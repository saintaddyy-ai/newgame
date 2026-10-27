// Фоны Эпизода 2: улицы, кафе, магазины, метро, «Подвал», крыши, ночной город.
// Рисуются прямоугольниками в том же пиксельном стиле, что и Эпизод 1. Описываются данными.
import Phaser from 'phaser';
import { now, at } from './world.js';

const FLOOR = 470;
const PIX = '"Press Start 2P"';

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Небо по времени суток
export function skyColors() {
  const t = now() % 1440;
  if (t >= at(6) && t < at(17)) return [0x6a7a9a, 0x8a98b4, 0xa8b4c8, 0xc8ccd8];
  if (t >= at(17) && t < at(20)) return [0x2a1f4a, 0x5a2a5a, 0xa04a6a, 0xe0705a];
  return [0x07060d, 0x0d0b1e, 0x15102a, 0x2a1b3d];
}

export const isDarkNow = () => {
  const t = now() % 1440;
  return t >= at(20) || t < at(6);
};

function sky(scene, width) {
  const g = scene.add.graphics();
  const cols = skyColors();
  const bh = Math.ceil(FLOOR / cols.length);
  cols.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * bh, width, bh));
  if (isDarkNow()) {
    const r = rng(9);
    for (let i = 0; i < width / 14; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.5).fillRect(r() * width, r() * 180, 2, 2);
  }
  return g;
}

// Дальний город медленнее ближнего — параллакс
function farCity(scene, width, seed = 3) {
  const g = scene.add.graphics().setScrollFactor(0.35, 1);
  const r = rng(seed);
  const dark = isDarkNow();
  for (let x = -100; x < width * 0.5 + 960; x += 50 + r() * 60) {
    const h = 120 + r() * 200;
    const w = 40 + r() * 50;
    g.fillStyle(dark ? 0x1a1430 : 0x5a6280, 1).fillRect(x, FLOOR - 120 - h, w, h + 120);
    for (let wy = FLOOR - 110 - h; wy < FLOOR - 130; wy += 16) {
      for (let wx = x + 5; wx < x + w - 6; wx += 12) if (r() > (dark ? 0.75 : 0.9)) g.fillStyle(dark ? 0xffd27a : 0x8a92ac, 1).fillRect(wx, wy, 5, 7);
    }
    if (r() > 0.7) g.fillStyle(r() > 0.5 ? 0xff3d8a : 0x3df0ff, 0.8).fillRect(x + 4, FLOOR - 124 - h, w - 8, 3);
  }
  return g;
}

function ground(g, width, { sidewalk = 0x3a3a44, road = 0x232329 } = {}) {
  g.fillStyle(sidewalk, 1).fillRect(0, FLOOR - 10, width, 40);
  for (let x = 0; x < width; x += 60) g.fillStyle(0x2e2e36, 1).fillRect(x, FLOOR - 10, 2, 40);
  g.fillStyle(0x55555f, 1).fillRect(0, FLOOR + 28, width, 4);
  g.fillStyle(road, 1).fillRect(0, FLOOR + 32, width, 40);
  for (let x = 20; x < width; x += 120) g.fillStyle(0xd8d8c8, 0.5).fillRect(x, FLOOR + 50, 50, 3);
}

function text(scene, x, y, str, color = '#ffffff', size = 10, opts = {}) {
  return scene.add.text(x, y, str, { fontFamily: PIX, fontSize: `${size}px`, color, ...opts }).setOrigin(0.5);
}

// Неоновая вывеска: светится и иногда мигает
export function neon(scene, x, y, str, color = '#ff3d8a', size = 10) {
  const t = text(scene, x, y, str, color, size);
  t.setShadow(0, 0, color, 12, true, true);
  if (Math.random() < 0.5) {
    scene.time.addEvent({ delay: 2500 + Math.random() * 4000, loop: true, callback: () => scene.tweens.add({ targets: t, alpha: 0.25, duration: 50, yoyo: true, repeat: 2 }) });
  }
  return t;
}

// Фасад: стена, окна, витрина, дверь, вывеска, козырёк
function facade(scene, g, b) {
  const top = FLOOR - b.h;
  g.fillStyle(b.color, 1).fillRect(b.x, top, b.w, b.h);
  const shade = Phaser.Display.Color.ValueToColor(b.color).darken(12).color;
  for (let y = top + 70; y < FLOOR - 140; y += 70) g.fillStyle(shade, 1).fillRect(b.x, y, b.w, 3);
  const dark = isDarkNow();
  const r = rng(b.x + 1);
  for (let y = top + 20; y < FLOOR - 170; y += 70) {
    for (let x = b.x + 18; x < b.x + b.w - 40; x += 56) {
      g.fillStyle(dark ? (r() > 0.55 ? 0xffd27a : 0x15102a) : 0x9ab0c8, 1).fillRect(x, y, 34, 40);
      g.fillStyle(shade, 1).fillRect(x + 16, y, 3, 40);
    }
  }
  if (b.shop) {
    // Витрина первого этажа
    const wy = FLOOR - 150;
    g.fillStyle(0x1a1a22, 1).fillRect(b.x + 10, wy - 6, b.w - 20, 152);
    g.fillStyle(b.glass ?? (dark ? 0xffd9a0 : 0x8aa0b8), dark ? 0.85 : 1).fillRect(b.x + 16, wy, b.w - 32, 120);
    if (b.awning) {
      for (let x = b.x + 4; x < b.x + b.w - 4; x += 20) g.fillStyle(((x - b.x) / 20) % 2 ? b.awning : 0xe8e0d0, 1).fillRect(x, wy - 30, 20, 22);
    }
    if (b.sign) {
      g.fillStyle(0x0c0a16, 1).fillRect(b.x + b.w / 2 - b.sign.length * 6 - 14, wy - 64, b.sign.length * 12 + 28, 28);
      neon(scene, b.x + b.w / 2, wy - 50, b.sign, b.signColor || '#ff3d8a', 10);
    }
    // Силуэты внутри витрины
    if (b.inside) b.inside(g, b.x + 16, wy, b.w - 32);
  }
}

// ---------- Улицы ----------

// spec: { buildings: [...], lamps: [x...], extras(scene, g) }
export function drawStreet(scene, width, spec) {
  sky(scene, width);
  farCity(scene, width, spec.seed || 3);
  const g = scene.add.graphics();
  (spec.buildings || []).forEach((b) => facade(scene, g, b));
  ground(g, width);
  (spec.lamps || []).forEach((x) => {
    g.fillStyle(0x1a1a22, 1).fillRect(x, 190, 8, FLOOR - 200).fillRect(x - 20, 190, 36, 6);
    g.fillStyle(0xffe0a0, 1).fillRect(x - 22, 196, 16, 6);
  });
  spec.extras?.(scene, g);
  traffic(scene, width);
  return g;
}

// Машины проезжают по дороге
function traffic(scene, width) {
  const colors = [0xc0303a, 0x3a5a8a, 0xd8d8d8, 0x2a2a2a, 0xd8a040, 0x3a8a5a];
  const spawn = () => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = FLOOR + 40 + (dir > 0 ? 0 : 14);
    const c = scene.add.container(dir > 0 ? -160 : width + 160, y).setDepth(26);
    const col = Phaser.Utils.Array.GetRandom(colors);
    c.add([
      scene.add.rectangle(0, 0, 130, 22, col).setOrigin(0.5, 1),
      scene.add.rectangle(dir * 6, -22, 70, 16, col).setOrigin(0.5, 1),
      scene.add.rectangle(dir * 10, -24, 54, 10, 0x2a3a4a).setOrigin(0.5, 1),
      scene.add.circle(-40, 0, 9, 0x111111),
      scene.add.circle(40, 0, 9, 0x111111),
      scene.add.rectangle(dir * 64, -12, 6, 6, isDarkNow() ? 0xfff0b0 : 0xd8d8c8),
    ]);
    scene.tweens.add({ targets: c, x: dir > 0 ? width + 160 : -160, duration: (width + 320) * (5 + Math.random() * 3), onComplete: () => c.destroy() });
  };
  scene.time.addEvent({ delay: 3500, loop: true, callback: () => Math.random() < 0.7 && spawn() });
  spawn();
}

// Вход в метро: большая красная «М»
export function metroEntrance(scene, g, x) {
  g.fillStyle(0x2a2a34, 1).fillRect(x - 70, FLOOR - 170, 140, 160);
  g.fillStyle(0x07060d, 1).fillRect(x - 50, FLOOR - 120, 100, 110);
  for (let i = 0; i < 6; i++) g.fillStyle(0x3a3a44, 1).fillRect(x - 50, FLOOR - 120 + 30 + i * 13, 100, 4);
  const m = text(scene, x, FLOOR - 145, 'М', '#ff3d3d', 26);
  m.setShadow(0, 0, '#ff3d3d', 14, true, true);
}

// ---------- Интерьеры ----------

const WALLS = {
  brick: (g, w, c) => {
    g.fillStyle(c, 1).fillRect(0, 0, w, FLOOR);
    const d = Phaser.Display.Color.ValueToColor(c).darken(12).color;
    for (let y = 0; y < FLOOR; y += 18) for (let x = (y / 18) % 2 ? 0 : 24; x < w; x += 48) g.fillStyle(d, 1).fillRect(x, y, 2, 18).fillRect(0, y, w, 2);
  },
  tile: (g, w, c) => {
    g.fillStyle(c, 1).fillRect(0, 0, w, FLOOR);
    const d = Phaser.Display.Color.ValueToColor(c).darken(10).color;
    for (let y = 0; y < FLOOR; y += 30) g.fillStyle(d, 1).fillRect(0, y, w, 2);
    for (let x = 0; x < w; x += 30) g.fillStyle(d, 1).fillRect(x, 0, 2, FLOOR);
  },
  wood: (g, w, c) => {
    g.fillStyle(c, 1).fillRect(0, 0, w, FLOOR);
    const d = Phaser.Display.Color.ValueToColor(c).darken(10).color;
    for (let x = 0; x < w; x += 26) g.fillStyle(d, 1).fillRect(x, 0, 3, FLOOR);
  },
  paint: (g, w, c) => {
    g.fillStyle(c, 1).fillRect(0, 0, w, FLOOR);
    g.fillStyle(Phaser.Display.Color.ValueToColor(c).darken(8).color, 1).fillRect(0, FLOOR - 140, w, 140);
  },
  concrete: (g, w, c) => {
    g.fillStyle(c, 1).fillRect(0, 0, w, FLOOR);
    const r = rng(5);
    for (let i = 0; i < w / 6; i++) g.fillStyle(0x000000, 0.08).fillRect(r() * w, r() * FLOOR, 3 + r() * 8, 2);
  },
};

const PROPS = {
  counter(scene, g, p) {
    g.fillStyle(p.color ?? 0x5a3a2a, 1).fillRect(p.x, FLOOR - 110, p.w, 110);
    g.fillStyle(p.top ?? 0x8a6a4a, 1).fillRect(p.x - 6, FLOOR - 116, p.w + 12, 10);
    if (p.machine) {
      g.fillStyle(0xb8b8c0, 1).fillRect(p.x + 20, FLOOR - 176, 70, 60);
      g.fillStyle(0x2a2a2a, 1).fillRect(p.x + 30, FLOOR - 160, 50, 10);
      scene.add.circle(p.x + 76, FLOOR - 168, 4, 0xff3d3d);
    }
    if (p.register) {
      g.fillStyle(0x2a2a30, 1).fillRect(p.x + p.w - 70, FLOOR - 150, 50, 34);
      g.fillStyle(0x3df0ff, 1).fillRect(p.x + p.w - 64, FLOOR - 146, 38, 12);
    }
  },
  table(scene, g, p) {
    g.fillStyle(p.color ?? 0x6a4a30, 1).fillRect(p.x - 40, FLOOR - 70, 80, 8).fillRect(p.x - 4, FLOOR - 62, 8, 62);
    g.fillStyle(0x3a2a20, 1).fillRect(p.x - 70, FLOOR - 46, 24, 6).fillRect(p.x - 66, FLOOR - 40, 4, 40).fillRect(p.x + 46, FLOOR - 46, 24, 6).fillRect(p.x + 62, FLOOR - 40, 4, 40);
    if (p.cup) g.fillStyle(0xe8e0d0, 1).fillRect(p.x - 10, FLOOR - 80, 12, 10);
  },
  shelf(scene, g, p) {
    g.fillStyle(0x3a2a20, 1).fillRect(p.x, p.y ?? 140, p.w, 8).fillRect(p.x, (p.y ?? 140) + 60, p.w, 8);
    const r = rng(p.x);
    for (let x = p.x + 6; x < p.x + p.w - 14; x += 16) {
      g.fillStyle(Phaser.Display.Color.HSVToRGB(r(), 0.5, 0.8).color, 1).fillRect(x, (p.y ?? 140) - 26, 10, 26);
      g.fillStyle(Phaser.Display.Color.HSVToRGB(r(), 0.5, 0.8).color, 1).fillRect(x, (p.y ?? 140) + 34, 10, 26);
    }
  },
  poster(scene, g, p) {
    g.fillStyle(p.color ?? 0xff3d8a, 1).fillRect(p.x, p.y ?? 160, p.w ?? 70, p.h ?? 96);
    g.fillStyle(0x0c0a16, 0.4).fillRect(p.x + 8, (p.y ?? 160) + 10, (p.w ?? 70) - 16, 40);
    if (p.text) text(scene, p.x + (p.w ?? 70) / 2, (p.y ?? 160) + (p.h ?? 96) - 18, p.text, '#ffffff', 7);
  },
  plant(scene, g, p) {
    g.fillStyle(0x8a4a2a, 1).fillRect(p.x - 14, FLOOR - 40, 28, 40);
    g.fillStyle(0x3a8a5a, 1).fillCircle(p.x, FLOOR - 64, 26).fillCircle(p.x - 16, FLOOR - 50, 14).fillCircle(p.x + 16, FLOOR - 52, 14);
  },
  window(scene, g, p) {
    const dark = isDarkNow();
    g.fillStyle(0xd8d4e0, 1).fillRect(p.x - 6, (p.y ?? 110) - 6, (p.w ?? 140) + 12, (p.h ?? 130) + 12);
    const cols = dark ? [0x0d0b1e, 0x15102a] : [0x8aa0c0, 0xb8c4d8];
    g.fillStyle(cols[0], 1).fillRect(p.x, p.y ?? 110, p.w ?? 140, (p.h ?? 130) / 2);
    g.fillStyle(cols[1], 1).fillRect(p.x, (p.y ?? 110) + (p.h ?? 130) / 2, p.w ?? 140, (p.h ?? 130) / 2);
    g.fillStyle(0xd8d4e0, 1).fillRect(p.x + (p.w ?? 140) / 2 - 3, p.y ?? 110, 6, p.h ?? 130);
  },
  rack(scene, g, p) {
    g.fillStyle(0x8a8a9a, 1).fillRect(p.x, FLOOR - 200, p.w, 5).fillRect(p.x + 4, FLOOR - 200, 4, 200).fillRect(p.x + p.w - 8, FLOOR - 200, 4, 200);
    const r = rng(p.x + 7);
    for (let x = p.x + 12; x < p.x + p.w - 20; x += 22) {
      const c = p.colors ? p.colors[Math.floor(r() * p.colors.length)] : Phaser.Display.Color.HSVToRGB(r(), 0.6, 0.7).color;
      g.fillStyle(c, 1).fillRect(x, FLOOR - 192, 18, 70 + r() * 30);
    }
  },
  mirror(scene, g, p) {
    g.fillStyle(0x8a7a5a, 1).fillRect(p.x - 46, 120, 92, 140);
    g.fillStyle(0xc8e0ff, 1).fillRect(p.x - 40, 126, 80, 128);
    g.fillStyle(0xffffff, 0.4).fillRect(p.x - 30, 136, 10, 100);
  },
  barberChair(scene, g, p) {
    g.fillStyle(0x8a1f28, 1).fillRect(p.x - 34, FLOOR - 110, 68, 50).fillRect(p.x - 30, FLOOR - 170, 60, 64);
    g.fillStyle(0xb8b8c0, 1).fillRect(p.x - 6, FLOOR - 60, 12, 50).fillRect(p.x - 30, FLOOR - 12, 60, 12);
  },
  tattooChair(scene, g, p) {
    g.fillStyle(0x1a1a1e, 1).fillRect(p.x - 70, FLOOR - 90, 140, 26).fillRect(p.x + 50, FLOOR - 140, 26, 60);
    g.fillStyle(0xb8b8c0, 1).fillRect(p.x - 6, FLOOR - 64, 12, 64);
    g.fillStyle(0xfff0c8, 1).fillRect(p.x - 90, 150, 6, 120);
    scene.add.circle(p.x - 87, 150, 14, 0xfff0c8);
  },
  flash(scene, g, p) {
    const r = rng(p.x);
    for (let i = 0; i < (p.n || 6); i++) {
      const x = p.x + (i % 3) * 64;
      const y = 110 + Math.floor(i / 3) * 84;
      g.fillStyle(0xf1ead8, 1).fillRect(x, y, 56, 74);
      g.lineStyle(3, Phaser.Display.Color.HSVToRGB(r(), 0.7, 0.6).color, 1).strokeCircle(x + 28, y + 32, 14);
      g.fillStyle(0x1a1a1e, 1).fillRect(x + 12, y + 56, 32, 4);
    }
  },
  grill(scene, g, p) {
    g.fillStyle(0x8a8a9a, 1).fillRect(p.x - 40, FLOOR - 250, 80, 140);
    g.fillStyle(0xff7a2a, 0.9).fillRect(p.x - 32, FLOOR - 240, 10, 120);
    // Вертел с мясом крутится
    const meat = scene.add.rectangle(p.x + 8, FLOOR - 180, 44, 110, 0xa0603a).setStrokeStyle(3, 0x7a4020);
    scene.tweens.add({ targets: meat, scaleX: 0.85, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },
  fridge(scene, g, p) {
    g.fillStyle(0xd8d8e0, 1).fillRect(p.x, FLOOR - 200, 80, 200);
    g.fillStyle(0x8ab4d8, 0.7).fillRect(p.x + 8, FLOOR - 190, 64, 150);
    for (let y = FLOOR - 180; y < FLOOR - 50; y += 28) for (let x = p.x + 12; x < p.x + 66; x += 12) g.fillStyle(Phaser.Display.Color.HSVToRGB(((x + y) % 7) / 7, 0.6, 0.9).color, 1).fillRect(x, y, 8, 20);
  },
  stage(scene, g, p) {
    g.fillStyle(0x1a1420, 1).fillRect(p.x, FLOOR - 60, p.w, 60);
    g.fillStyle(0x2a2030, 1).fillRect(p.x, FLOOR - 64, p.w, 6);
    g.fillStyle(0x2a2a2a, 1).fillRect(p.x + p.w / 2 - 3, FLOOR - 200, 6, 140).fillRect(p.x + p.w / 2 - 20, FLOOR - 64, 40, 4);
    g.fillStyle(0x8a8a9a, 1).fillRect(p.x + p.w / 2 - 6, FLOOR - 214, 12, 18);
    [p.x + 30, p.x + p.w - 90].forEach((x) => {
      g.fillStyle(0x111114, 1).fillRect(x, FLOOR - 170, 60, 110);
      g.fillStyle(0x2a2a30, 1).fillCircle(x + 30, FLOOR - 140, 18).fillCircle(x + 30, FLOOR - 88, 12);
    });
  },
  toilet(scene, g, p) {
    g.fillStyle(0xe8e8e8, 1).fillRect(p.x - 26, FLOOR - 60, 52, 40).fillRect(p.x - 34, FLOOR - 70, 68, 12).fillRect(p.x + 10, FLOOR - 130, 26, 64);
    g.fillStyle(0xb8b8c0, 1).fillRect(p.x - 18, FLOOR - 20, 36, 20);
  },
  sink(scene, g, p) {
    g.fillStyle(0xe8e8e8, 1).fillRect(p.x - 30, FLOOR - 120, 60, 18).fillRect(p.x - 8, FLOOR - 102, 16, 102);
    g.fillStyle(0xb8b8c0, 1).fillRect(p.x - 3, FLOOR - 140, 6, 22);
  },
  bulb(scene, g, p) {
    g.fillStyle(0x1a1a1a, 1).fillRect(p.x - 2, 0, 4, p.y ?? 60);
    scene.add.circle(p.x, p.y ?? 64, 9, 0xffe8a8);
  },
  scribbles(scene, g, p) {
    (p.lines || []).forEach((l, i) => {
      scene.add.text(p.x + (i % 2) * 40, (p.y ?? 140) + i * 34, l, {
        fontFamily: '"PT Mono", monospace', fontSize: '13px', color: ['#ff3d8a', '#3df0ff', '#ffd166', '#c9c4ee'][i % 4], fontStyle: 'italic',
      }).setAngle(-4 + (i % 3) * 3).setAlpha(0.85);
    });
  },
  sofa(scene, g, p) {
    g.fillStyle(p.color ?? 0x5a2a5a, 1).fillRect(p.x, FLOOR - 70, p.w ?? 220, 44).fillRect(p.x, FLOOR - 104, p.w ?? 220, 36);
    g.fillStyle(0x1a1a1a, 1).fillRect(p.x + 10, FLOOR - 26, 8, 26).fillRect(p.x + (p.w ?? 220) - 18, FLOOR - 26, 8, 26);
  },
  discoBall(scene, g, p) {
    const ball = scene.add.circle(p.x, 70, 26, 0xc8c8d8).setStrokeStyle(2, 0xffffff);
    scene.tweens.add({ targets: ball, angle: 360, duration: 4000, repeat: -1 });
    for (let i = 0; i < 6; i++) {
      const beam = scene.add.triangle(0, 0, p.x, 70, p.x - 120 + i * 50, FLOOR, p.x - 80 + i * 50, FLOOR, [0xff3d8a, 0x3df0ff, 0xffd166][i % 3], 0.12).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(31);
      scene.tweens.add({ targets: beam, alpha: 0.02, duration: 400 + i * 120, yoyo: true, repeat: -1 });
    }
  },
  door(scene, g, p) {
    g.fillStyle(0x1e1626, 1).fillRect(p.x - 42, FLOOR - 206, 84, 206);
    g.fillStyle(p.color ?? 0x5a3a2a, 1).fillRect(p.x - 36, FLOOR - 200, 72, 200);
    g.fillStyle(0xd8b040, 1).fillRect(p.x + 22, FLOOR - 100, 8, 8);
    if (p.sign) text(scene, p.x, FLOOR - 222, p.sign, p.signColor || '#c9c4ee', 8);
  },
  text(scene, g, p) {
    neon(scene, p.x, p.y ?? 80, p.text, p.color || '#ff3d8a', p.size || 12);
  },
};

// spec: { wall: 'brick'|'tile'|..., wallColor, floor, props: [{ type, ... }] }
export function drawInterior(scene, width, spec) {
  const g = scene.add.graphics();
  (WALLS[spec.wall] || WALLS.paint)(g, width, spec.wallColor ?? 0x3a2f4a);
  g.fillStyle(spec.floor ?? 0x2a1f1a, 1).fillRect(0, FLOOR, width, 70);
  if (spec.floorTiles) for (let x = 0; x < width; x += 40) g.fillStyle(spec.floorTiles, 1).fillRect(x, FLOOR + ((x / 40) % 2) * 20, 20, 20);
  g.fillStyle(0x000000, 0.25).fillRect(0, FLOOR - 8, width, 8);
  (spec.props || []).forEach((p) => PROPS[p.type]?.(scene, g, p));
  return g;
}

// ---------- Метро ----------

// Десять веток, у каждой своё оформление станций
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

export function drawMetro(scene, width, lineId, stationName) {
  const L = LINES[lineId];
  const g = scene.add.graphics();
  g.fillStyle(L.wall, 1).fillRect(0, 0, width, FLOOR);
  const d = Phaser.Display.Color.ValueToColor(L.wall).darken(15).color;
  if (L.brutal) for (let y = 0; y < FLOOR; y += 60) g.fillStyle(d, 1).fillRect(0, y, width, 4);
  else for (let y = 0; y < FLOOR; y += 24) for (let x = (y / 24) % 2 ? 0 : 20; x < width; x += 40) g.fillStyle(d, 0.5).fillRect(x, y, 2, 24);
  // Путь и край платформы
  g.fillStyle(0x15151a, 1).fillRect(0, 260, width, 120);
  g.fillStyle(0x2a2a30, 1).fillRect(0, 350, width, 6);
  for (let x = 0; x < width; x += 40) g.fillStyle(0x3a3a40, 1).fillRect(x, 362, 24, 8);
  g.fillStyle(L.accent, 1).fillRect(0, 250, width, 12);
  // Название станции на стене за путями — крупно
  for (let x = 300; x < width; x += 900) {
    g.fillStyle(L.accent, 1).fillRect(x - 160, 150, 320, 60);
    text(scene, x, 180, stationName.toUpperCase(), '#ffffff', 14);
  }
  if (L.mosaic) for (let x = 760; x < width; x += 900) {
    const r = rng(x);
    for (let i = 0; i < 60; i++) g.fillStyle(Phaser.Display.Color.HSVToRGB(r(), 0.6, 0.9).color, 1).fillRect(x + (i % 10) * 12, 120 + Math.floor(i / 10) * 12, 10, 10);
  }
  if (L.neonLine) {
    const n = scene.add.rectangle(0, 246, width, 4, 0xff3d8a).setOrigin(0);
    n.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: n, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
  }
  // Пол платформы
  g.fillStyle(0x8a8a90, 1).fillRect(0, 380, width, FLOOR - 380);
  g.fillStyle(0xd8d040, 1).fillRect(0, 382, width, 6);
  g.fillStyle(0x6a6a70, 1).fillRect(0, FLOOR, width, 70);
  // Колонны
  for (let x = 160; x < width; x += 340) {
    if (L.pillar === 'round') g.fillStyle(d, 1).fillRoundedRect(x - 26, 0, 52, FLOOR, 20);
    else if (L.pillar === 'arch') {
      g.fillStyle(d, 1).fillRect(x - 30, 0, 60, FLOOR);
      g.fillStyle(L.wall, 1).fillCircle(x + 170, 60, 110);
    } else if (L.pillar === 'thin') g.fillStyle(0x3a3a44, 1).fillRect(x - 6, 0, 12, FLOOR);
    else g.fillStyle(d, 1).fillRect(x - 32, 0, 64, FLOOR);
    g.fillStyle(0xfff0c8, 1).fillRect(x - 18, 30, 36, 8);
  }
  // Полоса цвета ветки и табло
  g.fillStyle(L.color, 1).fillRect(0, 0, width, 14);
  return g;
}

// Поезд приезжает и уезжает
export function trainArrive(scene, width, lineId, { leave = true } = {}) {
  const L = LINES[lineId];
  const c = scene.add.container(width + 50, 350).setDepth(8);
  for (let i = 0; i < 5; i++) {
    const x = i * 230;
    c.add(scene.add.rectangle(x, 0, 224, 110, 0x5a6a7a).setOrigin(0, 1));
    c.add(scene.add.rectangle(x, -84, 224, 10, L.color).setOrigin(0, 1));
    for (let w = 0; w < 4; w++) c.add(scene.add.rectangle(x + 16 + w * 52, -30, 38, 38, 0xfff0c8, 0.9).setOrigin(0, 1));
  }
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: c, x: 0, duration: 1800, ease: 'Cubic.out',
      onComplete: () => {
        if (!leave) return resolve(c);
        scene.time.delayedCall(1200, () => scene.tweens.add({ targets: c, x: -1300, duration: 1600, ease: 'Cubic.in', onComplete: () => {
          c.destroy();
          resolve(null);
        } }));
      },
    });
  });
}

// ---------- Особые места ----------

export function drawRooftop(scene, width) {
  const g = scene.add.graphics();
  const cols = [0x07060d, 0x0d0b1e, 0x15102a, 0x2a1b3d, 0x3a1f45];
  cols.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * 80, width, 80));
  const r = rng(77);
  for (let i = 0; i < 120; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.6).fillRect(r() * width, r() * 220, 2, 2);
  g.fillStyle(0xf2e8c8, 1).fillCircle(width * 0.7, 90, 30);
  // Весь город внизу — огни
  for (let x = 0; x < width; x += 30 + r() * 40) {
    const h = 60 + r() * 140;
    g.fillStyle(0x15102a, 1).fillRect(x, 380 - h, 40, h);
    for (let wy = 380 - h + 6; wy < 375; wy += 10) for (let wx = x + 4; wx < x + 36; wx += 8) if (r() > 0.6) g.fillStyle(r() > 0.8 ? 0xff3d8a : 0xffd27a, 1).fillRect(wx, wy, 3, 4);
  }
  g.fillStyle(0x3a3448, 1).fillRect(0, 380, width, 12);
  g.fillStyle(0x2a2438, 1).fillRect(0, 392, width, FLOOR - 392 + 70);
  for (let x = 120; x < width; x += 400) {
    g.fillStyle(0x4a4458, 1).fillRect(x, 300, 60, 92);
    g.fillStyle(0x5a5468, 1).fillRect(x - 6, 292, 72, 10);
  }
  // Антенна с красным огоньком
  g.fillStyle(0x1a1a22, 1).fillRect(width - 200, 150, 6, 240);
  const red = scene.add.circle(width - 197, 148, 5, 0xff3d3d);
  scene.tweens.add({ targets: red, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
  return g;
}

export function drawPort(scene, width) {
  const g = scene.add.graphics();
  [0x07060d, 0x0d0b1e, 0x1a1030, 0x2a1440].forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * 70, width, 70));
  // Краны и контейнеры
  const r = rng(31);
  for (let x = 100; x < width; x += 500) {
    g.fillStyle(0x2a2238, 1).fillRect(x, 80, 14, 220).fillRect(x, 80, 180, 12).fillRect(x + 170, 92, 4, 90);
  }
  for (let x = 0; x < width; x += 130) {
    g.fillStyle([0x8a2a2a, 0x2a4a6a, 0x3a6a3a, 0x8a6a2a][Math.floor(r() * 4)], 1).fillRect(x, 300, 120, 70).fillRect(x + 20, 230, 110, 70);
  }
  // Вода с отражениями огней
  g.fillStyle(0x0a1020, 1).fillRect(0, 370, width, 40);
  for (let i = 0; i < 40; i++) {
    const s = scene.add.rectangle(r() * width, 380 + r() * 26, 20 + r() * 30, 2, r() > 0.5 ? 0xff3d8a : 0xffd27a, 0.6);
    scene.tweens.add({ targets: s, alpha: 0.1, x: s.x + 10, duration: 1200 + r() * 1500, yoyo: true, repeat: -1 });
  }
  g.fillStyle(0x2a2a30, 1).fillRect(0, 410, width, FLOOR - 410 + 70);
  ground(g, width, { sidewalk: 0x2e2e36, road: 0x1c1c22 });
  // Вывески ночного города
  neon(scene, 520, 200, 'ОТЕЛЬ «ПРИЧАЛ»', '#ff3d8a', 10);
  neon(scene, 1480, 180, 'БАР 24', '#3df0ff', 12);
  neon(scene, 2380, 210, 'САУНА', '#ffd166', 10);
  return g;
}

export function drawPromzona(scene, width) {
  const g = scene.add.graphics();
  const cols = skyColors();
  cols.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * 120, width, 120));
  // Трубы с дымом
  for (let x = 300; x < width; x += 700) {
    g.fillStyle(0x3a3440, 1).fillRect(x, 60, 40, 340);
    for (let y = 80; y < 400; y += 40) g.fillStyle(0xc03a3a, 1).fillRect(x, y, 40, 12);
    const smoke = scene.add.particles(x + 20, 60, 'dot', {
      speedY: { min: -30, max: -15 }, speedX: { min: 5, max: 20 }, lifespan: 4000, scale: { start: 0.8, end: 3 },
      alpha: { start: 0.25, end: 0 }, tint: 0x8a8a9a, frequency: 300,
    });
    smoke.setDepth(1);
  }
  // Забор
  g.fillStyle(0x4a4450, 1).fillRect(0, 330, width, 8);
  for (let x = 0; x < width; x += 18) g.fillStyle(0x4a4450, 1).fillRect(x, 300, 4, 140);
  // Старое кладбище: кресты и оградки
  for (let x = 900; x < 2000; x += 120) {
    g.fillStyle(0x2a2a30, 1).fillRect(x, 380, 6, 70).fillRect(x - 16, 396, 38, 6);
    g.lineStyle(2, 0x3a3a44, 1).strokeRect(x - 34, 430, 74, 30);
  }
  g.fillStyle(0x3a3428, 1).fillRect(0, FLOOR - 10, width, 80);
  for (let x = 0; x < width; x += 20) g.fillStyle(0x4a6a3a, 1).fillRect(x, FLOOR - 16, 3, 8);
  return g;
}

export function drawRechnaya(scene, width) {
  const g = scene.add.graphics();
  sky(scene, width);
  farCity(scene, width, 12);
  g.fillStyle(0x1a3040, 1).fillRect(0, 330, width, 80);
  for (let i = 0; i < 30; i++) {
    const s = scene.add.rectangle(Math.random() * width, 340 + Math.random() * 60, 40, 2, 0x9ab0d8, 0.4);
    scene.tweens.add({ targets: s, x: s.x + 30, alpha: 0.1, duration: 2000 + Math.random() * 2000, yoyo: true, repeat: -1 });
  }
  g.fillStyle(0x6a6a74, 1).fillRect(0, 404, width, 10);
  for (let x = 0; x < width; x += 30) g.fillStyle(0x4a4a54, 1).fillRect(x, 380, 4, 26);
  g.fillStyle(0x4a4a54, 1).fillRect(0, 378, width, 4);
  g.fillStyle(0x3a3a44, 1).fillRect(0, 414, width, FLOOR - 414 + 70);
  return g;
}
