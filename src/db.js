// Хранилище в браузере игрока (IndexedDB): демки, фото с камеры телефона, записи диктофона.
// Если хранилище недоступно (приватный режим и т. п.), держим всё в памяти до закрытия вкладки.

const DB = 'platina';
const STORES = ['demos', 'photos', 'memos'];
const memory = Object.fromEntries(STORES.map((s) => [s, []]));
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function dbPut(store, rec) {
  try {
    const db = await open();
    await tx(db, store, 'readwrite', (s) => s.put(rec));
  } catch (e) {
    memory[store] = memory[store].filter((r) => r.id !== rec.id);
    memory[store].push(rec);
  }
  return rec;
}

export async function dbAll(store) {
  let list = [];
  try {
    const db = await open();
    list = await tx(db, store, 'readonly', (s) => s.getAll());
  } catch (e) {}
  return [...(list || []), ...memory[store]].sort((a, b) => b.createdAt - a.createdAt);
}

export async function dbDelete(store, id) {
  memory[store] = memory[store].filter((r) => r.id !== id);
  try {
    const db = await open();
    await tx(db, store, 'readwrite', (s) => s.delete(id));
  } catch (e) {}
}
