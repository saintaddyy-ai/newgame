import { BEAT, audioCtx, loadBuffer, decodeBlob, playBuffer } from './audio.js';
import { dbPut, dbAll, dbDelete } from './db.js';

// Демки на компе Дэна. Хранятся в браузере игрока, поэтому переживают перезапуск игры.

// demo: { title, theme, lines, voice: Blob|null, voiceAt: сек в бите, где начался голос, beatFrom, length, score }
export async function saveDemo(demo) {
  return dbPut('demos', { ...demo, id: `demo_${Date.now()}`, createdAt: Date.now() });
}

export async function listDemos() {
  return dbAll('demos');
}

export async function deleteDemo(id) {
  return dbDelete('demos', id);
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
