/* СИНХРОНИЗАЦИЯ ИСТОРИИ С СЕРВЕРОМ «КВАНТА».

   Телефон — главный: всё пишется сначала в базу тренировок, приложение
   работает и без сети. Каждая запись, о которой сообщила база (db.onChange),
   встаёт в очередь отправки (outbox). Очередь уходит на сервер через пару
   секунд после изменения, при открытии приложения и при появлении сети.

   Сервер содержимое не разбирает: запись — это вид, ключ и данные как они
   лежат здесь. Побеждает более поздняя правка; удаление доходит до других
   телефонов отметкой deletedAt.

   ЗНАКОМСТВО. Первый вход аккаунта на этом телефоне (или после смены
   аккаунта): сначала забираем с сервера всё, что там есть — так
   переустановленный телефон получает свою историю обратно, — а потом
   отправляем то, чего на сервере нет, — так месяц занятий, сделанный до
   первого входа, уходит на сервер. Где запись есть и там и тут, побеждает
   сервер: на свежем телефоне «своё» — это пустые настройки по умолчанию. */

// Хранилище базы тренировок → вид записи на сервере
const GF_KINDS = { workouts: 'workout', daily: 'day', programs: 'program', settings: 'settings' };
const GF_STORE_OF = Object.fromEntries(Object.entries(GF_KINDS).map(([s, k]) => [k, s]));
const GF_BATCH = 200;

// Сравнение без учёта порядка полей: сервер хранит JSON в своём порядке
function gfStable(v) {
  if (Array.isArray(v)) return '[' + v.map(gfStable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + gfStable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}

const gfSync = {
  status: 'idle',          // idle | syncing | ok | offline | error
  _running: null,
  _again: false,
  _timer: null,
  _byUid: null,            // тренировки по постоянному ключу — на время одного прохода
  onRestored: null,        // (сколько записей пришло) — знакомство вернуло историю
  onRemoteChange: null,    // пришли правки с другого устройства
  onExpired: null,         // сервер больше не принимает сессию

  init() {
    db.onChange((store, key) => this._mark(store, key));
    window.addEventListener('online', () => this.sync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync();
    });
  },

  async _mark(store, key) {
    const kind = GF_KINDS[store];
    if (!kind || key === undefined || key === null) return;
    const id = String(key);
    await gfStore.put('outbox', { key: `${kind}|${id}`, kind, id, at: new Date().toISOString() })
      .catch(e => console.warn('[Sync] очередь не записалась:', e));
    this._setStatus(this.status);
    this.schedule();
  },

  schedule(ms = 2000) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.sync(), ms);
  },

  sync() {
    if (!gfAccount.session || !db.db) return Promise.resolve(false);
    if (this._running) { this._again = true; return this._running; }
    this._running = this._run().finally(() => {
      this._running = null;
      if (this._again) { this._again = false; this.schedule(0); }
    });
    return this._running;
  },

  async pendingCount() {
    return (await gfStore.all('outbox').catch(() => [])).length;
  },

  _setStatus(s) {
    this.status = s;
    gfAccount._emit();
  },

  /* Чья история на телефоне. Вызывается при каждом входе, до того как
     сессия принята. false — человек не захотел заменять чужую историю. */
  async link(session) {
    const prev = await gfStore.getMeta('linkedUser');
    if (prev && prev.userId === session.userId) return true;

    if (prev && await this._hasLocalData()) {
      if (!confirm(gfText().switchConfirm(prev.displayName || '—', session.displayName || '—'))) return false;
      for (const store of Object.keys(GF_KINDS)) await db.rawClear(store);
    }
    await gfStore.clear('outbox');
    await gfStore.setMeta('cursor', 0);
    await gfStore.setMeta('linkedUser', { userId: session.userId, displayName: session.displayName });
    await gfStore.setMeta('needsIntro', true);
    return true;
  },

  async _hasLocalData() {
    for (const store of ['workouts', 'daily', 'programs']) {
      if ((await db.rawAll(store)).length) return true;
    }
    return false;
  },

  async _run() {
    this._setStatus('syncing');
    this._byUid = null;
    try {
      let restored = 0;
      if (await gfStore.getMeta('needsIntro')) {
        restored = await this._intro();
        await gfStore.setMeta('needsIntro', false);
      }
      const changed = await this._exchange();
      await gfStore.setMeta('lastSync', new Date().toISOString());
      this._setStatus('ok');
      if (restored && this.onRestored) this.onRestored(restored);
      else if (changed.size && this.onRemoteChange) this.onRemoteChange(changed);
      return true;
    } catch (e) {
      if (e.status === 401) {
        await gfAccount.expired();
        if (this.onExpired) this.onExpired();
      }
      this._setStatus(e.code === 'network' ? 'offline' : 'error');
      console.warn('[Sync] не получилось:', e);
      return false;
    } finally {
      this._byUid = null;
    }
  },

  // Знакомство: всё с сервера — сюда, своё, чего там нет, — в очередь
  async _intro() {
    let cursor = 0, restored = 0, page;
    const onServer = new Set();
    do {
      page = await gfAccount.request('/api/sport/sync', { cursor });
      for (const r of page.changes) {
        onServer.add(`${r.kind}|${r.id}`);
        if (await this._apply(r)) restored++;
      }
      cursor = page.cursor;
    } while (page.more);

    const at = new Date().toISOString();
    for (const [store, kind] of Object.entries(GF_KINDS)) {
      for (const rec of await db.rawAll(store)) {
        // Тренировки, записанные до этой сборки, получают постоянный ключ сейчас
        if (store === 'workouts' && !rec.uid) { rec.uid = newUid(); await db.rawPut('workouts', rec); }
        const id = this._idOf(store, rec);
        if (id && !onServer.has(`${kind}|${id}`)) {
          await gfStore.put('outbox', { key: `${kind}|${id}`, kind, id, at });
        }
      }
    }
    this._byUid = null;
    await gfStore.setMeta('cursor', cursor);
    return restored;
  },

  /* Обмен: очередь — на сервер, новое с сервера — сюда. Пачками, пока
     очередь не опустеет и сервер не отдаст всё. Возвращает, каких видов
     записи изменились правками с других устройств. */
  async _exchange() {
    const changed = new Set();
    let cursor = (await gfStore.getMeta('cursor')) || 0;
    for (let guard = 0; guard < 1000; guard++) {
      const sent = (await gfStore.all('outbox')).slice(0, GF_BATCH);
      const changes = [];
      for (const e of sent) changes.push(await this._outgoing(e));
      const res = await gfAccount.request('/api/sport/sync', { cursor, changes });

      // Отправленное — из очереди, если пока шёл запрос его не поменяли снова
      for (const e of sent) {
        const now = await gfStore.get('outbox', e.key);
        if (now && now.at === e.at) await gfStore.del('outbox', e.key);
      }
      if (res.rejected && res.rejected.length) console.warn('[Sync] сервер отклонил:', res.rejected);

      /* Пришедшее с сервера применяем ПОСЛЕ того, как отправленное ушло из
         очереди: если сервер оставил у себя более позднюю правку с другого
         телефона, она здесь и придёт — и заменит нашу устаревшую. Пропускаем
         только то, что поменяли на телефоне прямо во время запроса. */
      const waiting = new Set((await gfStore.all('outbox')).map(e => e.key));
      for (const r of res.changes) {
        if (waiting.has(`${r.kind}|${r.id}`)) continue;
        if (await this._apply(r)) changed.add(r.kind);
      }
      cursor = res.cursor;
      await gfStore.setMeta('cursor', cursor);

      if (!res.more && !(await this.pendingCount())) break;
    }
    return changed;
  },

  _idOf(store, rec) {
    if (store === 'workouts') return rec.uid;
    if (store === 'daily') return rec.date;
    if (store === 'programs') return rec.id;
    return rec.key;                       // settings
  },

  async _workouts() {
    if (!this._byUid) {
      this._byUid = new Map();
      for (const w of await db.rawAll('workouts')) if (w.uid) this._byUid.set(w.uid, w);
    }
    return this._byUid;
  },

  // Запись как она лежит на телефоне, в виде для сервера; null — её нет
  async _local(kind, id) {
    if (kind === 'workout') {
      const w = (await this._workouts()).get(id);
      if (!w) return null;
      const { id: localId, ...data } = w;   // номер по порядку — только этого телефона
      return data;
    }
    const store = GF_STORE_OF[kind];
    if (!store) return null;
    const rec = await db.rawGet(store, id);
    if (!rec) return null;
    return kind === 'settings' ? rec.value : rec;
  },

  async _outgoing(e) {
    const data = await this._local(e.kind, e.id);
    return data === null
      ? { kind: e.kind, id: e.id, data: null, updatedAt: e.at, deletedAt: e.at }
      : { kind: e.kind, id: e.id, data, updatedAt: e.at, deletedAt: null };
  },

  // Положить запись с сервера. true — на телефоне что-то поменялось
  async _apply(r) {
    const store = GF_STORE_OF[r.kind];
    if (!store) return false;               // вид, которого эта сборка не знает
    const local = await this._local(r.kind, r.id);

    if (r.deletedAt) {
      if (local === null) return false;
      if (r.kind === 'workout') {
        const w = (await this._workouts()).get(r.id);
        await db.rawDelete('workouts', w.id);
        this._byUid.delete(r.id);
      } else {
        await db.rawDelete(store, r.id);
      }
      return true;
    }

    if (local !== null && gfStable(local) === gfStable(r.data)) return false;

    if (r.kind === 'workout') {
      const w = (await this._workouts()).get(r.id);
      const rec = { ...r.data, uid: r.id };
      if (w) rec.id = w.id; else delete rec.id;
      const newId = await db.rawPut('workouts', rec);
      this._byUid.set(r.id, { ...rec, id: newId });
    } else if (r.kind === 'settings') {
      await db.rawPut('settings', { key: r.id, value: r.data });
    } else if (r.kind === 'day') {
      await db.rawPut('daily', { ...r.data, date: r.id });
    } else {
      await db.rawPut('programs', { ...r.data, id: r.id });
    }
    return true;
  }
};
