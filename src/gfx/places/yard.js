// Двор на Заводской: наш подъезд, площадка, лавочка, трансформаторная будка с «ТЕНЬ»,
// гаражи (№17 — студия Дэна), «Мерс» Рея, дом с аркой на улицу.
// Координаты в пикселях арта: экранные x из сценариев делим на 2.
import { makeWorld } from '../world.js';
import { m, block, panels, flatWindow, litWindow, balcony, entrance, garage, car, bench, swings, slide, trashBins, lampPost, puddle, manhole, graffiti, graffitiTag, poster, bricks, tree, bush, fence, wire, floorShadow, INK } from '../paint.js';
import { farCity, midBlocks, yardGround } from './common.js';
import { mix, rng, ramp } from '../color.js';
import { GROUND } from '../pix.js';
import { quality } from '../quality.js';

const FACADE = GROUND - 7; // основание стен и предметов за линией, где ходит герой

export function paintYard(scene, width, { time = 'night', min, merc = false, openMic = false, barberSign = false, wet = false } = {}) {
  const W = makeWorld(scene, width, { time, min, key: `yard${width}` });
  const { dark } = W.env;
  W.sky();
  W.layer(0.22, (p, ctx) => farCity(p, ctx, { seed: 3 }), { name: 'far' });
  W.layer(0.5, (p, ctx) => midBlocks(p, ctx, { seed: 8, garages: true }), { name: 'mid' });
  W.layer(1, (p, ctx) => {
    const r = rng(42);
    const wa = ctx.w;
    yardGround(p, ctx, { from: FACADE - 16, wet });
    // Газон с бордюром вдоль задней кромки двора
    p.rect(0, FACADE - 16, wa, 6, 0x3a4a34);
    p.speckle(0, FACADE - 18, wa, 8, [0x4a6a3a, 0x2e3a2a, 0x5a7a44], 0.25, r);
    p.rect(0, FACADE - 10, wa, 2, 0x8a8690);
    p.hline(0, FACADE - 8, wa, 0x5a5662);

    // ---- Наш дом: панелька, подъезд 3 ----
    const hx1 = 190;
    panels(p, 0, 0, hx1, FACADE, { c: 0x9a948a, r });
    // Окна: 1-й этаж (высокий цоколь), 2-й выше края экрана частично
    const lightUp = (fx, fy) => {
      if (dark > 0.3 && r() < 0.5) {
        const col = r() < 0.8 ? 0xffd27a : 0xffb070;
        const sd = Math.floor(r() * 1e6);
        ctx.emit.push([fx + 2, fy + 2, m(1.3) - 4, m(1.45) - 4, col, 0.12, (pp) => litWindow(pp, fx + 2, fy + 2, m(1.3) - 4, m(1.45) - 4, col, rng(sd))]);
      }
    };
    for (const fx of [14, 128, 160]) {
      flatWindow(p, fx, FACADE - m(3.6), m(1.3), m(1.45), { r, plant: r() < 0.3 });
      lightUp(fx, FACADE - m(3.6));
    }
    for (const fx of [14, 50, 128, 160]) {
      flatWindow(p, fx, FACADE - m(6.5), m(1.3), m(1.45), { r });
      lightUp(fx, FACADE - m(6.5));
    }
    balcony(p, 44, FACADE - m(5.2), m(2.2), { r });
    // Окно лестничной клетки над подъездом
    flatWindow(p, 70, FACADE - m(4.4), m(0.8), m(1.1), { r, curtains: false });
    // Цоколь и отмостка
    p.rect(0, FACADE - m(0.9), hx1, m(0.9), 0x6a6672);
    p.speckle(0, FACADE - m(0.9), hx1, m(0.9), [0x5a5662, 0x7a7682], 0.08, r);
    p.hline(0, FACADE - m(0.9), hx1, 0x8a8690);
    const ent = entrance(p, 77.5, FACADE, { label: 'ПОДЪЕЗД 3' });
    scene.doorSpots.entrance = { x: 155, bottom: ent.y * 2 + ent.h * 2, kind: 'entrance', behind: 'stairwell' };
    ctx.lights.push({ x: ent.lamp.x, y: ent.lamp.y, r: 46, color: 0xfff0b8, ground: FACADE, cone: true, spread: 0.9 });
    ctx.emit.push([ent.lamp.x - 3, ent.lamp.y - 2, 7, 2, 0xfff6d0, 0.25]);
    // Тень от угла дома
    p.tint(hx1 - 5, 0, 5, FACADE, 0x2a2430, 0.35);
    p.vline(hx1, 0, FACADE, INK);
    // Скамейка-«бабушатник» и урна у подъезда
    block(p, 120, FACADE - m(0.45), m(1.2), 3, 0x6a4a30, { top: 2 });
    p.rect(124, FACADE - m(0.45) + 3, 2, m(0.45) - 3, 0x2a2a30);
    p.rect(156, FACADE - m(0.45) + 3, 2, m(0.45) - 3, 0x2a2a30);
    block(p, 106, FACADE - m(0.7), 8, m(0.7), 0x4a5a4a, { top: 2 });

    // ---- Двор: фонари, площадка, лавка ----
    const lamp1 = lampPost(p, 260, FACADE + 2, 5.5);
    const lamp2 = lampPost(p, 680, FACADE + 2, 5.5);
    [lamp1, lamp2].forEach((L, i) => {
      ctx.lights.push({ x: L.x, y: L.y, r: 78, color: 0xffe0a0, ground: GROUND + 4, cone: true, spread: 0.55, flicker: i === 0 });
      ctx.emit.push([Math.round(L.x) - 3, L.y - 1, 7, 1, 0xfff6d0, 0.3]);
    });
    wire(p, 0, 40, 263, lamp1.y - 5, 10);
    wire(p, 263, lamp1.y - 5, 683, lamp2.y - 5, 18);
    tree(p, 300, FACADE - 14, 6.5, { r, leaves: 0.4 });
    slide(p, 290, FACADE - 6);
    swings(p, 330, FACADE - 2);
    bush(p, 440, FACADE - 10, 30, { r });
    bench(p, 483, FACADE - 4);
    trashBins(p, 560, FACADE - 6, 2);
    tree(p, 600, FACADE - 14, 7, { r: rng(77), leaves: 0.5 });

    // ---- Трансформаторная будка с «ТЕНЬ» ----
    const tbx = 622;
    const tbw = 154;
    const tbh = m(3.2);
    bricks(p, tbx, FACADE - tbh, tbw, tbh, { c: 0x8a6a5a, r });
    p.rect(tbx - 3, FACADE - tbh - 5, tbw + 6, 5, 0x4a4652);
    p.hline(tbx - 3, FACADE - tbh - 5, tbw + 6, 0x6a6672);
    p.rect(tbx - 3, FACADE - tbh, tbw + 6, 1, INK);
    // Железная дверь «Опасно»
    block(p, tbx + 8, FACADE - m(2.1), m(1), m(2.1), 0x5a6a6a);
    p.rect(tbx + 14, FACADE - m(1.7), 13, 9, 0xe8d050);
    p.line(tbx + 20, FACADE - m(1.7) + 1, tbx + 18, FACADE - m(1.7) + 5, INK);
    p.line(tbx + 18, FACADE - m(1.7) + 5, tbx + 21, FACADE - m(1.7) + 5, INK);
    p.line(tbx + 21, FACADE - m(1.7) + 5, tbx + 19, FACADE - m(1.7) + 8, INK);
    graffiti(p, tbx + 46, FACADE - m(2.3), 'ТЕНЬ', { fill: 0x3df0ff, line: 0xff3d8a, scale: 4, slant: -0.06 });
    graffitiTag(p, tbx + 130, FACADE - 30, 0xffd166, r);
    graffitiTag(p, tbx + 40, FACADE - 22, 0xe8e8e8, r);
    poster(p, tbx + 120, FACADE - m(1.9), 14, 18, { accent: 0x3a6ac8, r });
    p.dither(tbx, FACADE - 14, tbw, 14, 0x3a2a24, (x, y) => (y - (FACADE - 14)) / 22);
    floorShadow(p, tbx - 2, FACADE, tbw + 4, 0.5);

    // ---- Гаражи ----
    const gs = [[776, 15], [869, 16], [962, 17], [1055, 18]];
    gs.forEach(([gx, n]) => garage(p, gx, FACADE, 93, { n, r: rng(gx), open: n === 17 ? 4 : 0, c: n === 16 ? 0x6a5a50 : n === 18 ? 0x4a5a6a : 0x5a6070 }));
    // Из №17 пробивается свет — там студия
    ctx.emitFns.push((pp, dk) => {
      const c = mix(0x6a4a30, 0xffc870, 0.2 + dk * 0.3);
      pp.vline(966 + 46 - 1 + 1, FACADE - m(2.6) + 8, m(2.6) - 10, c);
      pp.hline(967, FACADE - 2, 83, c);
      pp.tint(967, FACADE - 4, 83, 2, c, 0.5);
    });
    ctx.lights.push({ x: 1008, y: FACADE - 2, r: 40, color: 0xffc870, ground: GROUND + 4, cone: false, squash: 2.4, k: 0.9 });
    // Лампочка над гаражами
    p.rect(1006, FACADE - m(2.6) - 4, 5, 3, 0x2a2a30);
    ctx.lights.push({ x: 1008, y: FACADE - m(2.6) + 1, r: 34, color: 0xffd27a, ground: FACADE, cone: true, spread: 0.8 });
    ctx.emit.push([1007, FACADE - m(2.6) - 1, 3, 2, 0xfff0c0, 0.3]);

    // ---- Дом с аркой ----
    const ax = 1100;
    panels(p, ax, 0, wa - ax, FACADE, { c: 0xa09080, pw: m(3.2), r });
    const archL = 1220;
    const archR = 1295;
    const archTop = FACADE - m(3.4);
    // В арке — улица: небо, дома напротив, свет витрин
    const sky = ['#2a1b3d', '#5a3a6a'];
    p.gradV(archL, archTop, archR - archL, FACADE - archTop, dark > 0.4 ? [0x1a1430, 0x3a2a50, 0x4a3060] : [0x8a98b4, 0xb8bcc8, 0x9a96a8]);
    p.rect(archL, FACADE - m(2.4), archR - archL, m(2.4), dark > 0.4 ? 0x241c34 : 0x7a7480);
    for (let wx = archL + 4; wx < archR - 6; wx += 10) p.rect(wx, FACADE - m(2.1), 6, 7, dark > 0.4 ? 0x15102a : 0x9ab0c8);
    // Витрина напротив
    if (dark > 0.3) ctx.emit.push([archL + 8, FACADE - m(1.2), 26, m(0.9), 0xffd9a0, 0.2], [archL + 44, FACADE - m(1.2), 22, m(0.9), 0x9ad8ff, 0.2]);
    else p.rect(archL + 8, FACADE - m(1.2), 26, m(0.9), 0x8aa0b8);
    if (barberSign) {
      p.rect(archL + 6, FACADE - m(1.7), 60, 7, 0x1a1a22);
      p.text('ОПАСНАЯ БРИТВА', archL + 36, FACADE - m(1.7) + 1, 0xff3d8a, { align: 'center' });
      for (let y = FACADE - m(1.2); y < FACADE - m(0.4); y += 4) p.rect(archR - 6, y, 3, 2, (y / 4) % 2 ? 0xffffff : 0xd83a3a);
    }
    p.rect(archL, FACADE - 4, archR - archL, 4, 0x3a3a44);
    // Свод арки: кромка и тень
    p.rect(archL - 3, archTop - 4, archR - archL + 6, 4, 0x7a7068);
    p.hline(archL - 3, archTop - 4, archR - archL + 6, 0xb8b0a0);
    p.dither(archL, archTop, archR - archL, 10, 0x15101c, (x, y) => 1 - (y - archTop) / 12);
    p.vline(archL - 1, archTop, FACADE - archTop, INK);
    p.vline(archR, archTop, FACADE - archTop, INK);
    // Окна дома
    for (const fx of [1116, 1160, 1312]) flatWindow(p, fx, FACADE - m(3.7), m(1.3), m(1.45), { r });
    for (const fx of [1116, 1160, 1236, 1312]) flatWindow(p, fx, FACADE - m(6.6), m(1.3), m(1.45), { r });
    p.rect(ax, FACADE - m(0.9), wa - ax, m(0.9), 0x6a6672);
    p.hline(ax, FACADE - m(0.9), wa - ax, 0x8a8690);
    p.vline(ax, 0, FACADE, INK);
    // Фонарь над аркой
    p.rect(1255, archTop - 12, 6, 4, 0x2a2a30);
    ctx.lights.push({ x: 1258, y: archTop - 8, r: 60, color: 0xffe0a0, ground: GROUND + 4, cone: true, spread: 0.7 });
    ctx.emit.push([1256, archTop - 8, 5, 1, 0xfff6d0, 0.3]);
    // Знак остановки у арки
    p.rect(1203, FACADE - m(2.3), 2, m(2.3), 0x6a6a72);
    block(p, 1197, FACADE - m(2.5), 14, 12, 0x3a6ac8);
    p.text('А', 1204, FACADE - m(2.5) + 4, 0xffffff, { align: 'center' });
    if (openMic) poster(p, 1322, FACADE - m(1.95), 18, 26, { accent: 0xff3d8a, title: 'ПОДВАЛ', r });
    else poster(p, 1322, FACADE - m(1.8), 14, 18, { accent: 0x8ae6a0, r });

    // «Мерс» Рея — старый серебристый седан
    if (merc) car(p, 1046, FACADE + 2, { c: 0x9a9ca4, type: 'old', dir: 1, r: rng(124) });
    else car(p, 1080, FACADE + 2, { c: 0x6a3a3a, dir: -1, r: rng(125) });

    // ---- Земля: лужи, люк, листья ----
    manhole(p, 420, GROUND + 14);
    for (let i = 0; i < 120; i++) p.set(Math.floor(r() * wa), FACADE - 8 + Math.floor(r() * (ctx.h - FACADE + 8)), [0xc8782a, 0xa05a2a, 0xd89a3a][Math.floor(r() * 3)]);
    // Лужи отражают уже освещённую картинку — рисуем после света
    ctx.post.push((pp) => {
      [[310, 248, 46], [712, 252, 60], [1150, 246, 40], [880, 258, 30]].forEach(([x, y, w]) => puddle(pp, x, y, w, wet ? 6 : 4));
    });
  }, { name: 'main' });

  // Передний план: стволы и кусты у нижнего края (только на высокой графике)
  if (quality() === 'high') W.layer(1.18, (p, ctx) => {
    const r = rng(5);
    for (let x = 60; x < ctx.w; x += 260 + r() * 200) bush(p, x, ctx.h + 6, 40, { r, c: 0x1e2a22 });
    // Тёмный ствол дерева на переднем плане — редко, чтобы не мешать
    for (let x = 520; x < ctx.w; x += 760) {
      p.rect(x, 0, 7, ctx.h, 0x15121c);
      p.vline(x + 1, 0, ctx.h, 0x231d2a);
      for (let k = 0; k < 4; k++) p.line(x + 3, 20 + k * 18, x + 3 + (k % 2 ? 26 : -22), 4 + k * 14, 0x15121c);
    }
  }, { name: 'front', front: true });
  return W;
}
