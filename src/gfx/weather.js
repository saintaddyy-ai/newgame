// Погода: дождь (два слоя капель + брызги на асфальте), снег, туман, пыль в лучах света.
import Phaser from 'phaser';
import { particles, quality } from './quality.js';
import { Pix } from './pix.js';
import { rng } from './color.js';

const FLOOR = 470;

export function rain(scene, { heavy = false } = {}) {
  const k = particles() * (heavy ? 1.6 : 1);
  // Дальний слой — тонкие медленные капли
  scene.add.particles(0, -20, 'raindrop', {
    x: { min: -100, max: 1060 }, lifespan: 1100, speedY: { min: 520, max: 620 }, speedX: -90,
    alpha: { start: 0.25, end: 0.08 }, scaleY: 1.4, scaleX: 1, quantity: 1, frequency: 22 / k,
  }).setScrollFactor(0).setDepth(-30);
  // Ближний слой — крупные косые капли поверх всего
  scene.add.particles(0, -20, 'raindrop', {
    x: { min: -100, max: 1060 }, lifespan: 800, speedY: { min: 800, max: 950 }, speedX: -140,
    alpha: { start: 0.5, end: 0.15 }, scaleY: 3, scaleX: 2, quantity: 1, frequency: 14 / k,
  }).setScrollFactor(0).setDepth(800);
  // Брызги на земле в видимой части
  if (quality() !== 'low') {
    const splash = scene.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 70 }, angle: { min: 220, max: 320 }, gravityY: 300, lifespan: 260,
      scale: 0.5, tint: 0x9ab0e0, alpha: 0.55, emitting: false,
    }).setDepth(26);
    scene.time.addEvent({
      delay: 60 / k, loop: true, callback: () => {
        const cam = scene.cameras.main;
        splash.explode(2, cam.scrollX + Math.random() * 960, FLOOR - 4 + Math.random() * 60);
      },
    });
  }
}

export function snow(scene) {
  scene.add.particles(0, -20, 'snowflake', {
    x: { min: -100, max: 1060 }, lifespan: 9000, speedY: { min: 40, max: 80 }, speedX: { min: -30, max: 10 },
    accelerationX: { min: -8, max: 8 }, scale: { min: 1.5, max: 3 }, alpha: { min: 0.5, max: 0.9 }, frequency: 50 / particles(),
  }).setScrollFactor(0).setDepth(800);
}

// Туман: два медленных слоя полупрозрачной дымки
export function fog(scene, { alpha = 0.14, tint = 0xb8bcd8 } = {}) {
  if (!scene.textures.exists('fog_tex')) {
    const p = new Pix(256, 64);
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const cx = r() * 256;
      const cy = 20 + r() * 30;
      p.ellipse(cx, cy, 10 + r() * 30, 4 + r() * 8, null, (x, y, dx, dy) => ((x + y) % 2 && dx * dx + dy * dy > 0.5 ? null : 0xffffff));
    }
    p.texture(scene, 'fog_tex');
    scene.textures.get('fog_tex').setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  const a = scene.add.tileSprite(0, 300, 960, 200, 'fog_tex').setOrigin(0).setScrollFactor(0).setDepth(29).setAlpha(alpha).setTint(tint).setTileScale(3, 3);
  const b = scene.add.tileSprite(0, 360, 960, 200, 'fog_tex').setOrigin(0).setScrollFactor(0).setDepth(41).setAlpha(alpha * 0.6).setTint(tint).setTileScale(4, 3);
  const drift = (t) => {
    const cam = scene.cameras.main;
    if (!a.active) return;
    a.tilePositionX = t / 160 + cam.scrollX * 0.25;
    b.tilePositionX = -t / 120 + cam.scrollX * 0.4;
  };
  scene.events.on('update', drift);
  scene.events.once('shutdown', () => scene.events.off('update', drift));
}

// Пылинки в луче света (гараж, склад, «Подвал»)
export function dust(scene, width) {
  if (quality() === 'low') return;
  scene.add.particles(0, 0, 'px', {
    x: { min: 0, max: width }, y: { min: 120, max: 440 }, lifespan: 6000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 4 },
    scale: { min: 0.25, max: 0.5 }, alpha: { start: 0, end: 0.5, ease: 'Sine.inOut' }, tint: 0xfff0d0, frequency: 180 / particles(), blendMode: 'ADD',
  }).setDepth(29);
}
