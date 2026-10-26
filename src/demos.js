import { BEAT, audioCtx, loadBuffer, decodeBlob, playBuffer } from './audio.js';

// Демки на компе Дэна. Хранятся в браузере игрока (IndexedDB), поэтому переживают перезапуск игры.
// Если хранилище недоступно (приватный режим и т. п.), держим их в памяти до закрытия вкладки.

const DB = 'platina';
const STORE = 'demos';
const memory = [];

function open() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

// demo: { title, theme, lines, voice: Blob|null, voiceAt: сек в бите, где начался голос, beatFrom, length, score }
export async function saveDemo(demo) {
  const rec = { ...demo, id: `demo_${Date.now()}`, createdAt: Date.now() };
  try {
    const db = await open();
    await tx(db, 'readwrite', (s) => s.put(rec));
  } catch (e) {
    memory.push(rec);
  }
  return rec;
}

export async function listDemos() {
  let list = [];
  try {
    const db = await open();
    list = await tx(db, 'readonly', (s) => s.getAll());
  } catch (e) {}
  return [...(list || []), ...memory].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDemo(id) {
  const i = memory.findIndex((d) => d.id === id);
  if (i >= 0) memory.splice(i, 1);
  try {
    const db = await open();
    await tx(db, 'readwrite', (s) => s.delete(id));
  } catch (e) {}
}

// ---------- Таймлайн караоке и воспроизведение ----------

export const BARS_PER_LINE = 2;
const COUNT_IN = 2;

// Две «прохода» по трём строчкам: 6 строк по 2 такта, перед ними — отсчёт
export function karaokeTimeline(lines) {
  const bar = BEAT.bar;
  const seq = [...lines, ...lines];
  const items = seq.map((l, i) => ({
    text: l.text,
    tag: l.tag,
    start: (COUNT_IN + i * BARS_PER_LINE) * bar,
    end: (COUNT_IN + (i + 1) * BARS_PER_LINE) * bar,
  }));
  return {
    beatFrom: BEAT.drop - COUNT_IN * bar,
    countIn: COUNT_IN * bar,
    items,
    length: items[items.length - 1].end + bar,
  };
}

// Проигрывает демку: бит + записанный голос. Возвращает { stop, startAt, length } или null.
export async function playDemo(demo) {
  const beat = await loadBuffer(BEAT.url);
  if (!beat) return null;
  // Сначала декодируем голос, потом считаем время старта — иначе голос отстанет
  let vbuf = null;
  if (demo.voice) {
    try {
      vbuf = await decodeBlob(demo.voice);
    } catch (e) {}
  }
  const ctx = audioCtx();
  const t0 = ctx.currentTime + 0.15;
  const handles = [playBuffer(beat, { offset: demo.beatFrom, when: t0, volume: 0.75 })];
  if (vbuf) {
    const at = demo.voiceAt || 0;
    // Голос громче бита, как на нормальном сведении
    handles.push(playBuffer(vbuf, { when: t0 + Math.max(0, at), offset: Math.max(0, -at), volume: 1.6 }));
  }
  // Плавно гасим в конце демки
  handles[0].gain.gain.setTargetAtTime(0, t0 + demo.length - 0.6, 0.2);
  const stopAll = () => handles.forEach((h) => h.stop(0.2));
  const timer = setTimeout(stopAll, (demo.length + 0.4) * 1000);
  return {
    startAt: t0,
    length: demo.length,
    stop() {
      clearTimeout(timer);
      stopAll();
    },
  };
}
