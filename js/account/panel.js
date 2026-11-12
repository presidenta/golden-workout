/* КАРТОЧКИ МОДУЛЯ НА ВКЛАДКЕ «ЕЩЁ» И ЗАПУСК.

   Две карточки в местах, которые отводит им страница:
   #gfAccountCard — вход и состояние сохранения;
   #gfInstallCard — «Поставить значок на экран».

   Снаружи модуль запускается одной строкой из app.js: GFAccount.start(). */

/* Chrome предлагает установку событием, и приходит оно рано — ловим его
   сразу при загрузке скрипта, а не в start(). Значок ставит только сам
   человек нажатием: prompt() без нажатия браузер не покажет. */
let gfInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  gfInstallPrompt = e;
  gfPanel.render();
});
window.addEventListener('appinstalled', () => {
  gfInstallPrompt = null;
  gfPanel._installed = true;
  gfPanel.render();
});

// Элемент с текстом через textContent: имя человека в разметку не попадает
function gfEl(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'onclick' || k === 'onsubmit') node[k] = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  children.flat().filter(Boolean).forEach(c => node.append(c));
  return node;
}

// Значок линиями, цветом текста кнопки
const GF_ICON_CAMERA = 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
const GF_ICON_SYNC = 'M20 11a8 8 0 0 0-14.3-4.9L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.3 4.9L20 16 M20 20v-4h-4';

function gfIcon(d, size) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

const gfPanel = {
  _formOpen: false,
  _msg: '',
  _busy: false,
  _installed: false,
  _highlight: false,
  _renderSeq: 0,
  _reloadPending: false,

  render() {
    this._renderAccount().catch(e => console.warn('[Account] карточка:', e));
    this._renderInstall();
  },

  async _renderAccount() {
    const host = document.getElementById('gfAccountCard');
    if (!host) return;
    const seq = ++this._renderSeq;
    const t = gfText();
    const s = gfAccount.session;
    const status = s ? await this._status(t) : null;
    if (seq !== this._renderSeq) return;      // пока считали, нарисовали новее

    host.classList.toggle('gf-signed', !!s);
    const parts = [];
    if (s) {
      parts.push(this._profile(t, s), this._footer(t, status));
    } else {
      parts.push(gfEl('div', { class: 'gf-title', text: t.title }));
      parts.push(gfEl('div', { class: 'gf-text', text: t.intro }));
      if (gfAccount.canAskKvant()) {
        parts.push(gfEl('button', {
          class: 'btn-gold', type: 'button', text: t.viaKvant,
          onclick: () => { location.href = gfAccount.kvantLoginUrl(); }
        }));
      }
      if (this._formOpen) {
        /* Форма собирается один раз, пока открыта: перерисовка карточки
           (отказ, смена состояния) не стирает набранный логин. Заново —
           только при смене языка, ради подписей. */
        if (!this._formNode || this._formLang !== t) { this._formNode = this._form(t); this._formLang = t; }
        parts.push(this._formNode);
      } else {
        parts.push(gfEl('button', {
          class: 'btn-gold btn-secondary', type: 'button', text: t.withPassword,
          onclick: () => { this._formOpen = true; this._msg = ''; this.render(); }
        }));
      }
      parts.push(gfEl('a', { class: 'gf-link', href: GF_KVANT_SITE, target: '_blank', rel: 'noopener', text: t.noAccount }));
    }
    if (this._msg) parts.push(gfEl('div', { class: 'gf-msg', role: 'alert', text: this._msg }));
    host.replaceChildren(...parts);
  },

  _form(t) {
    const login = gfEl('input', { type: 'text', name: 'login', autocomplete: 'username', required: '', maxlength: '120' });
    const password = gfEl('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: '', maxlength: '200' });
    return gfEl('form', {
      class: 'gf-form',
      onsubmit: async e => {
        e.preventDefault();
        if (this._busy) return;
        this._busy = true;
        this._msg = '';
        try {
          if (await gfAccount.loginWithPassword(login.value.trim(), password.value)) this._closeForm();
        } catch (err) {
          this._msg = gfAccount.errorText(err);
          password.value = '';
        } finally {
          this._busy = false;
          this.render();
        }
      }
    },
      gfEl('div', { class: 'form-group' }, gfEl('label', { text: t.login }), login),
      gfEl('div', { class: 'form-group' }, gfEl('label', { text: t.password }), password),
      gfEl('div', { class: 'gf-row' },
        gfEl('button', { class: 'btn-gold', type: 'submit', text: t.submit }),
        gfEl('button', {
          class: 'btn-gold btn-secondary', type: 'button', text: t.cancel,
          onclick: () => { this._closeForm(); this._msg = ''; this.render(); }
        })));
  },

  _closeForm() {
    this._formOpen = false;
    this._formNode = null;
  },

  /* КТО ВОШЁЛ — С ПЕРВОГО ВЗГЛЯДА. Раньше здесь была строка «Вы вошли: имя ·
     кабинет № …» под заголовком и две большие золотые кнопки — читалось как
     служебное сообщение, а не как свой кабинет. Теперь как профиль: фото
     (нет фото — первая буква имени), имя крупно, номер кабинета под ним.
     Фото — своё у спорта, не из «Кванта» (модуль js/photos/): нажатие
     открывает его целиком, а нет фото — предлагает выбрать. */
  _profile(t, s) {
    const photos = typeof GFPhotos !== 'undefined' && GFPhotos.started ? GFPhotos : null;
    const own = photos && photos.avatar();
    const label = own ? t.openPhoto : t.addPhoto;
    const face = own
      ? gfEl('img', { src: own.thumb, alt: '' })
      : gfEl('span', { class: 'gf-initial', text: (s.displayName || '·').trim().charAt(0).toUpperCase() || '·' });
    const avatar = photos
      ? gfEl('button', { class: 'gf-avatar', type: 'button', 'aria-label': label, title: label, onclick: () => photos.openAvatar() },
          face, gfEl('span', { class: 'gf-avatar-badge', 'aria-hidden': 'true' }, gfIcon(GF_ICON_CAMERA, 13)))
      : gfEl('div', { class: 'gf-avatar' }, face);

    return gfEl('div', { class: 'gf-profile' },
      avatar,
      gfEl('div', { class: 'gf-id' },
        gfEl('div', { class: 'gf-eyebrow', text: t.eyebrow }),
        gfEl('div', { class: 'gf-name', text: s.displayName || '—' }),
        s.accountNo
          ? gfEl('div', { class: 'gf-cabinet', text: `${t.cabinetNo} ${String(s.accountNo).padStart(9, '0')}` })
          : null));
  },

  // Сохранение — строкой с огоньком; рядом две маленькие кнопки, не главные на экране
  _footer(t, st) {
    const syncing = gfSync.status === 'syncing';
    return gfEl('div', { class: 'gf-foot' },
      gfEl('div', { class: `gf-state gf-state-${st.kind}`, role: 'status' },
        gfEl('span', { class: 'gf-dot', 'aria-hidden': 'true' }),
        gfEl('div', { class: 'gf-state-text' },
          gfEl('div', { class: 'gf-state-main', text: st.main }),
          st.sub ? gfEl('div', { class: 'gf-state-sub', text: st.sub }) : null)),
      gfEl('button', {
        class: `gf-mini gf-mini-icon${syncing ? ' spinning' : ''}`, type: 'button',
        'aria-label': t.syncNow, title: t.syncNow,
        /* Кружок — «сохранить и обновить» (сборка 37). Владелец 07.11.2026: «он должен делать обновление и
           смотреть, есть ли изменения». Прежде только сохранял историю на сервер. */
        onclick: () => {
          gfSync.sync();
          if (typeof GFUpdate !== 'undefined') GFUpdate.check({ manual: true });
        }
      }, gfIcon(GF_ICON_SYNC, 16)),
      gfEl('button', { class: 'gf-mini', type: 'button', text: t.logout, onclick: () => this._logout() }));
  },

  // { main, sub, kind } — kind красит огонёк: ok зелёный, busy золотой, warn оранжевый
  async _status(t) {
    if (gfSync.status === 'syncing') return { main: t.saving, kind: 'busy' };
    if (gfSync.status === 'offline') return { main: t.offline, kind: 'warn' };
    if (gfSync.status === 'error') return { main: t.syncError, kind: 'warn' };
    const n = await gfSync.pendingCount();
    if (n) return { main: t.pending(n), kind: 'busy' };
    const last = await gfStore.getMeta('lastSync').catch(() => null);
    if (!last) return { main: t.savedAt, sub: t.never, kind: 'busy' };
    const d = new Date(last);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = dateKey(d) === dateKey() ? t.today : d.toLocaleDateString();
    return { main: t.savedAt, sub: `${day} ${time}`, kind: 'ok' };
  },

  async _logout() {
    if (!confirm(gfText().logoutConfirm)) return;
    await gfAccount.logout();
  },

  _renderInstall() {
    const host = document.getElementById('gfInstallCard');
    if (!host) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    // Открыто со значка — значок уже стоит, предлагать нечего
    if (standalone) { host.replaceChildren(); host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    host.classList.toggle('gf-highlight', this._highlight);

    const t = gfText();
    const parts = [
      gfEl('div', { class: 'gf-title', text: t.installTitle }),
      gfEl('div', { class: 'gf-text', text: t.installText })
    ];
    if (this._installed) {
      parts.push(gfEl('div', { class: 'gf-status gf-status-ok', text: t.installDone }));
    } else if (gfInstallPrompt) {
      parts.push(gfEl('button', {
        class: 'btn-gold', type: 'button', text: t.installButton,
        onclick: async () => {
          const ask = gfInstallPrompt;
          gfInstallPrompt = null;
          ask.prompt();
          const choice = await ask.userChoice.catch(() => null);
          if (choice && choice.outcome === 'accepted') this._installed = true;
          this.render();
        }
      }));
    } else {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      parts.push(gfEl('div', { class: 'gf-text gf-hint', text: ios ? t.installHintIos : t.installHintAndroid }));
    }
    host.replaceChildren(...parts);
  },

  goToMore(cardId) {
    const tab = document.getElementById('tabBtnMore');
    if (tab) tab.click();
    const card = document.getElementById(cardId);
    if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  },

  /* Сообщение под карточкой. Отказ висит, пока человек не сделает
     следующий шаг; заметка («восстановлено», «пришли изменения») —
     четверть минуты, чтобы не путать потом. */
  showMessage(text, transient = false) {
    clearTimeout(this._msgTimer);
    this._msg = text;
    if (transient) this._msgTimer = setTimeout(() => { this._msg = ''; this.render(); }, 15000);
    this.render();
    this.goToMore('gfAccountCard');
  },

  // Вошли или вышли — прежнее сообщение уже не о том
  _sessionChanged() {
    const id = gfAccount.session && gfAccount.session.userId;
    if (id !== this._sessionId) {
      this._sessionId = id;
      clearTimeout(this._msgTimer);
      this._msg = '';
    }
    this.render();
  },

  openForm(text) {
    this._formOpen = true;
    this.showMessage(text);
  },

  highlightInstall() {
    this._highlight = true;
    this.render();
    this.goToMore('gfInstallCard');
  },

  /* Идёт тренировка, глаза, дорожка, кардио или открыто окно записи —
     перезагружать страницу нельзя: оборвётся занятие. */
  _isBusy() {
    const shown = id => { const n = document.getElementById(id); return n && !n.classList.contains('hidden'); };
    return ['screenWorkout', 'restScreen', 'eyesScreen', 'tmScreen', 'cardioScreen'].some(shown)
      || !!document.querySelector('.modal-overlay:not(.hidden)')
      || (typeof GFPhotos !== 'undefined' && GFPhotos.isOpen());
  },

  /* Пришедшее с сервера уже лежит в базе, но экран и настройки в памяти
     собраны из прежнего. Проще и надёжнее всего — открыть приложение
     заново. Занят человек — дождёмся, когда он свернёт приложение. */
  _reloadWhenIdle(note) {
    try { sessionStorage.setItem('gfNote', note); } catch (e) { /* без заметки */ }
    if (!this._isBusy()) { location.reload(); return; }
    if (this._reloadPending) return;
    this._reloadPending = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !this._isBusy()) location.reload();
    });
  },

  restored(n) { this._reloadWhenIdle(gfText().restored(n)); },
  remoteChange() { this._reloadWhenIdle(gfText().updated); },

  // Заметка, оставленная перед перезагрузкой, показывается один раз
  _takeNote() {
    let note = null;
    try { note = sessionStorage.getItem('gfNote'); sessionStorage.removeItem('gfNote'); } catch (e) { /* нет */ }
    if (note) this.showMessage(note, true);
  }
};

const GFAccount = {
  async start({ dbReady }) {
    // Без базы тренировок сохранять нечего (приватный режим Safari)
    if (!dbReady) return;
    try {
      await gfAccount.init();
    } catch (e) {
      console.warn('[Account] своя база не открылась:', e);
      return;
    }
    gfSync.init();
    gfSync.onRestored = n => gfPanel.restored(n);
    gfSync.onRemoteChange = kinds => gfPanel.remoteChange(kinds);
    gfSync.onExpired = () => gfPanel.showMessage(gfText().err.unauthorized);
    gfPanel._sessionId = gfAccount.session && gfAccount.session.userId;
    gfAccount.onChange(() => gfPanel._sessionChanged());
    // Доступ к GoldenFit — как у «Кванта»: срок с сервера, закрытие по дате (access.js)
    gfAccessGate.start();
    if (typeof GFPhotos !== 'undefined') GFPhotos.onChange(() => gfPanel.render());

    let lang = store.getState().lang;
    store.subscribe(s => { if (s.lang !== lang) { lang = s.lang; gfPanel.render(); } });

    gfPanel.render();
    gfPanel._takeNote();
    await this._takeHash();
    // «Войти через Квант» возвращает сюда же: уже открытая страница получает только новый #
    window.addEventListener('hashchange', () => this._takeHash());
    gfSync.sync();
    gfAccount.refreshProfile();
  },

  /* Что принёс адрес: #kvant=<пропуск>, #install (поставить значок),
     #nokvant (на телефоне нет «Кванта»). Адрес сразу очищается: пропуск
     не должен оставаться ни в строке адреса, ни в истории браузера. */
  async _takeHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (!h.has('kvant') && !h.has('install') && !h.has('nokvant')) return;
    history.replaceState(null, '', location.pathname + location.search);

    if (h.has('install')) gfPanel.highlightInstall();
    if (h.has('nokvant') && !gfAccount.session) gfPanel.openForm(gfText().kvantMissing);
    const code = h.get('kvant');
    // Уже вошли — пропуск не нужен, он истечёт сам
    if (code && !gfAccount.session) {
      try {
        await gfAccount.redeem(code);
      } catch (e) {
        gfPanel.showMessage(gfAccount.errorText(e));
      }
    }
  }
};
