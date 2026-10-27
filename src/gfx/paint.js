// Библиотека пиксельных объектов для фонов. Всё в пикселях арта (×2 на экране), 1 м = M px.
// Объекты рисуются «дневными» цветами; ночь, свет фонарей и светящиеся окна добавляет world.js.
import { M, GROUND } from './pix.js';
import { ramp, mix, rng } from './color.js';
import { drawText, textWidth } from './font.js';

export const m = (v) => Math.round(v * M);
export const WALL = GROUND - 7; // низ задней стены в помещениях: перед ней полоска пола
export const INK = 0x0b0912;
export { GROUND };

// ---------- Базовые формы ----------

// Прямоугольник с объёмом: светлый верх и левый край, тёмные правый и низ, контур
export function block(p, x, y, w, h, c, { outline = true, top = 0, edge = true } = {}) {
  const r = ramp(c);
  x = Math.round(x);
  y = Math.round(y);
  p.rect(x, y, w, h, r[2]);
  if (edge) {
    p.rect(x, y, w, 1, r[3]);
    p.rect(x, y, 1, h, r[3]);
    p.rect(x + w - 1, y, 1, h, r[1]);
    p.rect(x, y + h - 1, w, 1, r[1]);
  }
  // Видимая верхняя грань (предмет ниже глаз)
  if (top > 0) {
    p.rect(x + 1, y - top, w - 1, top, r[3]);
    p.rect(x + 1, y - top, w - 1, 1, r[4]);
  }
  if (outline) {
    p.rect(x - 1, y - top - 1, w + 2, 1, INK);
    p.rect(x - 1, y + h, w + 2, 1, INK);
    p.rect(x - 1, y - top, 1, h + top, INK);
    p.rect(x + w, y - top, 1, h + top, INK);
  }
  return r;
}

// Тень на полу/земле под предметом
export function floorShadow(p, x, y, w, k = 0.35) {
  p.tint(x, y, w, 2, 0x07060d, k);
  p.tint(x + 2, y + 2, w - 4, 1, 0x07060d, k * 0.5);
}

export function grime(p, x, y, w, h, c, density, r) {
  for (let i = 0; i < w * density; i++) {
    const gx = x + Math.floor(r() * w);
    const len = Math.floor(r() * h * 0.6) + 2;
    const gy = y + Math.floor(r() * (h - len));
    for (let k = 0; k < len; k++) if (r() > 0.25) p.tint(gx, gy + k, 1, 1, c, 0.12 + r() * 0.12);
  }
}

// Пятна и потёки снизу стен
export function dirtBottom(p, x, y, w, h, c = 0x2a2018, r = rng(1)) {
  p.dither(x, y, w, h, c, (xx, yy) => ((yy - y) / h) * 0.55 + r() * 0.08);
}

// ---------- Улица ----------

export function asphalt(p, x, y, w, h, { c = 0x3a3a44, r = rng(3), wet = false } = {}) {
  const rp = ramp(c);
  p.rect(x, y, w, h, rp[2]);
  p.speckle(x, y, w, h, [rp[1], rp[3], rp[1]], 0.08, r);
  // Трещины и заплатки
  for (let i = 0; i < w / 60; i++) {
    let cx = x + r() * w;
    let cy = y + r() * h;
    for (let k = 0; k < 6 + r() * 10; k++) {
      p.set(cx, cy, rp[0]);
      cx += r() < 0.5 ? 1 : 0;
      cy += r() < 0.3 ? 1 : r() < 0.15 ? -1 : 0;
    }
  }
  for (let i = 0; i < w / 160; i++) {
    const px = x + r() * w;
    const pw = 14 + r() * 30;
    p.rect(px, y + r() * (h - 4), pw, 3 + r() * 3, mix(rp[2], 0x101018, 0.18));
  }
  if (wet) p.dither(x, y, w, h, rp[1], 0.25);
}

export function sidewalk(p, x, y, w, h, { c = 0x6a6672, r = rng(4) } = {}) {
  const rp = ramp(c);
  p.rect(x, y, w, h, rp[2]);
  for (let xx = x; xx < x + w; xx += m(1)) p.vline(xx, y, h, rp[1]);
  p.hline(x, y, w, rp[3]);
  p.speckle(x, y, w, h, [rp[1], rp[3]], 0.05, r);
}

// Бордюр: камень с тенью
export function curb(p, x, y, w, c = 0x8a8690) {
  const rp = ramp(c);
  p.rect(x, y, w, 2, rp[3]);
  p.rect(x, y + 2, w, 2, rp[1]);
  for (let xx = x; xx < x + w; xx += 22) p.vline(xx, y, 4, rp[0]);
}

// Лужа: отражает то, что над ней (вызывать после того, как фон нарисован)
export function puddle(p, cx, y, w, h = 4) {
  const x0 = Math.round(cx - w / 2);
  p.reflect(x0, y, w, h, { dark: 0.35, tint: 0x1a2440, wave: 1 });
  // Маска эллипса: края лужи — асфальт остаётся
  for (let yy = 0; yy < h; yy++) {
    const half = (w / 2) * Math.sqrt(1 - ((yy + 0.5) / h) ** 2);
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    for (let xx = x0; xx < a; xx++) p.tint(xx, y + yy, 1, 1, 0x3a3a44, 1);
    for (let xx = b; xx < x0 + w; xx++) p.tint(xx, y + yy, 1, 1, 0x3a3a44, 1);
  }
  p.hline(cx - w / 2 + 2, y, w - 4, 0x5a6a8a);
}

export function manhole(p, cx, y) {
  p.ellipse(cx, y, 9, 2, 0x26262e);
  p.hline(cx - 6, y, 12, 0x3a3a44);
  p.set(cx - 3, y - 1, 0x4a4a55);
  p.set(cx + 3, y + 1, 0x4a4a55);
}

// Фонарный столб: h — высота в метрах; возвращает точку лампы
export function lampPost(p, x, base, h = 5.5, { style = 'yard', c = 0x2a2a34 } = {}) {
  const top = base - m(h);
  const rp = ramp(c);
  p.rect(x - 1, top, 3, base - top, rp[2]);
  p.vline(x - 1, top, base - top, rp[3]);
  p.vline(x + 1, top, base - top, rp[1]);
  p.rect(x - 2, base - 6, 5, 6, rp[1]);
  p.rect(x - 2, base - 6, 5, 1, rp[3]);
  if (style === 'yard') {
    // Изогнутая «шея» и плафон
    p.hline(x - 7, top, 9, rp[2]);
    p.hline(x - 7, top - 1, 8, rp[3]);
    p.rect(x - 11, top, 7, 3, rp[1]);
    p.hline(x - 11, top + 3, 7, 0xfff0c8);
    return { x: x - 7.5, y: top + 4 };
  }
  // Городской: двойной кронштейн
  p.hline(x - 10, top + 2, 21, rp[2]);
  p.rect(x - 13, top + 1, 6, 3, rp[1]);
  p.rect(x + 8, top + 1, 6, 3, rp[1]);
  p.hline(x - 13, top + 4, 6, 0xfff0c8);
  p.hline(x + 8, top + 4, 6, 0xfff0c8);
  return { x: x - 10, y: top + 5, x2: x + 11 };
}

// Голое осеннее дерево с остатками листвы
export function tree(p, x, base, h = 6, { r = rng(x), leaves = 0.35, c = 0x3a2a24, leaf = 0xc8782a } = {}) {
  const rp = ramp(c);
  const top = base - m(h);
  const trunkW = 3;
  p.rect(x - 1, base - m(h * 0.45), trunkW, m(h * 0.45), rp[2]);
  p.vline(x - 1, base - m(h * 0.45), m(h * 0.45), rp[3]);
  p.vline(x + 1, base - m(h * 0.45), m(h * 0.45), rp[1]);
  const tips = [];
  const branch = (bx, by, ang, len, depth) => {
    let cx = bx;
    let cy = by;
    for (let i = 0; i < len; i++) {
      cx += Math.sin(ang);
      cy -= Math.cos(ang);
      p.set(cx, cy, depth > 1 ? rp[1] : rp[2]);
      if (depth > 2) p.set(cx + 1, cy, rp[1]);
      if (i > len * 0.4 && r() < 0.18 && depth > 0) branch(cx, cy, ang + (r() - 0.5) * 1.6, len * 0.55, depth - 1);
    }
    tips.push([cx, cy]);
    if (depth > 0) {
      branch(cx, cy, ang - 0.35 - r() * 0.3, len * 0.6, depth - 1);
      branch(cx, cy, ang + 0.35 + r() * 0.3, len * 0.6, depth - 1);
    }
  };
  branch(x, base - m(h * 0.45), (r() - 0.5) * 0.2, m(h * 0.25), 4);
  const lr = ramp(leaf);
  tips.forEach(([tx, ty]) => {
    if (r() > leaves) return;
    for (let i = 0; i < 4; i++) p.set(tx + Math.round((r() - 0.5) * 6), ty + Math.round((r() - 0.5) * 5), lr[1 + Math.floor(r() * 3)]);
  });
  return top;
}

export function bush(p, x, base, w = 30, { c = 0x3a5a3a, r = rng(x) } = {}) {
  const rp = ramp(c);
  for (let i = 0; i < w / 4; i++) {
    const cx = x + r() * w;
    const cy = base - 4 - r() * 10;
    p.ellipse(cx, cy, 4 + r() * 4, 3 + r() * 3, null, (xx, yy, dx, dy) => rp[dy < -0.3 ? 3 : dx > 0.4 ? 1 : 2]);
  }
  p.speckle(x, base - 16, w, 14, rp[0], 0.06, r);
}

// Лавочка (вид сбоку, 2 м)
export function bench(p, x, base, { c = 0x6a4a30 } = {}) {
  const w = m(1.9);
  const legs = 0x2a2a30;
  // Спинка и сиденье — бруски
  for (let i = 0; i < 3; i++) block(p, x, base - m(0.85) + i * 4, w, 2, c, { outline: false });
  block(p, x - 2, base - m(0.45), w + 4, 3, c, { top: 2 });
  for (const lx of [x + 6, x + w - 9]) {
    p.rect(lx, base - m(0.45) + 3, 3, m(0.45) - 3, legs);
    p.rect(lx, base - m(0.95), 2, m(0.5), legs);
  }
  floorShadow(p, x, base, w);
}

// Качели: рама и сиденье на цепях
export function swings(p, x, base, { c = 0xc04040 } = {}) {
  const w = m(2.8);
  const h = m(2.4);
  const rp = ramp(c);
  for (const lx of [x, x + w]) {
    p.line(lx - 8, base, lx, base - h, rp[1]);
    p.line(lx - 7, base, lx + 1, base - h, rp[2]);
    p.line(lx + 8, base, lx, base - h, rp[1]);
    p.line(lx + 9, base, lx + 1, base - h, rp[2]);
  }
  p.rect(x - 2, base - h - 2, w + 5, 3, rp[2]);
  p.hline(x - 2, base - h - 2, w + 5, rp[3]);
  for (const sx of [x + m(0.6), x + m(1.6)]) {
    for (let y = base - h + 1; y < base - m(0.55); y += 2) {
      p.set(sx, y, 0x8a8a9a);
      p.set(sx + m(0.6), y, 0x8a8a9a);
    }
    block(p, sx - 1, base - m(0.55), m(0.6) + 3, 2, 0xd8b040, { outline: true });
  }
}

// Песочница/горка — детская площадка
export function slide(p, x, base, { c = 0x3a8ac8 } = {}) {
  const rp = ramp(c);
  p.line(x, base - m(1.5), x + m(1.8), base - 2, rp[2]);
  p.line(x, base - m(1.5) + 1, x + m(1.8), base - 1, rp[1]);
  p.line(x, base - m(1.5) + 2, x + m(1.8), base, rp[0]);
  for (let y = base - m(1.5); y < base; y += 4) p.hline(x - 8, y, 7, 0x8a8a9a);
  p.vline(x - 8, base - m(1.6), m(1.6), 0x6a6a7a);
  p.vline(x - 1, base - m(1.6), m(1.6), 0x6a6a7a);
}

// Мусорные баки
export function trashBins(p, x, base, n = 2) {
  for (let i = 0; i < n; i++) {
    const bx = x + i * m(1.2);
    block(p, bx, base - m(1.1), m(1.05), m(1.1), [0x3a6a4a, 0x5a5a62, 0x8a4a2a][i % 3], { top: 3 });
    p.hline(bx + 2, base - m(1.1) + 6, m(1.05) - 4, 0x2a2a30);
    p.rect(bx + 3, base - m(1.1) - 6, 6, 3, 0xe8e0d0);
    p.rect(bx + 12, base - m(1.1) - 5, 5, 2, 0x5a6a8a);
  }
}

// Стена из кирпича
export function bricks(p, x, y, w, h, { c = 0x7a3a2a, r = rng(x + y), mortar } = {}) {
  const rp = ramp(c);
  const mo = mortar ?? mix(rp[0], 0x2a2428, 0.3);
  p.rect(x, y, w, h, mo);
  const bw = 8;
  const bh = 3;
  for (let yy = y; yy < y + h; yy += bh + 1) {
    const off = ((yy - y) / (bh + 1)) % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw + 1) {
      const tone = r();
      const col = tone < 0.15 ? rp[1] : tone > 0.85 ? rp[3] : rp[2];
      const x0 = Math.max(x, xx);
      const x1 = Math.min(x + w, xx + bw);
      if (x1 <= x0) continue;
      p.rect(x0, yy, x1 - x0, Math.min(bh, y + h - yy), col);
      p.hline(x0, yy, x1 - x0, mix(col, 0xffffff, 0.06));
    }
  }
}

// Бетонные панели панельки: швы, потёки, разный оттенок плит
export function panels(p, x, y, w, h, { c = 0x8a8478, pw = m(3), ph = m(2.8), r = rng(x * 7 + y), stains = true } = {}) {
  const rp = ramp(c);
  for (let py = y; py < y + h; py += ph) {
    for (let px = x; px < x + w; px += pw) {
      const col = mix(rp[2], r() < 0.5 ? rp[1] : rp[3], r() * 0.35);
      p.rect(px, py, Math.min(pw, x + w - px), Math.min(ph, y + h - py), col);
      p.speckle(px, py, Math.min(pw, x + w - px), Math.min(ph, y + h - py), [rp[1], rp[3]], 0.03, r);
    }
  }
  for (let py = y; py < y + h; py += ph) {
    p.hline(x, py, w, rp[0]);
    p.hline(x, py + 1, w, rp[3]);
  }
  for (let px = x; px < x + w; px += pw) {
    p.vline(px, y, h, rp[0]);
    p.vline(px + 1, y, h, rp[1]);
  }
  if (stains) grime(p, x, y, w, h, 0x2a2a30, 0.25, r);
}

// Окно квартиры. lit — горит ли свет (рисуется в emissive отдельно)
export function flatWindow(p, x, y, w, h, { frame = 0xd8d8dc, r = rng(x + y), sky = [0x8a9ab8, 0xc0c8d8], curtains = true, plant = false } = {}) {
  const fr = ramp(frame);
  p.rect(x - 1, y - 1, w + 2, h + 2, INK);
  p.rect(x, y, w, h, fr[2]);
  // Стекло отражает небо (днём) — потом world.js может перекрыть его светом
  p.gradV(x + 2, y + 2, w - 4, h - 4, sky);
  // Блик
  p.line(x + 3, y + h - 4, x + 7, y + 2, mix(sky[1], 0xffffff, 0.4));
  // Переплёт
  p.vline(x + Math.floor(w / 2), y, h, fr[1]);
  p.hline(x, y + Math.floor(h * 0.35), w, fr[1]);
  // Подоконник снаружи
  p.rect(x - 2, y + h + 1, w + 4, 2, fr[3]);
  p.hline(x - 2, y + h + 3, w + 4, fr[0]);
  if (curtains && r() < 0.6) {
    const cc = [0xc8a070, 0x8a5a7a, 0xd8d0b0, 0x5a7a8a][Math.floor(r() * 4)];
    p.rect(x + 2, y + 2, 3, h - 4, ramp(cc)[1]);
    p.rect(x + w - 5, y + 2, 3, h - 4, ramp(cc)[1]);
  }
  if (plant) {
    p.rect(x + 4, y + h - 5, 4, 3, 0xa05a3a);
    p.ellipse(x + 6, y + h - 7, 3, 2, 0x3a7a4a);
  }
}

// Остеклённый балкон панельки
export function balcony(p, x, y, w, { c = 0xb8b0a0, r = rng(x * 3 + y) } = {}) {
  const h = m(1.1);
  const rp = ramp(c);
  // Плита
  p.rect(x - 2, y + h, w + 4, 3, rp[1]);
  p.hline(x - 2, y + h, w + 4, rp[3]);
  // Ограждение: у кого-то профнастил, у кого-то стёкла
  if (r() < 0.5) {
    const col = [0xb8b0a0, 0x7a8a9a, 0x9a6a5a, 0x6a7a6a][Math.floor(r() * 4)];
    const cr = ramp(col);
    p.rect(x, y, w, h, cr[2]);
    for (let xx = x + 2; xx < x + w; xx += 3) p.vline(xx, y, h, cr[1]);
    p.hline(x, y, w, cr[3]);
  } else {
    p.rect(x, y, w, h, rp[2]);
    p.gradV(x + 2, y + 2, w - 4, h - 6, [0x6a7a98, 0x9aa8c0]);
    for (let xx = x + 2; xx < x + w - 2; xx += m(0.7)) p.vline(xx, y, h - 4, rp[1]);
  }
  p.rect(x - 1, y - 1, w + 2, 1, INK);
  // Бельё / хлам
  if (r() < 0.3) for (let i = 0; i < 4; i++) p.rect(x + 4 + i * 6, y - 6 + (i % 2), 4, 6, [0xe8e8e8, 0xc84a4a, 0x4a6ac8, 0xe8d070][i]);
}

// Подъезд: козырёк, железная дверь (проём — для объекта-двери), домофон, ступени
export function entrance(p, cx, base, { label = 'ПОДЪЕЗД 3' } = {}) {
  const dw = m(1.25);
  const dh = m(2.15);
  const x = Math.round(cx - dw / 2);
  // Ступени
  block(p, x - 10, base - 4, dw + 20, 4, 0x7a7680, { top: 2 });
  block(p, x - 6, base - 8, dw + 12, 4, 0x8a8690, { top: 2 });
  // Проём (дверь — отдельный объект)
  p.rect(x - 3, base - 8 - dh - 3, dw + 6, dh + 3, 0x4a4650);
  p.rect(x, base - 8 - dh, dw, dh, 0x0c0a12);
  // Козырёк
  block(p, x - 16, base - 8 - dh - m(0.55), dw + 32, 5, 0x6a6672, { top: 2 });
  p.rect(x - 14, base - 8 - dh - m(0.55) + 5, 2, m(0.55) - 5, 0x4a4650);
  p.rect(x + dw + 12, base - 8 - dh - m(0.55) + 5, 2, m(0.55) - 5, 0x4a4650);
  // Табличка и домофон
  const lw = textWidth(label) + 6;
  p.rect(cx - Math.ceil(lw / 2), base - 8 - dh - m(0.55) - 9, lw, 7, 0x2a3a6a);
  p.text(label, cx, base - 8 - dh - m(0.55) - 8, 0xe8e8f0, { align: 'center' });
  block(p, x + dw + 4, base - 8 - m(1.45), 5, 9, 0x6a6a7a);
  p.set(x + dw + 6, base - 8 - m(1.45) + 2, 0x3df0ff);
  // Объявления на двери и стене
  p.rect(x + dw + 12, base - 8 - m(1.5), 7, 9, 0xe8e0d0);
  p.rect(x + dw + 13, base - 8 - m(1.5) + 2, 5, 1, 0x6a6a7a);
  p.rect(x + dw + 13, base - 8 - m(1.5) + 4, 4, 1, 0x6a6a7a);
  return { x, y: base - 8 - dh, w: dw, h: dh, lamp: { x: cx, y: base - 8 - dh - m(0.55) + 7 } };
}

// Гаражи: железные ворота с фактурой, ржавчина, номера, замки, крыша с навесом
export function garage(p, x, base, w, { n = 0, c = 0x5a6070, r = rng(x), open = 0, h = 2.6, tags = true } = {}) {
  const top = base - m(h);
  const rp = ramp(c);
  const wall = ramp(0x6a6458);
  // Стена-коробка (кирпич/блок) и крыша с рубероидом
  p.rect(x, top, w, base - top, wall[2]);
  for (let yy = top + 4; yy < base; yy += 5) p.hline(x, yy, w, wall[1]);
  p.speckle(x, top, w, base - top, [wall[1], wall[3]], 0.04, r);
  // Крыша: плита с нависанием, рубероид свисает
  p.rect(x - 3, top - 4, w + 6, 4, 0x3a3a40);
  p.hline(x - 3, top - 4, w + 6, 0x5a5a62);
  for (let xx = x - 3; xx < x + w + 3; xx += 3) if (r() < 0.4) p.vline(xx, top, 1 + Math.floor(r() * 3), 0x2a2a30);
  p.rect(x - 3, top - 1, w + 6, 1, INK);
  // Ворота: две створки с рёбрами
  const gx = x + 4;
  const gw = w - 8;
  const gy = top + 5;
  const gh = base - gy;
  p.rect(gx - 1, gy - 1, gw + 2, gh + 1, INK);
  for (let half = 0; half < 2; half++) {
    const hx = gx + (half ? Math.ceil(gw / 2) : 0);
    const hw = Math.floor(gw / 2);
    p.rect(hx, gy, hw, gh, rp[2]);
    for (let yy = gy + 3; yy < gy + gh; yy += 4) p.hline(hx, yy, hw, rp[1]);
    p.vline(hx, gy, gh, rp[3]);
    p.vline(hx + hw - 1, gy, gh, rp[0]);
    // Ржавчина и потёки
    for (let i = 0; i < hw / 4; i++) {
      const rx = hx + Math.floor(r() * hw);
      const ry = gy + Math.floor(r() * gh * 0.3);
      for (let k = 0; k < 4 + r() * 12; k++) if (r() > 0.3) p.set(rx, ry + k, r() < 0.5 ? 0x8a4a2a : 0x6a3a2a);
    }
    p.dither(hx, gy + gh - 10, hw, 10, 0x5a3a2a, (xx, yy) => (yy - (gy + gh - 10)) / 14);
  }
  // Калитка в левой створке, петли, ручка и навесной замок
  p.rect(gx + 4, gy + 6, Math.floor(gw / 2) - 8, gh - 8, rp[2]);
  p.rect(gx + 4, gy + 6, Math.floor(gw / 2) - 8, 1, rp[0]);
  p.rect(gx + 4, gy + 6, 1, gh - 8, rp[0]);
  for (const hy of [gy + 8, gy + gh - 10]) {
    p.rect(gx - 1, hy, 3, 3, 0x2a2a30);
    p.rect(gx + gw - 2, hy, 3, 3, 0x2a2a30);
  }
  const lx = gx + Math.floor(gw / 2) - 3;
  const ly = gy + Math.floor(gh * 0.55);
  p.rect(lx, ly, 7, 2, 0x8a8a9a);
  p.rect(lx + 2, ly + 2, 4, 5, 0x6a6a72);
  p.set(lx + 3, ly + 1, 0xb8b8c0);
  p.set(lx + 4, ly + 4, 0x2a2a30);
  // Номер краской
  if (n) p.text(`№${n}`, x + w / 2, gy + 4, 0xe8e0c8, { align: 'center', shadow: 0x2a2a30 });
  // Граффити-теги
  if (tags && r() < 0.6) graffitiTag(p, gx + 6 + Math.floor(r() * (gw - 30)), gy + gh - 18 - Math.floor(r() * 10), [0xff3d8a, 0x3df0ff, 0xe8e8e8, 0xffd166, 0x8ae6a0][Math.floor(r() * 5)], r);
  // Приоткрытые ворота: щель снизу/сбоку
  if (open) {
    p.rect(gx + Math.floor(gw / 2) - 1, gy, 3, gh, 0x0c0a12);
    p.rect(gx, base - open, gw, open, 0x0c0a12);
  }
  floorShadow(p, x - 2, base, w + 4, 0.45);
  return { x, w, top, gate: { x: gx, y: gy, w: gw, h: gh } };
}

// Тег-закорючка баллончиком
export function graffitiTag(p, x, y, c, r = rng(x * y)) {
  const n = 3 + Math.floor(r() * 4);
  let cx = x;
  for (let i = 0; i < n; i++) {
    const h = 5 + Math.floor(r() * 5);
    const cy = y + Math.floor(r() * 3);
    p.line(cx, cy + h, cx + 2, cy, c);
    p.line(cx + 2, cy, cx + 4, cy + h * 0.7, c);
    if (r() < 0.4) p.line(cx, cy + h * 0.5, cx + 5, cy + h * 0.4, c);
    cx += 5 + Math.floor(r() * 2);
  }
  p.line(x - 1, y + 11, cx + 2, y + 9, c);
}

// Крупное граффити буквами (контур + заливка + блик), slant — наклон строк
export function graffiti(p, x, y, text, { fill = 0x3df0ff, line = 0xff3d8a, scale = 3, slant = 0 } = {}) {
  const cells = new Set();
  drawText((px, py) => {
    for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) cells.add(`${px * scale + b},${py * scale + a}`);
  }, text, 0, 0, 1);
  const sh = (xx, yy) => Math.round(xx * slant);
  // Тень-обводка в два пикселя
  cells.forEach((k) => {
    const [xx, yy] = k.split(',').map(Number);
    for (let ox = -2; ox <= 2; ox++) for (let oy = -2; oy <= 2; oy++) {
      if (cells.has(`${xx + ox},${yy + oy}`)) continue;
      p.set(x + xx + ox, y + yy + oy + sh(xx + ox, yy + oy), Math.abs(ox) === 2 || Math.abs(oy) === 2 ? INK : line);
    }
  });
  const fr = ramp(fill);
  const H = 5 * scale;
  cells.forEach((k) => {
    const [xx, yy] = k.split(',').map(Number);
    const t = yy / H;
    p.set(x + xx, y + yy + sh(xx, yy), t < 0.25 ? fr[4] : t < 0.5 ? fr[3] : t < 0.8 ? fr[2] : fr[1]);
  });
  // Подтёки краски
  let n = 0;
  cells.forEach((k) => {
    const [xx, yy] = k.split(',').map(Number);
    if (yy === H - 1 && (xx * 7) % 23 === 0 && n++ < 6) for (let d = 1; d < 4 + (xx % 5); d++) p.set(x + xx, y + yy + d + sh(xx, yy), fr[1]);
  });
  return textWidth(text) * scale;
}

// Машина сбоку: 4.5 м седан. dir: 1 — смотрит вправо
export function car(p, x, base, { c = 0x8a8c94, dir = 1, type = 'sedan', r = rng(x), dirt = 0.2 } = {}) {
  const L = m(type === 'old' ? 4.7 : 4.4);
  const rp = ramp(c);
  const wheelR = 5;
  const bodyY = base - m(0.75);
  const roofY = base - m(1.45);
  const f = (v) => (dir > 0 ? x + v : x + L - v);
  // Кузов: низ
  const body = [[0, base - 7], [0, bodyY + 2], [3, bodyY], [L * 0.22, bodyY - 2], [L - 6, bodyY - 1], [L, bodyY + 3], [L, base - 7], [L - 2, base - 4], [2, base - 4]];
  const roof = [[L * 0.24, bodyY - 1], [L * 0.33, roofY], [L * 0.66, roofY], [L * 0.8, bodyY - 2]];
  const poly = (pts) => pts.map(([a, b]) => [f(a), b]);
  p.poly(poly(body), rp[2]);
  p.poly(poly(roof), rp[2]);
  // Стёкла
  const win = [[L * 0.27, bodyY - 1], [L * 0.345, roofY + 2], [L * 0.49, roofY + 2], [L * 0.49, bodyY - 1]];
  const win2 = [[L * 0.51, bodyY - 1], [L * 0.51, roofY + 2], [L * 0.645, roofY + 2], [L * 0.76, bodyY - 1]];
  p.poly(poly(win), 0x2a3448);
  p.poly(poly(win2), 0x2a3448);
  p.line(f(L * 0.3), bodyY - 2, f(L * 0.36), roofY + 3, 0x6a7a98);
  p.line(f(L * 0.56), bodyY - 2, f(L * 0.6), roofY + 3, 0x6a7a98);
  // Свет и тень по кузову: блик-линия, тёмный низ
  p.hline(Math.min(f(4), f(L - 4)), bodyY, L - 8, rp[3]);
  p.hline(Math.min(f(4), f(L - 4)), bodyY + 1, L - 8, rp[4]);
  p.rect(Math.min(f(1), f(L - 1)), base - 10, L - 2, 3, rp[1]);
  // Двери, ручки
  p.vline(f(L * 0.5), bodyY, base - 8 - bodyY, rp[0]);
  p.vline(f(L * 0.28), bodyY + 1, base - 9 - bodyY, rp[0]);
  p.hline(Math.min(f(L * 0.42), f(L * 0.42 + 3)), bodyY + 4, 4, rp[4]);
  p.hline(Math.min(f(L * 0.63), f(L * 0.63 + 3)), bodyY + 4, 4, rp[4]);
  // Бампер и фары
  p.rect(Math.min(f(L - 3), f(L)), base - 10, 3, 4, 0x2a2a30);
  p.rect(Math.min(f(0), f(3)), base - 10, 3, 4, 0x2a2a30);
  p.rect(Math.min(f(L - 3), f(L - 1)), bodyY + 3, 3, 3, 0xe8e8d8);
  p.rect(Math.min(f(0), f(2)), bodyY + 3, 3, 3, 0xb03030);
  // Колёса
  for (const wx of [L * 0.18, L * 0.8]) {
    p.ellipse(f(wx), base - wheelR, wheelR + 1.5, wheelR + 1.5, 0x101014);
    p.ellipse(f(wx), base - wheelR, wheelR, wheelR, 0x1a1a20);
    p.ellipse(f(wx), base - wheelR, 2.5, 2.5, 0x8a8a94);
    p.set(f(wx) - 1, base - wheelR - 1, 0xc8c8d0);
  }
  // Грязь на порогах
  if (dirt) p.dither(Math.min(f(0), f(L)), base - 12, L, 6, 0x4a3a2a, (xx, yy) => ((yy - (base - 12)) / 6) * dirt * 2);
  // Контур
  const pts = [...poly(body)];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    p.line(ax, ay, bx, by, INK);
  }
  poly(roof).forEach(([ax, ay], i, arr) => {
    if (i === arr.length - 1) return;
    const [bx, by] = arr[i + 1];
    p.line(ax, ay - 1, bx, by - 1, INK);
  });
  floorShadow(p, Math.min(f(0), f(L)) + 2, base, L - 4, 0.55);
  return { x, w: L, head: { x: f(L), y: bodyY + 4 }, tail: { x: f(0), y: bodyY + 4 } };
}

// Лист объявления / афиша на стене
export function poster(p, x, y, w, h, { c = 0xe8e0d0, accent = 0xff3d8a, title, r = rng(x) } = {}) {
  p.rect(x - 1, y - 1, w + 2, h + 2, INK);
  p.rect(x, y, w, h, c);
  p.rect(x + 2, y + 2, w - 4, Math.floor(h * 0.4), accent);
  if (title) p.text(title, x + w / 2, y + Math.floor(h * 0.4) + 4, INK, { align: 'center' });
  for (let yy = y + Math.floor(h * 0.4) + 11; yy < y + h - 2; yy += 2) p.hline(x + 3, yy, Math.floor((w - 6) * (0.5 + r() * 0.5)), mix(c, INK, 0.45));
  // Оборванный угол
  p.set(x + w - 1, y + h - 1, 0);
  p.set(x + w - 2, y + h - 1, 0);
  p.set(x + w - 1, y + h - 2, 0);
}

// Провода между столбами/домами
export function wire(p, x0, y0, x1, y1, sag = 6, c = 0x15121c) {
  const n = Math.abs(x1 - x0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag, c);
  }
}

// Забор из профнастила / решётка
export function fence(p, x, base, w, { h = 1.6, c = 0x5a6a5a, type = 'sheet' } = {}) {
  const rp = ramp(c);
  const top = base - m(h);
  if (type === 'sheet') {
    p.rect(x, top, w, base - top, rp[2]);
    for (let xx = x; xx < x + w; xx += 4) {
      p.vline(xx, top, base - top, rp[3]);
      p.vline(xx + 2, top, base - top, rp[1]);
    }
    p.hline(x, top, w, INK);
  } else {
    p.hline(x, top + 3, w, rp[2]);
    p.hline(x, base - 6, w, rp[2]);
    for (let xx = x; xx < x + w; xx += 5) {
      p.vline(xx, top, base - top, rp[2]);
      p.set(xx, top - 1, rp[3]);
    }
  }
}

// ---------- Дальний город ----------

// Силуэты панелек вдали с огоньками окон. k — масштаб (1 — вплотную, 0.25 — далеко)
export function cityBlock(p, x, base, { floors = 9, sections = 3, k = 0.5, c = 0x5a6070, r = rng(x), lit = 0, emit, sky } = {}) {
  const fh = Math.max(3, Math.round(m(2.8) * k));
  const sw = Math.max(6, Math.round(m(14) * k));
  const w = sw * sections;
  const h = fh * floors + Math.round(m(1.5) * k);
  const top = base - h;
  const rp = ramp(c);
  p.rect(x, top, w, h, rp[2]);
  // Вертикальные полосы-подъезды и тень справа
  for (let s = 0; s < sections; s++) p.vline(x + s * sw, top, h, rp[1]);
  p.rect(x + w - Math.max(1, Math.round(3 * k * 2)), top, Math.max(1, Math.round(3 * k * 2)), h, rp[1]);
  p.hline(x, top, w, rp[3]);
  // Технический этаж на крыше, антенны
  p.rect(x + Math.round(w * 0.3), top - Math.round(m(1.2) * k), Math.round(w * 0.2), Math.round(m(1.2) * k), rp[1]);
  if (r() < 0.6) p.vline(x + Math.round(w * 0.7), top - Math.round(m(3) * k), Math.round(m(3) * k), rp[0]);
  // Окна
  const ww = Math.max(1, Math.round(m(1.3) * k));
  const wh = Math.max(1, Math.round(m(1.4) * k));
  const step = Math.max(ww + 1, Math.round(m(3) * k));
  for (let fy = 0; fy < floors; fy++) {
    const wy = top + Math.round(m(1.2) * k) + fy * fh;
    for (let wx = x + Math.round(step / 2); wx < x + w - ww; wx += step) {
      const on = r() < lit;
      if (on && emit) emit.push([wx, wy, ww, wh, r() < 0.75 ? 0xffd27a : r() < 0.5 ? 0x9ab8ff : 0xffa86a]);
      else p.rect(wx, wy, ww, wh, sky ? mix(rp[1], sky, 0.35) : rp[0]);
    }
  }
  return { w, top };
}

// Панелька среднего плана (через двор): k — масштаб (0.3–0.6). Швы панелей, окна с рамами,
// балконы, подъезды с козырьками. Горящие окна уходят в emit (рисуются поверх ночи).
export function panelBlock(p, x, base, { floors = 9, sections = 3, k = 0.45, c = 0x9a948a, r = rng(x), lit = 0, emit, skyCol = [0x8a9ab8, 0xb0bcd0] } = {}) {
  const fh = Math.round(m(2.8) * k);
  const sw = Math.round(m(13) * k);
  const w = sw * sections;
  const h = fh * floors + Math.round(m(1.2) * k);
  const top = base - h;
  const rp = ramp(c);
  p.rect(x, top, w, h, rp[2]);
  // Плиты разного оттенка и швы
  const pw = Math.round(m(3.2) * k);
  for (let yy = top; yy < base; yy += fh) {
    for (let xx = x; xx < x + w; xx += pw) {
      if (r() < 0.3) p.rect(xx, yy, Math.min(pw, x + w - xx), Math.min(fh, base - yy), mix(rp[2], r() < 0.5 ? rp[1] : rp[3], 0.3));
    }
    p.hline(x, yy, w, rp[1]);
  }
  for (let xx = x; xx < x + w; xx += pw) p.vline(xx, top, h, mix(rp[1], rp[2], 0.5));
  // Крыша и правая тень
  p.rect(x - 1, top - 2, w + 2, 2, rp[0]);
  p.rect(x + Math.round(w * 0.35), top - Math.round(m(1.4) * k), Math.round(m(4) * k), Math.round(m(1.4) * k), rp[1]);
  p.dither(x + w - Math.round(6 * k * 2), top, Math.round(6 * k * 2), h, rp[0], 0.5);
  const ww = Math.max(2, Math.round(m(1.3) * k));
  const wh = Math.max(2, Math.round(m(1.45) * k));
  const step = Math.round(m(3.2) * k);
  for (let fy = 0; fy < floors; fy++) {
    const wy = base - Math.round(m(1.2) * k) - (fy + 1) * fh + Math.round(m(0.9) * k);
    for (let s = 0; s < sections; s++) {
      for (let wx = x + s * sw + Math.round(step * 0.35); wx < x + (s + 1) * sw - ww; wx += step) {
        // Лестничные окна — по центру секции, смещены по высоте
        const on = r() < lit;
        const col = r() < 0.72 ? 0xffd27a : r() < 0.5 ? 0x9ab8ff : 0xffa86a;
        if (on && emit) {
          emit.push([wx, wy, ww, wh, col, 0.12]);
          // Переплёт и занавеска поверх света
          emit.push([wx + Math.floor(ww / 2), wy, 1, wh, mix(col, 0x3a2a20, 0.55), 0]);
          if (r() < 0.5) emit.push([wx, wy, Math.max(1, Math.round(ww * 0.25)), wh, mix(col, 0x8a3a2a, 0.35), 0]);
        } else {
          p.rect(wx - 1, wy - 1, ww + 2, wh + 2, rp[3]);
          p.gradV(wx, wy, ww, wh, skyCol.map((cc) => mix(cc, rp[0], 0.35)));
          p.vline(wx + Math.floor(ww / 2), wy, wh, rp[3]);
        }
        // Балкон через этаж
        if (fy > 0 && (s + fy) % 2 === 0 && wx === x + s * sw + Math.round(step * 0.35)) {
          const bw = Math.round(m(2.2) * k);
          p.rect(wx - 1, wy + wh - Math.round(wh * 0.45), bw, Math.round(wh * 0.45) + 1, mix(rp[3], [0x7a8a9a, 0x9a6a5a, 0x6a7a6a][fy % 3], 0.4));
          p.hline(wx - 1, wy + wh + 1, bw, rp[0]);
        }
      }
    }
  }
  // Подъезды с козырьками
  for (let s = 0; s < sections; s++) {
    const ex = x + s * sw + Math.round(sw / 2) - Math.round(m(0.6) * k);
    const ew = Math.round(m(1.2) * k);
    const eh = Math.round(m(2.1) * k);
    p.rect(ex, base - eh, ew, eh, 0x1a1620);
    p.rect(ex - 2, base - eh - 2, ew + 4, 2, rp[0]);
    if (lit > 0.1 && emit) emit.push([ex + Math.floor(ew / 2) - 1, base - eh - 1, 2, 1, 0xfff0c0, 0.3]);
  }
  return { w, top };
}
