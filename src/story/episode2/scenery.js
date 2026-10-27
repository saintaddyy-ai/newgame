// Фоны Эпизода 2: улицы, кафе, магазины, метро, «Подвал», крыши, ночной город.
// Рисуются прямоугольниками в том же пиксельном стиле, что и Эпизод 1. Описываются данными.
import Phaser from 'phaser';
import { now, at } from './world.js';
import { paintStreet } from '../../gfx/places/street.js';
import { paintInterior } from '../../gfx/places/rooms.js';
import { LINES, trainArrive, paintMetro, paintRooftop, paintPort, paintPromzona, paintRechnaya } from '../../gfx/places/misc.js';

const FLOOR = 470;
const PIX = '"Press Start 2P"';

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Небо по времени суток
export function skyColors() {
  const t = now() % 1440;
  if (t >= at(6) && t < at(17)) return [0x6a7a9a, 0x8a98b4, 0xa8b4c8, 0xc8ccd8];
  if (t >= at(17) && t < at(20)) return [0x2a1f4a, 0x5a2a5a, 0xa04a6a, 0xe0705a];
  return [0x07060d, 0x0d0b1e, 0x15102a, 0x2a1b3d];
}

export const isDarkNow = () => {
  const t = now() % 1440;
  return t >= at(20) || t < at(6);
};

function sky(scene, width) {
  const g = scene.add.graphics();
  const cols = skyColors();
  const bh = Math.ceil(FLOOR / cols.length);
  cols.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * bh, width, bh));
  if (isDarkNow()) {
    const r = rng(9);
    for (let i = 0; i < width / 14; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.5).fillRect(r() * width, r() * 180, 2, 2);
  }
  return g;
}

// Дальний город медленнее ближнего — параллакс
function farCity(scene, width, seed = 3) {
  const g = scene.add.graphics().setScrollFactor(0.35, 1);
  const r = rng(seed);
  const dark = isDarkNow();
  for (let x = -100; x < width * 0.5 + 960; x += 50 + r() * 60) {
    const h = 120 + r() * 200;
    const w = 40 + r() * 50;
    g.fillStyle(dark ? 0x1a1430 : 0x5a6280, 1).fillRect(x, FLOOR - 120 - h, w, h + 120);
    for (let wy = FLOOR - 110 - h; wy < FLOOR - 130; wy += 16) {
      for (let wx = x + 5; wx < x + w - 6; wx += 12) if (r() > (dark ? 0.75 : 0.9)) g.fillStyle(dark ? 0xffd27a : 0x8a92ac, 1).fillRect(wx, wy, 5, 7);
    }
    if (r() > 0.7) g.fillStyle(r() > 0.5 ? 0xff3d8a : 0x3df0ff, 0.8).fillRect(x + 4, FLOOR - 124 - h, w - 8, 3);
  }
  return g;
}

function ground(g, width, { sidewalk = 0x3a3a44, road = 0x232329 } = {}) {
  g.fillStyle(sidewalk, 1).fillRect(0, FLOOR - 10, width, 40);
  for (let x = 0; x < width; x += 60) g.fillStyle(0x2e2e36, 1).fillRect(x, FLOOR - 10, 2, 40);
  g.fillStyle(0x55555f, 1).fillRect(0, FLOOR + 28, width, 4);
  g.fillStyle(road, 1).fillRect(0, FLOOR + 32, width, 40);
  for (let x = 20; x < width; x += 120) g.fillStyle(0xd8d8c8, 0.5).fillRect(x, FLOOR + 50, 50, 3);
}

function text(scene, x, y, str, color = '#ffffff', size = 10, opts = {}) {
  return scene.add.text(x, y, str, { fontFamily: PIX, fontSize: `${size}px`, color, ...opts }).setOrigin(0.5);
}

// Неоновая вывеска: светится и иногда мигает
export function neon(scene, x, y, str, color = '#ff3d8a', size = 10) {
  const t = text(scene, x, y, str, color, size);
  t.setShadow(0, 0, color, 12, true, true);
  if (Math.random() < 0.5) {
    scene.time.addEvent({ delay: 2500 + Math.random() * 4000, loop: true, callback: () => scene.tweens.add({ targets: t, alpha: 0.25, duration: 50, yoyo: true, repeat: 2 }) });
  }
  return t;
}

// Фасад: стена, окна, витрина, дверь, вывеска, козырёк
function facade(scene, g, b) {
  const top = FLOOR - b.h;
  g.fillStyle(b.color, 1).fillRect(b.x, top, b.w, b.h);
  const shade = Phaser.Display.Color.ValueToColor(b.color).darken(12).color;
  for (let y = top + 70; y < FLOOR - 140; y += 70) g.fillStyle(shade, 1).fillRect(b.x, y, b.w, 3);
  const dark = isDarkNow();
  const r = rng(b.x + 1);
  for (let y = top + 20; y < FLOOR - 170; y += 70) {
    for (let x = b.x + 18; x < b.x + b.w - 40; x += 56) {
      g.fillStyle(dark ? (r() > 0.55 ? 0xffd27a : 0x15102a) : 0x9ab0c8, 1).fillRect(x, y, 34, 40);
      g.fillStyle(shade, 1).fillRect(x + 16, y, 3, 40);
    }
  }
  if (b.shop) {
    // Витрина первого этажа
    const wy = FLOOR - 150;
    g.fillStyle(0x1a1a22, 1).fillRect(b.x + 10, wy - 6, b.w - 20, 152);
    g.fillStyle(b.glass ?? (dark ? 0xffd9a0 : 0x8aa0b8), dark ? 0.85 : 1).fillRect(b.x + 16, wy, b.w - 32, 120);
    if (b.awning) {
      for (let x = b.x + 4; x < b.x + b.w - 4; x += 20) g.fillStyle(((x - b.x) / 20) % 2 ? b.awning : 0xe8e0d0, 1).fillRect(x, wy - 30, 20, 22);
    }
    if (b.sign) {
      g.fillStyle(0x0c0a16, 1).fillRect(b.x + b.w / 2 - b.sign.length * 6 - 14, wy - 64, b.sign.length * 12 + 28, 28);
      neon(scene, b.x + b.w / 2, wy - 50, b.sign, b.signColor || '#ff3d8a', 10);
    }
    // Силуэты внутри витрины
    if (b.inside) b.inside(g, b.x + 16, wy, b.w - 32);
  }
}

// ---------- Улицы ----------

// spec: { buildings: [...], lamps: [x...], features: [...], parked: [[x, color, dir]] }
export function drawStreet(scene, width, spec) {
  return paintStreet(scene, width, spec);
}

// Вход в метро: большая красная «М»
export function metroEntrance(scene, g, x) {
  g.fillStyle(0x2a2a34, 1).fillRect(x - 70, FLOOR - 170, 140, 160);
  g.fillStyle(0x07060d, 1).fillRect(x - 50, FLOOR - 120, 100, 110);
  for (let i = 0; i < 6; i++) g.fillStyle(0x3a3a44, 1).fillRect(x - 50, FLOOR - 120 + 30 + i * 13, 100, 4);
  const m = text(scene, x, FLOOR - 145, 'М', '#ff3d3d', 26);
  m.setShadow(0, 0, '#ff3d3d', 14, true, true);
}

// ---------- Интерьеры ----------

// spec: { wall: 'brick'|'tile'|..., wallColor, floor, props: [{ type, ... }] } — см. gfx/places/rooms.js
export function drawInterior(scene, width, spec) {
  return paintInterior(scene, width, spec);
}

// ---------- Метро и особые места (gfx/places/misc.js) ----------

export { LINES, trainArrive };

export function drawMetro(scene, width, lineId, stationName) {
  return paintMetro(scene, width, lineId, stationName);
}

export function drawRooftop(scene, width) {
  return paintRooftop(scene, width);
}

export function drawPort(scene, width) {
  return paintPort(scene, width);
}

export function drawPromzona(scene, width) {
  return paintPromzona(scene, width);
}

export function drawRechnaya(scene, width) {
  return paintRechnaya(scene, width);
}
