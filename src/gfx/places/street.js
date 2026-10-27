// Городская улица: фасады с витринами и вывесками в реальном масштабе (первый этаж 3,5 м),
// машины на тротуаре у домов, поток машин на переднем плане (видны крыши и фары), неон.
// spec.buildings — как раньше: { x, w (экранные), color, shop, sign, signColor, awning, glass }.
// spec.features — особые места: podval, metro, neon, arch, posterImg.
import Phaser from 'phaser';
import { makeWorld } from '../world.js';
import { m, INK, block, panels, bricks, flatWindow, litWindow, lampPost, car, poster, graffitiTag, puddle, manhole, floorShadow, wire, trashBins, bush, tree } from '../paint.js';
import { farCity, midBlocks } from './common.js';
import { rng, ramp, mix, hex, hashStr } from '../color.js';
import { drawText, textWidth } from '../font.js';
import { GROUND, Pix } from '../pix.js';

const FACADE = GROUND - 7;
const SIDEWALK_END = GROUND + 11;

// Неоновая надпись крупным пиксельным шрифтом: светится ночью, днём — крашеные буквы
export function neonText(p, ctx, x, y, text, color, { scale = 2, board = true, align = 'center' } = {}) {
  const c = hex(color);
  const w = textWidth(text) * scale;
  const x0 = Math.round(align === 'center' ? x - w / 2 : x);
  if (board) {
    p.rect(x0 - 4, y - 3, w + 8, 5 * scale + 6, 0x15121c);
    p.rect(x0 - 4, y - 3, w + 8, 1, 0x3a3440);
  }
  const put = (pp, col) => drawText((px, py) => {
    for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) pp.set(x0 + px * scale + b, y + py * scale + a, col);
  }, text, 0, 0);
  // Днём — тусклые трубки, ночью — свечение поверх темноты
  put(p, mix(c, 0x3a3a44, 0.45));
  if (ctx.outDark > 0.2 || ctx.dark > 0.2) {
    ctx.emitFns.push((pp) => {
      pp.tint(x0 - 3, y - 3, w + 6, 5 * scale + 6, c, 0.18);
      put(pp, mix(c, 0xffffff, 0.35));
    });
  }
  ctx.lights.push({ x, y: y + 5 * scale, r: Math.max(30, w * 0.6), color: c, k: 0.5, glow: true, neon: true });
  return w;
}

// Фасад с магазином на первом этаже
function facade(p, ctx, b, r) {
  const x = Math.round(b.x / 2);
  const w = Math.round(b.w / 2);
  const base = mix(hex(b.color ?? 0x3a3440), 0xb8ae9c, 0.55);
  const brick = (hashStr(String(b.x)) % 3) === 0;
  if (brick) bricks(p, x, 0, w, FACADE, { c: mix(base, 0x9a5a44, 0.4), r });
  else panels(p, x, 0, w, FACADE, { c: base, pw: m(3.6), ph: m(3.2), r });
  // Карниз над первым этажом
  const gf = FACADE - m(3.6);
  p.rect(x - 2, gf - 4, w + 4, 4, mix(base, 0x2a2430, 0.3));
  p.hline(x - 2, gf - 4, w + 4, mix(base, 0xffffff, 0.25));
  // Верхние этажи: окна, кондиционеры, водосток
  for (let fy = gf - m(1.1) - m(1.5); fy > -m(1.5); fy -= m(3.2)) {
    for (let wx = x + 10; wx < x + w - m(1.3) - 6; wx += m(2.4)) {
      flatWindow(p, wx, fy, m(1.25), m(1.5), { r, curtains: true, sky: [0x8a9ab8, 0xb8c4d4] });
      if (ctx.dark > 0.3 && r() < 0.3) {
        const col = r() < 0.8 ? 0xffd27a : 0x9ab8ff;
        const seed = Math.floor(r() * 1e6);
        ctx.emit.push([wx + 2, fy + 2, m(1.25) - 4, m(1.5) - 4, col, 0.1, (pp) => litWindow(pp, wx + 2, fy + 2, m(1.25) - 4, m(1.5) - 4, col, rng(seed))]);
      }
      if (r() < 0.15) block(p, wx + m(1.25) + 2, fy + 8, 12, 9, 0xd8d8d8);
    }
  }
  p.rect(x + w - 6, 0, 3, FACADE, mix(base, 0x4a4a52, 0.5));
  p.vline(x, 0, FACADE, INK);
  p.vline(x + w - 1, 0, FACADE, INK);
  // Цоколь
  p.rect(x, FACADE - m(0.4), w, m(0.4), mix(base, 0x4a4652, 0.6));
  if (b.shop) shopFront(p, ctx, x, w, gf, b, r);
  else {
    // Первый этаж без магазина: окна с решётками и дверь
    for (let wx = x + 12; wx < x + w - m(1.3) - 8; wx += m(2.6)) {
      flatWindow(p, wx, FACADE - m(2.6), m(1.25), m(1.4), { r });
      for (let k = 2; k < m(1.25); k += 4) p.vline(wx + k, FACADE - m(2.6), m(1.4), 0x2a2a30);
    }
  }
  graffitiTag(p, x + 8 + Math.floor(r() * (w - 40)), FACADE - 26, [0xff3d8a, 0x3df0ff, 0xe8e8e8, 0xffd166][Math.floor(r() * 4)], r);
}

function shopWindow(p, ctx, wx, wy, ww, wh, sc, r) {
  const lit = ctx.outDark > 0.3;
  const inside = mix(sc, 0xe8dcc0, 0.6);
  p.rect(wx - 2, wy - 2, ww + 4, wh + 4, 0x1a1a22);
  p.rect(wx, wy, ww, wh, lit ? mix(inside, 0x2a2030, 0.3) : mix(inside, 0x6a7088, 0.55));
  for (let sx = wx + 4; sx < wx + ww - 14; sx += 20) {
    p.rect(sx, wy + 12, 16, 2, 0x5a4a3a);
    for (let k = 0; k < 4; k++) p.rect(sx + 1 + k * 4, wy + 6, 3, 6, [0xd83a3a, 0xffd166, 0x3a8a5a, 0xe8e8e8][(k + sx) % 4]);
  }
  for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
    const px = wx + 8 + Math.floor(r() * Math.max(1, ww - 20));
    p.ellipse(px, wy + wh - m(1.1), 3, 4, 0x2a2430);
    p.rect(px - 4, wy + wh - m(1.1) + 3, 9, m(1.1) - 3, 0x2a2430);
  }
  if (lit) {
    ctx.emitFns.push((pp) => {
      pp.tint(wx, wy, ww, wh, mix(sc, 0xffe0b0, 0.6), 0.45);
      pp.tint(wx - 6, FACADE, ww + 12, 12, mix(sc, 0xffe0b0, 0.6), 0.22);
    });
    ctx.lights.push({ x: wx + ww / 2, y: wy + wh * 0.7, r: Math.max(30, ww * 0.75), color: mix(sc, 0xffe0b0, 0.6), k: 0.7, glow: false });
  }
  p.line(wx + 4, wy + wh - 4, wx + 18, wy + 4, mix(0xffffff, inside, 0.5));
  p.line(wx + 8, wy + wh - 4, wx + 22, wy + 4, mix(0xffffff, inside, 0.7));
}

function shopFront(p, ctx, x, w, gf, b, r) {
  const sc = hex(b.signColor || '#ff3d8a');
  const lit = ctx.outDark > 0.3;
  const dw = m(1);
  const cx = x + Math.round(w / 2);
  const wy = FACADE - m(2.7);
  const wh = m(2.3);
  // Две витрины по бокам, дверь посередине (там, где в сценарии вход)
  shopWindow(p, ctx, x + 8, wy, cx - dw / 2 - 6 - (x + 8), wh, sc, r);
  shopWindow(p, ctx, cx + dw / 2 + 6, wy, x + w - 8 - (cx + dw / 2 + 6), wh, sc, r);
  const dx = Math.round(cx - dw / 2);
  block(p, dx, FACADE - m(2.15), dw, m(2.15), 0x2a2a30);
  p.rect(dx + 3, FACADE - m(2.15) + 3, dw - 6, m(1.4), lit ? mix(sc, 0xfff0d0, 0.6) : 0x6a7088);
  p.rect(dx + dw - 6, FACADE - m(1.1), 2, 6, 0xc8c8d0);
  block(p, dx - 4, FACADE - 2, dw + 8, 2, 0x8a8690, { outline: false });
  // Маркиза
  if (b.awning) {
    const ac = hex(b.awning);
    for (let ax = x + 4; ax < x + w - 4; ax += 6) {
      const col = ((ax - x) / 6) % 2 ? ac : 0xe8e0d0;
      p.poly([[ax, wy - 10], [ax + 6, wy - 10], [ax + 8, wy - 2], [ax + 2, wy - 2]], col);
      p.set(ax + 3, wy - 1, mix(col, INK, 0.4));
    }
    p.hline(x + 4, wy - 11, w - 8, INK);
  }
  if (b.sign) neonText(p, ctx, cx, gf + 4, b.sign, b.signColor || '#ff3d8a', { scale: 2 });
}

const FEATURES = {
  // Лестница вниз в «Подвал» с неоном
  podval(p, ctx, f) {
    const cx = Math.round(f.x / 2);
    const w = m(1.8);
    const x = cx - Math.floor(w / 2);
    p.rect(x - 3, FACADE - m(1.1), w + 6, m(1.1), 0x1a1620);
    for (let i = 0; i < 7; i++) block(p, x, FACADE - m(1.1) + 6 + i * 5, w, 3, 0x4a4652, { outline: false });
    p.rect(x + 4, FACADE - m(1.1), w - 8, 5, 0x07060d);
    // Перила
    p.hline(x - 4, FACADE - m(1.1) - 8, w + 8, 0x2a2a30);
    for (let k = x - 4; k < x + w + 4; k += 8) p.vline(k, FACADE - m(1.1) - 8, 8, 0x2a2a30);
    neonText(p, ctx, cx, FACADE - m(2.4), f.text || 'ПОДВАЛ', f.color || '#3df0ff', { scale: 3 });
    // Под вывеской — дверь вниз виднеется
    block(p, cx - 10, FACADE - m(1.0), 20, 10, 0x3a2a30, { outline: false });
  },
  // Павильон метро с красной «М»
  metro(p, ctx, f) {
    const cx = Math.round(f.x / 2);
    const w = m(3.4);
    const x = cx - Math.floor(w / 2);
    const h = m(3.1);
    block(p, x, FACADE - h, w, h, 0x8a8890);
    p.rect(x + 6, FACADE - m(2.4), w - 12, m(2.4), 0x1a1a22);
    for (let i = 0; i < 6; i++) block(p, x + 8, FACADE - m(1.6) + i * 9, w - 16, 3, 0x4a4652, { outline: false });
    p.rect(x + 8, FACADE - m(2.4), w - 16, m(0.8), ctx.outDark > 0.3 ? 0xffe8c0 : 0x9aa8c0);
    if (ctx.outDark > 0.3) ctx.lights.push({ x: cx, y: FACADE - m(2), r: 60, color: 0xffe8c0, k: 0.6, glow: false });
    neonText(p, ctx, cx, FACADE - h - 20, 'М', '#ff3d3d', { scale: 3, board: false });
    p.rect(x - 2, FACADE - h - 2, w + 4, 3, 0x6a6a72);
  },
  neon(p, ctx, f) {
    neonText(p, ctx, Math.round(f.x / 2), Math.round(f.y / 2), f.text, f.color || '#ff3d8a', { scale: f.size >= 16 ? 3 : 2, board: f.board !== false });
  },
  // Проход-арка во двор
  arch(p, ctx, f) {
    const cx = Math.round(f.x / 2);
    const w = m(2.4);
    const x = cx - Math.floor(w / 2);
    const top = FACADE - m(3.3);
    p.gradV(x, top, w, FACADE - top, ctx.outDark > 0.4 ? [0x0c0a14, 0x1a1622] : [0x4a4652, 0x5a5662]);
    p.rect(x, FACADE - m(1.6), w, m(1.6), ctx.outDark > 0.4 ? 0x241c30 : 0x6a6a72);
    p.rect(x - 3, top - 4, w + 6, 4, 0x7a7068);
    p.vline(x - 1, top, FACADE - top, INK);
    p.vline(x + w, top, FACADE - top, INK);
    p.rect(cx - 2, top - 10, 5, 4, 0x2a2a30);
    ctx.lights.push({ x: cx, y: top - 6, r: 50, color: 0xffe0a0, ground: GROUND + 4, cone: true, spread: 0.6 });
  },
  sky(p, ctx, f) {},
};

export function paintStreet(scene, width, spec = {}) {
  const W = makeWorld(scene, width, { time: 'night', key: `street_${spec.key || spec.seed || 0}_${width}` });
  W.sky();
  W.layer(0.22, (p, ctx) => farCity(p, ctx, { seed: (spec.seed || 3) + 1 }), { name: 'far' });
  W.layer(0.5, (p, ctx) => midBlocks(p, ctx, { seed: (spec.seed || 5) + 2, trees: true }), { name: 'mid' });
  W.layer(1, (p, ctx) => {
    const r = rng(spec.seed || 7);
    const wa = ctx.w;
    // Тротуар, бордюр, дорога
    p.rect(0, FACADE - 1, wa, SIDEWALK_END - FACADE + 1, 0x6a6672);
    for (let y = FACADE + 2; y < SIDEWALK_END; y += 5) p.hline(0, y, wa, 0x5e5a66);
    for (let y = FACADE; y < SIDEWALK_END; y += 5) for (let x = ((y / 5) % 2) * 6; x < wa; x += 12) p.vline(x, y, 5, 0x5e5a66);
    p.speckle(0, FACADE, wa, SIDEWALK_END - FACADE, [0x7a7682, 0x56525e], 0.05, r);
    p.rect(0, SIDEWALK_END, wa, 3, 0x9a96a0);
    p.hline(0, SIDEWALK_END + 3, wa, 0x4a4652);
    p.rect(0, SIDEWALK_END + 4, wa, ctx.h - SIDEWALK_END - 4, 0x34343c);
    p.speckle(0, SIDEWALK_END + 4, wa, ctx.h, [0x2a2a32, 0x3e3e46], 0.08, r);
    for (let x = 10; x < wa; x += 40) p.rect(x, ctx.h - 6, 18, 1, 0xd8d8c8);
    // Дома: зазоры между ними — двор/улица вдали (там видно средний план)
    (spec.buildings || []).forEach((b) => facade(p, ctx, b, r));
    // Фонари у фасадов
    (spec.lamps || []).forEach((lx) => {
      const L = lampPost(p, Math.round(lx / 2) + 6, FACADE + 4, 6, { style: 'city' });
      ctx.lights.push({ x: L.x, y: L.y, r: 82, color: 0xffe0a0, ground: GROUND + 4, cone: true, spread: 0.6 });
      ctx.lights.push({ x: L.x2, y: L.y, r: 82, color: 0xffe0a0, ground: GROUND + 4, cone: true, spread: 0.6, glow: false });
      ctx.emit.push([L.x - 3, L.y - 1, 6, 1, 0xfff6d0, 0.3], [L.x2 - 3, L.y - 1, 6, 1, 0xfff6d0, 0.3]);
    });
    (spec.features || []).forEach((f) => FEATURES[f.type]?.(p, ctx, f));
    // Припаркованные на тротуаре машины (как в жизни), урны, люки
    (spec.parked || []).forEach(([x, c, dir]) => car(p, Math.round(x / 2), FACADE + 3, { c, dir, r }));
    for (let x = 60 + Math.floor(r() * 80); x < wa; x += 220 + Math.floor(r() * 160)) {
      manhole(p, x, SIDEWALK_END + 12);
      if (r() < 0.5) scene.steamSpots?.push([x * 2, (SIDEWALK_END + 12) * 2]);
    }
    ctx.post.push((pp) => {
      for (let x = 100; x < wa; x += 300 + Math.floor(r() * 200)) puddle(pp, x, SIDEWALK_END + 8 + Math.floor(r() * 6), 30 + Math.floor(r() * 30), 4);
    });
  }, { name: 'main' });
  (spec.features || []).filter((f) => f.type === 'posterImg').forEach((f) => scene.add.image(f.x, f.y, f.key).setDisplaySize(f.w, f.h).setAngle(f.angle || 0).setDepth(3));
  if (spec.traffic !== false) trafficFront(scene, width, { dark: W.env.dark });
  return W;
}

// Поток машин на переднем плане: видны крыши и фары, героя не загораживают
export function trafficFront(scene, width, { dark = 0 } = {}) {
  const colors = [0xc0303a, 0x3a5a8a, 0xd8d8d8, 0x2a2a2a, 0xd8a040, 0x3a8a5a, 0x8a8c94, 0xe8e8e8];
  const makeCar = (c, dir) => {
    const key = `car_${c}_${dir}_${Math.round(dark * 4)}`;
    if (!scene.textures.exists(key)) {
      const pix = new Pix(m(4.6) + 4, m(1.6) + 4);
      car(pix, 2, pix.h - 1, { c, dir, r: rng(c) });
      if (dark > 0.05) pix.tint(0, 0, pix.w, pix.h, 0x0a0a26, dark * 0.5);
      pix.texture(scene, key);
    }
    return key;
  };
  const spawn = () => {
    if (!scene.scene.isActive()) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const c = Phaser.Utils.Array.GetRandom(colors);
    const key = makeCar(c, dir);
    const y = 540 + (dir > 0 ? 70 : 92);
    const s = scene.add.image(dir > 0 ? -200 : width + 200, y, key).setOrigin(0.5, 1).setScale(2.5).setDepth(45).setScrollFactor(1.12, 1);
    const parts = [s];
    if (dark > 0.3) {
      // Фары: луч вперёд и красные габариты
      const head = scene.add.image(s.x + dir * 300, y - 56, 'glow').setTint(0xfff0c0).setBlendMode(Phaser.BlendModes.ADD).setScale(4, 1.2).setAlpha(0.5).setDepth(46).setScrollFactor(1.12, 1);
      const tail = scene.add.image(s.x - dir * 290, y - 50, 'glow').setTint(0xff3030).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8, 0.5).setAlpha(0.6).setDepth(46).setScrollFactor(1.12, 1);
      parts.push(head, tail);
    }
    const dx = dir > 0 ? width + 500 : -(width + 500);
    scene.tweens.add({ targets: parts, x: `+=${dx}`, duration: (width + 600) * (2.2 + Math.random() * 1.6), onComplete: () => parts.forEach((o) => o.destroy()) });
  };
  scene.time.addEvent({ delay: 4200, loop: true, callback: () => Math.random() < 0.7 && spawn() });
  scene.time.delayedCall(600, spawn);
}
