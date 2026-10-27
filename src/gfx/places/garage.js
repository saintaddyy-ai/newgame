// Гараж №17 — студия Дэна. Длинный бокс (стену к соседнему пробили), над крышей — небо двора.
// Экранные x: ворота 69, диван 210, ковёр (за ним туалет) 370, афиша «Арены» 520, комп 730, микрофон 1029.
import Phaser from 'phaser';
import { makeWorld } from '../world.js';
import { m, INK, block, bricks, poster, graffitiTag, floorShadow } from '../paint.js';
import * as I from '../interior.js';
import { farCity, midBlocks } from './common.js';
import { rng, ramp, mix } from '../color.js';
import { GROUND } from '../pix.js';

const { WALL } = I;
const CEIL = WALL - m(2.5);

export function paintGarage(scene, width, { min } = {}) {
  const W = makeWorld(scene, width, { min, time: 'night', key: `garage${width}` });
  const outDark = W.env.dark;
  // Внутри темно всегда, кроме лампы, монитора и ленты; снаружи — небо по времени
  W.sky();
  W.layer(0.22, (p, ctx) => farCity(p, ctx, { seed: 4 }), { name: 'far' });
  W.layer(0.5, (p, ctx) => midBlocks(p, ctx, { seed: 6, trees: true }), { name: 'mid' });
  W.layer(1, (p, ctx) => {
    const r = rng(17);
    const wa = ctx.w;
    // Крыша гаража в разрезе: плита, рубероид, мусор, кошка иногда
    p.rect(0, CEIL - 9, wa, 9, 0x3a3a40);
    p.hline(0, CEIL - 9, wa, 0x5a5a62);
    for (let x = 0; x < wa; x += 3) if (r() < 0.3) p.vline(x, CEIL - 10, 1, 0x2a2a30);
    p.rect(0, CEIL - 2, wa, 2, 0x2a2a30);
    // Стены: шлакоблок, крашенный до середины
    bricks(p, 0, CEIL, wa, WALL - CEIL, { c: 0x6a6a72, r, mortar: 0x4a4a52 });
    p.tint(0, WALL - m(1.1), wa, m(1.1), 0x2a4a5a, 0.45);
    p.hline(0, WALL - m(1.1), wa, 0x3a5a6a);
    // Звукоизоляция у микрофона: поролон «яичной ячейкой»
    for (let y = CEIL + 10; y < WALL - 20; y += 4) for (let x = 470; x < 545; x += 4) {
      p.rect(x, y, 3, 3, (x + y) % 8 ? 0x2a2430 : 0x3a3440);
      p.set(x, y, 0x4a4450);
    }
    p.rect(469, CEIL + 9, 77, 1, INK);
    // Ворота — дверь-объект; вокруг них рама и щель света снизу
    scene.doorSpots.gate = { x: 80, bottom: WALL * 2, kind: 'gate', behind: 'yard', size: [m(2.2), m(2.15)] };
    // Диван
    const sx = 72;
    block(p, sx, WALL - m(0.45), m(2), m(0.45), 0x3a4a6a, { top: 3 });
    block(p, sx + 4, WALL - m(0.85), m(2) - 8, m(0.42), 0x34445e);
    block(p, sx - 4, WALL - m(0.6), 9, m(0.6), 0x2e3c58, { top: 2 });
    block(p, sx + m(2) - 5, WALL - m(0.6), 9, m(0.6), 0x2e3c58, { top: 2 });
    p.rect(sx + 20, WALL - m(0.45) - 6, 16, 6, 0x8a3a4a);
    floorShadow(p, sx, WALL, m(2));
    // Ковёр на стене — за ним дверь в каморку
    I.wallRug(p, 150, CEIL + 10, m(2), m(1.5), { c: 0x8a1f28, r });
    // Афиша «Арены» (картинка из art.js — вешаем объектом), кассетный сборник, полки с хламом
    I.shelf(p, 228, CEIL + 22, m(1.2), { items: 'tapes', r });
    block(p, 236, WALL - m(0.9), m(1.1), m(0.9), 0x5a5a62, { top: 2 });
    for (let k = 0; k < 3; k++) block(p, 240 + k * 12, WALL - m(0.9) - 8, 10, 8, [0xc8642a, 0x3a3a44, 0xd8b040][k], { top: 1 });
    // Колёса в углу
    for (let k = 0; k < 3; k++) {
      p.ellipse(212, WALL - 4 - k * 7, 12, 4, 0x1a1a1e);
      p.ellipse(212, WALL - 4 - k * 7, 7, 2, 0x2a2a30);
    }
    // Стол: комп, пульт, колонки — колонки «дышат» под бит (объекты сцены)
    const deskTop = I.desk(p, 318, { len: m(3.2), c: 0x5a4030 });
    block(p, 336, deskTop - 4, 50, 4, 0x2a2a30, { top: 2 });
    for (let k = 0; k < 12; k++) p.set(340 + k * 4, deskTop - 6, k % 3 ? 0x8a8a9a : 0xff3d8a);
    block(p, 352, deskTop - 26, 30, 20, 0x1a1a1e);
    p.rect(365, deskTop - 6, 4, 4, 0x2a2a30);
    block(p, 392, deskTop - 10, 20, 8, 0x3a3a44, { top: 1 });
    // Системник под столом, провода
    block(p, 400, WALL - m(0.5), 12, m(0.5), 0x2a2a30);
    p.set(406, WALL - m(0.4), 0x3df0ff);
    for (let x = 300; x < 470; x += 2) p.set(x, WALL - 1 - Math.round(Math.sin(x / 9) * 1.5), 0x15151a);
    // Микрофон на стойке с поп-фильтром, наушники на гвозде
    const mx = 514;
    p.rect(mx, WALL - m(1.55), 2, m(1.55), 0x2a2a2a);
    p.rect(mx - 9, WALL - 2, 20, 2, 0x2a2a2a);
    p.line(mx + 1, WALL - m(1.55), mx + 10, WALL - m(1.6), 0x2a2a2a);
    block(p, mx + 9, WALL - m(1.75), 5, 9, 0x8a8a9a);
    p.ellipse(mx + 20, WALL - m(1.68), 4, 6, null, (x, y, dx, dy) => (Math.abs(dx) > 0.7 ? 0x2a2a30 : (x + y) % 2 ? 0x3a3a48 : null));
    p.line(mx + 2, WALL - m(1.2), mx + 16, WALL - m(1.6), 0x2a2a30);
    p.ellipse(500, CEIL + 30, 5, 5, null, (x, y, dx, dy) => (dx * dx + dy * dy > 0.4 ? 0x1a1a1e : null));
    // REC
    p.rect(526, CEIL + 8, 3, 3, 0x6a1a1a);
    p.text('REC', 532, CEIL + 7, 0xff3d3d);
    ctx.emit.push([526, CEIL + 8, 3, 3, 0xff3d3d, 0.4]);
    // Маленький холодильник и чайник, удлинители
    block(p, 440, WALL - m(0.85), m(0.5), m(0.85), 0xd8d8dc, { top: 2 });
    block(p, 444, WALL - m(0.85) - 9, 8, 7, 0x3a6ac8, { top: 1 });
    // Пол: бетон, масляное пятно, коврик под столом
    I.floor(p, 0, wa, { type: 'boards', c: 0x4a4a52, r });
    p.rect(0, WALL, wa, GROUND + 9 - WALL, 0x3e3e46);
    p.speckle(0, WALL, wa, GROUND + 9 - WALL, [0x34343c, 0x4a4a52], 0.12, r);
    p.ellipse(280, GROUND + 2, 30, 3, 0x2a2a30);
    p.rect(320, WALL + 1, m(3.2), 6, 0x5a2a3a);
    for (let x = 322; x < 318 + m(3.2); x += 4) p.set(x, WALL + 3, 0x7a3a4a);
    // Граффити и наклейки на стенах
    graffitiTag(p, 30, CEIL + 30, 0x3df0ff, r);
    graffitiTag(p, 300, CEIL + 20, 0xff3d8a, r);
    poster(p, 288, CEIL + 34, 18, 22, { accent: 0xffd166, title: 'БИТЫ', r });
    // Лампа-«груша» и неоновая лента под потолком
    p.vline(360, CEIL, 14, 0x1a1a1a);
    ctx.lights.push({ x: 360, y: CEIL + 18, r: 150, color: 0xffe8a8, k: 0.85 });
    ctx.emitFns.push((pp) => {
      for (let x = 10; x < wa - 10; x++) pp.set(x, CEIL + 2, x % 40 < 20 ? 0xff3d8a : 0x3df0ff);
      pp.tint(10, CEIL + 3, wa - 20, 3, 0xff3d8a, 0.12);
      pp.rect(358, CEIL + 14, 5, 5, 0xfff0c0);
    });
    ctx.lights.push({ x: 367, y: deskTop - 16, r: 40, color: 0x3df0ff, k: 0.6, glow: false });
  }, { name: 'garage', dark: Math.max(0.6, outDark * 0.9) });

  // Объекты, которые «дышат» под бит
  scene.speakers = [];
  [652, 820].forEach((x) => {
    scene.add.rectangle(x, 2 * (WALL - m(0.75) - 3) - 22, 26, 44, 0x1a1a1e).setStrokeStyle(2, INK).setDepth(3);
    scene.speakers.push(scene.add.circle(x, 2 * (WALL - m(0.75) - 3) - 30, 8, 0x3a3a44).setDepth(3), scene.add.circle(x, 2 * (WALL - m(0.75) - 3) - 12, 5, 0x3a3a44).setDepth(3));
  });
  scene.screen = scene.add.rectangle(734, 2 * (WALL - m(0.75) - 3) - 32, 52, 32, 0x3df0ff).setDepth(3);
  scene.bulbLight = scene.add.image(720, 2 * (CEIL + 18), 'glow').setTint(0xffe8a8).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.08).setDepth(31);
  // Афиша «Арены»
  scene.add.image(520, 2 * (CEIL + 34), 'poster_arena').setDisplaySize(52, 74).setAngle(-2).setDepth(3);
  return W;
}
