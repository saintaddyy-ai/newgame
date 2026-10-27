// Фоны локаций, нарисованные прямоугольниками в пиксельном стиле.
// Двери рисуются отдельно (LocationScene.makeDoor), здесь для них только проёмы.

import Phaser from 'phaser';
import { state } from '../state.js';
import { paintYard } from '../gfx/places/yard.js';
import { paintApartment, paintBathroom } from '../gfx/places/apartment.js';
import { paintGarage } from '../gfx/places/garage.js';
import { paintWarehouse, paintPawnshop, paintFlea } from '../gfx/places/misc.js';

const FLOOR = 470;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function bands(g, x, y, w, h, colors) {
  const bh = Math.ceil(h / colors.length);
  colors.forEach((c, i) => g.fillStyle(c, 1).fillRect(x, y + i * bh, w, bh));
}

// Ночной город с панельками — для титульника и двора
// time: 'night' (по умолчанию), 'day' (пасмурный день), 'dusk' (закат)
export function drawSkyline(scene, width, { seed = 1, groundY = 540, time = 'night' } = {}) {
  const r = rng(seed);
  const g = scene.add.graphics();
  const P = {
    night: { sky: [0x07060d, 0x0d0b1e, 0x15102a, 0x1e1535, 0x2a1b3d, 0x3a1f45], far: 0x1a1430, near: 0x221c38, top: 0x2c2448, off: 0x14102a, lit: 0.78, blue: 0.72 },
    dusk: { sky: [0x2a1f4a, 0x4a2a5a, 0x7a3a6a, 0xa04a6a, 0xd0605a, 0xe8805a], far: 0x3a2a4a, near: 0x2e2440, top: 0x3a2e50, off: 0x241a36, lit: 0.82, blue: 0.8 },
    day: { sky: [0x5a6a8a, 0x6a7a98, 0x7a88a4, 0x8a96b0, 0x9aa4bc, 0xa8b0c4], far: 0x5a6280, near: 0x4a4e68, top: 0x565a76, off: 0x6a7490, lit: 0.97, blue: 0.9 },
  }[time];
  bands(g, 0, 0, width, groundY, P.sky);
  if (time === 'night') {
    for (let i = 0; i < width / 12; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.5).fillRect(r() * width, r() * 200, 2, 2);
    g.fillStyle(0xf2e8c8, 1).fillCircle(width * 0.8, 90, 26);
    g.fillStyle(0x15102a, 1).fillCircle(width * 0.8 + 12, 82, 22);
  } else if (time === 'dusk') {
    g.fillStyle(0xffd88a, 0.9).fillCircle(width * 0.7, groundY - 200, 34);
  } else {
    // Пасмурно: размытые облака
    for (let i = 0; i < width / 200; i++) g.fillStyle(0xc8ccd8, 0.25).fillEllipse(r() * width, 40 + r() * 120, 180 + r() * 160, 30 + r() * 20);
    r();
    r();
  }

  for (let x = 0; x < width; x += 60 + r() * 50) {
    const h = 140 + r() * 180;
    const w = 40 + r() * 40;
    g.fillStyle(P.far, 1).fillRect(x, groundY - 130 - h, w, h + 130);
    if (r() > 0.6) g.fillStyle(r() > 0.5 ? 0xff3d8a : 0x3df0ff, time === 'day' ? 0.3 : 0.8).fillRect(x + 6, groundY - 120 - h, w - 12, 3);
  }
  for (let x = -20; x < width; x += 170 + r() * 40) {
    const h = 200 + r() * 90;
    const w = 150;
    g.fillStyle(P.near, 1).fillRect(x, groundY - h, w, h);
    g.fillStyle(P.top, 1).fillRect(x, groundY - h, w, 6);
    for (let wy = groundY - h + 18; wy < groundY - 20; wy += 22) {
      for (let wx = x + 12; wx < x + w - 14; wx += 20) {
        const lit = r();
        g.fillStyle(lit > P.lit ? 0xffd27a : lit > P.blue ? 0x7a9cff : P.off, 1).fillRect(wx, wy, 10, 12);
      }
    }
  }
  return g;
}

// Стена-перегородка между комнатами с дверным проёмом
function partition(g, x, color) {
  g.fillStyle(0x1e1626, 1).fillRect(x, 0, 70, FLOOR);
  g.fillStyle(color, 1).fillRect(x + 6, 0, 58, FLOOR);
}

export function drawApartment(scene, width) {
  paintApartment(scene, width, { min: state.episode === 'prologue' ? (state.flags.danMet ? 9 * 60 + 10 : state.flags.momLeft ? 7 * 60 + 20 : 6 * 60 + 40) : undefined });
}

export function drawYard(scene, width, opts = {}) {
  const rain = scene.cfg?.rain;
  const wet = typeof rain === 'function' ? rain() : !!rain;
  // Пролог — утро понедельника; в эпизодах время берётся из сюжета/часов
  const min = state.episode === 'prologue' ? 7 * 60 + 25 : undefined;
  paintYard(scene, width, { ...opts, wet, min });
  // Неоновое свечение граффити — им «мигают» сценарии
  scene.graffiti = scene.add.image(1400, 470 - 14 - 112, 'glow').setTint(0x3df0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 0.9).setAlpha(0.22).setDepth(5);
}

// За гаражами: дом с аркой, через арку видна улица
function drawArch(scene, g, opts) {
  const x0 = 2180;
  // Улица за аркой — светлее и живее двора
  bands(g, 2440, 200, 150, FLOOR - 200, [0x3a2a5a, 0x5a3a6a, 0x7a4a6a]);
  g.fillStyle(0x2a2238, 1).fillRect(2440, 330, 150, 130);
  g.fillStyle(0xffd27a, 0.9).fillRect(2452, 350, 30, 40).fillRect(2540, 350, 34, 40);
  if (opts.barberSign) {
    g.fillStyle(0x1a1a22, 1).fillRect(2456, 300, 120, 26);
    scene.add.text(2516, 313, 'ОПАСНАЯ БРИТВА', { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff3d8a' }).setOrigin(0.5);
    // Полосатый столб барбершопа
    for (let y = 330; y < 400; y += 12) g.fillStyle(y % 24 ? 0xffffff : 0xd83a3a, 1).fillRect(2584, y, 6, 12);
  }
  // Дом и арка
  g.fillStyle(0x2c2436, 1).fillRect(x0, 120, 260, FLOOR - 120).fillRect(2590, 120, 2700 - 2590, FLOOR - 120);
  g.fillStyle(0x2c2436, 1).fillRect(2440, 120, 150, 80);
  g.fillStyle(0x3a3046, 1).fillRect(2436, 196, 158, 8);
  for (let y = 140; y < FLOOR - 20; y += 26) for (let x = x0 + 10; x < 2700; x += 34) {
    if (x > 2420 && x < 2600 && y > 190) continue;
    g.fillStyle(0x251f2e, 1).fillRect(x, y, 30, 2);
  }
  // Окна дома
  [[2200, 150], [2290, 150], [2620, 150], [2200, 250], [2620, 250]].forEach(([x, y], i) => {
    g.fillStyle(i % 2 ? 0x15102a : 0xffd27a, 1).fillRect(x, y, 44, 40);
  });
  // Фонарь над аркой
  g.fillStyle(0xffe0a0, 1).fillRect(2506, 206, 18, 8);
  g.fillStyle(0xffe0a0, 0.1).fillTriangle(2515, 214, 2420, FLOOR, 2610, FLOOR);
  if (opts.merc) drawMerc(g, 2215);
  if (opts.openMic) scene.add.image(2660, 300, 'poster_openmic').setDisplaySize(64, 83).setAngle(2);
}

// Старый «Мерс» Рея (боком)
function drawMerc(g, x) {
  const y = FLOOR - 70;
  g.fillStyle(0x8a8c94, 1).fillRect(x, y + 20, 200, 38).fillRect(x + 40, y, 110, 24);
  g.fillStyle(0x2a3a4a, 1).fillRect(x + 48, y + 4, 44, 18).fillRect(x + 98, y + 4, 44, 18);
  g.fillStyle(0x6a6c74, 1).fillRect(x, y + 40, 200, 4);
  g.fillStyle(0xffe8a8, 1).fillRect(x + 194, y + 26, 6, 8);
  g.fillStyle(0xd83a3a, 1).fillRect(x, y + 26, 5, 8);
  g.fillStyle(0x141418, 1).fillCircle(x + 40, y + 60, 15).fillCircle(x + 160, y + 60, 15);
  g.fillStyle(0xb8b8c0, 1).fillCircle(x + 40, y + 60, 6).fillCircle(x + 160, y + 60, 6);
}

// Ванная: плитка, ванна, раковина с зеркалом, унитаз, «Малютка»
export function drawBathroom(scene, width) {
  paintBathroom(scene, width);
}

// Склад, ломбард, барахолка — gfx/places/misc.js
export function drawWarehouse(scene, width) {
  paintWarehouse(scene, width);
}

export function drawPawnshop(scene, width) {
  paintPawnshop(scene, width);
}

export function drawFlea(scene, width) {
  paintFlea(scene, width);
}

export function drawGarage(scene, width) {
  paintGarage(scene, width);
}
