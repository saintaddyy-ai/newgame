// Двери: настоящий размер (2 м), створка поворачивается к зрителю (6 кадров в перспективе),
// в проёме нарисовано то, что за дверью на самом деле: лестница подъезда, соседняя комната,
// ванная, двор или улица. Это заменяет старые плоские цветные «двери в другой мир».
import { Pix, ART } from './pix.js';
import { ramp, mix, rng } from './color.js';
import { m, INK, block } from './paint.js';

const ANGLES = [0, 20, 40, 58, 74, 86];

// Размеры по виду двери (в пикселях арта)
const SIZE = {
  entrance: [m(1.2), m(2.15)],
  flat: [m(0.92), m(2.05)],
  interior: [m(0.82), m(2.0)],
  bath: [m(0.72), m(1.95)],
  gate: [m(2.3), m(2.2)],
  shop: [m(1), m(2.1)],
  metal: [m(0.95), m(2.05)],
};

function kindOf(d) {
  if (d.kind) return d.kind;
  if (d.metal) return 'gate';
  if (d.id === 'bath') return 'bath';
  if (d.id === 'front') return 'flat';
  if (d.id === 'entrance') return 'entrance';
  if (d.interior) return 'interior';
  return 'metal';
}

// ---------- Что видно в проёме ----------

const BEHIND = {
  // Лестничная клетка: зелёная панель снизу, побелка сверху, ступени, тусклая лампа, почтовые ящики
  stairwell(p, w, h, { dark = 0 }) {
    p.rect(0, 0, w, h, 0xb8b4a0);
    p.rect(0, Math.floor(h * 0.45), w, h, 0x3a5a4a);
    p.hline(0, Math.floor(h * 0.45), w, 0x2a4a3a);
    // Ступени вверх направо
    for (let i = 0; i < 9; i++) {
      const sx = Math.floor(w * 0.35) + i * 4;
      const sy = h - 4 - i * 4;
      block(p, sx, sy, w, 4, 0x7a7680, { outline: false });
    }
    p.line(Math.floor(w * 0.35), h - 14, w, h - 52, 0x2a2a30);
    // Почтовые ящики
    block(p, 2, Math.floor(h * 0.3), Math.floor(w * 0.3), 10, 0x5a6a8a, { outline: false });
    for (let x = 4; x < Math.floor(w * 0.3); x += 4) p.vline(x, Math.floor(h * 0.3) + 2, 7, 0x3a4a6a);
    // Лампочка
    p.rect(Math.floor(w * 0.6), 2, 3, 3, 0xfff0c0);
    p.tint(0, 0, w, h, 0x0c0a14, 0.35 + dark * 0.35);
    p.tint(Math.floor(w * 0.6) - 8, 0, 20, 30, 0xfff0c0, 0.12);
  },
  // Соседняя комната: обои, плинтус, край мебели
  room(p, w, h, { wall = 0x4a4f66, floor = 0x4a3a3a, dark = 0, lit = true }) {
    const wr = ramp(wall);
    p.rect(0, 0, w, h, wr[2]);
    for (let x = 1; x < w; x += 6) p.vline(x, 0, h - 8, wr[1]);
    p.rect(0, h - 8, w, 8, floor);
    p.hline(0, h - 9, w, wr[0]);
    p.rect(Math.floor(w * 0.6), h - 26, w, 18, mix(wall, 0x2a1a14, 0.5));
    p.tint(0, 0, w, h, 0x0c0a14, lit ? 0.2 + dark * 0.25 : 0.55);
    // Свет из комнаты падает на пол
    if (lit) p.tint(0, h - 8, w, 8, 0xffe0a0, 0.15);
  },
  // Проём между соседними комнатами: слева одна стена, справа другая
  between(p, w, h, { wall = 0x4a4f66, wallR = 0x4a4f66, floor = 0x4a3a3a, dark = 0 }) {
    const half = Math.floor(w / 2);
    const L = ramp(wall);
    const R = ramp(wallR);
    p.rect(0, 0, half, h, L[1]);
    p.rect(half, 0, w - half, h, R[2]);
    p.vline(half, 0, h - 8, mix(R[0], 0x1a1420, 0.5));
    p.rect(0, h - 8, w, 8, floor);
    p.hline(0, h - 9, w, mix(floor, 0x07060d, 0.4));
    p.tint(0, 0, w, h, 0x0c0a14, 0.12 + dark * 0.3);
  },
  // Ванная: голубая плитка, раковина с зеркалом, яркий свет
  bathroom(p, w, h) {
    p.rect(0, 0, w, h, 0x8ab4c8);
    for (let x = 0; x < w; x += 5) p.vline(x, 0, h, 0x7aa0b4);
    for (let y = 0; y < h; y += 5) p.hline(0, y, w, 0x7aa0b4);
    p.rect(0, h - 7, w, 7, 0x5a6a78);
    block(p, Math.floor(w * 0.5), h - 34, Math.floor(w * 0.5), 5, 0xf0f0f4, { outline: false });
    p.rect(Math.floor(w * 0.7), h - 29, 4, 22, 0xe0e0e8);
    block(p, Math.floor(w * 0.55), h - 62, Math.floor(w * 0.4), 18, 0xc8e0f0, { outline: false });
    p.tint(0, 0, w, h, 0xfff8e0, 0.08);
  },
  // Двор снаружи (из гаража): небо, гаражи напротив, асфальт
  yard(p, w, h, { dark = 1 }) {
    const night = dark > 0.4;
    p.gradV(0, 0, w, Math.floor(h * 0.45), night ? [0x0a0818, 0x1e1535, 0x33203f] : [0x6f80a2, 0x9aa4bc, 0xc6cad6]);
    for (let x = 0; x < w; x += 22) {
      p.rect(x, Math.floor(h * 0.45), 20, Math.floor(h * 0.4), night ? 0x2a2e38 : 0x6a7080);
      p.rect(x + 2, Math.floor(h * 0.5), 16, Math.floor(h * 0.35), night ? 0x22262e : 0x5a6070);
    }
    p.rect(0, Math.floor(h * 0.85), w, h, night ? 0x1e1e26 : 0x4a4a52);
    if (night) {
      p.rect(Math.floor(w * 0.7), Math.floor(h * 0.2), 2, 2, 0xffd27a);
      p.tint(0, Math.floor(h * 0.85), w, h, 0xffe0a0, 0.08);
    }
  },
  // Улица: витрины, свет фонарей
  street(p, w, h, { dark = 1 }) {
    const night = dark > 0.4;
    p.gradV(0, 0, w, h, night ? [0x15102a, 0x2a1b3d, 0x3a2a50] : [0x8a98b4, 0xb8bcc8, 0x9a96a8]);
    p.rect(0, Math.floor(h * 0.4), w, Math.floor(h * 0.5), night ? 0x241c34 : 0x7a7480);
    p.rect(3, Math.floor(h * 0.6), w - 6, Math.floor(h * 0.25), night ? 0xffd9a0 : 0x8aa0b8);
    p.rect(0, h - 6, w, 6, night ? 0x2a2a30 : 0x5a5a62);
  },
  // Темнота (подсобка, чёрный ход)
  dark(p, w, h) {
    p.rect(0, 0, w, h, 0x0c0a12);
    p.rect(2, h - 6, w - 4, 6, 0x15121c);
    p.rect(Math.floor(w * 0.3), Math.floor(h * 0.4), 6, 10, 0x1a1622);
  },
};

// ---------- Створка ----------

function paintLeaf(kind, w, h, c, r) {
  const p = new Pix(w, h);
  const cr = ramp(c);
  if (kind === 'flat') {
    // Дерматин с гвоздиками ромбом, глазок, номер
    p.rect(0, 0, w, h, cr[2]);
    for (let y = 4; y < h - 4; y += 7) for (let x = ((y / 7) % 2 ? 3 : 7); x < w - 2; x += 8) {
      p.set(x, y, 0xd8b060);
      p.set(x - 1, y + 1, cr[1]);
      p.set(x + 1, y + 1, cr[3]);
    }
    p.rect(Math.floor(w / 2) - 1, Math.floor(h * 0.3), 2, 2, 0x1a1a1e);
    p.rect(Math.floor(w / 2) - 4, Math.floor(h * 0.18), 9, 5, 0xd8b060);
    p.text('45', Math.floor(w / 2), Math.floor(h * 0.18), 0x2a1a10, { align: 'center' });
    p.rect(w - 6, Math.floor(h * 0.5), 3, 6, 0xc8a050);
  } else if (kind === 'entrance' || kind === 'metal' || kind === 'shop') {
    p.rect(0, 0, w, h, cr[2]);
    for (let y = 6; y < h; y += 10) p.hline(2, y, w - 4, cr[1]);
    p.rect(2, 2, w - 4, 1, cr[3]);
    // Наклейки, царапины, ручка
    if (kind === 'entrance') {
      p.rect(4, Math.floor(h * 0.45), 8, 6, 0xe8e0d0);
      p.rect(Math.floor(w * 0.6), Math.floor(h * 0.3), 6, 4, 0xff7ab8);
      for (let i = 0; i < 6; i++) p.set(Math.floor(r() * w), Math.floor(r() * h), cr[4]);
    }
    p.rect(w - 6, Math.floor(h * 0.48), 4, 2, 0xb8b8c0);
    p.rect(w - 5, Math.floor(h * 0.48) + 2, 2, 5, 0x8a8a92);
  } else if (kind === 'gate') {
    p.rect(0, 0, w, h, cr[2]);
    for (let y = 3; y < h; y += 4) p.hline(0, y, w, cr[1]);
    for (let i = 0; i < w / 3; i++) {
      const x = Math.floor(r() * w);
      for (let k = 0; k < 6 + r() * 10; k++) if (r() > 0.3) p.set(x, Math.floor(r() * 20) + k, 0x8a4a2a);
    }
    p.rect(w - 8, Math.floor(h * 0.5), 6, 3, 0x2a2a30);
  } else {
    // Межкомнатная (кухня — со стеклом), ванная — белая с табличкой
    p.rect(0, 0, w, h, cr[2]);
    const pane = kind === 'bath' ? 0xd8e8f0 : 0xb8c8d8;
    block(p, 4, 5, w - 8, Math.floor(h * 0.38), cr[2], { outline: false });
    p.rect(5, 6, w - 10, Math.floor(h * 0.38) - 2, kind === 'interior' && r() < 0.6 ? pane : cr[1]);
    block(p, 4, Math.floor(h * 0.5), w - 8, Math.floor(h * 0.42), cr[2], { outline: false });
    p.rect(w - 6, Math.floor(h * 0.5), 3, 2, 0xd8b040);
    if (kind === 'bath') {
      p.rect(Math.floor(w / 2) - 4, Math.floor(h * 0.44), 9, 5, 0x3a6ac8);
      p.set(Math.floor(w / 2) - 2, Math.floor(h * 0.44) + 2, 0xffffff);
      p.set(Math.floor(w / 2) + 2, Math.floor(h * 0.44) + 2, 0xffffff);
    }
  }
  // Объём: светлый левый край, тёмный правый, контур
  p.vline(0, 0, h, cr[3]);
  p.vline(w - 1, 0, h, cr[0]);
  p.hline(0, h - 1, w, cr[0]);
  return p;
}

// Кадр поворота створки: θ — угол, створка «едет» к зрителю, дальний край выше
function leafFrame(src, angle, hingeLeft = true) {
  const a = (angle * Math.PI) / 180;
  const w = src.w;
  const h = src.h;
  const grow = 0.08;
  const out = new Pix(w + 4, h + Math.ceil(h * grow) + 2);
  const pw = Math.max(2, Math.round(w * Math.cos(a)));
  const H0 = out.h;
  for (let i = 0; i < pw; i++) {
    const t = i / pw;
    const u = Math.min(w - 1, Math.floor(t * w));
    const hh = Math.round(h * (1 + grow * Math.sin(a) * t));
    const x = hingeLeft ? i : out.w - 1 - i;
    for (let y = 0; y < hh; y++) {
      const v = Math.min(h - 1, Math.floor((y / hh) * h));
      const px = src.get(hingeLeft ? u : w - 1 - u, v);
      if (!(px >>> 24)) continue;
      const hex = ((px & 255) << 16) | (((px >> 8) & 255) << 8) | ((px >> 16) & 255);
      out.set(x, H0 - hh + y, mix(hex, 0x0b0912, Math.sin(a) * 0.38));
    }
  }
  // Торец створки: виден, когда дверь открыта
  if (angle > 10) {
    const ex = hingeLeft ? pw : out.w - 1 - pw;
    const hh = Math.round(h * (1 + grow * Math.sin(a)));
    const ec = src.getHex(Math.floor(w / 2), Math.floor(h / 2));
    for (let k = 0; k < Math.min(3, Math.round(3 * Math.sin(a))); k++) out.vline(ex + (hingeLeft ? k : -k), H0 - hh, hh, mix(ec >= 0 ? ec : 0x5a5a62, 0xffffff, 0.15));
  }
  out.outline(INK);
  return out;
}

// Собрать дверь: проём с содержимым, рамка, лист кадров створки
export function buildDoor(scene, d, { bottom, dark = 0 }) {
  const kind = kindOf(d);
  const [w, h] = d.size || SIZE[kind] || SIZE.metal;
  const r = rng(d.x * 7 + w);
  const key = `door_${scene.locKey}_${d.id}_${Math.round(dark * 5)}`;
  const behind = d.behind || { entrance: 'stairwell', flat: 'stairwell', bath: 'bathroom', gate: 'yard', interior: 'room', shop: 'street' }[kind] || 'dark';
  // Проём
  const hole = new Pix(w + 8, h + 5);
  const inner = new Pix(w, h);
  BEHIND[behind]?.(inner, w, h, { wall: d.inside ?? 0x4a4f66, wallR: d.insideR ?? d.inside ?? 0x4a4f66, floor: d.insideFloor ?? 0x3a2c24, dark });
  // Наличник
  const fr = ramp(d.frame ?? (kind === 'interior' || kind === 'bath' ? 0xd8d0c0 : kind === 'flat' ? 0x6a4a3a : 0x4a4652));
  hole.rect(0, 0, w + 8, h + 5, fr[2]);
  hole.rect(0, 0, w + 8, 1, fr[3]);
  hole.vline(0, 0, h + 5, fr[3]);
  hole.vline(w + 7, 0, h + 5, fr[1]);
  hole.stamp(inner, 4, 5);
  hole.rect(4, 4, w, 1, fr[0]);
  hole.outline(INK);
  // Темнее ночью: проём тоже подчиняется освещению
  if (dark > 0.05) hole.tint(0, 0, hole.w, hole.h, 0x0a0a26, dark * 0.35);
  const holeKey = `${key}_hole`;
  hole.texture(scene, holeKey);
  // Створка: петли слева
  const leafSrc = paintLeaf(kind, w, h, d.color ?? { flat: 0x5a3020, entrance: 0x3a4a5a, gate: 0x4a505c, bath: 0xe8e4dc, interior: 0xd8d0c0 }[kind] ?? 0x5a5a62, r);
  if (dark > 0.05) leafSrc.tint(0, 0, w, h, 0x0a0a26, dark * 0.3);
  const frames = ANGLES.map((a) => leafFrame(leafSrc, a, true));
  const fw = frames[0].w;
  const fh = frames[0].h;
  const cv = document.createElement('canvas');
  cv.width = fw * frames.length;
  cv.height = fh;
  frames.forEach((f, i) => cv.getContext('2d').putImageData(f.img, i * fw, 0));
  const leafKey = `${key}_leaf`;
  if (scene.textures.exists(leafKey)) scene.textures.remove(leafKey);
  const t = scene.textures.addCanvas(leafKey, cv);
  frames.forEach((_, i) => t.add(i, 0, i * fw, 0, fw, fh));
  // На сцене: проём, створка (петли у левого края проёма)
  const sx = d.x;
  const holeImg = scene.add.image(sx, bottom, holeKey).setOrigin(0.5, 1).setScale(ART).setDepth(4);
  const leaf = scene.add.sprite(sx - (w / 2) * ART, bottom, leafKey, 0).setOrigin(0, 1).setScale(ART).setDepth(5);
  return { ...d, kind, hole: holeImg, leaf, w: w * ART, open: false, frame: 0 };
}

export function swingDoor(scene, door, open, dur = 260) {
  scene.tweens.killTweensOf(door);
  scene.tweens.add({
    targets: door,
    frame: open ? ANGLES.length - 1 : 0,
    duration: dur,
    ease: open ? 'Cubic.out' : 'Cubic.in',
    onUpdate: () => door.leaf.setFrame(Math.round(door.frame)),
  });
}
