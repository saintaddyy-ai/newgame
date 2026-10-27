// Интерьеры по описанию (кафе, магазины, «Подвал», туалеты, вечеринки): та же разметка,
// что раньше (wall, wallColor, floor, props с экранными x), но в новом масштабе и стиле.
// Стойки (counter) рисуются отдельным слоем перед работниками — они стоят ЗА стойкой.
import Phaser from 'phaser';
import { makeWorld } from '../world.js';
import { m, INK, block, bricks, poster, graffitiTag, floorShadow } from '../paint.js';
import * as I from '../interior.js';
import { rng, ramp, mix, hex } from '../color.js';
import { Pix, ART, GROUND } from '../pix.js';
import { neonText } from './street.js';

const { WALL, CEIL } = I;
const ax = (v) => Math.round(v / 2);
// Старые экранные y (стена была от 0 до 462) → высота на новой стене от потолка до пола
const wy = (v) => Math.round(CEIL + (Math.max(0, v) / 462) * (WALL - CEIL));

const WALLS = {
  brick: (p, w, c, r) => bricks(p, 0, CEIL, w, WALL - CEIL, { c: mix(hex(c), 0x9a6a54, 0.45), r }),
  tile: (p, w, c, r) => {
    I.wallpaper(p, 0, CEIL, w, WALL - CEIL, { c: mix(hex(c), 0xe8e4dc, 0.2), pattern: 'paint', r });
    I.tiles(p, 0, WALL - m(1.6), w, m(1.6), { c: hex(c), size: 6, r });
  },
  wood: (p, w, c, r) => {
    const rp = ramp(mix(hex(c), 0x8a6a4a, 0.4));
    p.rect(0, CEIL, w, WALL - CEIL, rp[2]);
    for (let x = 0; x < w; x += 7) {
      p.vline(x, CEIL, WALL - CEIL, rp[1]);
      if (r() < 0.3) p.vline(x + 3, CEIL + Math.floor(r() * 40), 6, rp[3]);
    }
  },
  paint: (p, w, c, r) => {
    I.wallpaper(p, 0, CEIL, w, WALL - CEIL, { c: mix(hex(c), 0x8a8478, 0.25), pattern: 'paint', r });
    p.rect(0, WALL - m(1.2), w, m(1.2), mix(hex(c), 0x2a2430, 0.25));
    p.hline(0, WALL - m(1.2), w, mix(hex(c), 0xffffff, 0.2));
  },
  concrete: (p, w, c, r) => {
    const rp = ramp(mix(hex(c), 0x7a7680, 0.4));
    p.rect(0, CEIL, w, WALL - CEIL, rp[2]);
    p.speckle(0, CEIL, w, WALL - CEIL, [rp[1], rp[3]], 0.06, r);
    for (let x = 30; x < w; x += 70) p.vline(x, CEIL, WALL - CEIL, rp[1]);
  },
};

const PROPS = {
  counter(p, ctx, q, front) {
    const x = ax(q.x);
    const w = ax(q.w);
    const h = m(1.05);
    const c = q.color ?? 0x5a3a2a;
    const B = GROUND; // стойка стоит посреди зала: работники за ней по пояс
    // То, что на стойке, — в переднем слое вместе с ней
    front.push((fp) => {
      const rp = block(fp, x, B - h + 3, w, h - 3, c);
      for (let xx = x + 8; xx < x + w - 4; xx += 16) fp.vline(xx, B - h + 6, h - 9, rp[1]);
      block(fp, x - 2, B - h, w + 4, 3, q.top ?? 0x8a6a4a, { top: 3 });
      if (q.machine) {
        block(fp, x + 10, B - h - 24, 30, 21, 0xb8b8c0, { top: 2 });
        fp.rect(x + 14, B - h - 16, 22, 4, 0x2a2a2a);
        fp.set(x + 36, B - h - 21, 0xff3d3d);
      }
      if (q.register) {
        block(fp, x + w - 30, B - h - 17, 22, 14, 0x2a2a30, { top: 2 });
        fp.rect(x + w - 27, B - h - 15, 16, 5, 0x3df0ff);
      }
      // Чашки, салфетницы
      for (let k = x + 50; k < x + w - 40; k += 37) block(fp, k, B - h - 5, 4, 4, 0xe8e0d0, { outline: false });
    });
  },
  table(p, ctx, q) {
    const x = ax(q.x);
    const top = WALL - m(0.75);
    block(p, x - 14, top, 28, 2, q.color ?? 0x6a4a30, { top: 2 });
    p.rect(x - 1, top + 2, 3, m(0.75) - 4, 0x2a2a30);
    p.rect(x - 7, WALL - 2, 15, 2, 0x2a2a30);
    if (q.cup) block(p, x - 4, top - 6, 5, 4, 0xe8e0d0, { top: 1 });
    I.chair(p, x - 30, { c: 0x3a2a20 });
    I.chair(p, x + 16, { c: 0x3a2a20, flip: true });
    floorShadow(p, x - 16, WALL, 32);
  },
  shelf(p, ctx, q, front, r) {
    const x = ax(q.x);
    const y = wy(q.y ?? 140);
    I.shelf(p, x, y, ax(q.w), { items: 'jars', r });
    I.shelf(p, x, y + 22, ax(q.w), { items: 'jars', r });
  },
  poster(p, ctx, q, front, r) {
    poster(p, ax(q.x), wy(q.y ?? 160), ax(q.w ?? 56), ax(q.h ?? 76), { accent: hex(q.color ?? 0xff3d8a), title: q.text, r });
  },
  plant(p, ctx, q) {
    const x = ax(q.x);
    block(p, x - 6, WALL - 12, 12, 12, 0x8a4a2a, { top: 2 });
    for (let k = 0; k < 14; k++) p.line(x, WALL - 12, x - 10 + k * 1.5, WALL - 24 - ((k * 7) % 11), k % 3 ? 0x3a7a4a : 0x4a8a5a);
  },
  window(p, ctx, q, front, r) {
    const x = ax(q.x);
    const y = Math.max(CEIL + 10, wy(q.y ?? 110));
    const w = Math.min(ax(q.w ?? 140), 120);
    const h = Math.min(ax(q.h ?? 130), WALL - y - 30);
    I.roomWindow(p, x, y, w, h, { view: I.windowView(ctx), curtain: null, r });
    ctx.lights.push({ x: x + w / 2, y: y + h / 2, r: w, color: ctx.outDark > 0.5 ? 0x6a7ad0 : 0xe8e8ff, k: ctx.outDark > 0.5 ? 0.25 : 0.4, glow: false });
  },
  rack(p, ctx, q, front, r) {
    const x = ax(q.x);
    const w = ax(q.w);
    const top = WALL - m(1.55);
    p.rect(x, top, w, 2, 0x8a8a9a);
    p.rect(x + 2, top, 2, WALL - top, 0x6a6a7a);
    p.rect(x + w - 4, top, 2, WALL - top, 0x6a6a7a);
    for (let xx = x + 6; xx < x + w - 10; xx += 8) {
      const c = q.colors ? hex(q.colors[Math.floor(r() * q.colors.length)]) : mix(0x6a6a7a, [0xc0303a, 0x3a5a8a, 0xe8e8e8, 0x3a8a5a, 0xd8a040][Math.floor(r() * 5)], 0.8);
      const cr = ramp(c);
      p.set(xx + 3, top + 2, 0x8a8a9a);
      p.poly([[xx, top + 4], [xx + 7, top + 4], [xx + 8, top + 4 + m(0.8) + r() * 10], [xx - 1, top + 4 + m(0.8) + r() * 10]], cr[2]);
      p.vline(xx, top + 5, m(0.8), cr[3]);
      p.vline(xx + 6, top + 5, m(0.8), cr[1]);
    }
  },
  mirror(p, ctx, q) {
    const x = ax(q.x);
    I.mirror(p, x - 12, WALL - m(1.85), 24, m(1.1), { frame: 0x8a7a5a });
  },
  barberChair(p, ctx, q) {
    const x = ax(q.x);
    block(p, x - 12, WALL - m(0.55), 24, 6, 0x8a1f28, { top: 2 });
    block(p, x - 11, WALL - m(1.15), 6, m(0.6), 0x8a1f28);
    block(p, x - 14, WALL - m(0.75), 4, 10, 0xb8b8c0);
    block(p, x + 10, WALL - m(0.75), 4, 10, 0xb8b8c0);
    p.rect(x - 2, WALL - m(0.55) + 6, 4, m(0.55) - 8, 0xb8b8c0);
    p.rect(x - 9, WALL - 3, 18, 3, 0x8a8a92);
  },
  tattooChair(p, ctx, q) {
    const x = ax(q.x);
    block(p, x - 30, WALL - m(0.7), 60, 6, 0x1a1a1e, { top: 3 });
    block(p, x + 22, WALL - m(1.2), 10, m(0.5), 0x1a1a1e);
    p.rect(x - 2, WALL - m(0.7) + 6, 4, m(0.7) - 6, 0xb8b8c0);
    // Лампа на штативе
    p.rect(x - 44, WALL - m(1.9), 2, m(1.9), 0x2a2a30);
    p.ellipse(x - 43, WALL - m(1.9), 6, 3, 0xfff0c8);
    ctx.lights.push({ x: x - 43, y: WALL - m(1.9), r: 60, color: 0xfff0c8, k: 0.7 });
  },
  flash(p, ctx, q, front, r) {
    for (let i = 0; i < (q.n || 6); i++) {
      const x = ax(q.x) + (i % 3) * 30;
      const y = CEIL + 14 + Math.floor(i / 3) * 36;
      block(p, x, y, 26, 32, 0xf1ead8);
      const c = [0xd83a3a, 0x3a6ac8, 0x1a1a1e, 0x3a8a5a][i % 4];
      p.ellipse(x + 13, y + 13, 7, 7, null, (xx, yy, dx, dy) => (dx * dx + dy * dy > 0.55 ? c : null));
      p.line(x + 6, y + 26, x + 20, y + 26, 0x1a1a1e);
      graffitiTag(p, x + 5, y + 6, c, r);
    }
  },
  grill(p, ctx, q) {
    const x = ax(q.x);
    block(p, x - 18, WALL - m(1.75), 36, m(0.75), 0x9a9aa8);
    p.rect(x - 14, WALL - m(1.7), 4, m(0.65), 0xff7a2a);
    ctx.emit.push([x - 14, WALL - m(1.7), 4, m(0.65), 0xff8a3a, 0.3]);
    ctx.scene.__grill = { x: x * ART + 8, y: (WALL - m(1.38)) * ART };
  },
  fridge(p, ctx, q) {
    const x = ax(q.x);
    const h = m(1.85);
    block(p, x, WALL - h, 40, h, 0xd8d8e0);
    p.rect(x + 3, WALL - h + 4, 34, h - 22, 0x8ab4d8);
    for (let y = WALL - h + 8; y < WALL - 24; y += 12) {
      p.hline(x + 3, y + 9, 34, 0xb8c8d8);
      for (let xx = x + 5; xx < x + 35; xx += 5) p.rect(xx, y, 3, 8, [0xd83a3a, 0xffd166, 0x3a8a5a, 0x3a6ac8, 0xe8e8e8][(xx + y) % 5]);
    }
    ctx.emit.push([x + 3, WALL - h + 4, 34, 2, 0xe8f4ff, 0.2]);
    ctx.lights.push({ x: x + 20, y: WALL - h / 2, r: 40, color: 0xc8e4ff, k: 0.5, glow: false });
  },
  stage(p, ctx, q) {
    const x = ax(q.x);
    const w = ax(q.w);
    block(p, x, WALL - m(0.6), w, m(0.6), 0x1a1420, { top: 3 });
    for (let xx = x + 6; xx < x + w; xx += 14) p.vline(xx, WALL - m(0.6) + 2, m(0.6) - 4, 0x2a2030);
    // Стойка с микрофоном и мониторы
    const cx = x + Math.floor(w / 2);
    p.rect(cx, WALL - m(0.6) - m(1.4), 2, m(1.4), 0x2a2a2a);
    block(p, cx - 1, WALL - m(0.6) - m(1.5), 4, 7, 0x8a8a9a);
    for (const sx of [x + 10, x + w - 34]) {
      block(p, sx, WALL - m(0.6) - m(1.2), 24, m(1.2), 0x111114);
      p.ellipse(sx + 12, WALL - m(0.6) - m(0.85), 7, 7, 0x2a2a30);
      p.ellipse(sx + 12, WALL - m(0.6) - m(0.3), 4, 4, 0x2a2a30);
    }
    // Свет сцены: розовый и голубой прожекторы
    ctx.lights.push({ x: cx - 30, y: CEIL + 6, r: 110, color: 0xff3d8a, ground: WALL - m(0.6), cone: true, spread: 0.45, k: 0.9 });
    ctx.lights.push({ x: cx + 30, y: CEIL + 6, r: 110, color: 0x3df0ff, ground: WALL - m(0.6), cone: true, spread: 0.45, k: 0.9 });
    p.rect(x, CEIL, w, 4, 0x2a2a30);
    for (const lx of [cx - 30, cx + 30]) block(p, lx - 3, CEIL + 3, 7, 5, 0x1a1a1e);
  },
  toilet(p, ctx, q) {
    const x = ax(q.x);
    block(p, x + 2, WALL - m(0.95), 12, 18, 0xf2f2f6);
    p.poly([[x - 6, WALL - m(0.42)], [x + 16, WALL - m(0.42)], [x + 12, WALL - 4], [x, WALL - 4]], 0xf0f0f4);
    p.hline(x - 6, WALL - m(0.42), 22, 0xd8d8e0);
    p.rect(x - 2, WALL - 4, 14, 4, 0xe0e0e8);
    p.line(x - 6, WALL - m(0.42), x, WALL - 4, INK);
    p.line(x + 16, WALL - m(0.42), x + 12, WALL - 4, INK);
  },
  sink(p, ctx, q) {
    const x = ax(q.x);
    block(p, x - 12, WALL - m(0.85), 24, 5, 0xf2f2f6, { top: 2 });
    block(p, x - 3, WALL - m(0.85) + 5, 6, m(0.85) - 5, 0xe8e8ec);
    p.rect(x - 1, WALL - m(0.85) - 8, 2, 8, 0xb8b8c0);
  },
  bulb(p, ctx, q) {
    const x = ax(q.x);
    p.vline(x, CEIL, 14, 0x1a1a1a);
    ctx.emit.push([x - 1, CEIL + 14, 3, 3, 0xfff0c0, 0.3]);
    ctx.lights.push({ x, y: CEIL + 16, r: 110, color: 0xffe8a8, k: 0.8 });
    ctx.__bulb = true;
  },
  scribbles(p, ctx, q, front, r) {
    (q.lines || []).forEach((l, i) => {
      const col = [0xff3d8a, 0x3df0ff, 0xffd166, 0xc9c4ee][i % 4];
      p.text(l.toUpperCase(), ax(q.x) + (i % 2) * 14, wy(q.y ?? 120) + i * 11, col, { shadow: mix(col, INK, 0.7) });
    });
  },
  sofa(p, ctx, q) {
    const x = ax(q.x);
    const w = ax(q.w ?? 220);
    const c = q.color ?? 0x5a2a5a;
    block(p, x, WALL - m(0.45), w, m(0.45), c, { top: 3 });
    block(p, x + 4, WALL - m(0.85), w - 8, m(0.42), mix(hex(c), 0x07060d, 0.12));
    block(p, x - 4, WALL - m(0.6), 8, m(0.6), mix(hex(c), 0x07060d, 0.2), { top: 2 });
    block(p, x + w - 4, WALL - m(0.6), 8, m(0.6), mix(hex(c), 0x07060d, 0.2), { top: 2 });
    floorShadow(p, x, WALL, w);
  },
  discoBall(p, ctx, q) {
    ctx.scene.__disco = { x: q.x, y: (CEIL + 24) * ART };
    p.vline(ax(q.x), CEIL, 16, 0x8a8a92);
    ctx.lights.push({ x: ax(q.x), y: CEIL + 24, r: 140, color: 0xc77dff, k: 0.6, glow: false });
  },
  door(p, ctx, q) {
    const x = ax(q.x);
    const w = m(0.95);
    block(p, x - Math.floor(w / 2) - 3, WALL - m(2.1) - 3, w + 6, m(2.1) + 3, 0x2a2430);
    block(p, x - Math.floor(w / 2), WALL - m(2.1), w, m(2.1), q.color ?? 0x5a3a2a);
    p.rect(x + Math.floor(w / 2) - 6, WALL - m(1.05), 3, 3, 0xd8b040);
    if (q.sign) {
      const lw = p.text(q.sign, x, WALL - m(2.1) - 12, hex(q.signColor || '#c9c4ee'), { align: 'center', shadow: INK });
      p.rect(x - Math.ceil(lw / 2) - 3, WALL - m(2.1) - 14, lw + 6, 1, 0x3a3440);
    }
  },
  text(p, ctx, q) {
    neonText(p, ctx, ax(q.x), Math.max(CEIL + 6, wy(q.y ?? 80) - 6), q.text, q.color || '#ff3d8a', { scale: (q.size || 12) >= 18 ? 3 : 2, board: false });
  },
};

// spec: { wall, wallColor, floor, floorTiles, props, dark, upstairs: false }
export function paintInterior(scene, width, spec = {}) {
  const night = typeof scene.cfg?.night === 'function' ? scene.cfg.night() : scene.cfg?.night;
  const W = makeWorld(scene, width, { outdoor: false, indoorDark: spec.dark ?? Math.min(0.75, (night || 0) * 1.6 + 0.08), key: `room_${scene.locKey}` });
  const front = [];
  W.layer(1, (p, ctx) => {
    const r = rng(width + (spec.props?.length || 0) * 31);
    const wa = ctx.w;
    if (spec.upstairs !== false) I.upstairs(p, 0, wa, { c: mix(hex(spec.wallColor ?? 0x3a2f4a), 0x4a4040, 0.5), r, ctx });
    (WALLS[spec.wall] || WALLS.paint)(p, wa, spec.wallColor ?? 0x3a2f4a, r);
    I.baseboard(p, 0, wa, mix(hex(spec.floor ?? 0x2a1f1a), 0x3a2a20, 0.3));
    (spec.props || []).forEach((q) => PROPS[q.type]?.(p, ctx, q, front, r));
    // Если нет своих ламп — потолочные светильники через равные промежутки
    if (!ctx.__bulb && !ctx.lights.length) {
      for (let x = 80; x < wa; x += 200) {
        const L = I.ceilingLamp(p, x, { shade: 0xe8dcc0 });
        ctx.lights.push({ x: L.x, y: L.y, r: 120, color: 0xfff0d0, k: 0.7 });
      }
    }
    const fc = hex(spec.floor ?? 0x2a1f1a);
    I.floor(p, 0, wa, { type: spec.floorTiles ? 'tiles' : spec.wall === 'wood' || spec.wall === 'paint' ? 'boards' : 'lino', c: mix(fc, 0x6a5a4a, 0.35), r });
  }, { name: 'room' });
  // Передний план интерьера: стойки (перед работниками, но за героем)
  if (front.length) {
    const fp = new Pix(Math.ceil(width / ART) + 2, 270);
    front.forEach((fn) => fn(fp));
    const dk = scene.lightEnv.dark;
    if (dk > 0.05) fp.tint(0, 0, fp.w, fp.h, 0x140f26, dk * 0.45);
    const key = `room_front_${scene.locKey}_${Math.round(dk * 10)}`;
    fp.texture(scene, key);
    scene.add.image(0, 0, key).setOrigin(0).setScale(ART).setDepth(15);
  }
  // Живые детали: вертел, диско-шар
  if (scene.__grill) {
    const g = scene.__grill;
    const meat = scene.add.rectangle(g.x, g.y, 22, 56, 0xa0603a).setStrokeStyle(2, 0x7a4020).setDepth(3);
    scene.tweens.add({ targets: meat, scaleX: 0.8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.__grill = null;
  }
  if (scene.__disco) {
    const d = scene.__disco;
    const ball = scene.add.circle(d.x, d.y, 12, 0xc8c8d8).setStrokeStyle(2, 0xffffff).setDepth(3);
    scene.tweens.add({ targets: ball, angle: 360, duration: 4000, repeat: -1 });
    for (let i = 0; i < 6; i++) {
      const beam = scene.add.triangle(0, 0, d.x, d.y, d.x - 120 + i * 50, 470, d.x - 80 + i * 50, 470, [0xff3d8a, 0x3df0ff, 0xffd166][i % 3], 0.1).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(31);
      scene.tweens.add({ targets: beam, alpha: 0.02, duration: 400 + i * 120, yoyo: true, repeat: -1 });
    }
    scene.__disco = null;
  }
  return W;
}
