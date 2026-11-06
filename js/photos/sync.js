/* ФОТО НА СЕРВЕРЕ «КВАНТА» — когда человек вошёл (модуль js/account/).

   Без входа фото живут только на телефоне. Со входом — копия на сервере (/api/sport/photos), и после
   переустановки они возвращаются. Фото аккаунта «Кванта» здесь не участвует: у спорта своё.

   Порядок обмена — от него зависит, что победит:
   1. убранное здесь — убрать на сервере;
   2. новое здесь — отправить (новое фото профиля на сервере заменяет прежнее);
   3. список с сервера: чего здесь нет — докачать; что здесь было на сервере, а там его нет, — отправить
      снова (сборка 34: прежде стиралось здесь). Здесь фото убирает только человек.

   Хозяин фото — аккаунт (meta owner). Вошёл другой человек — фото прежнего с телефона убираются
   (у него они на сервере), как и история тренировок. */

const gpSync = {
  _running: null,
  _again: false,
  _timer: null,

  // Через пару секунд: несколько правок подряд уходят одним обменом
  schedule(ms = 1500) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.run(), ms);
  },

  run() {
    if (this._running) { this._again = true; return this._running; }
    this._running = this._exchange()
      .catch(e => console.warn('[Photos] обмен не удался:', e))
      .finally(() => {
        this._running = null;
        if (this._again) { this._again = false; this.run(); }
      });
    return this._running;
  },

  _session() {
    return typeof gfAccount !== 'undefined' && gfAccount.session ? gfAccount.session : null;
  },

  async _exchange() {
    const s = this._session();
    if (!s) return;
    let changed = false;

    const owner = await gpStore.getMeta('owner');
    if (owner && owner !== s.userId) {
      await gpStore.clear();
      changed = true;
    }
    if (owner !== s.userId) await gpStore.setMeta('owner', s.userId);

    for (const p of await gpStore.all()) {
      if (p.removed) {
        if (p.synced) await this._send('DELETE', p.id);
        await gpStore.del(p.id);
        changed = true;
      } else if (!p.synced && await this._upload(p)) {
        await gpStore.put({ ...p, synced: true });
      }
    }

    const remote = await gfAccount.request('/api/sport/photos');
    const onServer = new Set(remote.map(r => r.id));
    const local = new Map((await gpStore.all()).map(p => [p.id, p]));
    /* НА СЕРВЕРЕ НЕТ — ОТПРАВИТЬ СНОВА, А НЕ СТЕРЕТЬ ЗДЕСЬ (сборка 34). Владелец 06.11.2026: «синхронизация
       сохранять должна, а не забирать». Прежде такой снимок считался убранным с другого телефона и стирался
       здесь — а пустой или потерянный список на сервере стёр бы все фото разом. Убирает снимок только
       человек, своей кнопкой (removed выше); убранное на другом телефоне сюда не доходит — это дешевле.
       Отправит его следующий проход обмена (_again). */
    let заново = false;
    for (const p of local.values()) {
      if (p.synced && !onServer.has(p.id)) { await gpStore.put({ ...p, synced: false }); заново = true; }
    }
    if (заново) this._again = true;
    for (const r of remote) {
      if (local.has(r.id)) continue;
      const full = await this._download(r.id);
      await gpStore.put({
        id: r.id, role: r.role, full, thumb: await gpThumbOf(full),
        width: r.width, height: r.height, addedAt: Date.parse(r.createdAt) || Date.now(),
        synced: true, removed: false
      });
      changed = true;
    }
    if (changed) GFPhotos._changed();
  },

  _url(id) { return `${GF_API}/api/sport/photos/${encodeURIComponent(id)}`; },

  _auth() { return { Authorization: `Bearer ${this._session().token}` }; },

  async _send(method, id, init = {}) {
    let res;
    try {
      res = await fetch(this._url(id) + (init.query || ''), { method, headers: { ...this._auth(), ...(init.headers || {}) }, body: init.body });
    } catch (e) {
      throw new GFError('network', 0);
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new GFError((data && data.error) || 'other', res.status);
    }
    return res;
  },

  // true — снимок на сервере
  async _upload(p) {
    try {
      await this._send('POST', p.id, {
        query: `?role=${p.role}&w=${p.width}&h=${p.height}`,
        headers: { 'Content-Type': 'image/jpeg' },
        body: p.full
      });
      return true;
    } catch (e) {
      /* Эталонов на сервере уже двенадцать (добавили с другого телефона) — этот остаётся только
         здесь, неотправленным, и не пропадает при сверке; остальное обмен продолжает */
      if (e.code === 'too_many_photos') return false;
      throw e;
    }
  },

  async _download(id) {
    return (await this._send('GET', id)).blob();
  }
};
