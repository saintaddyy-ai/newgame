// Остальные места: метро и поезд, крыша, ночной порт, промзона с кладбищем, набережная,
// склад, ломбард, барахолка под эстакадой, дворы-колодцы.
import Phaser from 'phaser';
import { makeWorld, HORIZON } from '../world.js';
import { m, INK, block, bricks, panels, poster, graffitiTag, graffiti, floorShadow, lampPost, fence, tree, bush, car, puddle, wire, trashBins, flatWindow } from '../paint.js';
import * as I from '../interior.js';
import { farCity, midBlocks } from './common.js';
import { neonText } from './street.js';
import { rng, ramp, mix, hex } from '../color.js';
import { Pix, ART, GROUND } from '../pix.js';

const { WALL, CEIL } = I;
const FACADE = GROUND - 7;

// ---------- Метро ----------
export const LINES = {
  red: { name: 'Заводская', color: 0xe03a3a, wall: 0xd8c8b0, pillar: 'round', accent: 0x8a2a2a },
  green: { name: 'Речная', color: 0x3ab86a, wall: 0xb8d8c0, pillar: 'arch', accent: 0x2a6a4a },
  blue: { name: 'Арбатско-Портовая', color: 0x3a6ae0, wall: 0x9ab0d8, pillar: 'square', accent: 0x1a3a8a },
  cyan: { name: 'Филёвская-2', color: 0x3ad8e8, wall: 0xc8e8f0, pillar: 'thin', accent: 0x2a8a9a },
  ring: { name: 'Кольцевая', color: 0x8a5a2a, wall: 0xe8d8b8, pillar: 'arch', accent: 0x5a3a1a, mosaic: true },
  orange: { name: 'Калужская-Промзона', color: 0xff8a2a, wall: 0xd8b898, pillar: 'square', accent: 0x8a4a1a },
  violet: { name: 'Таганско-Ночная', color: 0x9a3ad8, wall: 0x6a5a8a, pillar: 'round', accent: 0x4a2a6a, neonLine: true },
  yellow: { name: 'Солнечная', color: 0xffd23a, wall: 0xf0e0a0, pillar: 'thin', accent: 0x8a7a2a },
  grey: { name: 'Серпуховская', color: 0x9a9aa8, wall: 0xb8b8c0, pillar: 'square', accent: 0x5a5a68, brutal: true },
  lime: { name: 'Люблинская', color: 0xa8e03a, wall: 0xd0e8b0, pillar: 'round', accent: 0x5a8a2a },
};

const TRACK = 150; // низ путевой стены (за путями)
const RAIL = 190; // уровень рельсов: поезд стоит тут, ниже края платформы
const EDGE = 200; // край платформы

export function paintMetro(scene, width, lineId, stationName) {
  const L = LINES[lineId] || LINES.red;
  const W = makeWorld(scene, width, { outdoor: false, indoorDark: 0.1, key: `metro_${lineId}` });
  W.layer(1, (p, ctx) => {
    const r = rng(lineId.length * 13);
    const wa = ctx.w;
    const wr = ramp(L.wall);
    // Свод станции
    p.gradV(0, 0, wa, 40, [mix(L.wall, 0x2a2430, 0.6), mix(L.wall, 0x4a4450, 0.4)]);
    // Путевая стена: плитка, название станции, полоса цвета линии
    p.rect(0, 30, wa, TRACK - 30, wr[2]);
    if (L.brutal) for (let y = 40; y < TRACK; y += 20) p.hline(0, y, wa, wr[1]);
    else for (let y = 30; y < TRACK; y += 6) for (let x = ((y / 6) % 2) * 5; x < wa; x += 10) p.vline(x, y, 6, wr[1]);
    p.rect(0, 30, wa, 4, L.color);
    p.rect(0, TRACK - 30, wa, 6, L.accent);
    for (let x = 160; x < wa; x += 450) {
      block(p, x - 80, 56, 160, 26, L.accent);
      neonText(p, ctx, x, 63, stationName.toUpperCase(), '#ffffff', { scale: 2, board: false });
    }
    if (L.mosaic) for (let x = 380; x < wa; x += 450) for (let i = 0; i < 48; i++) p.rect(x + (i % 8) * 5, 50 + Math.floor(i / 8) * 5, 4, 4, [0xd83a3a, 0xffd166, 0x3a6ac8, 0x3a8a5a, 0xe8e8e8][Math.floor(r() * 5)]);
    if (L.neonLine) ctx.emitFns.push((pp) => {
      pp.hline(0, TRACK - 32, wa, 0xff3d8a);
      pp.tint(0, TRACK - 34, wa, 5, 0xff3d8a, 0.25);
    });
    // Путь: тёмная яма, шпалы, рельсы, контактный рельс
    p.rect(0, TRACK, wa, EDGE - TRACK, 0x15151a);
    for (let x = 0; x < wa; x += 6) p.rect(x, RAIL - 3, 4, 3, 0x2a241e);
    p.hline(0, RAIL - 4, wa, 0x8a8a92);
    p.hline(0, RAIL - 6, wa, 0x5a5a62);
    p.rect(0, TRACK + 6, wa, 2, 0x3a3a40);
    // Край платформы: жёлтая полоса, гранит
    p.rect(0, EDGE, wa, 3, 0xd8d040);
    p.rect(0, EDGE + 3, wa, 270 - EDGE - 3, mix(0x8a8a90, L.wall, 0.15));
    for (let x = 0; x < wa; x += 14) p.vline(x, EDGE + 3, 270 - EDGE, 0x7a7a80);
    for (let y = EDGE + 8; y < 270; y += 9) p.hline(0, y, wa, 0x7a7a80);
    p.speckle(0, EDGE + 3, wa, 270 - EDGE, [0x9a9aa0, 0x6a6a72], 0.05, r);
    // Колонны вдоль платформы — заслоняют пути, но не героя
    for (let x = 80; x < wa; x += 170) {
      const cw = L.pillar === 'thin' ? 8 : L.pillar === 'round' ? 22 : 26;
      const top = 0;
      const pr = ramp(mix(L.wall, 0x8a8478, 0.4));
      p.rect(x - cw / 2, top, cw, FACADE - top, pr[2]);
      p.vline(x - cw / 2, top, FACADE, pr[3]);
      p.vline(x - cw / 2 + 1, top, FACADE, pr[3]);
      p.rect(x + cw / 2 - 3, top, 3, FACADE, pr[1]);
      if (L.pillar === 'arch') {
        p.rect(x - cw / 2 - 4, 30, cw + 8, 6, pr[3]);
        p.rect(x - cw / 2 - 2, FACADE - 6, cw + 4, 6, pr[1]);
      }
      p.rect(x - cw / 2, top, 1, FACADE, INK);
      p.rect(x + cw / 2, top, 1, FACADE, INK);
      floorShadow(p, x - cw / 2, FACADE, cw);
      // Светильник на колонне
      block(p, x - 8, 26, 16, 4, 0xe8e0c8);
      ctx.emit.push([x - 7, 29, 14, 1, 0xfff6e0, 0.3]);
      ctx.lights.push({ x, y: 32, r: 90, color: 0xfff0d0, k: 0.5, glow: false });
    }
    // Скамейка и табло
    block(p, wa / 2 - 30, FACADE - m(0.45), 60, 3, 0x6a4a30, { top: 2 });
    block(p, 440, 8, 40, 12, 0x1a1a1e);
    ctx.emitFns.push((pp) => pp.text('02:14', 460, 11, 0xff6a3a, { align: 'center' }));
  }, { name: `metro_${lineId}`, dark: 0.12 });
  scene.metroLine = L;
  return W;
}

function trainTexture(scene, lineId) {
  const L = LINES[lineId] || LINES.red;
  const key = `train_${lineId}`;
  if (scene.textures.exists(key)) return key;
  const carW = m(9);
  const n = 4;
  const p = new Pix(carW * n + 4, m(3.4) + 4);
  const H = p.h - 2;
  for (let i = 0; i < n; i++) {
    const x = 2 + i * carW;
    const body = ramp(0x6a7a8a);
    p.rect(x, 2, carW - 3, H - 8, body[2]);
    p.hline(x, 2, carW - 3, body[3]);
    p.rect(x, 2 + Math.floor(H * 0.62), carW - 3, 6, L.color);
    // Двери и окна с пассажирами
    for (let d = 0; d < 3; d++) {
      const dx = x + 20 + d * Math.floor((carW - 40) / 2);
      p.rect(dx - 9, 10, 18, H - 18, body[1]);
      p.rect(dx - 7, 14, 6, 34, 0xfff0c8);
      p.rect(dx + 1, 14, 6, 34, 0xfff0c8);
      p.vline(dx, 10, H - 18, INK);
    }
    for (let w = 0; w < 2; w++) {
      const wx = x + 38 + w * Math.floor((carW - 40) / 2);
      p.rect(wx, 14, 34, 24, 0xfff0c8);
      for (let k = 0; k < 3; k++) {
        p.ellipse(wx + 6 + k * 11, 26, 3, 4, 0x3a3440);
        p.rect(wx + 3 + k * 11, 29, 7, 9, 0x3a3440);
      }
    }
    p.rect(x, H - 8, carW - 3, 8, 0x2a2a30);
    p.ellipse(x + 18, H - 2, 6, 3, 0x111114);
    p.ellipse(x + carW - 22, H - 2, 6, 3, 0x111114);
  }
  p.outline(INK);
  p.texture(scene, key);
  return key;
}

// Поезд приезжает (справа налево, за героем) и уезжает
export function trainArrive(scene, width, lineId, { leave = true } = {}) {
  const key = trainTexture(scene, lineId);
  const img = scene.add.image(width + 50, RAIL * ART + 4, key).setOrigin(0, 1).setScale(ART).setDepth(-5);
  const glow = scene.add.rectangle(width + 50, RAIL * ART - 120, img.displayWidth, 140, 0xfff0c8, 0.06).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(-4);
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: [img, glow], x: 0, duration: 1800, ease: 'Cubic.out',
      onComplete: () => {
        if (!leave) return resolve(img);
        scene.time.delayedCall(1200, () => scene.tweens.add({ targets: [img, glow], x: -img.displayWidth - 100, duration: 1600, ease: 'Cubic.in', onComplete: () => {
          img.destroy();
          glow.destroy();
          resolve(null);
        } }));
      },
    });
  });
}

// ---------- Крыша ----------
export function paintRooftop(scene, width) {
  const W = makeWorld(scene, width, { key: 'rooftop' });
  W.sky({ clouds: true });
  W.layer(0.15, (p, ctx) => farCity(p, { ...ctx, base: HORIZON + 30 }, { seed: 77, density: 1.6 }), { name: 'far' });
  W.layer(0.35, (p, ctx) => {
    const r = rng(9);
    // Крыши соседних домов внизу, огни окон
    for (let x = -10; x < ctx.w; x += 50 + r() * 40) {
      const top = HORIZON + 20 + r() * 30;
      p.rect(x, top, 46, ctx.h - top, mix(0x3a3448, 0x15102a, ctx.dark));
      for (let y = top + 6; y < ctx.h; y += 8) for (let wx = x + 4; wx < x + 42; wx += 6) if (r() < 0.3 && ctx.dark > 0.3) ctx.emit.push([wx, y, 2, 3, r() < 0.8 ? 0xffd27a : 0xff3d8a, 0]);
    }
  }, { name: 'below' });
  W.layer(1, (p, ctx) => {
    const r = rng(5);
    const wa = ctx.w;
    // Парапет и кровля
    p.rect(0, FACADE - 10, wa, ctx.h, 0x3a3448);
    p.speckle(0, FACADE - 10, wa, ctx.h, [0x2e2a3a, 0x4a4458], 0.1, r);
    p.rect(0, FACADE - 14, wa, 4, 0x5a5468);
    p.hline(0, FACADE - 14, wa, 0x7a7488);
    // Вентиляция, выход на крышу, антенны, провода
    for (let x = 60; x < wa; x += 200) {
      block(p, x, FACADE - m(1.4), 30, m(1.4) - 10, 0x5a5468, { top: 3 });
      p.rect(x + 4, FACADE - m(1.4) + 6, 22, 3, 0x2a2430);
    }
    block(p, 300, FACADE - m(2.6), 50, m(2.6) - 10, 0x4a4458, { top: 3 });
    block(p, 314, FACADE - m(2.1), 22, m(2.1) - 10, 0x2a2a30);
    p.rect(wa - 100, FACADE - m(5), 2, m(5) - 10, 0x1a1a22);
    for (let k = 0; k < 4; k++) p.hline(wa - 108, FACADE - m(5) + 6 + k * 8, 18, 0x1a1a22);
    ctx.emitFns.push((pp) => pp.rect(wa - 100, FACADE - m(5) - 2, 2, 2, 0xff3d3d));
    graffiti(p, 120, FACADE - 34, 'ТЕНЬ', { fill: 0xffd166, line: 0x3a2a50, scale: 2 });
  }, { name: 'roof' });
  return W;
}

// ---------- Ночной порт ----------
export function paintPort(scene, width) {
  const W = makeWorld(scene, width, { time: 'night', key: 'port' });
  W.sky();
  W.layer(0.25, (p, ctx) => {
    const r = rng(31);
    // Краны и контейнеры на том берегу
    for (let x = 30; x < ctx.w; x += 160) {
      const cc = mix(0x2a2238, 0x5a5a6a, 1 - ctx.dark);
      p.rect(x, ctx.base - 90, 5, 90, cc);
      p.rect(x, ctx.base - 90, 60, 4, cc);
      p.rect(x + 56, ctx.base - 86, 2, 30, cc);
      if (ctx.dark > 0.3) ctx.emit.push([x + 1, ctx.base - 92, 2, 2, 0xff3d3d, 0.2]);
    }
    for (let x = 0; x < ctx.w; x += 26) p.rect(x, ctx.base - 12 - (Math.floor(x / 26) % 2) * 10, 24, 12, [0x8a2a2a, 0x2a4a6a, 0x3a6a3a, 0x8a6a2a][Math.floor(r() * 4)]);
  }, { name: 'cranes' });
  W.layer(1, (p, ctx) => {
    const r = rng(7);
    const wa = ctx.w;
    // Вода с отражениями огней
    p.rect(0, HORIZON + 6, wa, FACADE - 20 - HORIZON - 6, 0x0a1020);
    for (let i = 0; i < wa / 6; i++) {
      const x = Math.floor(r() * wa);
      const y = HORIZON + 8 + Math.floor(r() * (FACADE - 30 - HORIZON));
      ctx.emit.push([x, y, 4 + Math.floor(r() * 8), 1, [0xff3d8a, 0xffd27a, 0x3df0ff][Math.floor(r() * 3)], 0]);
    }
    // Причал, кнехты, ограждение
    p.rect(0, FACADE - 20, wa, 6, 0x4a4a52);
    p.hline(0, FACADE - 20, wa, 0x6a6a72);
    for (let x = 30; x < wa; x += 90) block(p, x, FACADE - 26, 6, 6, 0x2a2a30, { top: 1 });
    // Бетон и асфальт, вывески ночного города
    p.rect(0, FACADE - 14, wa, ctx.h, 0x2e2e36);
    p.speckle(0, FACADE - 14, wa, ctx.h, [0x26262e, 0x3a3a42], 0.1, r);
    // Здания у причала с неоном
    [[180, 'ОТЕЛЬ «ПРИЧАЛ»', '#ff3d8a'], [700, 'БАР 24', '#3df0ff'], [1160, 'САУНА', '#ffd166']].forEach(([x, t, c]) => {
      const bw = 130;
      bricks(p, x, 40, bw, FACADE - 54, { c: 0x5a4a50, r });
      p.rect(x, FACADE - 54, bw, 40, 0x2a2430);
      for (let wx = x + 10; wx < x + bw - 14; wx += 24) flatWindow(p, wx, 70, 14, 20, { r, curtains: false });
      neonText(p, ctx, x + bw / 2, 50, t, c, { scale: 2 });
      block(p, x + bw / 2 - 10, FACADE - 14 - m(2.1), 20, m(2.1), 0x2a2a30);
    });
    for (let x = 400; x < wa; x += 520) {
      const L = lampPost(p, x, FACADE - 10, 6, { style: 'city' });
      ctx.lights.push({ x: L.x, y: L.y, r: 80, color: 0xffd0a0, ground: GROUND + 4, cone: true });
    }
  }, { name: 'port' });
  return W;
}

// ---------- Промзона и старое кладбище ----------
export function paintPromzona(scene, width) {
  const W = makeWorld(scene, width, { key: 'promzona' });
  W.sky();
  W.layer(0.3, (p, ctx) => {
    const r = rng(3);
    for (let x = 60; x < ctx.w; x += 230) {
      const c = mix(0x4a4450, 0x15102a, ctx.dark * 0.6);
      p.rect(x, ctx.base - 120, 12, 120, c);
      for (let y = ctx.base - 116; y < ctx.base - 20; y += 18) p.rect(x, y, 12, 5, mix(c, 0xc03a3a, 0.5));
      block(p, x - 40, ctx.base - 50, 90, 50, mix(c, 0x6a6a72, 0.2), { outline: false });
      if (ctx.dark > 0.3) for (let k = 0; k < 6; k++) ctx.emit.push([x - 36 + k * 14, ctx.base - 40, 4, 3, 0xffb86a, 0]);
    }
  }, { name: 'factory' });
  W.layer(1, (p, ctx) => {
    const r = rng(4);
    const wa = ctx.w;
    // Бетонный забор с колючкой
    p.rect(0, FACADE - m(2.2), wa, m(2.2) - 20, 0x7a7680);
    for (let x = 0; x < wa; x += m(2)) {
      p.vline(x, FACADE - m(2.2), m(2.2) - 20, 0x5a5662);
      for (let y = FACADE - m(2.2) + 6; y < FACADE - 26; y += 8) p.hline(x + 6, y, m(2) - 12, 0x6e6a74);
    }
    for (let x = 0; x < wa; x += 3) p.set(x, FACADE - m(2.2) - 2 - (x % 6 === 0 ? 1 : 0), 0x3a3a40);
    graffiti(p, 180, FACADE - m(1.7), 'ДЫШИ', { fill: 0x8ae6a0, line: 0x2a2430, scale: 2 });
    graffitiTag(p, 700, FACADE - 50, 0xff3d8a, r);
    // Старое кладбище: кресты, оградки, берёзы
    for (let x = 440; x < 1000; x += 46) {
      const cx = x + Math.floor(r() * 10);
      p.rect(cx, FACADE - 34, 3, 30, 0x2a2a30);
      p.rect(cx - 7, FACADE - 26, 17, 3, 0x2a2a30);
      p.rect(cx - 16, FACADE - 10, 34, 1, 0x3a3a44);
      for (let k = cx - 16; k < cx + 18; k += 4) p.vline(k, FACADE - 10, 8, 0x3a3a44);
    }
    for (let x = 470; x < 1000; x += 140) tree(p, x, FACADE - 4, 6, { r, c: 0xd8d0c0, leaves: 0.6, leaf: 0xd8b040 });
    // Земля: грязь, трава
    p.rect(0, FACADE - 6, wa, ctx.h, 0x4a3e30);
    p.speckle(0, FACADE - 6, wa, ctx.h, [0x3a3024, 0x5a4a38], 0.12, r);
    for (let x = 0; x < wa; x += 2) if (r() < 0.6) p.vline(x, FACADE - 8 - Math.floor(r() * 4), 4, [0x4a6a3a, 0x5a7a44, 0x3a5a2e][Math.floor(r() * 3)]);
    ctx.post.push((pp) => [300, 1100].forEach((x) => puddle(pp, x, GROUND + 10, 50, 4)));
  }, { name: 'promzona' });
  // Дым из труб
  for (let x = 120; x < width; x += 460) {
    scene.add.particles(x, 260, 'dot', {
      speedY: { min: -30, max: -15 }, speedX: { min: 5, max: 20 }, lifespan: 4000, scale: { start: 0.8, end: 3 },
      alpha: { start: 0.2, end: 0 }, tint: 0x8a8a9a, frequency: 400,
    }).setScrollFactor(0.3, 1).setDepth(-20);
  }
  return W;
}

// ---------- Набережная у «Речной» ----------
export function paintRechnaya(scene, width, { samizdat = true } = {}) {
  const W = makeWorld(scene, width, { key: 'rechnaya' });
  W.sky();
  W.layer(0.2, (p, ctx) => farCity(p, ctx, { seed: 12 }), { name: 'far' });
  W.layer(1, (p, ctx) => {
    const r = rng(12);
    const wa = ctx.w;
    // Река с бликами
    const water = mix(0x2a4a5a, 0x0a1428, ctx.dark);
    p.rect(0, HORIZON, wa, FACADE - 18 - HORIZON, water);
    for (let i = 0; i < wa / 4; i++) {
      const x = Math.floor(r() * wa);
      const y = HORIZON + 2 + Math.floor(r() * (FACADE - 22 - HORIZON));
      p.rect(x, y, 3 + Math.floor(r() * 10), 1, mix(water, 0x9ab0d8, 0.3));
    }
    // Гранитный парапет, фонари, решётка
    p.rect(0, FACADE - 18, wa, 8, 0x6a6a74);
    p.hline(0, FACADE - 18, wa, 0x8a8a94);
    for (let x = 0; x < wa; x += 5) p.vline(x, FACADE - 32, 14, 0x3a3a44);
    p.hline(0, FACADE - 33, wa, 0x4a4a54);
    p.rect(0, FACADE - 10, wa, ctx.h, 0x5a5662);
    for (let x = 0; x < wa; x += m(1)) p.vline(x, FACADE - 10, ctx.h, 0x4e4a56);
    for (let x = 150; x < wa; x += 360) {
      const L = lampPost(p, x, FACADE - 10, 5.5, { style: 'city', c: 0x2a2a34 });
      ctx.lights.push({ x: L.x, y: L.y, r: 76, color: 0xffe0a0, ground: GROUND + 4, cone: true });
    }
    for (let x = 60; x < wa; x += 300) {
      block(p, x, FACADE - 10 - m(0.45), m(1.8), 3, 0x6a4a30, { top: 2 });
      p.rect(x + 4, FACADE - 10 - m(0.45) + 3, 2, m(0.45) - 3, 0x2a2a30);
      p.rect(x + m(1.8) - 6, FACADE - 10 - m(0.45) + 3, 2, m(0.45) - 3, 0x2a2a30);
    }
    if (samizdat) {
      // Подвальчик «САМИЗДАТ»
      const x = 740;
      bricks(p, x, FACADE - m(3.4), 110, m(3.4) - 10, { c: 0x5a5056, r });
      block(p, x + 35, FACADE - 10 - m(2.1), m(1.1), m(2.1), 0x1a1a1e);
      neonText(p, ctx, x + 55, FACADE - m(3.1), 'САМИЗДАТ', '#8ae6a0', { scale: 2 });
      poster(p, x + 82, FACADE - m(1.8), 14, 18, { accent: 0x8ae6a0, r });
    }
  }, { name: 'river' });
  return W;
}

// ---------- Склад «ЛогистЛайн» ----------
export function paintWarehouse(scene, width) {
  const W = makeWorld(scene, width, { outdoor: false, indoorDark: 0.2, key: 'warehouse' });
  W.layer(1, (p, ctx) => {
    const r = rng(8);
    const wa = ctx.w;
    // Профнастил, фермы под крышей
    const wr = ramp(0x6a7078);
    p.rect(0, 0, wa, WALL, wr[2]);
    for (let x = 0; x < wa; x += 4) p.vline(x, 30, WALL - 30, x % 8 ? wr[1] : wr[3]);
    p.rect(0, 0, wa, 30, 0x2a2c32);
    for (let x = 0; x < wa; x += 60) {
      p.line(x, 30, x + 30, 6, 0x4a4a52);
      p.line(x + 30, 6, x + 60, 30, 0x4a4a52);
    }
    p.hline(0, 30, wa, 0x4a4a52);
    // Лампы дневного света
    for (let x = 60; x < wa; x += 150) {
      block(p, x, 34, 40, 3, 0xe8f4ff);
      ctx.emit.push([x + 1, 36, 38, 1, 0xf4faff, 0.3]);
      ctx.lights.push({ x: x + 20, y: 38, r: 110, color: 0xe8f4ff, k: 0.5, glow: false });
    }
    // Стеллажи с коробками
    for (let x = 150; x < 560; x += 130) {
      p.rect(x, 60, 3, WALL - 60, 0x2a5aa8);
      p.rect(x + 100, 60, 3, WALL - 60, 0x2a5aa8);
      for (let y = 90; y < WALL; y += 46) {
        p.rect(x, y, 103, 3, 0xff8a20);
        for (let b = x + 5; b < x + 95; b += 24) if (r() < 0.85) {
          const bh = 14 + Math.floor(r() * 10);
          block(p, b, y - bh, 20, bh, 0xc89a5a, { top: 1 });
          p.hline(b + 1, y - bh + 5, 18, 0xa87a3a);
        }
      }
    }
    // Ворота под фуру, погрузчик
    block(p, 630, WALL - m(3.2), 110, m(3.2), 0x1a1c20);
    for (let y = WALL - m(3.2) + 4; y < WALL; y += 5) p.hline(632, y, 106, 0x26282c);
    p.rect(630, WALL - m(3.2) - 4, 110, 4, 0xd8b040);
    for (let x = 630; x < 740; x += 8) p.rect(x, WALL - m(3.2) - 4, 4, 4, 0x1a1a1e);
    block(p, 70, WALL - m(1.5), 40, m(1.2), 0xffc020);
    block(p, 80, WALL - m(2.2), 22, m(0.8), 0xffc020);
    p.rect(110, WALL - m(2.4), 3, m(2.4), 0x2a2a2a);
    p.ellipse(82, WALL - 5, 6, 6, 0x1a1a1e);
    p.ellipse(105, WALL - 4, 5, 5, 0x1a1a1e);
    // Табличка
    block(p, 20, 50, 100, 20, 0xff8a20);
    p.text('ЛОГИСТЛАЙН', 70, 57, 0x1a1c20, { align: 'center' });
    p.text('УРОНИЛ — ЗАПЛАТИЛ', 70, 76, 0xff8a20, { align: 'center' });
    // Пол: бетон с разметкой
    p.rect(0, WALL, wa, ctx.h, 0x3a3c42);
    p.speckle(0, WALL, wa, ctx.h, [0x32343a, 0x44464c], 0.1, r);
    for (let x = 0; x < wa; x += 40) p.rect(x, GROUND + 6, 20, 2, 0xd8b040);
  }, { name: 'warehouse', dark: 0.2 });
  return W;
}

// ---------- Ломбард ----------
export function paintPawnshop(scene, width) {
  const W = makeWorld(scene, width, { outdoor: false, indoorDark: 0.3, key: 'pawnshop' });
  W.layer(1, (p, ctx) => {
    const r = rng(24);
    const wa = ctx.w;
    I.upstairs(p, 0, wa, { c: 0x4a3a30, r, ctx });
    I.wallpaper(p, 0, CEIL, wa, WALL - CEIL, { c: 0x5a3a2c, pattern: 'stripes', r });
    I.baseboard(p, 0, wa);
    // Полки: гитары, телевизоры, магнитофоны
    for (const [x, c] of [[24, 0xc8642a], [56, 0x2a2a2a], [88, 0xd8b040]]) {
      p.ellipse(x + 8, WALL - 22, 10, 12, c);
      p.ellipse(x + 8, WALL - 22, 3, 3, 0x1a1a1e);
      p.rect(x + 6, WALL - m(1.75), 4, m(1.75) - 32, mix(c, 0x3a2a20, 0.5));
      p.rect(x + 4, WALL - m(1.8), 8, 6, 0x2a2a2a);
    }
    I.shelf(p, 130, CEIL + 30, 90, { items: 'tapes', r });
    for (let k = 0; k < 3; k++) {
      block(p, 132 + k * 30, CEIL + 50, 26, 20, 0x2a2a30);
      p.rect(135 + k * 30, CEIL + 53, 20, 14, 0x6a8aaa);
    }
    // Вывеска
    block(p, 290, CEIL + 2, 100, 10, 0xd8b040);
    p.text('ЛОМБАРД 24', 340, CEIL + 4, 0x2a1e1a, { align: 'center' });
    scene.doorSpots.out = { x: 950, bottom: WALL * 2, kind: 'shop', behind: 'street' };
    const L = I.ceilingLamp(p, 340);
    ctx.lights.push({ x: L.x, y: L.y, r: 140, color: 0xffd8a0, k: 0.8 });
    I.floor(p, 0, wa, { type: 'boards', c: 0x4a3426, r });
  }, { name: 'pawn' });
  // Прилавок с решёткой — перед Лёвой, но за героем
  W.layer(1, (p) => {
    block(p, 260, GROUND - m(1.05), 160, m(1.05), 0x5a3a2a, { top: 3 });
    p.rect(266, GROUND - m(1.05) + 4, 148, 16, 0x8ab4c8);
    for (const [x, c] of [[272, 0xffd166], [300, 0xd8d8e0], [340, 0xffd166], [380, 0xe8e0d0]]) p.rect(x, GROUND - m(1.05) + 12, 8, 4, c);
    for (let x = 260; x <= 420; x += 8) p.vline(x, CEIL + 12, GROUND - m(1.05) - CEIL - 12, 0x6a6a72);
    p.hline(260, CEIL + 12, 161, 0x6a6a72);
  }, { name: 'pawnfront', depth: 15, dark: 0.3 });
  return W;
}

// ---------- Барахолка под эстакадой ----------
export function paintFlea(scene, width) {
  const W = makeWorld(scene, width, { time: 'night', key: 'flea' });
  W.sky();
  W.layer(0.3, (p, ctx) => farCity(p, ctx, { seed: 21 }), { name: 'far' });
  W.layer(1, (p, ctx) => {
    const r = rng(19);
    const wa = ctx.w;
    // Эстакада над головой
    p.rect(0, 20, wa, 26, 0x4a4a54);
    p.hline(0, 20, wa, 0x6a6a74);
    p.rect(0, 46, wa, 4, 0x2a2a30);
    for (let x = 40; x < wa; x += 200) {
      p.rect(x, 50, 24, FACADE - 50, 0x5a5a64);
      p.vline(x, 50, FACADE - 50, 0x6a6a74);
      p.rect(x + 20, 50, 4, FACADE - 50, 0x3a3a44);
      graffitiTag(p, x + 2, 120, [0xff3d8a, 0x3df0ff, 0xffd166][Math.floor(r() * 3)], r);
    }
    // Гирлянда
    for (let x = 4; x < wa; x += 9) {
      const y = 62 + Math.round(Math.sin(x / 30) * 5);
      p.set(x, y - 1, 0x2a2a30);
      if (ctx.dark > 0.3) ctx.emit.push([x, y, 2, 2, [0xffd166, 0xff3d8a, 0x3df0ff][Math.floor(x / 9) % 3], 0.3]);
      else p.rect(x, y, 2, 2, [0xd8b040, 0xc84a7a, 0x4aa8c0][Math.floor(x / 9) % 3]);
    }
    // Прилавки под тентами с товаром
    [[80, 0x2a6a8a], [260, 0x8a2a4a], [450, 0x4a6a2a], [630, 0x6a4a8a]].forEach(([x, c]) => {
      const w = 130;
      for (let k = 0; k < w; k += 8) p.poly([[x + k, 110], [x + k + 8, 110], [x + k + 10, 122], [x + k + 2, 122]], (k / 8) % 2 ? c : 0xe8e0d0);
      p.rect(x, 122, 3, FACADE - 122, 0x3a3a3a);
      p.rect(x + w - 3, 122, 3, FACADE - 122, 0x3a3a3a);
      block(p, x + 6, FACADE - m(0.85), w - 12, 4, 0x5a3a2a, { top: 3 });
      p.rect(x + 10, FACADE - m(0.85) + 4, 3, m(0.85) - 4, 0x3a2a20);
      p.rect(x + w - 14, FACADE - m(0.85) + 4, 3, m(0.85) - 4, 0x3a2a20);
      for (let i = 0; i < 8; i++) block(p, x + 10 + i * 14, FACADE - m(0.85) - 6, 9, 6, [0xe8e0d0, 0x2a2a2a, 0xd83a3a, 0x8a8a9a][i % 4], { top: 1 });
      ctx.lights.push({ x: x + w / 2, y: 124, r: 70, color: 0xffd8a0, k: 0.7, glow: true });
      p.rect(x + w / 2, 122, 2, 4, 0xfff0c0);
    });
    neonText(p, ctx, wa / 2, 30, 'СТ. ЗАВОДСКАЯ', '#ff3d3d', { scale: 2, board: false });
    p.text('ЗВУК · ПРОВОДА · МИКРОФОНЫ', 515, 100, 0xffd166, { align: 'center', shadow: INK });
    p.rect(0, FACADE - 4, wa, ctx.h, 0x34343c);
    p.speckle(0, FACADE - 4, wa, ctx.h, [0x2a2a32, 0x3e3e46], 0.1, r);
  }, { name: 'flea' });
  return W;
}

// ---------- Дворы-колодцы (кафе-квартал) ----------
export function paintCourtyards(scene, width) {
  const W = makeWorld(scene, width, { key: 'courtyards' });
  W.sky();
  W.layer(1, (p, ctx) => {
    const r = rng(41);
    const wa = ctx.w;
    bricks(p, 0, 0, wa, FACADE, { c: 0x8a5a48, r });
    for (let x = 40; x < wa; x += 120) {
      flatWindow(p, x, FACADE - m(3.6), m(1.2), m(1.4), { r });
      flatWindow(p, x + 30, FACADE - m(6.6), m(1.2), m(1.4), { r });
      if (ctx.dark > 0.3 && r() < 0.5) ctx.emit.push([x + 2, FACADE - m(3.6) + 2, m(1.2) - 4, m(1.4) - 4, 0xffd27a, 0.15]);
    }
    p.text('САМИЗДАТ', 300, FACADE - m(2.2), 0xff3d8a, { shadow: INK });
    p.text('ТИШИНА — ТОЖЕ БИТ', 290, FACADE - m(2.2) + 10, 0x3df0ff, { shadow: INK });
    graffitiTag(p, 520, FACADE - 40, 0xffd166, r);
    for (let x = 0; x < wa; x += 200) wire(p, x, 20, x + 200, 26, 8);
    trashBins(p, 700, FACADE, 3);
    p.rect(0, FACADE - 2, wa, ctx.h, 0x3e3e46);
    p.speckle(0, FACADE - 2, wa, ctx.h, [0x34343c, 0x4a4a52], 0.1, r);
    const L = lampPost(p, 450, FACADE, 5, { style: 'yard' });
    ctx.lights.push({ x: L.x, y: L.y, r: 76, color: 0xffe0a0, ground: GROUND + 4, cone: true });
    ctx.post.push((pp) => [200, 620].forEach((x) => puddle(pp, x, GROUND + 10, 50, 4)));
  }, { name: 'court' });
  return W;
}
