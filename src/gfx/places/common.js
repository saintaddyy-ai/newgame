// Общие куски уличных фонов: дальний город, соседние дома через двор, земля.
import { m, cityBlock, panelBlock, tree, asphalt, sidewalk, curb, garage, fence, bush, lampPost, wire } from '../paint.js';
import { mix, ramp, rng } from '../color.js';
import { HORIZON } from '../world.js';

// Самый дальний план: силуэты города, телебашня, трубы. Окна горят по времени.
export function farCity(p, ctx, { seed = 3, density = 1 } = {}) {
  const r = rng(seed);
  const { base, dark } = ctx;
  const haze = mix(0x6a6a88, 0x1a1430, dark);
  const lit = dark > 0.3 ? 0.18 + dark * 0.2 : 0;
  // Самый дальний ряд — почти силуэт
  for (let x = -10; x < ctx.w; x += 14 + r() * 26 / density) {
    cityBlock(p, x, base - 2, { floors: 10 + Math.floor(r() * 14), sections: 1 + Math.floor(r() * 2), k: 0.13, c: mix(haze, 0x8a8aa8, 0.25 * (1 - dark)), r, lit: lit * 0.7, emit: ctx.emit });
  }
  // Телебашня с огоньком
  const tx = Math.floor(ctx.w * 0.62);
  const tc = mix(haze, 0x000000, 0.15);
  p.poly([[tx - 4, base], [tx - 1, base - 120], [tx + 1, base - 120], [tx + 4, base]], tc);
  p.rect(tx - 3, base - 92, 7, 5, tc);
  p.vline(tx, base - 138, 18, tc);
  if (dark > 0.3) ctx.emit.push([tx, base - 139, 1, 1, 0xff3d3d, 0.4]);
  // Заводская труба с полосами
  const cx = Math.floor(ctx.w * 0.18);
  p.rect(cx, base - 70, 5, 70, tc);
  for (let y = base - 66; y < base - 20; y += 12) p.rect(cx, y, 5, 3, mix(tc, 0x8a3a3a, 0.4));
  // Ближе — ряд домов покрупнее
  for (let x = -6; x < ctx.w; x += 30 + r() * 30 / density) {
    cityBlock(p, x, base, { floors: 9 + Math.floor(r() * 8), sections: 1 + Math.floor(r() * 2), k: 0.2, c: mix(haze, 0x9a9ab8, 0.2 * (1 - dark)), r, lit, emit: ctx.emit });
  }
}

// Средний план: соседние панельки через двор, деревья, гаражи вдали
export function midBlocks(p, ctx, { seed = 5, garages = false, trees = true, gap = 0 } = {}) {
  const r = rng(seed);
  const { base, dark } = ctx;
  const lit = dark > 0.25 ? 0.25 + dark * 0.2 : 0;
  let x = -20 + gap;
  while (x < ctx.w) {
    const sec = 2 + Math.floor(r() * 3);
    const b = panelBlock(p, x, base, { floors: 9, sections: sec, k: 0.42, c: [0x9a948a, 0x8a8e96, 0xa8a090, 0xb09a88][Math.floor(r() * 4)], r, lit, emit: ctx.emit });
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
