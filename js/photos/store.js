/* ФОТОГРАФИИ НА ТЕЛЕФОНЕ — своя база GoldenFitPhotos.

   Не база тренировок: снимки весят мегабайты, и в общей базе каждое чтение истории таскало бы их
   за собой. Отдельная база ещё и не требует поднимать версию базы тренировок.

   Запись фото: { id, role: 'avatar' | 'goal', full: Blob, thumb: Blob, width, height, addedAt,
                  synced — уже на сервере, removed — убрано здесь, ждёт удаления на сервере }.
   meta: owner — чей аккаунт хозяин этих фото (см. sync.js). */

const GP_LIMIT_GOALS = 12;          // столько же держит сервер (server/src/sport/photos.js)

const gpStore = {
  db: null,

  open() {
    if (this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('GoldenFitPhotos', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('photos', { keyPath: 'id' });
        req.result.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  },

  _run(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const req = fn(this.db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  get(id) { return this._run('photos', 'readonly', s => s.get(id)); },
  all() { return this._run('photos', 'readonly', s => s.getAll()); },
  put(photo) { return this._run('photos', 'readwrite', s => s.put(photo)); },
  del(id) { return this._run('photos', 'readwrite', s => s.delete(id)); },
  clear() { return this._run('photos', 'readwrite', s => s.clear()); },

  async getMeta(key) { const row = await this._run('meta', 'readonly', s => s.get(key)); return row ? row.value : undefined; },
  setMeta(key, value) { return this._run('meta', 'readwrite', s => s.put({ key, value })); }
};

/* ПОДГОТОВКА СНИМКА. Фото открывается целиком, без обрезки: сохраняем весь кадр в качестве для
   экрана телефона. Снимок с камеры весит мегабайты, а перед сервером стоит nginx с пределом 1 МБ на
   запрос (настройка хоста, вне репозитория; проверено 04.11: 0,9 МБ проходит, 1,1 МБ — 413). Поэтому
   идём по ступеням от лучшей и берём первую, что влезает: обычный снимок остаётся на верхних.
   Перекодирование заодно снимает метаданные камеры — место съёмки на сервер не уходит.
   Рядом — уменьшенная копия до 480 пикселей для кружка и плиток. */
const GP_MAX_BYTES = 1000000;
const GP_STEPS = [[2560, 0.92], [2560, 0.85], [2048, 0.85], [2048, 0.75], [1600, 0.8], [1280, 0.75]];
const GP_THUMB_SIDE = 480;

async function gpDecode(blob) {
  // createImageBitmap поворачивает снимок по метке камеры; старым браузерам — через <img>
  if (window.createImageBitmap) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) { /* ниже */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not_an_image')); };
    img.src = url;
  });
}

function gpEncode(image, side, quality) {
  const w0 = image.width, h0 = image.height;
  const k = Math.min(1, side / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob(
    b => (b ? resolve({ blob: b, width: w, height: h }) : reject(new Error('encode_failed'))), 'image/jpeg', quality));
}

async function gpPrepare(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('not_an_image');
  const image = await gpDecode(file);
  let full = null;
  for (const [side, quality] of GP_STEPS) {
    full = await gpEncode(image, side, quality);
    if (full.blob.size <= GP_MAX_BYTES) break;
  }
  if (full.blob.size > GP_MAX_BYTES) throw new Error('too_big');
  const thumb = await gpEncode(image, GP_THUMB_SIDE, 0.85);
  if (image.close) image.close();
  return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
}

// Уменьшенная копия для пришедшего с сервера снимка
async function gpThumbOf(blob) {
  const image = await gpDecode(blob);
  const thumb = await gpEncode(image, GP_THUMB_SIDE, 0.85);
  if (image.close) image.close();
  return thumb.blob;
}
