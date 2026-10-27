// Живой мир: голуби, кошки, вороны, падающие листья, пар из люков, прохожие вдали.
import Phaser from 'phaser';
import { Pix, ART } from './pix.js';
import { ramp, mix, rng } from './color.js';
import { particles, quality } from './quality.js';
import { personTexture, randomSpec } from '../story/episode2/people.js';
import { addActor, walk } from './actors.js';

const INK = 0x0b0912;

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const p = new Pix(w, h);
  draw(p);
  p.outline(INK);
  p.texture(scene, key);
}

// Текстуры живности — один раз при загрузке
export function createLifeTextures(scene) {
  const G = ramp(0x8a8a9a);
  const neck = 0x6a8a7a;
  // Голубь: стоит, клюёт, летит
  const pigeon = (p, peck) => {
    p.ellipse(6, 6, 4.5, 3, G[2], (x, y, dx, dy) => (dy < -0.3 ? G[3] : dx > 0.5 ? G[1] : G[2]));
    p.rect(1, 5, 3, 2, G[1]);
    if (peck) {
      p.rect(9, 7, 2, 2, neck);
      p.set(11, 8, 0xc86a4a);
    } else {
      p.rect(9, 2, 2, 3, neck);
      p.rect(9, 1, 3, 2, G[3]);
      p.set(12, 2, 0xc86a4a);
      p.set(10, 1, 0x1a1a1e);
    }
    p.set(5, 9, 0xc86a4a);
    p.set(7, 9, 0xc86a4a);
  };
  tex(scene, 'pigeon_0', 14, 11, (p) => pigeon(p, false));
  tex(scene, 'pigeon_1', 14, 11, (p) => pigeon(p, true));
  // Летящий голубь / ворона — два взмаха
  tex(scene, 'bird_0', 13, 7, (p) => {
    p.line(0, 0, 4, 3, G[2]);
    p.line(12, 0, 8, 3, G[2]);
    p.rect(4, 3, 5, 2, G[2]);
  });
  tex(scene, 'bird_1', 13, 7, (p) => {
    p.line(0, 5, 4, 3, G[1]);
    p.line(12, 5, 8, 3, G[1]);
    p.rect(4, 2, 5, 2, G[2]);
  });
  // Анимацию пересоздаём: старая могла ссылаться на прежние текстуры птиц
  if (scene.anims.exists('bird_fly')) scene.anims.remove('bird_fly');
  scene.anims.create({ key: 'bird_fly', frames: [{ key: 'bird_0' }, { key: 'bird_1' }], frameRate: 8, repeat: -1 });
  // Кот сидит, хвост ходит
  const K = ramp(0x2a2030);
  const cat = (p, tail) => {
    p.ellipse(7, 9, 4, 4, K[2], (x, y, dx) => (dx < -0.3 ? K[3] : K[2]));
    p.ellipse(8, 4, 3, 2.5, K[2]);
    p.set(6, 1, K[2]);
    p.set(10, 1, K[2]);
    p.set(7, 4, 0xd8e040);
    p.set(9, 4, 0xd8e040);
    p.rect(5, 12, 2, 1, K[1]);
    p.rect(8, 12, 2, 1, K[1]);
    if (tail) p.line(3, 11, 0, 6, K[2]);
    else p.line(3, 11, 0, 12, K[2]);
  };
  tex(scene, 'cat_0', 13, 14, (p) => cat(p, false));
  tex(scene, 'cat_1', 13, 14, (p) => cat(p, true));
  // Листья
  [0xc8782a, 0xa05a2a, 0xd89a3a].forEach((c, i) => tex(scene, `leaf_${i}`, 4, 3, (p) => {
    p.rect(0, 1, 3, 1, c);
    p.set(1, 0, c);
    p.set(2, 2, mix(c, 0x3a2010, 0.4));
  }));
  // Капля и брызги дождя, снежинка
  tex(scene, 'raindrop', 1, 6, (p) => p.vline(0, 0, 6, 0x9ab0e0));
  const sn = new Pix(2, 2);
  sn.rect(0, 0, 2, 2, 0xf0f4ff);
  sn.texture(scene, 'snowflake');
  // Мягкое пятно для тумана/пара — гладкое
  if (!scene.textures.exists('puff')) {
    const c = scene.textures.createCanvas('puff', 64, 64);
    const g = c.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    c.refresh();
    c.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  scene.textures.get('glow')?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
}

// Падающие листья (улица, день и вечер)
export function leaves(scene, width) {
  if (quality() === 'low') return;
  const env = scene.lightEnv;
  if (!env?.outdoor) return;
  scene.add.particles(0, -10, 'leaf_0', {
    x: { min: 0, max: width }, lifespan: 9000, speedY: { min: 20, max: 40 }, speedX: { min: -30, max: 10 },
    rotate: { min: 0, max: 360 }, scale: 2, frequency: 900 / particles(), tint: [0xffffff, 0xd8c8b0],
    frame: undefined,
  }).setDepth(28).setScrollFactor(1);
}

// Пар из люков
export function steam(scene, spots) {
  if (quality() === 'low') return;
  spots.forEach(([x, y]) => {
    scene.add.particles(x, y, 'puff', {
      x: { min: -10, max: 10 }, speedY: { min: -40, max: -20 }, speedX: { min: -6, max: 10 }, lifespan: 2400,
      alpha: { start: 0.18, end: 0 }, scale: { start: 0.3, end: 1.4 }, tint: 0xd8d8e8, frequency: 260 / particles(),
    }).setDepth(27);
  });
}

// Прохожие вдали: силуэты на среднем плане (через двор / на той стороне улицы)
export function distantWalkers(scene, width, { n = 3, y = 412, f = 0.5 } = {}) {
  if (quality() === 'low') return;
  const env = scene.lightEnv;
  const tint = mix(0x8a8aa8, 0x2a2440, Math.min(1, (env?.dark ?? 0) * 1.1));
  for (let i = 0; i < n; i++) {
    scene.time.delayedCall(500 + i * 2300, function go() {
      if (!scene.scene.isActive()) return;
      const key = personTexture(scene, randomSpec(`far_${Math.floor(Math.random() * 30)}`), null, 'crowd');
      const dir = Math.random() < 0.5 ? 1 : -1;
      const span = 960 + (width - 960) * f;
      // Глубина — сразу над слоем своего плана (у слоя f глубина −50 + f·10), но ПОЗАДИ ближнего плана (гаражи, стены):
      // иначе прохожие «идут по стене»
      const s = addActor(scene, dir > 0 ? -40 : span + 40, y, key, { scale: 0.5, flip: dir < 0, depth: -50 + f * 10 + 0.5 }).setScrollFactor(f, 1).setTint(tint);
      s.__noLight = true;
      scene.__actors?.delete(s);
      walk(s);
      scene.tweens.add({
        targets: s, x: dir > 0 ? span + 40 : -40, duration: (span + 80) * (14 + Math.random() * 6),
        onComplete: () => {
          s.destroy();
          scene.time.delayedCall(1500 + Math.random() * 6000, go);
        },
      });
    });
  }
}

// Вороны иногда пролетают по небу
export function skyBirds(scene) {
  if (quality() === 'low') return;
  scene.time.addEvent({
    delay: 7000, loop: true, callback: () => {
      if (Math.random() > 0.5) return;
      const y = 40 + Math.random() * 120;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
        const b = scene.add.sprite(dir > 0 ? -30 - i * 24 : 990 + i * 24, y + i * 8, 'bird_0').play('bird_fly').setScale(2).setScrollFactor(0).setDepth(-60).setTint(0x2a2438).setFlipX(dir < 0);
        scene.tweens.add({ targets: b, x: dir > 0 ? 1100 : -140, y: y - 20 + Math.random() * 40, duration: 6000 + Math.random() * 2000, onComplete: () => b.destroy() });
      }
    },
  });
}
