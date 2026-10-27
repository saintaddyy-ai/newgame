// Интерьеры: стены, полы, разрез дома (соседи сверху и снизу), мебель.
// Высота комнаты 2,6 м; над потолком — плита перекрытия и квартира соседей сверху.
import { m, WALL, INK, block, floorShadow, grime, poster } from './paint.js';
import { ramp, mix, rng } from './color.js';
import { GROUND } from './pix.js';

export const CEIL = WALL - m(2.6); // потолок комнаты
export const SLAB = m(0.25);
export const EYE = GROUND - m(1.6);
export { WALL, INK };

// ---------- Стены ----------

export function wallpaper(p, x, y, w, h, { c = 0x3a2f4a, pattern = 'stripes', r = rng(x) } = {}) {
  const rp = ramp(c);
  p.rect(x, y, w, h, rp[2]);
  if (pattern === 'stripes') {
    for (let xx = x; xx < x + w; xx += 8) {
      p.vline(xx, y, h, rp[3]);
      p.vline(xx + 4, y, h, rp[1]);
    }
  } else if (pattern === 'flowers') {
    for (let yy = y + 3; yy < y + h; yy += 10) for (let xx = x + ((yy / 10) % 2 ? 2 : 7); xx < x + w; xx += 10) {
      p.set(xx, yy, rp[3]);
      p.set(xx - 1, yy + 1, rp[3]);
      p.set(xx + 1, yy + 1, rp[3]);
      p.set(xx, yy + 2, rp[3]);
      p.set(xx, yy + 1, rp[4]);
    }
  } else if (pattern === 'diamonds') {
    for (let yy = y; yy < y + h; yy += 8) for (let xx = x + ((yy / 8) % 2 ? 0 : 4); xx < x + w; xx += 8) {
      p.set(xx, yy + 2, rp[1]);
      p.set(xx - 1, yy + 3, rp[1]);
      p.set(xx + 1, yy + 3, rp[1]);
      p.set(xx, yy + 4, rp[1]);
    }
  } else if (pattern === 'paint') {
    p.speckle(x, y, w, h, [rp[1], rp[3]], 0.03, r);
  }
  // Пожелтевшие стыки рулонов и потёртости
  for (let xx = x + 26; xx < x + w; xx += 53) p.vline(xx, y, h, mix(rp[2], 0x8a7a50, 0.15));
  grime(p, x, y, w, h, 0x1a1420, 0.06, r);
}

export function tiles(p, x, y, w, h, { c = 0x8ab4c8, size = 5, r = rng(x + y), broken = 0.02 } = {}) {
  const rp = ramp(c);
  p.rect(x, y, w, h, rp[2]);
  for (let yy = y; yy < y + h; yy += size) p.hline(x, yy, w, rp[1]);
  for (let xx = x; xx < x + w; xx += size) p.vline(xx, y, h, rp[1]);
  for (let yy = y + 1; yy < y + h; yy += size) for (let xx = x + 1; xx < x + w; xx += size) {
    p.set(xx, yy, rp[3]);
    if (r() < broken) p.rect(xx, yy, size - 1, size - 1, rp[0]);
  }
}

// Плинтус у пола
export function baseboard(p, x, w, c = 0x6a4a3a) {
  const rp = ramp(c);
  p.rect(x, WALL - 3, w, 3, rp[2]);
  p.hline(x, WALL - 3, w, rp[3]);
}

// Пол: доски / линолеум / плитка — видна верхняя поверхность (перспектива), потом срез плиты
export function floor(p, x, w, { type = 'boards', c = 0x6a4a34, r = rng(x) } = {}) {
  const rp = ramp(c);
  const y0 = WALL;
  const y1 = GROUND + 9;
  if (type === 'boards') {
    p.rect(x, y0, w, y1 - y0, rp[2]);
    for (let yy = y0 + 2; yy < y1; yy += 3) p.hline(x, yy, w, rp[1]);
    for (let yy = y0; yy < y1; yy += 3) for (let xx = x + ((yy * 7) % 23); xx < x + w; xx += 23 + ((yy * 3) % 9)) p.set(xx, yy + 1, rp[0]);
    p.speckle(x, y0, w, y1 - y0, rp[3], 0.03, r);
  } else if (type === 'lino') {
    p.rect(x, y0, w, y1 - y0, rp[2]);
    for (let yy = y0; yy < y1; yy += 4) for (let xx = x + ((yy / 4) % 2 ? 0 : 4); xx < x + w; xx += 8) p.rect(xx, yy, 4, 2, rp[3]);
    p.speckle(x, y0, w, y1 - y0, rp[1], 0.04, r);
  } else {
    // Плитка шашкой
    for (let yy = y0; yy < y1; yy += 4) for (let xx = x; xx < x + w; xx += 6) p.rect(xx, yy, 6, 4, ((xx - x) / 6 + (yy - y0) / 4) % 2 ? rp[2] : rp[1]);
  }
  // Дальний край пола темнее (у стены)
  p.tint(x, y0, w, 2, 0x07060d, 0.35);
  slabBelow(p, x, w);
}

// Срез перекрытия под полом и потолок соседей снизу
export function slabBelow(p, x, w) {
  const y = GROUND + 9;
  p.rect(x, y, w, 2, 0x8a8478);
  p.rect(x, y + 2, w, SLAB - 2, 0x4a4650);
  for (let xx = x + 5; xx < x + w; xx += 11) p.set(xx, y + 4, 0x3a3640);
  p.rect(x, y + SLAB, w, 270 - y - SLAB, 0x1a1622);
  p.hline(x, y + SLAB, w, 0x2a2430);
}

// Перекрытие над потолком
export function slabAbove(p, x, w) {
  p.rect(x, CEIL - SLAB, w, SLAB, 0x4a4650);
  p.hline(x, CEIL - SLAB, w, 0x6a6672);
  p.hline(x, CEIL - 1, w, 0x2a2430);
  for (let xx = x + 3; xx < x + w; xx += 13) p.set(xx, CEIL - SLAB + 4, 0x3a3640);
}

// Квартира соседей сверху: другая отделка, мебель силуэтами, иногда горит свет
export function upstairs(p, x, w, { c = 0x4a3a40, r = rng(x), ctx } = {}) {
  const top = CEIL - SLAB;
  const rp = ramp(c);
  const fl = top;
  p.rect(x, 0, w, fl, rp[1]);
  for (let xx = x; xx < x + w; xx += 6) p.vline(xx, 0, fl, rp[0]);
  p.rect(x, fl - 5, w, 5, mix(rp[0], 0x2a1a14, 0.4));
  // Мебель
  for (let xx = x + 8 + Math.floor(r() * 20); xx < x + w - 30; xx += 50 + Math.floor(r() * 50)) {
    const kind = Math.floor(r() * 4);
    if (kind === 0) block(p, xx, fl - 5 - m(0.8), m(1.8), m(0.8), mix(rp[0], 0x5a2a3a, 0.4), { outline: false });
    else if (kind === 1) block(p, xx, fl - 5 - m(1.9), m(0.9), m(1.9), mix(rp[0], 0x3a2a20, 0.5), { outline: false });
    else if (kind === 2) {
      block(p, xx, fl - 5 - m(0.5), m(1.1), m(0.5), mix(rp[0], 0x2a2a30, 0.6), { outline: false });
      // Телевизор: ночью мерцает голубым
      block(p, xx + 6, fl - 5 - m(0.5) - 16, 22, 15, 0x1a1a22, { outline: false });
      if (ctx && ctx.dark > 0.3 && r() < 0.6) ctx.emit.push([xx + 8, fl - 5 - m(0.5) - 14, 18, 11, 0x6a9aff, 0.2]);
    } else {
      p.rect(xx, fl - 5 - m(1.4), 2, m(1.4), mix(rp[0], 0x1a1a1e, 0.6));
      p.rect(xx - 5, fl - 5 - m(1.4), 12, 6, mix(rp[0], 0xd8c8a0, 0.3));
    }
  }
  // Соседи — фон: приглушаем, чтобы взгляд оставался на нашем этаже
  p.tint(x, 0, w, fl, 0x0c0a16, 0.38);
  // Ночью у кого-то горит свет
  if (ctx && ctx.dark > 0.3 && r() < 0.6) ctx.lights.push({ x: x + w / 2, y: 6, r: w * 0.5, color: 0xffd8a0, k: 0.6, glow: false });
  slabAbove(p, x, w);
}

// Перегородка между комнатами в разрезе: толщина стены, проём под дверь
export function partition(p, x, { door = true, doorW = m(0.82), doorH = m(2.05), c = 0xd8d0c0 } = {}) {
  const w = 8;
  const rp = ramp(c);
  const top = 0;
  p.rect(x, top, w, WALL - top, rp[2]);
  p.vline(x, top, WALL, rp[3]);
  p.vline(x + w - 1, top, WALL, rp[1]);
  p.rect(x + 2, top, w - 4, WALL, mix(rp[1], 0x6a6672, 0.5));
  return w;
}

// Окно изнутри: рама, подоконник, батарея под ним, вид наружу — view(p, x, y, w, h)
export function roomWindow(p, x, y, w, h, { view, frame = 0xe8e4dc, curtain = 0x8a5a7a, r = rng(x) } = {}) {
  const fr = ramp(frame);
  p.rect(x - 4, y - 4, w + 8, h + 8, mix(fr[1], 0x6a6672, 0.3));
  p.rect(x - 2, y - 2, w + 4, h + 4, fr[2]);
  if (view) view(p, x, y, w, h);
  p.vline(x + Math.floor(w / 2) - 1, y, h, fr[2]);
  p.vline(x + Math.floor(w / 2), y, h, fr[1]);
  p.hline(x, y + Math.floor(h * 0.3), w, fr[2]);
  p.rect(x - 1, y - 1, w + 2, 1, fr[1]);
  // Подоконник с горшками
  block(p, x - 6, y + h + 2, w + 12, 3, fr[2], { top: 2 });
  // Шторы-тюль
  if (curtain) {
    const cr = ramp(curtain);
    for (const sx of [x - 8, x + w - 2]) {
      p.rect(sx, y - 8, 10, h + 14, cr[2]);
      for (let k = 1; k < 10; k += 3) p.vline(sx + k, y - 8, h + 14, cr[1]);
      p.vline(sx + 9, y - 8, h + 14, cr[0]);
    }
    p.rect(x - 10, y - 10, w + 20, 2, 0x8a8a92);
  }
  // Батарея
  const by = y + h + 10;
  const bw = Math.min(w, m(1));
  for (let k = 0; k < bw; k += 3) block(p, x + Math.floor((w - bw) / 2) + k, by, 2, m(0.5), 0xd8d8d0, { outline: false });
}

// Вид из окна: небо по времени + дома напротив + огни
export function windowView(ctx, { sky } = {}) {
  return (p, x, y, w, h) => {
    const dark = ctx.dark;
    const cols = sky || (dark > 0.6 ? [0x0a0818, 0x1e1535, 0x33203f] : dark > 0.3 ? [0x2e3262, 0x7a4a78, 0xf09a6a] : [0x6f80a2, 0x9aa4bc, 0xc6cad6]);
    p.gradV(x, y, w, h, cols);
    const r = rng(x);
    for (let bx = x - 4; bx < x + w; bx += 16 + Math.floor(r() * 10)) {
      const bh = Math.floor(h * (0.4 + r() * 0.5));
      p.rect(bx, y + h - bh, 14, bh, dark > 0.5 ? 0x1a1430 : 0x7a8098);
      for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 5) for (let wx = bx + 2; wx < bx + 12; wx += 4) {
        if (dark > 0.4 && r() < 0.35) ctx.emit.push([wx, wy, 2, 2, r() < 0.8 ? 0xffd27a : 0x9ab8ff, 0]);
        else p.rect(wx, wy, 2, 2, dark > 0.5 ? 0x15102a : 0x9ab0c8);
      }
    }
    // Стекло: блики
    p.line(x + 3, y + h - 3, x + 9, y + 3, mix(cols[1], 0xffffff, 0.3));
  };
}

// ---------- Мебель (вид сбоку, низ — у стены WALL) ----------

export function bed(p, x, { len = m(2), c = 0x5b4b8a, wood = 0x4a3a2a } = {}) {
  const top = WALL - m(0.45);
  block(p, x, WALL - m(0.9), 5, m(0.9), wood);
  block(p, x + len - 4, WALL - m(0.55), 4, m(0.55), wood);
  block(p, x + 4, top + 4, len - 8, m(0.45) - 4, wood, { top: 0 });
  block(p, x + 5, top - 2, len - 10, 7, 0x8a8aa8, { top: 3 });
  // Одеяло со складками и подушка
  const cr = ramp(c);
  p.rect(x + 22, top - 5, len - 28, 10, cr[2]);
  for (let k = x + 26; k < x + len - 8; k += 9) p.vline(k, top - 4, 9, cr[1]);
  p.hline(x + 22, top - 5, len - 28, cr[3]);
  p.rect(x + 22, top + 5, len - 28, 2, cr[1]);
  block(p, x + 6, top - 8, 16, 7, 0xe8e4f0, { top: 2 });
  floorShadow(p, x, WALL, len);
}

export function nightstand(p, x, { c = 0x5a4030 } = {}) {
  block(p, x, WALL - m(0.55), m(0.5), m(0.55), c, { top: 3 });
  p.hline(x + 2, WALL - m(0.3), m(0.5) - 4, ramp(c)[1]);
  p.set(x + 9, WALL - m(0.42), 0xd8b040);
  return WALL - m(0.55) - 3;
}

export function desk(p, x, { len = m(1.3), c = 0x5a4030 } = {}) {
  const top = WALL - m(0.75);
  block(p, x, top, len, 3, c, { top: 3 });
  block(p, x + 2, top + 3, 3, m(0.75) - 3, c, { outline: true });
  block(p, x + len - 18, top + 3, 16, m(0.75) - 3, c);
  p.hline(x + len - 16, top + 12, 12, ramp(c)[1]);
  p.set(x + len - 10, top + 8, 0xd8b040);
  p.set(x + len - 10, top + 17, 0xd8b040);
  floorShadow(p, x, WALL, len);
  return top - 3;
}

export function chair(p, x, { c = 0x4a3a2a, flip = false } = {}) {
  const seat = WALL - m(0.45);
  block(p, x, seat, m(0.42), 2, c, { top: 2 });
  p.rect(x + 1, seat + 2, 2, m(0.45) - 2, ramp(c)[1]);
  p.rect(x + m(0.42) - 3, seat + 2, 2, m(0.45) - 2, ramp(c)[1]);
  const bx = flip ? x + m(0.42) - 3 : x;
  block(p, bx, seat - m(0.45), 3, m(0.45), c);
}

export function deskLamp(p, x, y) {
  p.rect(x - 4, y - 1, 9, 2, 0x2a2a2a);
  p.line(x, y - 1, x - 3, y - 10, 0x3a3a3a);
  p.line(x - 3, y - 10, x + 2, y - 15, 0x3a3a3a);
  p.poly([[x - 1, y - 18], [x + 6, y - 16], [x + 5, y - 12], [x, y - 14]], 0x2a5a4a);
  return { x: x + 3, y: y - 12 };
}

export function wardrobe(p, x, { w = m(1.2), h = m(2.1), c = 0x6a4a34 } = {}) {
  const rp = block(p, x, WALL - h, w, h, c);
  p.vline(x + Math.floor(w / 2), WALL - h + 2, h - 6, rp[0]);
  p.rect(x + Math.floor(w / 2) - 3, WALL - h / 2, 2, 5, 0xd8b040);
  p.rect(x + Math.floor(w / 2) + 2, WALL - h / 2, 2, 5, 0xd8b040);
  p.rect(x + 3, WALL - h + 3, w - 6, 2, rp[3]);
  // Коробки на шкафу
  block(p, x + 4, WALL - h - 10, 18, 10, 0xb8946a, { top: 2 });
  floorShadow(p, x, WALL, w);
}

export function fridge(p, x, { w = m(0.62), h = m(1.75), c = 0xe0e0e4 } = {}) {
  const rp = block(p, x, WALL - h, w, h, c);
  p.hline(x + 1, WALL - h + Math.floor(h * 0.32), w - 2, rp[0]);
  p.rect(x + w - 4, WALL - h + 6, 2, 12, rp[0]);
  p.rect(x + w - 4, WALL - h + Math.floor(h * 0.32) + 6, 2, 18, rp[0]);
  // Магнитики и записка
  p.rect(x + 4, WALL - h + 8, 3, 3, 0xff3d8a);
  p.rect(x + 9, WALL - h + 12, 3, 4, 0xffd166);
  p.rect(x + 5, WALL - h + 28, 8, 9, 0xf0ead8);
  p.set(x + 8, WALL - h + 27, 0x3df0ff);
  floorShadow(p, x, WALL, w);
  return { top: WALL - h };
}

export function stove(p, x, { w = m(0.55), c = 0xe8e8ec } = {}) {
  const h = m(0.85);
  const rp = block(p, x, WALL - h, w, h, c, { top: 3 });
  p.rect(x + 3, WALL - h + 8, w - 6, h - 12, 0x2a2a30);
  p.rect(x + 5, WALL - h + 10, w - 10, h - 18, 0x3a3a44);
  for (let k = 0; k < 4; k++) p.set(x + 3 + k * 4, WALL - h + 3, 0x2a2a30);
  // Кастрюля и чайник
  block(p, x + 2, WALL - h - 10, 9, 7, 0x8a8a9a, { top: 1 });
  block(p, x + 12, WALL - h - 9, 7, 6, 0xc84a3a, { top: 1 });
  p.set(x + 19, WALL - h - 7, 0xc84a3a);
  return { top: WALL - h };
}

export function kitchenSink(p, x, { w = m(0.6) } = {}) {
  const h = m(0.85);
  block(p, x, WALL - h, w, h, 0xf0ece0, { top: 3 });
  p.rect(x + 3, WALL - h + 6, w - 6, h - 9, 0xe0dcd0);
  p.vline(x + Math.floor(w / 2), WALL - h + 6, h - 9, 0xb8b4a8);
  // Кран
  p.rect(x + w - 8, WALL - h - 10, 2, 10, 0xb8b8c0);
  p.rect(x + w - 12, WALL - h - 10, 6, 2, 0xb8b8c0);
  return { tap: { x: x + w - 12, y: WALL - h - 8 } };
}

export function cabinets(p, x, y, w, { c = 0x8a6a4a, h = m(0.7) } = {}) {
  const rp = block(p, x, y, w, h, c);
  for (let xx = x + m(0.5); xx < x + w - 2; xx += m(0.5)) p.vline(xx, y + 1, h - 2, rp[0]);
  for (let xx = x + 3; xx < x + w; xx += m(0.5)) p.rect(xx + m(0.5) - 7, y + h - 6, 3, 1, 0xd8b040);
  // Низ шкафов виден снизу (выше глаз)
  p.hline(x, y + h, w, rp[0]);
}

export function table(p, x, { len = m(1.2), c = 0x7a5a40, cloth = null } = {}) {
  const top = WALL - m(0.75);
  block(p, x, top, len, 3, c, { top: 3 });
  p.rect(x + 3, top + 3, 3, m(0.75) - 3, ramp(c)[1]);
  p.rect(x + len - 6, top + 3, 3, m(0.75) - 3, ramp(c)[1]);
  if (cloth) {
    const cr = ramp(cloth);
    p.rect(x - 2, top - 3, len + 4, 8, cr[2]);
    for (let k = x; k < x + len; k += 4) p.set(k, top + 4, cr[3]);
  }
  floorShadow(p, x, WALL, len);
  return top - 3;
}

export function stool(p, x, { c = 0x6a4a30 } = {}) {
  const top = WALL - m(0.48);
  block(p, x, top, m(0.36), 3, c, { top: 2 });
  p.rect(x + 2, top + 3, 2, m(0.48) - 3, ramp(c)[1]);
  p.rect(x + m(0.36) - 4, top + 3, 2, m(0.48) - 3, ramp(c)[1]);
}

export function wallRug(p, x, y, w, h, { c = 0x8a1f28, r = rng(x) } = {}) {
  const rp = ramp(c);
  p.rect(x, y, w, h, rp[2]);
  p.rect(x + 2, y + 2, w - 4, h - 4, rp[1]);
  p.rect(x + 4, y + 4, w - 8, h - 8, rp[2]);
  const gold = ramp(0xd8a040);
  // Узор «ковра на стене»: ромб в центре и бордюр
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let yy = y + 4; yy < y + h - 4; yy++) for (let xx = x + 4; xx < x + w - 4; xx++) {
    const d = Math.abs(xx - cx) / (w / 2 - 6) + Math.abs(yy - cy) / (h / 2 - 6);
    if (d < 0.55 && d > 0.42) p.set(xx, yy, gold[2]);
    else if (d < 0.25) p.set(xx, yy, (xx + yy) % 3 ? 0x1e3a5a : gold[1]);
    else if ((xx + yy) % 7 === 0 && d < 0.9) p.set(xx, yy, rp[3]);
  }
  for (let xx = x + 2; xx < x + w - 2; xx += 3) {
    p.set(xx, y + 2, gold[2]);
    p.set(xx, y + h - 3, gold[2]);
  }
  // Бахрома снизу
  for (let xx = x + 1; xx < x + w - 1; xx += 2) p.vline(xx, y + h, 2, gold[1]);
  p.rect(x - 1, y - 1, w + 2, 1, INK);
}

export function shelf(p, x, y, w, { c = 0x5a4030, r = rng(x + y), items = 'books' } = {}) {
  block(p, x, y, w, 2, c, { top: 1 });
  for (let xx = x + 2; xx < x + w - 3;) {
    if (items === 'books') {
      const bw = 2 + Math.floor(r() * 3);
      const bh = 7 + Math.floor(r() * 5);
      const col = [0x8a2a2a, 0x2a4a8a, 0x3a6a3a, 0xd8b040, 0x6a3a6a, 0xe8e0d0][Math.floor(r() * 6)];
      p.rect(xx, y - bh, bw, bh, col);
      p.vline(xx, y - bh, bh, mix(col, 0xffffff, 0.2));
      xx += bw + (r() < 0.2 ? 2 : 0);
    } else if (items === 'tapes') {
      p.rect(xx, y - 5, 6, 5, [0x1a1a1e, 0xe8e0d0, 0xd83a3a][Math.floor(r() * 3)]);
      p.hline(xx + 1, y - 3, 4, 0x8a8a9a);
      xx += 7;
    } else {
      const bw = 3 + Math.floor(r() * 3);
      const bh = 4 + Math.floor(r() * 7);
      p.rect(xx, y - bh, bw, bh, [0xff9ab8, 0xffffff, 0x8ae6a0, 0xffd166, 0x9ad1ff][Math.floor(r() * 5)]);
      p.rect(xx + 1, y - bh - 1, bw - 2, 1, 0xd8d8d8);
      xx += bw + 2;
    }
  }
}

export function coatRack(p, x, { coats = [0x6a2a3a, 0x2a3a5a, 0x3a3a3a] } = {}) {
  const y = WALL - m(1.75);
  block(p, x, y, m(1.1), 3, 0x5a3a2a);
  coats.forEach((c, i) => {
    const cx = x + 4 + i * 13;
    p.rect(cx + 3, y + 3, 2, 3, 0x8a8a9a);
    const cr = ramp(c);
    p.poly([[cx, y + 5], [cx + 9, y + 5], [cx + 10, y + 5 + m(1.05)], [cx - 1, y + 5 + m(1.05)]], cr[2]);
    p.vline(cx + 1, y + 6, m(1.05) - 2, cr[3]);
    p.vline(cx + 8, y + 6, m(1.05) - 2, cr[1]);
  });
}

export function shoeRack(p, x) {
  block(p, x, WALL - m(0.45), m(0.9), m(0.45), 0x4a3a2a, { top: 2 });
  [[x + 3, 0x1a1a1a], [x + 12, 0x1a1a1a], [x + 21, 0xeeeeee]].forEach(([sx, c]) => {
    p.rect(sx, WALL - m(0.45) - 4, 8, 3, c);
    p.rect(sx, WALL - m(0.45) - 5, 4, 1, c);
  });
  p.rect(x + 2, WALL - 3, 9, 3, 0x6a3a5a);
}

// Зеркало: рама и стекло (отражение героя добавляет сцена)
export function mirror(p, x, y, w, h, { frame = 0x8a6a40 } = {}) {
  block(p, x - 3, y - 3, w + 6, h + 6, frame);
  p.gradV(x, y, w, h, [0x9ab8c8, 0x7a98a8, 0x6a8898]);
  p.line(x + 2, y + h - 4, x + 8, y + 2, 0xd8ecf4);
  p.line(x + 4, y + h - 4, x + 10, y + 2, 0xc0dce8);
  return { x, y, w, h };
}

export function wallPhone(p, x, y) {
  block(p, x, y, 8, 12, 0xd8d0b8);
  p.rect(x + 1, y - 2, 6, 3, 0xc84040);
  for (let k = 0; k < 3; k++) p.set(x + 2 + k * 2, y + 5, 0x2a2a30);
  p.line(x + 4, y + 12, x + 2, y + 20, 0x2a2a30);
}

export function plantPot(p, x, y) {
  p.rect(x - 3, y - 5, 7, 5, 0xa05a3a);
  p.hline(x - 3, y - 5, 7, 0xc87a4a);
  for (let k = 0; k < 6; k++) p.line(x, y - 5, x - 4 + k * 2, y - 11 - (k % 2) * 3, 0x3a7a4a);
}

export function ceilingLamp(p, x, { shade = 0xe8c890 } = {}) {
  p.vline(x, CEIL, 10, 0x2a2a2a);
  const sr = ramp(shade);
  p.poly([[x - 7, CEIL + 16], [x - 3, CEIL + 10], [x + 4, CEIL + 10], [x + 8, CEIL + 16]], sr[2]);
  p.hline(x - 7, CEIL + 16, 16, sr[1]);
  return { x, y: CEIL + 17 };
}

export function radiator(p, x, y, w) {
  for (let k = 0; k < w; k += 3) block(p, x + k, y, 2, m(0.5), 0xd8d8d0, { outline: false });
  p.rect(x - 1, y - 1, w + 1, 1, INK);
}

export { poster, block, floorShadow };
