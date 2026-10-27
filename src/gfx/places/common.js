// Общие куски уличных фонов: дальний город, соседние дома через двор, земля.
import { m, cityBlock, panelBlock, tree, asphalt, sidewalk, curb, garage, fence, bush, lampPost, wire } from '../paint.js';
import { mix, ramp, rng } from '../color.js';
import { HORIZON } from '../world.js';

// Самый дальний план: силуэты города в дымке, телебашня, трубы, огоньки окон точками
export function farCity(p, ctx, { seed = 3, density = 1 } = {}) {
  const r = rng(seed);
  const { base, dark } = ctx;
  const haze = mix(0x7a7a98, 0x1a1430, dark);
  const near = mix(0x6a6a88, 0x15102a, dark);
  const dot = (x, y, c) => (dark > 0.3 ? ctx.emitFns.push((pp) => pp.set(x, y, c)) : null);
  // Дальний ряд — силуэты разной высоты
  for (let x = -6; x < ctx.w; x += 6 + Math.floor(r() * 14 / density)) {
    const w = 8 + Math.floor(r() * 14);
    const h = 20 + Math.floor(r() * 40);
    p.rect(x, base - h, w, h, haze);
    if (r() < 0.2) p.vline(x + Math.floor(w / 2), base - h - 6, 6, haze);
    for (let y = base - h + 2; y < base - 2; y += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (r() < 0.12) dot(wx, y, r() < 0.8 ? 0xd8b070 : 0x8aa0d8);
  }
  // Телебашня с огоньком
  const tx = Math.floor(ctx.w * 0.62);
  p.poly([[tx - 3, base], [tx - 1, base - 90], [tx + 1, base - 90], [tx + 3, base]], haze);
  p.rect(tx - 3, base - 68, 7, 4, haze);
  p.vline(tx, base - 104, 14, haze);
  if (dark > 0.3) ctx.emitFns.push((pp) => pp.set(tx, base - 105, 0xff3d3d));
  // Заводская труба
  const cx = Math.floor(ctx.w * 0.18);
  p.rect(cx, base - 54, 4, 54, haze);
  for (let y = base - 50; y < base - 14; y += 9) p.rect(cx, y, 4, 2, mix(haze, 0xa04a4a, 0.4));
  // Ряд ближе — панельки силуэтами с окнами-точками
  for (let x = -4; x < ctx.w; x += 18 + Math.floor(r() * 26 / density)) {
    const w = 14 + Math.floor(r() * 18);
    const h = 18 + Math.floor(r() * 26);
    p.rect(x, base - h, w, h, near);
    p.hline(x, base - h, w, mix(near, 0xffffff, 0.08));
    for (let y = base - h + 3; y < base - 2; y += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) {
      if (dark > 0.3 && r() < 0.18) dot(wx, y, r() < 0.75 ? 0xffd27a : 0x9ab8ff);
      else if (dark <= 0.3 && r() < 0.5) p.set(wx, y, mix(near, 0x2a2a40, 0.4));
    }
  }
}

// Средний план: соседние панельки через двор, деревья, гаражи вдали
export function midBlocks(p, ctx, { seed = 5, garages = false, trees = true, gap = 0, k = 0.42 } = {}) {
  const r = rng(seed);
  const { base, dark } = ctx;
  const lit = dark > 0.25 ? 0.18 + dark * 0.14 : 0;
  let x = -20 + gap;
  while (x < ctx.w) {
    const sec = 2 + Math.floor(r() * 3);
    const b = panelBlock(p, x, base, { floors: 9, sections: sec, k, c: [0x9a948a, 0x8a8e96, 0xa8a090, 0xb09a88][Math.floor(r() * 4)], r, lit, emit: ctx.emit });
    x += b.w + 24 + r() * 70;
  }
  // Земля двора вдали
  asphalt(p, 0, base, ctx.w, ctx.h - base, { c: 0x4a4a52, r });
  for (let gx = 0; gx < ctx.w; gx += 50 + r() * 80) p.rect(gx, base, 20 + r() * 40, 2, mix(0x4a6a3a, 0x3a3a44, 0.3));
  if (garages) {
    for (let gx = Math.floor(ctx.w * 0.55); gx < ctx.w; gx += 47) garage(p, gx, base + 1, 46, { r, h: 1.3, tags: false, c: 0x5a6070 });
  }
  if (trees) {
    for (let tx = 10; tx < ctx.w; tx += 40 + r() * 70) tree(p, tx, base + 2, 3 + r() * 1.5, { r, leaves: 0.25, c: 0x2e2420 });
  }
}

// Земля перед героем: тротуар у стен, асфальт, бордюр
export function yardGround(p, ctx, { from, wet = false, c = 0x3e3e48 } = {}) {
  const r = rng(9);
  asphalt(p, 0, from, ctx.w, ctx.h - from, { c, r, wet });
  // Дальняя кромка — темнее (перспектива)
  p.dither(0, from, ctx.w, 6, mix(c, 0x07060d, 0.4), (x, y) => 1 - (y - from) / 6);
}

export { HORIZON, m, ramp, mix, rng, sidewalk, curb, fence, bush, lampPost, wire, tree };
