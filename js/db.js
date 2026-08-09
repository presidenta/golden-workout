const DB_NAME = 'GoldenWorkoutDB';
/* Версия 2 добавила хранилище daily — дневник дня: кардио, глаза, заметка.
   Тренировки лежат отдельно, в workouts, и туда же попадают недоделанные. */
const DB_VERSION = 2;

class Database {
  constructor() {
    this.db = null;
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
        if (!db.objectStoreNames.contains('schedule')) {
          db.createObjectStore('schedule', { keyPath: 'day' });
        }
        if (!db.objectStoreNames.contains('imageCache')) {
          db.createObjectStore('imageCache', { keyPath: 'url' });
        }
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
      req.onsuccess = () => resolve();
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
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteProgram(id) {
    return new Promise((resolve, reject) => {
      const req = this._tx('programs', 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async addWorkout(record) {
    return new Promise((resolve, reject) => {
      const req = this._tx('workouts', 'readwrite').add(record);
      req.onsuccess = () => resolve(req.result);
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
      req.onsuccess = () => resolve(record);
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

  async cacheImage(url, blob) {
    return new Promise((resolve, reject) => {
      const req = this._tx('imageCache', 'readwrite').put({ url, blob, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getCachedImage(url) {
    return new Promise((resolve, reject) => {
      const req = this._tx('imageCache', 'readonly').get(url);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }
}

const db = new Database();
