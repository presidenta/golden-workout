const DB_NAME = 'GoldenWorkoutDB';
const DB_VERSION = 1;

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
