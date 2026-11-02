/* ВХОД GOLDENFIT — АККАУНТ «КВАНТА».

   Своих пользователей и паролей у спорта нет. Сессию даёт сервер «Кванта»
   одним из двух путей:
   1. ПРОПУСК. «Квант», где человек уже вошёл, открывает спорт с адресом
      …/golden-workout/#kvant=<пропуск>. Пропуск живёт две минуты и годится
      один раз; спорт меняет его на свою сессию (/api/sport/redeem).
   2. ПАРОЛЬ. Тот же логин и пароль, что в «Кванте» (/api/session/login) —
      когда «Квант» на телефоне нет: айфон, компьютер.

   Сессия, курсор синхронизации и очередь отправки лежат в своей базе
   GoldenFitAccount — не в базе тренировок и не в базе «Кванта». */

const GF_API = (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname))
  ? 'http://localhost:8580'
  : 'https://game.coreviaflow.com/genesisystem';

// Приложение «Квант» на Android и его адрес для «Войти через Квант»
const GF_KVANT_PACKAGE = 'space.coreviaflow.planner';
const GF_KVANT_SITE = 'https://presidenta.github.io/quantum-diary/';

class GFAccountStore {
  constructor() { this.db = null; }

  open() {
    if (this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('GoldenFitAccount', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        // meta: сессия, курсор, чья история на телефоне, когда сохранялось
        d.createObjectStore('meta', { keyPath: 'key' });
        // outbox: что изменилось и ещё не дошло до сервера — по одной строке на запись
        d.createObjectStore('outbox', { keyPath: 'key' });
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  _run(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const req = fn(this.db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  get(store, key) { return this._run(store, 'readonly', s => s.get(key)); }
  all(store) { return this._run(store, 'readonly', s => s.getAll()); }
  put(store, value) { return this._run(store, 'readwrite', s => s.put(value)); }
  del(store, key) { return this._run(store, 'readwrite', s => s.delete(key)); }
  clear(store) { return this._run(store, 'readwrite', s => s.clear()); }

  async getMeta(key) { const row = await this.get('meta', key); return row ? row.value : undefined; }
  setMeta(key, value) { return this.put('meta', { key, value }); }
}

const gfStore = new GFAccountStore();

// Ошибка запроса с кодом отказа сервера: по нему выбирается понятная подпись
class GFError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

const gfAccount = {
  session: null,          // { token, userId, displayName, accountNo }
  _listeners: [],

  async init() {
    await gfStore.open();
    this.session = (await gfStore.getMeta('session')) || null;
  },

  onChange(fn) { this._listeners.push(fn); },
  _emit() { this._listeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[Account]', e); } }); },

  async request(path, body, token = this.session && this.session.token) {
    let res;
    try {
      res = await fetch(GF_API + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new GFError('network', 0);
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new GFError((data && data.error) || 'other', res.status);
    return data;
  },

  // Пропуск из «Кванта» — на свою сессию
  async redeem(code) {
    const s = await this.request('/api/sport/redeem', { code }, null);
    return this._adopt(s);
  },

  async loginWithPassword(login, password) {
    const { token, userId } = await this.request('/api/session/login', { login, password }, null);
    const me = await this.request('/api/me', undefined, token).catch(() => null);
    return this._adopt({ token, userId, displayName: me && me.displayName, accountNo: me && me.accountNo });
  },

  /* Новая сессия ещё не принята: сначала синхронизация решает, чья история
     на телефоне (gfSync.link). Отказался человек заменять чужую историю —
     сессию закрываем, как будто входа не было. */
  async _adopt(session) {
    const ok = await gfSync.link(session);
    if (!ok) {
      await this.request('/api/session/logout', {}, session.token).catch(() => {});
      return false;
    }
    this.session = session;
    await gfStore.setMeta('session', session);
    this._emit();
    gfSync.sync();
    return true;
  },

  /* Выход: сессия закрывается и на сервере. История на телефоне остаётся,
     а вместе с ней и отметка, чья она: войдёт тот же человек — продолжим
     с того же места, другой — спросим, заменять ли. */
  async logout() {
    const s = this.session;
    this.session = null;
    await gfStore.setMeta('session', null);
    this._emit();
    if (s) await this.request('/api/session/logout', {}, s.token).catch(() => {});
  },

  // Сервер больше не принимает сессию: срок вышел, сменили пароль, заблокировали
  async expired() {
    this.session = null;
    await gfStore.setMeta('session', null);
    this._emit();
  },

  /* «Войти через Квант». На Android — ссылка-намерение: Chrome откроет
     приложение «Квант», а тот вернёт сюда пропуск. Нет «Кванта» на
     телефоне (или он старый, без этого входа) — Chrome сам откроет
     запасной адрес с #nokvant, и мы покажем вход по паролю. */
  kvantLoginUrl() {
    const back = location.origin + location.pathname + '#nokvant';
    return `intent://goldenfit/login#Intent;scheme=quantumdiary;package=${GF_KVANT_PACKAGE};`
      + `S.browser_fallback_url=${encodeURIComponent(back)};end`;
  },

  canAskKvant() { return /Android/i.test(navigator.userAgent); },

  errorText(err) {
    const t = gfText().err;
    return t[err && err.code] || t.other;
  }
};
