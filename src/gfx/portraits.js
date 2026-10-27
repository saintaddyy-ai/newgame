// Портреты для окна диалога: тот же человек, что и спрайт, крупно (40×40 арта, на экране ×3).
// Эмоции: neutral, happy, angry, sad, surprised, shout. Рисуются по описанию внешности.
import { Pix } from './pix.js';
import { ramp, hex, mix } from './color.js';
import { normSpec } from './chars.js';

export const PW = 40;
const INK = 0x0b0912;
const L = [-0.5, -0.5, 0.71];

function shade(n) {
  const I = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
  if (I > 0.95) return 4;
  if (I > 0.78) return 3;
  if (I > 0.42) return 2;
  if (I > 0.14) return 1;
  return 0;
}

// Эллипсоид: нормаль в точке
function ell(x, y, cx, cy, rx, ry) {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  const d = nx * nx + ny * ny;
  return d > 1 ? null : [nx, ny, Math.sqrt(1 - d)];
}

class Canvas {
  constructor() {
    this.p = new Pix(PW, PW);
    this.z = new Uint8Array(PW * PW);
  }

  put(x, y, c, z = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= PW || y >= PW) return;
    if (this.z[y * PW + x] > z) return;
    this.z[y * PW + x] = z;
    this.p.set(x, y, c);
  }

  // Залить область освещённой «поверхностью»: mask(x,y) → нормаль или null
  fill(mask, rp, z, { hi = true } = {}) {
    for (let y = 0; y < PW; y++) {
      for (let x = 0; x < PW; x++) {
        const n = mask(x, y);
        if (!n) continue;
        const t = shade(n);
        this.put(x, y, rp[hi ? t : Math.min(3, t)], z);
      }
    }
  }
}

function inPoly(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// ---------- Части лица ----------

const HEAD = { cx: 20, cy: 16, rx: 9.5, ry: 10.5 };
// Челюсть вида 3/4: подбородок смещён вправо (к зрителю-собеседнику)
const JAW = [[10.5, 15], [29, 14], [29.5, 19], [28, 23], [25, 27], [21.5, 28.5], [17.5, 27.5], [13.5, 24], [11, 19]];

function headMask(x, y) {
  const n = ell(x, y, HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry);
  const px = x + 0.5;
  const py = y + 0.5;
  if (inPoly(JAW, px, py)) {
    // Щека и челюсть: нормаль по горизонтали + вниз к подбородку
    const nx = Math.max(-1, Math.min(1, (px - 20.5) / 9));
    const ny = Math.max(-0.2, (py - 20) / 10);
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny * 0.6));
    // Правая сторона лица (к зрителю) — плоскость, освещена спереди
    return px > 22 && py < 25 ? [Math.min(0.4, nx), ny * 0.5, Math.max(nz, 0.8)] : [nx, ny, nz];
  }
  return n;
}

function drawFace(c, sp, emo) {
  const S = ramp(sp.skin, 'skin');
  c.fill(headMask, S, 5);
  // Ухо (слева, на дальней от лица стороне)
  for (const [x, y, t] of [[11, 16, 2], [11, 17, 2], [10, 17, 1], [10, 18, 1], [11, 18, 1], [11, 19, 2], [11, 20, 1], [12, 17, 0], [12, 18, 0]]) c.put(x, y, S[t], 6);
  // Тень под скулой и у переносицы
  for (const [x, y] of [[26, 22], [27, 21], [25, 23], [22, 26], [23, 26], [24, 25]]) c.put(x, y, S[1], 6);
  // Нос: спинка, кончик, ноздря и тень
  for (const [x, y, t] of [[23, 15, 4], [23, 16, 4], [27, 15, 2], [27, 16, 2], [27, 17, 3], [28, 18, 3], [28, 19, 4], [29, 19, 3], [29, 20, 3], [30, 20, 2], [29, 21, 1], [28, 21, 0], [27, 21, 1], [26, 21, 0], [25, 21, 1], [26, 20, 2], [27, 20, 3]]) c.put(x, y, S[t], 7);
  // Скула и щека: светлая плоскость лица и тень у уха
  for (let y = 18; y < 23; y++) for (let x = 14; x < 17; x++) if (c.z[y * PW + x] === 5) c.p.set(x, y, S[x === 14 ? 1 : 2]);
  for (const [x, y] of [[21, 20], [22, 20], [21, 21], [22, 19]]) if (c.z[y * PW + x] === 5) c.p.set(x, y, S[4]);
  const eyeWhite = 0xece8f0;
  const iris = hex(sp.eyeColor || '#3a2a20');
  const lash = mix(S[0], INK, 0.6);
  const surprised = emo === 'surprised' || emo === 'shout';
  const closed = emo === 'happy';
  // Глаза: ближний (крупнее) и дальний у переносицы; зрачки смотрят на собеседника (вправо)
  const irisD = mix(iris, INK, 0.5);
  const pupil = 0x140c14;
  if (closed) {
    for (const [x, y] of [[16, 17], [17, 16], [18, 16], [19, 16], [20, 17], [24, 17], [25, 16], [26, 17]]) c.put(x, y, lash, 9);
  } else {
    const up = surprised ? 1 : 0;
    // Ближний глаз 4×2
    for (let x = 16; x <= 20; x++) c.put(x, 15 - up, lash, 9);
    c.put(15, 16 - up, lash, 9);
    [[16, eyeWhite], [17, eyeWhite], [18, iris], [19, pupil], [20, eyeWhite]].forEach(([x, col]) => c.put(x, 16, col, 9));
    [[16, S[1]], [17, eyeWhite], [18, irisD], [19, iris], [20, S[1]]].forEach(([x, col]) => c.put(x, 17, col, 9));
    if (surprised) [[16, eyeWhite], [17, eyeWhite], [18, iris], [19, iris], [20, eyeWhite]].forEach(([x, col]) => c.put(x, 15, col, 9));
    c.put(18, 16 - up, 0xffffff, 10);
    // Дальний глаз 2×2 у переносицы
    for (let x = 24; x <= 26; x++) c.put(x, 15 - up, lash, 9);
    [[24, eyeWhite], [25, pupil], [26, iris]].forEach(([x, col]) => c.put(x, 16, col, 9));
    [[24, S[1]], [25, irisD], [26, S[1]]].forEach(([x, col]) => c.put(x, 17, col, 9));
    if (surprised) [[24, eyeWhite], [25, iris]].forEach(([x, col]) => c.put(x, 15, col, 9));
    // Нижнее веко
    for (let x = 17; x <= 20; x++) c.put(x, 18, S[2] === S[1] ? S[1] : mix(S[2], S[1], 0.6), 8);
    if (emo === 'sad' || emo === 'angry') {
      for (let x = 16; x <= 20; x++) c.put(x, 16, x < 19 ? lash : c.p.getHex(x, 16), 9);
      c.put(24, 16, lash, 9);
      c.put(25, 16, lash, 9);
    }
  }
  // Брови
  const hr = ramp(sp.hairColor || '#2a1e18');
  const brow = sp.hair === 'bald' || sp.hair === 'buzz' ? mix(S[0], hr[1], 0.5) : hr[1];
  const bY = 14 - (surprised ? 1 : 0);
  const near = [[16, 0], [17, 0], [18, 0], [19, 0], [20, 0]];
  const far = [[24, 0], [25, 0], [26, 0]];
  const tilt = (pts, inner, dir) => pts.map(([x], k) => {
    const t = inner === 'right' ? k / (pts.length - 1) : 1 - k / (pts.length - 1);
    return [x, Math.round(dir * t * 1.5)];
  });
  let nb = near;
  let fb = far;
  if (emo === 'angry' || emo === 'shout') {
    nb = tilt(near, 'right', 1);
    fb = tilt(far, 'left', 1);
  } else if (emo === 'sad') {
    nb = tilt(near, 'right', -1);
    fb = tilt(far, 'left', -1);
  }
  nb.forEach(([x, dy]) => c.put(x, bY + dy, brow, 9));
  fb.forEach(([x, dy]) => c.put(x, bY + dy, brow, 9));
  c.put(16, bY + 1 + (nb[0][1] || 0), mix(brow, S[2], 0.5), 9);
  // Рот
  const lip = sp.lipstick ? hex(sp.lipstick) : mix(S[1], 0x8a2a3a, 0.35);
  const dark = 0x3a0a18;
  const my = 24;
  if (emo === 'shout') {
    for (let x = 21; x <= 25; x++) for (let y = my - 1; y <= my + 2; y++) c.put(x, y, dark, 9);
    for (let x = 21; x <= 25; x++) c.put(x, my - 1, 0xe8e0e0, 9);
    c.put(22, my + 2, 0xa03a4a, 9);
    c.put(23, my + 2, 0xa03a4a, 9);
  } else if (emo === 'surprised') {
    c.put(23, my, dark, 9);
    c.put(24, my, dark, 9);
    c.put(23, my + 1, dark, 9);
    c.put(24, my + 1, dark, 9);
    c.put(22, my, lip, 9);
    c.put(25, my + 1, lip, 9);
  } else if (emo === 'happy') {
    c.put(20, my - 1, lip, 9);
    for (let x = 21; x <= 25; x++) c.put(x, my, dark, 9);
    for (let x = 22; x <= 24; x++) c.put(x, my, 0xece8e8, 9);
    c.put(26, my - 1, lip, 9);
    for (let x = 22; x <= 24; x++) c.put(x, my + 1, lip, 9);
    // Румянец
    c.put(18, 21, mix(S[2], 0xd85a6a, 0.35), 8);
    c.put(19, 21, mix(S[2], 0xd85a6a, 0.35), 8);
  } else if (emo === 'sad' || emo === 'angry') {
    c.put(21, my + 1, lip, 9);
    for (let x = 22; x <= 24; x++) c.put(x, my, lip, 9);
    c.put(25, my + 1, lip, 9);
  } else {
    for (let x = 21; x <= 25; x++) c.put(x, my, x === 21 || x === 25 ? mix(lip, S[1], 0.5) : lip, 9);
    for (let x = 22; x <= 24; x++) c.put(x, my + 1, S[3], 8);
  }
  // Растительность и украшения
  if (sp.mustache) for (let x = 21; x <= 26; x++) c.put(x, my - 1, hr[x % 2 ? 1 : 2], 9);
  if (sp.beard) {
    for (let y = 20; y < 30; y++) for (let x = 12; x < 30; x++) {
      if (!inPoly(JAW, x + 0.5, y + 0.5)) continue;
      if (y < 22 && x > 14 && x < 26) continue;
      if (y >= my - 1 && y <= my + 1 && x >= 21 && x <= 25) continue;
      c.put(x, y, hr[(x + y) % 3 === 0 ? 1 : 2], 9);
    }
    for (let x = 21; x <= 25; x++) c.put(x, my, lip, 10);
  }
  if (sp.stubble) for (let y = 22; y < 28; y++) for (let x = 14; x < 28; x++) if ((x * 3 + y * 5) % 4 === 0 && inPoly(JAW, x + 0.5, y + 0.5)) c.put(x, y, mix(S[1], hr[1], 0.4), 7);
  if (sp.piercing) c.put(29, 20, 0xe8e8f0, 10);
  if (sp.earring) c.put(11, 21, 0xffd166, 10);
}

function drawGlasses(c, sp) {
  const g = sp.glasses;
  if (!g) return;
  const frame = g === 'aviator' ? 0xc8c8d0 : g === 'pink' ? 0xff7ab8 : 0x1a1a22;
  const lens = g === 'pink' ? 0xff9ad0 : g === 'aviator' ? 0x4a5a50 : g === 'dark' ? 0x14141c : null;
  const lensAt = (x0, w, h) => {
    for (let y = 15; y < 15 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = y === 15 || y === 14 + h || x === x0 || x === x0 + w - 1;
      if (edge) c.put(x, y, frame, 11);
      else if (lens != null) c.put(x, y, (x + y) % 5 === 0 ? mix(lens, 0xffffff, 0.5) : lens, 11);
    }
  };
  lensAt(15, 7, g === 'aviator' ? 5 : 4);
  lensAt(23, 4, g === 'aviator' ? 5 : 4);
  c.put(22, 16, frame, 11);
  for (let x = 11; x < 15; x++) c.put(x, 16, frame, 11);
}

// ---------- Причёски ----------
// Маска волос: функция (x, y) → true. back — часть за головой (рисуется под ней)

const R = (x, y, cx, cy, rx, ry) => {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
};
const cap = (x, y, top = 15) => R(x, y, 19.5, 15, 10.6, 11.3) && (y < top || x < 13.5);

const HAIRS = {
  short: { front: (x, y) => cap(x, y, 12) || (y < 14 && x < 25 && R(x, y, 19.5, 15, 10.6, 11.3)) },
  buzz: { front: (x, y) => R(x, y, 19.5, 15, 10.2, 10.8) && (y < 10 || (x < 13 && y < 17)), stubbly: true },
  undercut: { front: (x, y) => (R(x, y, 20, 13, 11, 9) && y < 11) || (y < 13 && x > 15 && x < 28 && R(x, y, 20, 12, 11, 8)) },
  bleach: { front: (x, y) => (R(x, y, 20, 13, 11, 9) && y < 11) || (y < 13 && x > 15 && x < 28 && R(x, y, 20, 12, 11, 8)) },
  fringe: { front: (x, y) => cap(x, y, 11) || (y < 15 && x > 16 && x < 28 && R(x, y, 21, 9, 9, 7)) },
  swept: { front: (x, y) => cap(x, y, 11) || (y < 13 && x > 14 && R(x, y, 23, 8, 10, 6)) },
  curly: { front: (x, y) => R(x, y, 19.5, 13, 12, 10.5) && (y < 11 || x < 13), lumpy: true },
  curlsEyes: { front: (x, y) => (R(x, y, 19.5, 13, 12.5, 11) && (y < 13 || x < 14)) || (y < 17 && y >= 12 && x > 14 && x < 29 && (x + y * 3) % 5 !== 0 && R(x, y, 21, 12, 9, 5.5)), lumpy: true },
  shaggy: { front: (x, y) => (R(x, y, 19.5, 13.5, 12, 11) && (y < 12 || x < 14)) || (y < 15 && x > 15 && x < 27 && (x % 3 !== 0 || y < 13)), back: (x, y) => R(x, y, 17, 22, 9, 8) && x < 18 },
  long: { front: (x, y) => cap(x, y, 12) || (y < 14 && x > 18 && x < 28 && R(x, y, 21, 10, 8, 5)), back: (x, y) => (x > 7 && x < 21 && y > 8 && y < 39) || R(x, y, 19.5, 15, 11, 12) },
  bob: { front: (x, y) => cap(x, y, 13) || (y < 15 && x > 16 && x < 29 && R(x, y, 22, 11, 8, 5)), back: (x, y) => (x > 8 && x < 21 && y > 8 && y < 29) || R(x, y, 19.5, 15, 11, 12) },
  bun: { front: (x, y) => cap(x, y, 11) || R(x, y, 13, 4, 4.5, 4) },
  ponytail: { front: (x, y) => cap(x, y, 11), back: (x, y) => (x > 5 && x < 11 && y > 10 && y < 32) || R(x, y, 9, 11, 3, 3) },
  mohawk: { front: (x, y) => x > 16 && x < 23 && y > 1 && y < 10 && R(x, y, 19.5, 9, 4, 9), side: true },
  dreads: { front: (x, y) => cap(x, y, 11), back: (x, y) => (x > 6 && x < 22 && y > 8 && y < 36 && (x % 3 !== 2)) || R(x, y, 19.5, 15, 11, 12), locks: true },
  bald: { front: () => false },
};

function drawHair(c, sp, layer) {
  const hr = ramp(sp.hairColor || '#2a1e18');
  if (sp.hood && layer === 'front') return drawHood(c, sp, 'front');
  if (sp.hood && layer === 'back') return drawHood(c, sp, 'back');
  if (sp.hair === 'scarf') return layer === 'front' && drawScarf(c, sp);
  const h = HAIRS[sp.hair] || HAIRS.short;
  const m = layer === 'back' ? h.back : h.front;
  if (!m) return;
  for (let y = 0; y < PW; y++) {
    for (let x = 0; x < PW; x++) {
      if (!m(x, y)) continue;
      const n = ell(x, y, 19.5, 14, 13, 14) || [0, 0, 0.3];
      let t = shade(n);
      if (layer === 'back') t = Math.max(0, t - 1);
      // Пряди: чередуем тона по диагонали
      if (h.lumpy && (x * 2 + y * 3) % 7 === 0) t = Math.max(0, t - 1);
      else if (!h.lumpy && (x + y * 2) % 9 === 0) t = Math.min(4, t + 1);
      if (h.locks && layer === 'back' && x % 3 === 1) t = Math.max(0, t - 1);
      c.put(x, y, hr[Math.min(4, t)], layer === 'back' ? 2 : 12);
    }
  }
  if (sp.hair === 'bleach') for (let y = 0; y < 13; y++) for (let x = 14; x < 30; x++) if (c.z[y * PW + x] === 12 && (x + y) % 4 !== 0) c.p.set(x, y, mix(hr[3], 0xfff0c0, 0.3));
  if (h.side) for (let y = 8; y < 15; y++) c.put(11, y, mix(ramp(sp.skin, 'skin')[1], hr[1], 0.4), 12);
  if (sp.cap) drawCap(c, sp);
  if (sp.beanie || sp.hair === 'beanie') drawBeanie(c, sp);
  if (sp.hair === 'cap') drawCap(c, sp);
}

function drawHood(c, sp, layer) {
  const cr = ramp(sp.topColor);
  if (layer === 'back') {
    // Капюшон вокруг головы — объёмный, с тёмным нутром
    for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
      if (!R(x, y, 19, 15, 13.5, 15.5)) continue;
      const n = ell(x, y, 19, 15, 13.5, 15.5);
      c.put(x, y, cr[Math.max(0, shade(n) - (x > 24 && y > 8 ? 2 : 0))], 2);
    }
    return;
  }
  // Край капюшона над лбом и по бокам; внутри — тень на лице
  const S = ramp(sp.skin, 'skin');
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    const outer = R(x, y, 19, 15, 13.5, 15.5);
    const inner = R(x, y, 21.5, 18, 9.5, 11);
    if (outer && !inner && (y < 26 || x < 15)) {
      const n = ell(x, y, 19, 15, 13.5, 15.5) || [0, 0, 1];
      c.put(x, y, cr[shade(n)], 12);
    } else if (inner && y < 14 && c.z[y * PW + x] === 5) c.p.set(x, y, S[1]);
  }
  // Чёлка из-под капюшона
  const hr = ramp(sp.hairColor);
  for (const [x, y] of [[17, 10], [18, 10], [19, 10], [20, 10], [18, 11], [19, 11], [21, 10], [22, 10], [20, 11]]) c.put(x, y, hr[(x + y) % 2 ? 2 : 1], 12);
}

function drawScarf(c, sp) {
  const cr = ramp(sp.capColor);
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    const outer = R(x, y, 19.5, 15, 12, 13.5);
    const inner = R(x, y, 21, 19, 9, 10.5);
    if (outer && !(inner && y > 11)) {
      const n = ell(x, y, 19.5, 15, 12, 13.5) || [0, 0, 1];
      c.put(x, y, cr[shade(n)], 12);
    }
  }
  // Узел под подбородком
  for (const [x, y] of [[20, 29], [21, 29], [22, 30], [21, 30], [20, 31]]) c.put(x, y, cr[1], 13);
}

function drawCap(c, sp) {
  const cr = ramp(sp.capColor);
  for (let y = 2; y < 12; y++) for (let x = 8; x < 32; x++) {
    if (R(x, y, 19.5, 11, 11, 9) && y < 11) {
      const n = ell(x, y, 19.5, 11, 11, 9) || [0, 0, 1];
      c.put(x, y, cr[shade(n)], 13);
    }
  }
  // Козырёк вправо
  for (let x = 22; x < 35; x++) {
    c.put(x, 11, cr[x > 31 ? 1 : 2], 13);
    c.put(x, 12, cr[0], 13);
  }
}

function drawBeanie(c, sp) {
  const cr = ramp(sp.capColor);
  for (let y = 0; y < 14; y++) for (let x = 7; x < 33; x++) {
    if (!R(x, y, 19.5, 12, 11.5, 11) || y > 12) continue;
    const n = ell(x, y, 19.5, 12, 11.5, 11) || [0, 0, 1];
    c.put(x, y, cr[Math.max(0, shade(n) - (y > 9 ? 1 : 0) - ((x % 2) && y < 10 ? 1 : 0))], 13);
  }
}

// ---------- Плечи и одежда ----------

function drawBust(c, sp) {
  const tr = ramp(sp.topColor);
  const S = ramp(sp.skin, 'skin');
  // Шея
  for (let y = 25; y < 34; y++) for (let x = 16; x < 25; x++) {
    if (x < 16 + (y - 25) * 0.1 || x > 24) continue;
    c.put(x, y, S[y < 29 ? 1 : x < 19 ? 2 : 1], 3);
  }
  // Плечи (вид 3/4: ближнее плечо слева ниже и шире)
  const pts = [[0, 40], [1, 35], [5, 32], [13, 30.5], [17, 31], [24, 31], [29, 31.5], [35, 33.5], [39, 37], [40, 40]];
  for (let y = 28; y < PW; y++) for (let x = 0; x < PW; x++) {
    if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
    const nx = (x - 19) / 22;
    const ny = -0.4 + (y - 30) / 30;
    const n = [nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))];
    c.put(x, y, tr[shade(n)], 4);
  }
  const g = sp.garment;
  if (g === 'tee' || g === 'dress' || g === 'tank') {
    // Вырез
    for (let y = 31; y < 35; y++) for (let x = 18 + (y - 31); x < 25 - (y - 31) * 0.5; x++) c.put(x, y, S[y < 33 ? 1 : 2], 5);
  } else if (g === 'hoodie') {
    // Капюшон лежит на плечах, шнурки
    if (!sp.hood) for (let x = 6; x < 17; x++) c.put(x, 30 + Math.round(Math.abs(x - 11) * 0.3), tr[1], 5);
    const dc = mix(sp.strings ? hex(sp.strings) : tr[4], tr[2], 0.3);
    for (let y = 33; y < 39; y++) {
      c.put(20, y, dc, 6);
      c.put(24, y + 1, dc, 6);
    }
    for (let x = 17; x < 27; x++) c.put(x, 32, tr[0], 5);
  } else if (['jacket', 'leather', 'leopard', 'cardigan', 'tracksuit', 'coat'].includes(g)) {
    const inner = ramp(sp.accent);
    for (let y = 31; y < PW; y++) for (let x = 18; x < 25; x++) {
      const w = (y - 31) * 0.25;
      if (x > 21 - w && x < 23 + w) c.put(x, y, inner[2], 5);
    }
    // Лацканы
    for (let y = 31; y < PW; y++) {
      c.put(Math.round(20 - (y - 31) * 0.2), y, tr[3], 6);
      c.put(Math.round(24 + (y - 31) * 0.3), y, tr[1], 6);
    }
    if (g === 'leopard') for (let y = 31; y < PW; y++) for (let x = 0; x < PW; x++) if (c.z[y * PW + x] === 4 && (x * 7 + y * 13) % 9 === 0) c.p.set(x, y, 0x3a2a1a);
    if (g === 'leather') for (let y = 33; y < 39; y++) c.put(8 + (y - 33), y, tr[4], 6);
    if (g === 'tracksuit') for (let y = 31; y < PW; y++) c.put(4 + Math.round((y - 31) * 0.2), y, 0xe8e8e8, 6);
  } else if (g === 'vest') {
    const sl = ramp(sp.sleeveColor || '#4a4a52');
    for (let y = 32; y < PW; y++) for (let x = 19; x < 24; x++) c.put(x, y, sl[2], 5);
    for (let x = 0; x < PW; x++) if (c.z[37 * PW + x] === 4) c.p.set(x, 37, 0xe8e8f0);
  } else if (g === 'overalls') {
    const sl = ramp(sp.sleeveColor || '#9a9aa2');
    for (let y = 30; y < PW; y++) for (let x = 0; x < PW; x++) if (c.z[y * PW + x] === 4 && (x < 9 || x > 30)) c.p.set(x, y, sl[x < 9 ? 2 : 1]);
    for (let y = 31; y < PW; y++) {
      c.put(10, y, tr[3], 6);
      c.put(28, y, tr[1], 6);
    }
  } else if (g === 'sweater') {
    for (let x = 14; x < 27; x++) c.put(x, 31, tr[3], 5);
    if (sp.print) for (let y = 35; y < 39; y++) for (let x = 17; x < 25; x++) if ((x + y) % 3) c.put(x, y, hex(sp.print), 6);
  } else if (g === 'shirt') {
    for (let y = 31; y < PW; y++) c.put(22, y, tr[1], 6);
    for (const [x, y] of [[19, 31], [20, 32], [25, 31], [24, 32]]) c.put(x, y, tr[4], 6);
  }
  if (sp.apron) {
    const ar = ramp(sp.apron);
    for (let y = 33; y < PW; y++) for (let x = 13; x < 29; x++) c.put(x, y, ar[x < 16 ? 3 : x > 25 ? 1 : 2], 6);
    for (let y = 30; y < 34; y++) {
      c.put(14 + (y - 30), y, ar[2], 6);
      c.put(27 - (y - 30) * 0.5, y, ar[1], 6);
    }
  }
  if (sp.stripe && g !== 'sweater') for (let y = 32; y < PW; y++) c.put(10, y, hex(sp.accent), 6);
  if (sp.chain) {
    const cc = hex(sp.chain === true ? '#d8d8e0' : sp.chain);
    for (let x = 16; x <= 26; x++) {
      const y = 31 + Math.round(Math.sin(((x - 16) / 10) * Math.PI) * 4);
      c.put(x, y, x % 2 ? mix(cc, 0xffffff, 0.5) : cc, 7);
    }
  }
  if (sp.headphones) {
    const hp = ramp(0x2a2a30);
    for (let x = 12; x <= 28; x++) c.put(x, 29 + Math.round(Math.abs(x - 20) * 0.15), hp[2], 7);
    for (let y = 26; y < 32; y++) for (let x = 10; x < 14; x++) c.put(x, y, hp[x === 10 ? 3 : 1], 7);
    for (let y = 26; y < 32; y++) for (let x = 27; x < 31; x++) c.put(x, y, hp[x === 27 ? 2 : 1], 7);
  }
}

// ---------- Сборка ----------

export const EMOTIONS = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'shout'];

export function renderPortrait(rawSpec, emo = 'neutral', bg = 0x2a1b3d) {
  const sp = normSpec(rawSpec);
  const c = new Canvas();
  // Фон: тёмный градиент с цветной подсветкой сзади
  c.p.gradV(0, 0, PW, PW, [mix(bg, 0x07060d, 0.6), mix(bg, 0x07060d, 0.35), bg]);
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    const d = Math.hypot(x - 14, y - 14);
    if (d < 16 && (x + y) % 2 === 0 && d > 11) c.p.set(x, y, mix(bg, 0xffffff, 0.12));
  }
  drawHair(c, sp, 'back');
  drawBust(c, sp);
  drawFace(c, sp, emo);
  drawHair(c, sp, 'front');
  drawGlasses(c, sp);
  // Контур фигуры
  const p = c.p;
  const z = c.z;
  const edge = [];
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    if (z[y * PW + x]) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => {
      const nx = x + ox;
      const ny = y + oy;
      return nx >= 0 && ny >= 0 && nx < PW && ny < PW && z[ny * PW + nx];
    });
    if (nb) edge.push([x, y]);
  }
  edge.forEach(([x, y]) => p.set(x, y, INK));
  // Контровой свет: правый край фигуры светлеет цветом фона
  for (let y = 0; y < PW; y++) for (let x = PW - 1; x > 0; x--) {
    if (z[y * PW + x] && !z[y * PW + x + 1]) {
      if (y > 4 && (y + x) % 2 === 0) p.set(x, y, mix(p.getHex(x, y), mix(bg, 0xffffff, 0.5), 0.35));
      break;
    }
  }
  return p;
}

// Текстура портрета для сцены (создаётся при первом показе)
export function portraitKey(scene, key, spec, emo = 'neutral', bg) {
  const k = `portrait_${key}_${emo}`;
  if (scene.textures.exists(k)) return k;
  renderPortrait(spec, emo, bg).texture(scene, k);
  return k;
}
