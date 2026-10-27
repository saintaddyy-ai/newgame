// Квартира Марка в разрезе дома: спальня, кухня, прихожая; сверху — соседи, снизу — перекрытие.
// Экранные x предметов из сценариев: кровать 200, окно 480, стол 630–690, холодильник 872,
// плита/кран 985, стол с бумагами 1190, пальто 1480, зеркало 1605, ванная 1703, входная 1840.
import { makeWorld } from '../world.js';
import { darkness } from '../time.js';
import { worldMinutes } from '../time.js';
import { m, INK, block, poster, graffitiTag } from '../paint.js';
import * as I from '../interior.js';
import { rng, mix } from '../color.js';

const { WALL, CEIL } = I;

export function paintApartment(scene, width, { min, momHome = true } = {}) {
  const t = min ?? worldMinutes('morning');
  const dark = darkness(t);
  const W = makeWorld(scene, width, { min: t, outdoor: false, indoorDark: dark * 0.82, key: `apt${width}` });
  const night = dark > 0.45;
  W.layer(1, (p, ctx) => {
    const r = rng(12);
    const wa = ctx.w;
    // Соседи сверху (над каждой комнатой — своя квартира)
    I.upstairs(p, 0, 387, { c: 0x5a4a3a, r, ctx });
    I.upstairs(p, 387, 300, { c: 0x3a4a4a, r, ctx });
    I.upstairs(p, 687, wa - 687, { c: 0x4a3a4a, r, ctx });

    // ---- Спальня 0..370 ----
    I.wallpaper(p, 0, CEIL, 384, WALL - CEIL, { c: 0x40344f, pattern: 'flowers', r });
    I.baseboard(p, 0, 384);
    I.wallRug(p, 52, CEIL + 16, m(2.1), m(1.25), { r });
    I.bed(p, 56, { len: m(2.05) });
    I.nightstand(p, 30);
    I.wallPhone(p, 38, WALL - m(1.45));
    // Плакат «Тень» над столом и самодельная афиша
    poster(p, 150, CEIL + 22, 26, 34, { accent: 0x3df0ff, title: 'РЭП', r });
    // Окно с видом во двор
    I.roomWindow(p, 214, CEIL + 22, m(1.3), m(1.35), { view: I.windowView(ctx), curtain: 0x7a5a8a, r });
    I.plantPot(p, 222, CEIL + 22 + m(1.35) + 2);
    // Стол с тетрадью и лампой, стул, полка с кассетами
    const deskTop = I.desk(p, 292, { len: m(1.35) });
    p.rect(305, deskTop - 2, 18, 3, 0xf1ead8);
    p.rect(305, deskTop - 2, 2, 3, 0xd86a6a);
    p.rect(326, deskTop - 3, 8, 3, 0x2a2a30);
    const lamp = I.deskLamp(p, 343, deskTop);
    I.chair(p, 300, { flip: true });
    I.shelf(p, 296, CEIL + 34, m(1.2), { items: 'tapes', r });
    I.shelf(p, 296, CEIL + 52, m(1.2), { items: 'books', r });
    // Кроссовки и рюкзак на полу
    p.rect(180, WALL + 1, 9, 3, 0xeeeeee);
    p.rect(180, WALL + 4, 9, 1, 0xb8b8c0);
    block(p, 268, WALL - 16, 12, 16, 0x2a3a5a, { top: 2 });
    if (night) {
      ctx.lights.push({ x: lamp.x, y: lamp.y, r: 70, color: 0xffd8a0, k: 0.95 });
      ctx.emit.push([lamp.x - 2, lamp.y, 5, 2, 0xfff0c0, 0.3]);
    }
    // Свет из окна днём и на рассвете
    ctx.lights.push({ x: 236, y: CEIL + 40, r: 120, color: night ? 0x8a9ad8 : 0xe8e0ff, k: night ? 0.35 : 0.6, glow: false });
    I.floor(p, 0, 384, { type: 'boards', c: 0x6a4a34, r });

    // ---- Перегородка и проём в кухню ----
    I.partition(p, 383);
    // Над проёмом — стена, сам проём рисует дверь (d1, x 775)
    scene.doorSpots.d1 = { x: 775, bottom: WALL * 2, kind: 'interior', behind: 'between', inside: 0x40344f, insideR: 0xc8b890, insideFloor: 0x6a4a34 };

    // ---- Кухня 376..670 ----
    I.wallpaper(p, 391, CEIL, 293, WALL - CEIL, { c: 0xc8b890, pattern: 'paint', r });
    I.tiles(p, 391, WALL - m(1.45), 293, m(1.45) - 3, { c: 0x8aa8b0, size: 6, r, broken: 0.03 });
    I.baseboard(p, 391, 293, 0x5a4a3a);
    I.cabinets(p, 456, CEIL + 16, m(3), { c: 0x9a7a54 });
    I.fridge(p, 424);
    I.stove(p, 468);
    const sink = I.kitchenSink(p, 490);
    block(p, 512, WALL - m(0.85), m(0.9), m(0.85), 0x9a7a54, { top: 3 });
    // Кухонное окно над столом, стол с бумагами и квитанциями, табуретки
    I.roomWindow(p, 586, CEIL + 24, m(1.4), m(1.15), { view: I.windowView(ctx), curtain: 0xd8d0a8, r });
    const tableTop = I.table(p, 556, { len: m(2.1), cloth: 0xc8d8e8 });
    p.rect(580, tableTop - 2, 14, 2, 0xf4f4f4);
    p.rect(598, tableTop - 3, 12, 3, 0xf0ece0);
    p.rect(612, tableTop - 2, 4, 2, 0xffd166);
    p.rect(632, tableTop - 6, 5, 6, 0xe8e4dc);
    I.stool(p, 640);
    I.stool(p, 540);
    // Календарь на стене
    block(p, 524, CEIL + 50, 16, 20, 0xf0ece0);
    p.rect(526, CEIL + 52, 12, 6, 0xd83a3a);
    const kLamp = I.ceilingLamp(p, 575);
    if (momHome || !night) ctx.lights.push({ x: kLamp.x, y: kLamp.y, r: 120, color: 0xfff0c8, k: night ? 0.9 : 0.3 });
    ctx.lights.push({ x: 610, y: CEIL + 40, r: 90, color: night ? 0x7a8ad0 : 0xe8e8ff, k: night ? 0.3 : 0.5, glow: false });
    I.floor(p, 384, 300, { type: 'lino', c: 0x6a5450, r });

    // ---- Перегородка и проём в прихожую (d2, x 1375) ----
    I.partition(p, 683);
    scene.doorSpots.d2 = { x: 1375, bottom: WALL * 2, kind: 'interior', behind: 'between', inside: 0xc8b890, insideR: 0x2e4a40, insideFloor: 0x5a4430 };

    // ---- Прихожая 676..950 ----
    I.wallpaper(p, 691, CEIL, wa - 691, WALL - CEIL, { c: 0x2e4a40, pattern: 'diamonds', r });
    I.baseboard(p, 691, wa - 691);
    I.coatRack(p, 716);
    I.shoeRack(p, 716);
    const mir = I.mirror(p, 791, WALL - m(1.75), 22, m(1.15));
    scene.mirrorRect = { x: mir.x * 2, y: mir.y * 2, w: mir.w * 2, h: mir.h * 2 };
    block(p, 786, WALL - m(0.8), 32, 3, 0x5a3a2a, { top: 2 });
    // Табличка на ванной, выключатели
    p.rect(843, WALL - m(2.35), 16, 5, 0xfff0b0);
    p.set(847, WALL - m(2.35) + 2, 0x3a6ac8);
    p.set(853, WALL - m(2.35) + 2, 0x3a6ac8);
    block(p, 866, WALL - m(1.4), 3, 5, 0xe8e4dc);
    scene.doorSpots.bath = { x: 1703, bottom: WALL * 2, kind: 'bath', behind: 'bathroom' };
    scene.doorSpots.front = { x: 1840, bottom: WALL * 2, kind: 'flat', behind: 'stairwell' };
    // Счётчик и щиток, связка ключей на гвозде
    block(p, 896, CEIL + 12, 18, 14, 0x8a8a92);
    graffitiTag(p, 900, WALL - 30, 0x5a6a62, r);
    const hLamp = I.ceilingLamp(p, 820, { shade: 0xf0f0e8 });
    ctx.lights.push({ x: hLamp.x, y: hLamp.y, r: 90, color: 0xfff0d8, k: night ? 0.75 : 0.25 });
    I.floor(p, 684, wa - 684, { type: 'boards', c: 0x5a4430, r });
    // Порожки в проёмах
    for (const tx of [383, 683]) block(p, tx - 4, WALL - 1, 16, 2, 0x8a7050, { outline: false });
    // Наружная стена дома справа (срез)
    p.rect(wa - 6, 0, 6, ctx.h, 0x6a6672);
    p.vline(wa - 6, 0, ctx.h, INK);
  }, { name: 'apt' });
  return W;
}

// Ванная: плитка, «Малютка», раковина с зеркалом, унитаз, полка с кремами, ванна с краном.
// Экранные x: дверь 70, машинка 205, зеркало 345, унитаз 505, полка 635, кран 790.
export function paintBathroom(scene, width, { min } = {}) {
  const t = min ?? worldMinutes('morning');
  const W = makeWorld(scene, width, { min: t, outdoor: false, indoorDark: 0.12, key: `bath${width}` });
  W.layer(1, (p, ctx) => {
    const r = rng(31);
    const wa = ctx.w;
    I.upstairs(p, 0, wa, { c: 0x6a8a9a, r, ctx });
    // Стены: плитка до 1,6 м, выше — масляная краска
    I.wallpaper(p, 0, CEIL, wa, WALL - CEIL, { c: 0x9ab8c0, pattern: 'paint', r });
    I.tiles(p, 0, WALL - m(1.6), wa, m(1.6), { c: 0x8ab4c8, size: 6, r, broken: 0.04 });
    p.hline(0, WALL - m(1.6), wa, 0x5a7a8a);
    // Трубы вдоль стены и газовая колонка
    p.rect(0, CEIL + 8, wa, 2, 0xb8b8b0);
    p.rect(0, WALL - 8, wa, 2, 0x8a8a82);
    for (let x = 40; x < wa; x += 90) p.rect(x, CEIL + 8, 2, WALL - CEIL - 16, 0x9a9a92);
    // Окошко в кухню под потолком (классика хрущёвки)
    block(p, 70, CEIL + 10, 22, 12, 0xe8e4dc);
    p.rect(72, CEIL + 12, 18, 8, 0xe8d8a0);
    scene.doorSpots.out = { x: 70, bottom: WALL * 2, kind: 'bath', behind: 'room', inside: 0x2e4a40, insideFloor: 0x5a4430 };
    // Стиральная машина «Малютка»
    block(p, 86, WALL - m(0.75), m(0.5), m(0.75), 0xe8e8ec, { top: 2 });
    p.rect(90, WALL - m(0.75) + 6, 10, 3, 0x3a6aaa);
    p.rect(88, WALL - m(0.75) - 6, 14, 4, 0xd8d8e0);
    // Раковина с зеркальным шкафчиком
    block(p, 160, WALL - m(0.85), m(0.6), 5, 0xf2f2f6, { top: 2 });
    block(p, 168, WALL - m(0.85) + 5, 6, m(0.85) - 5, 0xe8e8ec);
    p.rect(176, WALL - m(0.85) - 8, 2, 8, 0xb8b8c0);
    const mir = I.mirror(p, 158, WALL - m(1.9), m(0.6), m(0.75), { frame: 0xe8e0d0 });
    scene.mirrorRect = { x: mir.x * 2, y: mir.y * 2, w: mir.w * 2, h: mir.h * 2 };
    // Пар на зеркале
    p.dither(mir.x, mir.y, mir.w, mir.h, 0xd8e4ec, 0.45);
    I.shelf(p, 158, WALL - m(1.95), m(0.6), { items: 'jars', r });
    // Унитаз с бачком
    block(p, 246, WALL - m(0.95), 12, 18, 0xf2f2f6);
    p.poly([[240, WALL - m(0.42)], [262, WALL - m(0.42)], [258, WALL - 4], [246, WALL - 4]], 0xf0f0f4);
    p.hline(240, WALL - m(0.42), 22, 0xd8d8e0);
    p.rect(244, WALL - 4, 14, 4, 0xe0e0e8);
    p.line(240, WALL - m(0.42), 246, WALL - 4, INK);
    p.line(262, WALL - m(0.42), 258, WALL - 4, INK);
    p.rect(250, WALL - m(0.95) - 6, 2, 6, 0x9a9a92);
    // Полка с кремами и полотенца
    I.shelf(p, 300, WALL - m(1.75), m(0.8), { items: 'jars', r });
    block(p, 300, WALL - m(1.35), 2, 2, 0xb8b8c0);
    p.rect(304, WALL - m(1.35), 14, 28, 0xff9ab8);
    p.rect(320, WALL - m(1.35), 14, 32, 0x6a8aff);
    p.vline(310, WALL - m(1.35), 28, 0xd87a98);
    // Ванна с отбитой эмалью и краном
    const bx = 352;
    const bw = m(1.75);
    block(p, bx, WALL - m(0.6), bw, m(0.6) - 4, 0xf4f4f8, { top: 3 });
    p.rect(bx + 20, WALL - m(0.4), 4, 3, 0x2a2a30);
    p.rect(bx + 40, WALL - m(0.3), 5, 2, 0x2a2a30);
    p.rect(bx + 4, WALL - 4, 4, 4, 0xc8c8d0);
    p.rect(bx + bw - 8, WALL - 4, 4, 4, 0xc8c8d0);
    p.rect(bx + 10, WALL - m(0.6) - 18, 2, 18, 0xb8b8c0);
    p.rect(bx + 4, WALL - m(0.6) - 18, 10, 2, 0xb8b8c0);
    p.rect(bx + 22, WALL - m(1.6) - 4, 2, m(1.0), 0xb8b8c0);
    // Занавеска на штанге
    p.rect(bx, WALL - m(2.05), bw, 1, 0x9a9a92);
    for (let x = bx + 30; x < bx + bw; x += 4) p.rect(x, WALL - m(2.05) + 1, 3, m(1.3), x % 8 ? 0xd8e8f0 : 0xb8d0e0);
    // Коврик и тазик
    p.rect(bx - 30, WALL + 1, 24, 2, 0x6aa86a);
    block(p, 128, WALL - 8, 16, 8, 0x5a8ac8, { top: 2 });
    const bulb = I.ceilingLamp(p, 250, { shade: 0xf0f0f0 });
    ctx.lights.push({ x: bulb.x, y: bulb.y, r: 160, color: 0xfff6e0, k: 0.6 });
    I.floor(p, 0, wa, { type: 'tiles', c: 0x5a6a78, r });
  }, { name: 'bath' });
  return W;
}
