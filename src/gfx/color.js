// Цвета: перевод форматов и «рампы» — 5 тонов одного цвета для объёма.
// Тени уходят в холодный фиолетовый, блики — в тёплый жёлтый (как в ручном пиксель-арте).

export function hex(c) {
  if (typeof c === 'number') return c;
  const s = c.replace('#', '');
  return parseInt(s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s, 16);
}

export function rgb(c) {
  const n = hex(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]) {
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function css(c) {
  return '#' + hex(c).toString(16).padStart(6, '0');
}

function rgb2hsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl2rgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// Сдвиг оттенка к цели по кратчайшей дуге
function towards(h, target, amount) {
  let d = target - h;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return h + Math.sign(d) * Math.min(Math.abs(d), amount);
}

// Сдвинуть цвет: dl — светлота (−1..1), к жёлтому (блик) или к фиолетовому (тень)
export function shift(c, dl, { sat = 0 } = {}) {
  const [h, s, l] = rgb2hsl(rgb(c));
  const warm = dl > 0;
  const hue = s < 0.06 ? h : towards(h, warm ? 50 : 255, Math.abs(dl) * (warm ? 50 : 70));
  const nl = Math.max(0, Math.min(1, l + dl));
  const ns = Math.max(0, Math.min(1, s + sat + (warm ? -Math.abs(dl) * 0.1 : Math.abs(dl) * 0.02)));
  // Серым теням добавляем чуть-чуть синевы
  const out = hsl2rgb([s < 0.06 && !warm ? 245 : hue, s < 0.06 ? (warm ? 0.04 : 0.12) * Math.abs(dl) * 3 : ns, nl]);
  return toHex(out);
}

// 5 тонов: [глубокая тень, тень, основа, свет, блик].
// Тени — подмешиванием холодного фиолетового (у кожи — винно-красного), свет — тёплого кремового.
const RAMPS = new Map();
export function ramp(c, kind = '') {
  const key = `${hex(c)}${kind}`;
  if (RAMPS.has(key)) return RAMPS.get(key);
  const base = hex(c);
  const [r, g, b] = rgb(base);
  const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const sh = kind === 'skin' ? [0x4a2038, 0x7a3a4a] : [0x140c24, 0x2a1e3e];
  const out = [
    mix(base, sh[0], kind === 'skin' ? 0.5 : 0.48),
    mix(base, sh[1], kind === 'skin' ? 0.3 : 0.26),
    base,
    mix(base, 0xfff0d0, 0.1 + lum * 0.08),
    mix(base, 0xfffaf0, 0.22 + lum * 0.12),
  ];
  RAMPS.set(key, out);
  return out;
}

export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function darken(c, k) {
  return mix(c, 0x07060d, k);
}

export function lighten(c, k) {
  return mix(c, 0xffffff, k);
}

// Случайные числа по сиду (детерминированно: один и тот же сид — та же картинка)
export function rng(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}
