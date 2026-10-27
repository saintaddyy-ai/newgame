// Сборка фона локации: небо, слои параллакса (дальние — мельче и ближе к горизонту),
// ночная цветокоррекция, «запечённый» свет фонарей и светящиеся окна.
// Свет для персонажей (подсветка спрайтов) — в scene.lightEnv, ореолы ламп — в scene.autoLights.
import Phaser from 'phaser';
import { Pix, ART, GROUND, bayer } from './pix.js';
import { rgb, mix, rng, ramp } from './color.js';
import { worldMinutes, darkness, skyColors, phaseOf, ambientTint } from './time.js';
import { quality } from './quality.js';

export const H = 270; // высота экрана в пикселях арта
export const HORIZON = GROUND - 58; // линия горизонта (уровень глаз ≈ 1,6 м)
// Основание слоя с параллаксом f: чем дальше, тем ближе к горизонту
export const layerBase = (f) => Math.round(HORIZON + (GROUND - HORIZON) * f);

const CACHE = [];
const MAX_CACHE = 30;

function remember(scene, key) {
  const i = CACHE.indexOf(key);
  if (i >= 0) CACHE.splice(i, 1);
  CACHE.push(key);
  while (CACHE.length > MAX_CACHE) {
    const old = CACHE.shift();
    if (scene.textures.exists(old)) scene.textures.remove(old);
  }
}

// Ночная цветокоррекция: темнее и синее, яркие цвета гаснут сильнее
function grade(p, dark, tint) {
  if (dark <= 0.01) return;
  const [tr, tg, tb] = rgb(tint);
  const k = dark * 0.62;
  const b = 1 - dark * 0.55;
  const d = p.d;
  for (let i = 0; i < d.length; i++) {
    const v = d[i];
    if (!(v >>> 24)) continue;
    let r = v & 255;
    let g = (v >> 8) & 255;
    let bl = (v >> 16) & 255;
    r = (r + (tr - r) * k) * b;
    g = (g + (tg - g) * k) * b;
    bl = (bl + (tb - bl) * k) * b + dark * 6;
    d[i] = ((v & 0xff000000) | (Math.min(255, bl) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
  }
}

// Пятно света: возвращает часть исходных цветов (albedo), окрашенных светом. Полосами с дизерингом.
function bake(p, albedo, L) {
  const [lr, lg, lb] = rgb(L.color ?? 0xffd8a0).map((c) => c / 255);
  const R = L.r;
  const x0 = Math.max(0, Math.floor(L.x - R * 1.2));
  const x1 = Math.min(p.w - 1, Math.ceil(L.x + R * 1.2));
  const y0 = Math.max(0, Math.floor(L.y - R * (L.cone ? 0.4 : 1)));
  const y1 = Math.min(p.h - 1, Math.ceil(L.cone ? L.ground + 6 : L.y + R));
  const strength = L.k ?? 0.85;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * p.w + x;
      const v = p.d[i];
      if (!(v >>> 24)) continue;
      let k;
      const dx = x - L.x;
      const dy = y - L.y;
      const radial = Math.max(0, 1 - Math.hypot(dx, dy * (L.squash || 1)) / R);
      if (L.cone) {
        // Конус вниз от лампы + яркое пятно на земле
        const depth = y - L.y;
        const half = 3 + depth * (L.spread ?? 0.55);
        const cone = depth > 0 ? Math.max(0, 1 - Math.abs(dx) / half) * Math.max(0, 1 - depth / ((L.ground - L.y) * 1.25)) * 0.8 : 0;
        const pool = Math.max(0, 1 - Math.hypot(dx / (R * 0.9), (y - L.ground) / 6));
        k = Math.max(radial * 0.9, cone, pool);
      } else k = radial;
      if (k <= 0) continue;
      k = Math.pow(k, 1.3) * strength;
      // Квантуем на 4 ступени, края ступеней — сеточкой
      const q = k * 4;
      const step = Math.floor(q) + (q - Math.floor(q) > bayer(x, y) ? 1 : 0);
      const kk = Math.min(1, step / 4);
      if (kk <= 0) continue;
      const a = albedo[i];
      const ar = (a & 255) * lr * 1.08;
      const ag = ((a >> 8) & 255) * lg * 1.08;
      const ab = ((a >> 16) & 255) * lb * 1.08;
      const r = (v & 255) + (ar - (v & 255)) * kk;
      const g = ((v >> 8) & 255) + (ag - ((v >> 8) & 255)) * kk;
      const b = ((v >> 16) & 255) + (ab - ((v >> 16) & 255)) * kk;
      p.d[i] = ((v & 0xff000000) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
    }
  }
}

// Светящийся прямоугольник (окно, вывеска) с мягким ореолом вокруг
function glowRect(p, x, y, w, h, c, halo = 0.18) {
  if (halo > 0) p.tint(x - 1, y - 1, w + 2, h + 2, c, halo);
  p.rect(x, y, w, h, c);
}

export function makeWorld(scene, width, { min, time = 'night', outdoor = true, key = scene.locKey || 'loc', indoorDark } = {}) {
  const t = min ?? worldMinutes(time);
  let dark = outdoor ? darkness(t) : indoorDark ?? 0;
  const env = { t, dark, phase: phaseOf(t), tint: ambientTint(t), lights: [], outdoor, width, key };
  if (!outdoor) env.tint = 0x1a1230;
  scene.lightEnv = env;
  scene.autoLights = [];
  scene.blinkers = [];
  const bucket = `${Math.round(dark * 10)}_${env.phase}`;

  const api = {
    env,
    // Небо: градиент по времени, звёзды, луна, облака
    sky({ clouds = true, stars = true } = {}) {
      const k = `sky_${bucket}_${Math.round(t / 30)}`;
      if (!scene.textures.exists(k)) {
        const p = new Pix(480, H);
        const cols = skyColors(t);
        p.gradV(0, 0, 480, HORIZON + 30, cols);
        p.rect(0, HORIZON + 30, 480, H - HORIZON - 30, cols[4]);
        // Засветка от города у горизонта ночью
        if (dark > 0.4) p.dither(0, HORIZON - 40, 480, 70, mix(cols[4], 0x6a3050, 0.4), (x, y) => ((y - (HORIZON - 40)) / 70) * 0.6 * dark);
        if (stars && dark > 0.5) {
          const r = rng(77);
          for (let i = 0; i < 140; i++) {
            const sx = Math.floor(r() * 480);
            const sy = Math.floor(r() * (HORIZON - 30));
            p.set(sx, sy, r() < 0.2 ? 0xc8d8ff : mix(0xffffff, cols[0], 0.3 + r() * 0.4));
          }
        }
        // Луна (растущий серп)
        if (dark > 0.35) {
          p.ellipse(380, 34, 9, 9, 0xf2e8c8, (x, y, dx, dy) => (dx + 0.35 > 0.75 ? null : dx < -0.4 && dy < 0 ? 0xfffaf0 : (x + y) % 5 === 0 ? 0xd8ccb0 : 0xf2e8c8));
          p.tint(366, 20, 28, 28, 0xf2e8c8, (x, y) => Math.max(0, 0.18 - Math.hypot(x - 380, y - 34) / 90));
        }
        p.texture(scene, k);
      }
      remember(scene, k);
      scene.add.image(0, 0, k).setOrigin(0).setScale(ART).setScrollFactor(0).setDepth(-100);
      // Облака плывут медленно
      if (clouds && quality() === 'high') {
        const ck = `clouds_${bucket}`;
        if (!scene.textures.exists(ck)) {
          const p = new Pix(480, 80);
          const r = rng(11);
          const base = mix(skyColors(t)[2], dark > 0.5 ? 0x2a2440 : 0xe8e8f0, dark > 0.5 ? 0.35 : 0.45);
          const cr = ramp(base);
          for (let i = 0; i < 9; i++) {
            const cx = r() * 480;
            const cy = 18 + r() * 44;
            const w = 30 + r() * 60;
            for (let j = 0; j < 6; j++) {
              p.ellipse(cx + (r() - 0.5) * w, cy + (r() - 0.5) * 6, 8 + r() * 12, 3 + r() * 4, null, (x, y, dx, dy) => {
                if (dy < -0.5) return (x + y) % 2 ? cr[3] : null;
                return dy > 0.3 ? cr[1] : cr[2];
              });
            }
          }
          p.texture(scene, ck);
        }
        remember(scene, ck);
        const c = scene.add.tileSprite(0, 0, 480, 80, ck).setOrigin(0).setScale(ART).setScrollFactor(0).setDepth(-99).setAlpha(dark > 0.5 ? 0.5 : 0.8);
        const drift = (time) => {
          if (c.active) c.tilePositionX = (time / 1000) * 1.5 + scene.cameras.main.scrollX * 0.02;
        };
        scene.events.on('update', drift);
        scene.events.once('shutdown', () => scene.events.off('update', drift));
      }
    },

    // Слой с параллаксом f. paint(p, ctx) рисует в пикселях арта своего слоя.
    layer(f, paint, { depth = -50 + f * 10, name = `L${f}`, front = false, seed = 1, dark: layerDark } = {}) {
      const wArt = Math.ceil((960 + Math.max(0, width - 960) * f) / ART) + 2;
      const dk = layerDark ?? dark;
      const k = `bg_${key}_${name}_${bucket}_${Math.round(dk * 10)}_${seed}`;
      const ctx = { f, w: wArt, h: H, base: layerBase(f), env, dark: dk, outDark: dark, r: rng(seed * 101 + f * 997), lights: [], emit: [], emitFns: [], post: [], scene };
      // Свет для персонажей — по главному слою
      if (f === 1 && !front && layerDark != null) env.dark = layerDark;
      if (!scene.textures.exists(k)) {
        const p = new Pix(wArt, H);
        paint(p, ctx);
        const albedo = new Uint32Array(p.d);
        grade(p, dk, layerDark != null ? 0x140f26 : env.tint);
        if (dk > 0.05) ctx.lights.forEach((L) => bake(p, albedo, { ...L, k: (L.k ?? 0.85) * Math.min(1, dk * 1.4) }));
        ctx.emit.forEach(([x, y, w, h, c, halo, fn]) => {
          glowRect(p, x, y, w, h, c, halo);
          fn?.(p);
        });
        ctx.emitFns.forEach((fn) => fn(p, dk));
        ctx.post.forEach((fn) => fn(p));
        // Обрезаем пустые (прозрачные) полосы сверху и снизу — меньше лишней заливки
        let top = 0;
        let bot = p.h - 1;
        const rowEmpty = (y) => {
          for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x] >>> 24) return false;
          return true;
        };
        while (top < bot && rowEmpty(top)) top++;
        while (bot > top && rowEmpty(bot)) bot--;
        if (top > 0 || bot < p.h - 1) {
          const cropped = new Pix(p.w, bot - top + 1);
          cropped.d.set(p.d.subarray(top * p.w, (bot + 1) * p.w));
          cropped.texture(scene, k);
        } else p.texture(scene, k);
        const tx = scene.textures.get(k);
        tx.__lights = ctx.lights;
        tx.__top = top;
      } else {
        // Повторный вход: картинка из кэша, но свет надо знать заново
        ctx.lights = scene.textures.get(k).__lights || [];
      }
      remember(scene, k);
      const img = scene.add.image(0, (scene.textures.get(k).__top || 0) * ART, k).setOrigin(0).setScale(ART).setScrollFactor(f, 1).setDepth(front ? 40 : depth);
      if (f === 1 && !front && depth < 0) {
        ctx.lights.forEach((L) => {
          const s = { x: L.x * ART, y: L.y * ART, r: L.r * ART, color: L.color ?? 0xffd8a0, flicker: L.flicker, glow: L.glow !== false, ground: (L.ground ?? L.y) * ART };
          env.lights.push(s);
          if (dk > 0.25 && s.glow) scene.autoLights.push({ x: s.x, y: s.y, r: Math.min(140, L.r * 1.1), color: s.color, flicker: L.flicker, alpha: 0.32 * dk + 0.05 });
        });
      }
      return img;
    },
  };
  return api;
}

// Подсветка персонажа по ближайшим лампам (вызывается каждый кадр)
export function lightSprite(scene, s) {
  const env = scene.lightEnv;
  if (!env || !s?.visible || s.__noLight) return;
  const dark = env.dark;
  if (dark < 0.05) {
    if (s.__lit !== 0xffffff) {
      s.clearTint();
      s.__lit = 0xffffff;
    }
    return;
  }
  // Окружающий свет: синеватый полумрак
  const amb = mix(0xffffff, mix(env.tint, 0x8a8ab8, 0.5), Math.min(0.75, dark * 0.75));
  let best = 0;
  let bestC = 0xffffff;
  for (const L of env.lights) {
    const dx = Math.abs(s.x - L.x);
    const reach = L.r * 1.25;
    if (dx > reach) continue;
    const k = (1 - dx / reach) * (L.flickerNow ?? 1);
    if (k > best) {
      best = k;
      bestC = L.color;
    }
  }
  const lit = mix(amb, mix(0xffffff, bestC, 0.35), Math.min(1, best * 1.3));
  const c = Phaser.Display.Color.GetColor(...rgb(lit));
  if (c !== s.__lit) {
    s.setTint(c);
    s.__lit = c;
  }
}
