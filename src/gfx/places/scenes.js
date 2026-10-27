// Фоны отдельных сцен: титульник, погоня, концерт (вид из зала), итоги.
import { makeWorld } from '../world.js';
import { m, INK, block, bricks, garage, lampPost, trashBins, graffitiTag, graffiti, poster } from '../paint.js';
import { farCity, midBlocks } from './common.js';
import { neonText } from './street.js';
import { rng, ramp, mix } from '../color.js';
import { Pix, ART, GROUND } from '../pix.js';
import { setTimeOverride } from '../time.js';

// Титульник: ночной город с крыши, Марк сидит на краю
export function paintTitle(scene) {
  setTimeOverride(23 * 60 + 30);
  const W = makeWorld(scene, 960, { key: 'title' });
  setTimeOverride(null);
  W.sky();
  W.layer(0.2, (p, ctx) => farCity(p, { ...ctx, base: 205 }, { seed: 7, density: 1.5 }), { name: 'far' });
  W.layer(0.45, (p, ctx) => midBlocks(p, { ...ctx, base: 238 }, { seed: 9, trees: false }), { name: 'mid' });
  W.layer(1, (p, ctx) => {
    // Край крыши на переднем плане, антенна, провода
    p.rect(0, 236, ctx.w, 40, 0x1a1626);
    p.hline(0, 236, ctx.w, 0x3a3448);
    p.rect(0, 232, ctx.w, 4, 0x2a2438);
    p.rect(388, 120, 2, 116, 0x15121c);
    for (let k = 0; k < 4; k++) p.hline(380, 126 + k * 8, 18, 0x15121c);
    ctx.emitFns.push((pp) => pp.rect(388, 118, 2, 2, 0xff3d3d));
    graffiti(p, 40, 246, 'ТЕНЬ', { fill: 0x3df0ff, line: 0xff3d8a, scale: 2 });
  }, { name: 'roofedge' });
  return W;
}

// Погоня: бесшовные полосы фона для tileSprite (гаражи, дворы, асфальт)
export function chaseTextures(scene) {
  if (scene.textures.exists('chase2_far')) return;
  setTimeOverride(23 * 60);
  const far = new Pix(480, 270);
  far.gradV(0, 0, 480, 210, [0x05040b, 0x120d26, 0x221838, 0x3a2242]);
  const fctx = { w: 480, h: 270, base: 210, dark: 1, emit: [], emitFns: [], lights: [] };
  farCity(far, fctx, { seed: 5 });
  fctx.emitFns.forEach((fn) => fn(far));
  far.rect(0, 210, 480, 60, 0x15101c);
  // Склеиваем края, чтобы полоса бесшовно повторялась
  for (let y = 0; y < 270; y++) far.set(479, y, far.getHex(0, y) >= 0 ? far.getHex(0, y) : 0x05040b);
  far.texture(scene, 'chase2_far');
  const near = new Pix(480, 140);
  const r = rng(3);
  for (let x = 0; x < 480; x += 96) garage(near, x, 136, 94, { r, n: 0, c: [0x5a6070, 0x6a5a50, 0x4a5a6a][(x / 96) % 3] });
  near.tint(0, 0, 480, 140, 0x0a0a26, 0.55);
  near.texture(scene, 'chase2_near');
  const ground = new Pix(480, 40);
  ground.rect(0, 0, 480, 40, 0x2e2e36);
  ground.speckle(0, 0, 480, 40, [0x26262e, 0x3a3a42], 0.12, r);
  for (let x = 0; x < 480; x += 60) ground.rect(x, 18, 26, 2, 0x5a5a62);
  ground.texture(scene, 'chase2_ground');
  // Препятствия: коробки, бак, лужа-ограждение, самокат
  const obs = [['box', 22, 18], ['bin', 26, 30], ['cone', 12, 20], ['barrier', 40, 16]];
  obs.forEach(([k, w, h]) => {
    const o = new Pix(w + 2, h + 2);
    if (k === 'box') {
      block(o, 1, 1, w, h, 0xc89a5a);
      o.hline(2, 7, w - 2, 0xa87a3a);
      o.vline(Math.floor(w / 2), 1, h, 0xa87a3a);
    } else if (k === 'bin') {
      block(o, 1, 4, w, h - 3, 0x3a6a4a, { top: 2 });
    } else if (k === 'cone') {
      o.poly([[1, h + 1], [w / 2, 1], [w + 1, h + 1]], 0xff7a2a);
      o.hline(3, Math.floor(h * 0.55), w - 4, 0xe8e8e8);
    } else {
      block(o, 1, 4, w, 6, 0xe8e8e8);
      for (let x = 2; x < w; x += 8) o.rect(x, 5, 4, 4, 0xd83a3a);
      o.rect(4, 10, 2, h - 9, 0x6a6a72);
      o.rect(w - 4, 10, 2, h - 9, 0x6a6a72);
    }
    o.outline(INK);
    o.texture(scene, `chase2_${k}`);
  });
  setTimeOverride(null);
}

// Концерт: сцена «Подвала» анфас — кирпич, неон, прожекторы, колонки
export function paintStageBack(scene, { title = 'ПОДВАЛ', stream = false } = {}) {
  const p = new Pix(480, 270);
  const r = rng(13);
  bricks(p, 0, 0, 480, 160, { c: stream ? 0x6a4a3a : 0x4a2a30, r });
  p.tint(0, 0, 480, 160, 0x0a0614, 0.55);
  // Сцена
  block(p, 70, 150, 340, 14, 0x2a2030, { top: 4 });
  p.rect(70, 164, 340, 30, 0x15101c);
  for (let x = 74; x < 410; x += 12) p.vline(x, 165, 28, 0x1e1828);
  // Колонки и мониторы
  for (const sx of [80, 360]) {
    block(p, sx, 70, 40, 80, 0x111114);
    for (const yy of [92, 128]) {
      p.ellipse(sx + 20, yy, 12, 12, 0x2a2a30);
      p.ellipse(sx + 20, yy, 5, 5, 0x15151a);
    }
  }
  // Стойка микрофона
  p.rect(251, 100, 2, 50, 0x2a2a2a);
  block(p, 249, 94, 6, 8, 0x8a8a9a);
  // Ферма с прожекторами
  p.rect(60, 20, 360, 4, 0x2a2a30);
  for (let x = 90; x < 400; x += 60) block(p, x, 24, 10, 8, 0x1a1a1e);
  // Неон над сценой
  const ctx = { outDark: 1, dark: 1, emitFns: [], lights: [] };
  neonText(p, ctx, 240, 40, title, '#ff3d8a', { scale: 3, board: false });
  ctx.emitFns.forEach((fn) => fn(p));
  graffitiTag(p, 20, 120, 0x3df0ff, r);
  graffitiTag(p, 430, 110, 0xffd166, r);
  poster(p, 24, 60, 22, 30, { accent: 0x3df0ff, r });
  const key = `stage_back_${stream ? 's' : 'p'}`;
  p.texture(scene, key);
  return key;
}

// Зрители со спины: головы, капюшоны, поднятые руки с телефонами
export function crowdBackTextures(scene) {
  const keys = [];
  const r = rng(77);
  for (let i = 0; i < 10; i++) {
    const key = `crowd_back_${i}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;
    const p = new Pix(22, 40);
    const body = [0x15121f, 0x1e1a2e, 0x262036, 0x2a1a2a, 0x1a2228][i % 5];
    const hair = [0x1a1410, 0x3a2416, 0x6b3e26, 0xc8a040, 0x2a2a2a, 0xb03030][Math.floor(r() * 6)];
    p.ellipse(11, 30, 9, 12, body);
    p.ellipse(11, 12, 5, 6, i % 4 === 0 ? body : hair);
    if (i % 3 === 0) {
      // Рука с телефоном вверх
      p.rect(16, 0, 3, 14, body);
      p.rect(15, 0, 5, 4, 0x2a2a34);
      p.set(17, 1, 0x9ad8ff);
    }
    p.outline(INK);
    p.texture(scene, key);
  }
  return keys;
}

export { GROUND, ART };
