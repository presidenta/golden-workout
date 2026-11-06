/* ФОТОГРАФИИ GOLDENFIT: «МОЙ ЭТАЛОН» И ФОТО ПРОФИЛЯ СПОРТА.

   Владелец 04.11.2026: фото у спорта своё, не из «Кванта»; фото должно открываться целиком; нужен
   раздел, где человек держит фото тела, к которому идёт, и смотрит на него, пока занимается.

   Места на странице:
   #gpGoalCard  — карточка «Мой эталон» на вкладке «Тренировка»;
   #gpTrainGoal — эталоны над счётчиком подходов, всю тренировку: листаются пальцем или сами («Авто»).
   Фото профиля показывает карточка аккаунта (js/account/panel.js) через GFPhotos.avatar().
   Просмотр во весь экран — окно, которое модуль строит сам.

   Снаружи модуль запускается одной строкой из app.js: GFPhotos.start(). */

// Карусель над подходами: интервалы на выбор (с) и что стоит, пока человек не выбрал сам
const GP_AUTO_STEPS = [5, 10, 15, 30, 60];
const GP_AUTO_DEFAULT = { on: false, sec: 10 };

function gpEl(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) node[k] = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  children.flat().filter(Boolean).forEach(c => node.append(c));
  return node;
}

const GFPhotos = {
  _photos: [],            // без убранных; full/thumb — Blob из базы
  _thumbs: new Map(),     // id → адрес уменьшенной копии
  _fulls: new Map(),      // id → адрес снимка целиком (заводится при первом показе)
  _listeners: [],
  _trainId: null,         // какой эталон сейчас над подходами — по id, чтобы перерисовка его не сбивала
  _auto: { ...GP_AUTO_DEFAULT },
  _autoTimer: null,
  _viewer: null,
  started: false,

  async start({ dbReady } = {}) {
    if (!dbReady) return;
    try {
      await gpStore.open();
    } catch (e) {
      console.warn('[Photos] своя база не открылась:', e);
      return;
    }
    this.started = true;
    const auto = await gpStore.getMeta('auto').catch(() => null);
    if (auto) this._auto = { on: !!auto.on, sec: GP_AUTO_STEPS.includes(auto.sec) ? auto.sec : GP_AUTO_DEFAULT.sec };
    await this._load();
    this._render();
    this._notify();             // карточка аккаунта могла нарисоваться раньше — без фото
    this._watchTraining();

    let lang = store.getState().lang;
    store.subscribe(s => { if (s.lang !== lang) { lang = s.lang; this._render(); } });

    // Вошли (или вошёл другой человек) — обмен с сервером; без входа фото живут здесь
    if (typeof gfAccount !== 'undefined') {
      let uid = gfAccount.session && gfAccount.session.userId;
      gfAccount.onChange(() => {
        const now = gfAccount.session && gfAccount.session.userId;
        if (now !== uid) { uid = now; if (now) gpSync.run(); }
      });
    }
    window.addEventListener('online', () => gpSync.schedule(500));
    gpSync.run();
  },

  onChange(fn) { this._listeners.push(fn); },

  async _changed() {
    await this._load();
    this._render();
    this._notify();
  },

  _notify() {
    this._listeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[Photos]', e); } });
  },

  async _load() {
    const all = (await gpStore.all()).filter(p => !p.removed).sort((a, b) => a.addedAt - b.addedAt);
    const alive = new Set(all.map(p => p.id));
    for (const map of [this._thumbs, this._fulls]) {
      for (const [id, url] of map) if (!alive.has(id)) { URL.revokeObjectURL(url); map.delete(id); }
    }
    for (const p of all) if (!this._thumbs.has(p.id)) this._thumbs.set(p.id, URL.createObjectURL(p.thumb));
    this._photos = all;
  },

  goals() { return this._photos.filter(p => p.role === 'goal'); },

  // Фото профиля спорта: { id, thumb } или null
  avatar() {
    const a = this._photos.filter(p => p.role === 'avatar').pop();
    return a ? { id: a.id, thumb: this._thumbs.get(a.id) } : null;
  },

  _full(p) {
    if (!this._fulls.has(p.id)) this._fulls.set(p.id, URL.createObjectURL(p.full));
    return this._fulls.get(p.id);
  },

  /* ----- Добавить и убрать ----- */

  // Нажатие на кружок в карточке аккаунта: есть фото — открыть его, нет — выбрать
  openAvatar() {
    const a = this._photos.filter(p => p.role === 'avatar').pop();
    if (a) this._open([a], 0, 'avatar');
    else this.pick('avatar');
  },

  pick(role) {
    if (role === 'goal' && this.goals().length >= GP_LIMIT_GOALS) {
      alert(gpText().goalFull(GP_LIMIT_GOALS));
      return;
    }
    if (!this._input) {
      this._input = gpEl('input', { type: 'file', accept: 'image/*', hidden: '' });
      this._input.addEventListener('change', () => {
        const file = this._input.files && this._input.files[0];
        this._input.value = '';                  // тот же снимок можно выбрать снова
        if (file) this._add(file, this._pickRole);
      });
      document.body.append(this._input);
    }
    this._pickRole = role;
    this._input.click();
  },

  async _add(file, role) {
    const t = gpText();
    this._toast(t.saving);
    try {
      const prepared = await gpPrepare(file);
      // Фото профиля одно: прежнее уходит (с сервера — при обмене)
      if (role === 'avatar') {
        for (const p of this._photos.filter(x => x.role === 'avatar')) await this._drop(p);
      }
      await gpStore.put({
        id: newUid(), role, ...prepared,
        addedAt: Date.now(), synced: false, removed: false
      });
      this._toast('');
      await this._changed();
      gpSync.schedule();
    } catch (e) {
      console.warn('[Photos] не сохранилось:', e);
      this._toast(e && e.message === 'not_an_image' ? t.notImage : t.failed, 4000);
    }
  },

  // Отправленное на сервер помечаем: убрать его там должен обмен. Не отправленное — просто стираем
  async _drop(p) {
    if (p.synced) await gpStore.put({ ...p, removed: true });
    else await gpStore.del(p.id);
  },

  async _remove(p) {
    const t = gpText();
    if (!confirm(p.role === 'avatar' ? t.removeAvatar : t.removeGoal)) return false;
    await this._drop(p);
    await this._changed();
    gpSync.schedule();
    return true;
  },

  /* ----- Карточка «Мой эталон» ----- */

  _render() {
    this._renderGoalCard();
    this._renderTrain();
    if (this._viewer) this._paintViewer();
  },

  _renderGoalCard() {
    const host = document.getElementById('gpGoalCard');
    if (!host) return;
    const t = gpText();
    const goals = this.goals();
    const head = gpEl('div', { class: 'gp-head' },
      gpEl('span', { class: 'gp-title', text: t.goalTitle }),
      goals.length ? gpEl('span', { class: 'gp-count-badge', text: `${goals.length}/${GP_LIMIT_GOALS}` }) : null);

    if (!goals.length) {
      host.replaceChildren(head,
        gpEl('div', { class: 'gp-intro', text: t.goalIntro }),
        gpEl('button', { class: 'gp-add-btn', type: 'button', onclick: () => this.pick('goal') },
          gpEl('span', { class: 'gp-plus', 'aria-hidden': 'true', text: '+' }), t.goalAdd));
      return;
    }

    const strip = gpEl('div', { class: 'gp-strip' },
      goals.map((p, i) => gpEl('button', {
        class: 'gp-tile', type: 'button', 'aria-label': `${t.open} ${i + 1}`,
        onclick: () => this._open(goals, i, 'goal')
      }, gpEl('img', { src: this._thumbs.get(p.id), alt: '' }))),
      goals.length < GP_LIMIT_GOALS
        ? gpEl('button', { class: 'gp-tile gp-tile-add', type: 'button', 'aria-label': t.goalMore, onclick: () => this.pick('goal') },
            gpEl('span', { class: 'gp-plus', 'aria-hidden': 'true', text: '+' }))
        : null);
    host.replaceChildren(head, strip);
  },


  /* ----- Эталон над счётчиком подходов (сборка 33) -----
     Владелец 06.11.2026: фото — вверху, над счётчиком подходов, всю тренировку: «смотришь определённую
     группу мышц, когда качаешь, как она выглядит на фото». Два способа листать:
       пальцем — выбрал фото, и оно стоит, пока не перелистнёшь;
       «Авто» — фото меняются сами, интервал выбирается (по умолчанию 10 с). Без «Авто» ничего не движется.
     Блок виден, пока виден счётчик подходов (#sessionProgress — и во время подхода, и на отдыхе); прежнее
     фото на экране отдыха убрано — было бы вторым. Выбор «Авто» и интервала помнит этот телефон. */
  _watchTraining() {
    const bar = document.getElementById('sessionProgress');
    if (!bar) return;
    new MutationObserver(() => this._showTrain())
      .observe(bar, { attributes: true, attributeFilter: ['class'] });
    this._showTrain();
  },

  _trainVisible() {
    const bar = document.getElementById('sessionProgress');
    return !!bar && !bar.classList.contains('hidden') && this.goals().length > 0;
  },

  _showTrain() {
    const host = document.getElementById('gpTrainGoal');
    if (!host) return;
    const was = !host.classList.contains('hidden');
    const now = this._trainVisible();
    host.classList.toggle('hidden', !now);
    // Только что показали — встать на выбранное фото: у скрытой ленты ширины нет, сдвиг не держится
    if (now && !was) this._trainGo(this._trainIndex(), false);
    this._restartAuto();
  },

  _trainIndex() {
    const i = this.goals().findIndex(p => p.id === this._trainId);
    return i < 0 ? 0 : i;
  },

  _renderTrain() {
    const host = document.getElementById('gpTrainGoal');
    if (!host) return;
    const goals = this.goals();
    if (!goals.length) { host.replaceChildren(); this._showTrain(); return; }
    const t = gpText();
    if (!goals.some(p => p.id === this._trainId)) this._trainId = goals[0].id;

    const strip = gpEl('div', { class: 'gp-train-strip' },
      goals.map((p, i) => gpEl('button', {
        class: 'gp-train-slide', type: 'button', 'aria-label': `${t.open} ${i + 1}`,
        onclick: () => this._open(goals, i, 'goal')
      }, gpEl('img', { src: this._full(p), alt: '' }))));
    const count = gpEl('span', { class: 'gp-train-count' });
    const auto = gpEl('button', {
      class: 'gp-auto-btn', type: 'button', 'aria-pressed': String(this._auto.on), title: t.autoHint,
      onclick: () => this._setAuto({ on: !this._auto.on })
    }, t.auto);
    const every = gpEl('select', { class: 'gp-auto-every', 'aria-label': t.autoEvery },
      GP_AUTO_STEPS.map(sec => {
        const o = gpEl('option', { value: String(sec), text: t.everySec(sec) });
        if (sec === this._auto.sec) o.selected = true;
        return o;
      }));
    every.addEventListener('change', () => this._setAuto({ sec: Number(every.value) }));
    host.replaceChildren(strip, gpEl('div', { class: 'gp-train-bar' }, auto, every, count));

    // Перелистнули пальцем — это фото и стоит; при «Авто» отсчёт до следующего — заново
    let ждём = null;
    strip.addEventListener('scroll', () => {
      clearTimeout(ждём);
      ждём = setTimeout(() => {
        const i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
        const p = this.goals()[Math.min(i, this.goals().length - 1)];
        if (p && p.id !== this._trainId) { this._trainId = p.id; this._restartAuto(); }
        this._trainCount();
      }, 120);
    }, { passive: true });
    strip.addEventListener('touchstart', () => this._restartAuto(), { passive: true });

    this._trainGo(this._trainIndex(), false);
    this._showTrain();
  },

  _trainCount() {
    const host = document.getElementById('gpTrainGoal');
    const count = host && host.querySelector('.gp-train-count');
    if (count) count.textContent = `${this._trainIndex() + 1}/${this.goals().length}`;
  },

  _trainGo(i, smooth) {
    const goals = this.goals();
    const strip = document.querySelector('#gpTrainGoal .gp-train-strip');
    if (!goals.length || !strip) return;
    const k = ((i % goals.length) + goals.length) % goals.length;
    this._trainId = goals[k].id;
    strip.scrollTo({ left: k * strip.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    this._trainCount();
  },

  async _setAuto(change) {
    this._auto = { ...this._auto, ...change };
    gpStore.setMeta('auto', this._auto).catch(e => console.warn('[Photos] «Авто» не запомнилось:', e));
    const btn = document.querySelector('#gpTrainGoal .gp-auto-btn');
    if (btn) btn.setAttribute('aria-pressed', String(this._auto.on));
    this._restartAuto();
  },

  _restartAuto() {
    clearInterval(this._autoTimer);
    this._autoTimer = null;
    if (!this._auto.on || this.goals().length < 2 || !this._trainVisible()) return;
    this._autoTimer = setInterval(() => {
      if (document.hidden || this._viewer) return;
      this._trainGo(this._trainIndex() + 1, true);
    }, this._auto.sec * 1000);
  },

  /* ----- Просмотр во весь экран -----
     Снимок целиком, без обрезки, на чёрном. Листается пальцем и стрелками; закрывается крестиком,
     Escape и системной «назад» (ui.js спрашивает isOpen/close). */
  _open(list, index, kind) {
    this._viewer = { ids: list.map(p => p.id), index, kind };
    this._paintViewer();
  },

  isOpen() { return !!this._viewer; },

  close() {
    if (!this._viewer) return false;
    this._viewer = null;
    if (this._viewerNode) this._viewerNode.classList.add('hidden');
    document.body.classList.remove('gp-noscroll');
    return true;
  },

  _step(d) {
    const v = this._viewer;
    if (!v || v.ids.length < 2) return;
    v.index = (v.index + d + v.ids.length) % v.ids.length;
    this._paintViewer();
  },

  _paintViewer() {
    const v = this._viewer;
    const byId = new Map(this._photos.map(p => [p.id, p]));
    v.ids = v.ids.filter(id => byId.has(id));
    if (v.kind === 'goal') v.ids = this.goals().map(p => p.id).filter(id => v.ids.includes(id));
    if (!v.ids.length) { this.close(); return; }
    v.index = Math.min(v.index, v.ids.length - 1);
    const p = byId.get(v.ids[v.index]);
    const t = gpText();

    const node = this._viewerNode || this._buildViewer();
    node.classList.remove('hidden');
    document.body.classList.add('gp-noscroll');
    node.querySelector('.gp-v-img').src = this._full(p);
    node.querySelector('.gp-v-count').textContent = v.ids.length > 1 ? `${v.index + 1} / ${v.ids.length}` : '';
    node.querySelector('.gp-v-close').setAttribute('aria-label', t.close);
    node.querySelectorAll('.gp-v-nav').forEach(b => b.classList.toggle('hidden', v.ids.length < 2));
    node.querySelector('.gp-v-prev').setAttribute('aria-label', t.prev);
    node.querySelector('.gp-v-next').setAttribute('aria-label', t.next);

    const actions = node.querySelector('.gp-v-actions');
    const remove = gpEl('button', { class: 'gp-v-btn gp-v-danger', type: 'button', text: t.remove, onclick: () => this._remove(p) });
    if (v.kind === 'avatar') {
      actions.replaceChildren(
        gpEl('button', { class: 'gp-v-btn', type: 'button', text: t.change, onclick: () => { this.close(); this.pick('avatar'); } }),
        remove);
    } else {
      actions.replaceChildren(remove);
    }
  },

  _buildViewer() {
    const node = gpEl('div', { class: 'gp-viewer hidden', role: 'dialog', 'aria-modal': 'true' },
      gpEl('div', { class: 'gp-v-top' },
        gpEl('span', { class: 'gp-v-count' }),
        gpEl('button', { class: 'gp-v-close', type: 'button', text: '✕', onclick: () => this.close() })),
      gpEl('img', { class: 'gp-v-img', alt: '' }),
      gpEl('button', { class: 'gp-v-nav gp-v-prev', type: 'button', text: '‹', onclick: () => this._step(-1) }),
      gpEl('button', { class: 'gp-v-nav gp-v-next', type: 'button', text: '›', onclick: () => this._step(1) }),
      gpEl('div', { class: 'gp-v-actions' }));

    // Листать пальцем: сдвиг больше 50 пикселей вбок
    let x0 = null;
    node.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    node.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) this._step(dx < 0 ? 1 : -1);
    });
    document.addEventListener('keydown', e => {
      if (!this._viewer) return;
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowLeft') this._step(-1);
      else if (e.key === 'ArrowRight') this._step(1);
    });
    document.body.append(node);
    this._viewerNode = node;
    return node;
  },

  /* ----- Подсказка внизу экрана: «сохраняю», «не получилось» ----- */
  _toast(text, ms) {
    if (!this._toastNode) {
      this._toastNode = gpEl('div', { class: 'gp-toast hidden', role: 'status' });
      document.body.append(this._toastNode);
    }
    clearTimeout(this._toastTimer);
    this._toastNode.textContent = text;
    this._toastNode.classList.toggle('hidden', !text);
    if (text && ms) this._toastTimer = setTimeout(() => this._toast(''), ms);
  }
};
