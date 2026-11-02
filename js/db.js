const DB_NAME = 'GoldenWorkoutDB';
/* Версия 2 добавила хранилище daily — дневник дня: кардио, глаза, заметка.
   Тренировки лежат отдельно, в workouts, и туда же попадают недоделанные. */
const DB_VERSION = 2;

class Database {
  constructor() {
    this.db = null;
    this._listeners = [];
  }

  /* Кто хочет знать о каждой записи. Сейчас это модуль аккаунта
     (js/account/): он отправляет изменённое на сервер. Сообщаем имя
     хранилища и ключ записи — что с ней делать, решает подписчик. */
  onChange(fn) { this._listeners.push(fn); }

  _changed(store, key) {
    this._listeners.forEach(fn => { try { fn(store, key); } catch (e) { console.warn('[DB] подписчик упал:', e); } });
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('programs')) {
          db.createObjectStore('programs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workouts')) {
          const wStore = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
          wStore.createIndex('date', 'date', { unique: false });
          wStore.createIndex('program', 'program', { unique: false });
        }
        /* Хранилища schedule и imageCache были в первой версии и не
           использовались ни разу: расписание лежит в settings, картинки
           хранит сервис-воркер. Новым установкам их не создаём, у старых
           они остаются пустыми — вреда от них нет. */
        // Кардио и глаза — по одной записи на дату
        if (!db.objectStoreNames.contains('daily')) {
          db.createObjectStore('daily', { keyPath: 'date' });
        }
      };
    });
  }

  _tx(store, mode) {
    return this.db.transaction(store, mode).objectStore(store);
  }

  async get(store, key) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readonly').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value ?? req.result : undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async set(store, key, value) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readwrite').put({ key, value });
      req.onsuccess = () => { this._changed(store, key); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(store) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readonly').getAll();
      req.onsuccess = () => resolve(req.result.map(r => r.value ?? r));
      req.onerror = () => reject(req.error);
    });
  }

  /* ----- Программы -----
     У этого хранилища ключ лежит внутри записи (keyPath: 'id'), поэтому
     обычный set() с обёрткой {key, value} сюда не подходит — база
     отвергает запись без поля id. Программу кладём как есть. */
  async putProgram(prog) {
    return new Promise((resolve, reject) => {
      const req = this._tx('programs', 'readwrite').put(prog);
      req.onsuccess = () => { this._changed('programs', prog.id); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProgram(id) {
    return new Promise((resolve, reject) => {
      const req = this._tx('programs', 'readwrite').delete(id);
      req.onsuccess = () => { this._changed('programs', id); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  /* У тренировки два ключа. id — номер по порядку, его выдаёт сама база
     этого телефона, и на другом телефоне он другой. uid — постоянный, по
     нему тренировку узнают на сервере и после переустановки. */
  async addWorkout(record) {
    if (!record.uid) record.uid = newUid();
    return new Promise((resolve, reject) => {
      const req = this._tx('workouts', 'readwrite').add(record);
      req.onsuccess = () => { this._changed('workouts', record.uid); resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  }

  async getWorkoutsByDate(date) {
    return new Promise((resolve, reject) => {
      const idx = this._tx('workouts', 'readonly').index('date');
      const req = idx.getAll(date);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllWorkouts() {
    return new Promise((resolve, reject) => {
      const req = this._tx('workouts', 'readonly').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /* ----- Дневник дня -----
     Кардио и гимнастика для глаз — не тренировки, но в календаре они
     должны оставаться навсегда, наравне с ними. */
  async getDay(date) {
    return new Promise((resolve, reject) => {
      const req = this._tx('daily', 'readonly').get(date);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // Дописывает поля, не стирая то, что уже записано за этот день
  async mergeDay(date, patch) {
    const existing = await this.getDay(date).catch(() => null);
    const record = { ...(existing || { date }), ...patch, date };
    return new Promise((resolve, reject) => {
      const req = this._tx('daily', 'readwrite').put(record);
      req.onsuccess = () => { this._changed('daily', date); resolve(record); };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllDays() {
    return new Promise((resolve, reject) => {
      const req = this._tx('daily', 'readonly').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /* ----- Записи как они лежат в базе -----
     Для восстановления с сервера. Пишут молча, без _changed: пришедшее
     с сервера отправлять обратно незачем. */
  async rawGet(store, key) {
    return this._req(this._tx(store, 'readonly').get(key));
  }

  async rawAll(store) {
    return (await this._req(this._tx(store, 'readonly').getAll())) || [];
  }

  async rawPut(store, value) {
    return this._req(this._tx(store, 'readwrite').put(value));
  }

  async rawDelete(store, key) {
    return this._req(this._tx(store, 'readwrite').delete(key));
  }

  // Стереть историю на этом телефоне: на нём вошёл другой человек
  async rawClear(store) {
    return this._req(this._tx(store, 'readwrite').clear());
  }

  _req(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

/* Постоянный ключ записи. randomUUID есть не во всех браузерах (старые
   Safari), а getRandomValues — во всех, где вообще есть IndexedDB. */
function newUid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const db = new Database();
