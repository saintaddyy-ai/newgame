// Время суток для картинки: небо, окна, фонари. Во 2-м эпизоде — по часам мира,
// в прологе и 1-м — по фазе сюжета (или явно из описания локации).
import { state, PHASE_CLOCK } from '../state.js';

let override = null;
export function setTimeOverride(min) {
  override = min;
}

export function worldMinutes(fallback = 'night') {
  if (override != null) return override;
  if (state.episode === 'ep2') return state.time?.min ?? 12 * 60;
  if (state.episode === 'ep1') {
    const clock = PHASE_CLOCK[state.flags.e1];
    if (clock != null) return clock;
  }
  return { night: 23 * 60, dusk: 18 * 60 + 30, day: 13 * 60, morning: 7 * 60 }[fallback] ?? 23 * 60;
}

// Названия: night / dawn / day / dusk / evening
export function phaseOf(min) {
  const t = ((min % 1440) + 1440) % 1440;
  if (t < 5 * 60 || t >= 22 * 60) return 'night';
  if (t < 7 * 60) return 'dawn';
  if (t < 17 * 60) return 'day';
  if (t < 19 * 60 + 30) return 'dusk';
  return 'evening';
}

// Насколько темно: 0 — день, 1 — глубокая ночь
export function darkness(min) {
  const t = ((min % 1440) + 1440) % 1440;
  const k = [[0, 1], [5 * 60, 0.95], [6 * 60 + 30, 0.45], [8 * 60, 0], [17 * 60, 0.05], [19 * 60, 0.5], [20 * 60 + 30, 0.85], [22 * 60, 1], [1440, 1]];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [a, va] = k[i - 1];
      const [b, vb] = k[i];
      return va + ((vb - va) * (t - a)) / (b - a);
    }
  }
  return 1;
}

// Цвета неба сверху вниз (5 точек) по ключевым кадрам суток
const SKY = [
  [0, [0x05040b, 0x0a0818, 0x120d26, 0x1e1535, 0x33203f]],
  [4 * 60 + 30, [0x05040b, 0x0b0a1c, 0x16122e, 0x261a3e, 0x3a2346]],
  [6 * 60, [0x141633, 0x2a2a52, 0x56406a, 0x9a5a72, 0xe0866a]],
  [7 * 60 + 30, [0x3a4a72, 0x5a6a90, 0x8a92b0, 0xb8b0bc, 0xe8c8a8]],
  [10 * 60, [0x55678e, 0x6f80a2, 0x8c9ab6, 0xa9b2c6, 0xc6cad6]],
  [15 * 60, [0x51628a, 0x6b7c9e, 0x8a96b2, 0xaab0c4, 0xcac8d0]],
  [17 * 60 + 30, [0x2e3262, 0x4a3c74, 0x7a4a78, 0xc0606e, 0xf09a6a]],
  [19 * 60, [0x1a1a40, 0x2e2456, 0x58306a, 0x9a4468, 0xd86a5a]],
  [20 * 60 + 30, [0x0c0a1e, 0x16122e, 0x261a42, 0x40224e, 0x6a2e52]],
  [22 * 60, [0x06050d, 0x0b0919, 0x140f28, 0x221838, 0x382242]],
  [1440, [0x05040b, 0x0a0818, 0x120d26, 0x1e1535, 0x33203f]],
];

function lerpC(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  return (Math.round(ar + (((b >> 16) & 255) - ar) * t) << 16) | (Math.round(ag + (((b >> 8) & 255) - ag) * t) << 8) | Math.round(ab + ((b & 255) - ab) * t);
}

export function skyColors(min) {
  const t = ((min % 1440) + 1440) % 1440;
  for (let i = 1; i < SKY.length; i++) {
    if (t <= SKY[i][0]) {
      const [a, ca] = SKY[i - 1];
      const [b, cb] = SKY[i];
      const k = (t - a) / (b - a);
      return ca.map((c, j) => lerpC(c, cb[j], k));
    }
  }
  return SKY[0][1];
}

// Оттенок «окружающего света» для затемнения сцены (ночью синий, на закате тёплый)
export function ambientTint(min) {
  const ph = phaseOf(min);
  return { night: 0x0a0a26, dawn: 0x2a2048, day: 0x000000, dusk: 0x3a1a3a, evening: 0x140f30 }[ph];
}
