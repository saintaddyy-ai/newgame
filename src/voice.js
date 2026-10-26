// Озвучка реплик. Файлы генерирует scripts/voice.mjs в public/voice/<id>.mp3,
// а manifest.json перечисляет, какие реплики уже озвучены. Нет файла — реплика идёт молча.
import { audioCtx, loadBuffer, playBuffer } from './audio.js';

// FNV-1a по UTF-16 — одинаково считается и в браузере, и в Node (scripts/voice.mjs)
export function lineId(speaker, text) {
  let h = 0x811c9dc5;
  const s = `${speaker}|${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let available = new Set();
let current = null;
let token = 0;
export const voiceSettings = { enabled: true, volume: 1.4 };

export async function loadVoiceManifest() {
  try {
    const r = await fetch('./voice/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const m = await r.json();
    available = new Set(m.ids || []);
  } catch (e) {}
}

export async function playVoice(speaker, text) {
  stopVoice();
  if (!voiceSettings.enabled || !audioCtx()) return;
  const id = lineId(speaker, text);
  if (!available.has(id)) return;
  const my = ++token;
  const buf = await loadBuffer(`./voice/${id}.mp3`);
  // Пока грузилось, игрок мог перелистнуть дальше
  if (!buf || my !== token) return;
  current = playBuffer(buf, { volume: voiceSettings.volume });
}

export function stopVoice() {
  token++;
  current?.stop(0.08);
  current = null;
}
