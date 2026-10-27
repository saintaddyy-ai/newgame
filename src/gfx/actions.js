// Анимации действий: что делает Марк, когда пользуется предметами, и живое поведение NPC.
// Зеркало с отражением, холодильник с подсветкой, сон на кровати, душ, поездка в вагоне.
import Phaser from 'phaser';
import { state } from '../state.js';
import { pose, play, idle, isWalking } from './actors.js';
import { portraitKey, renderPortrait } from './portraits.js';
import { Pix, ART } from './pix.js';
import { mix } from './color.js';
import { markSpec } from '../story/episode2/look.js';

// Поза героя на время сценария — по звуку предмета (так не надо править каждый сценарий)
export const USE_POSE = {
  fridge: 'give',
  mirror: 'hood',
  water: 'wash',
  drip: 'give',
  bed: 'sit',
  paper: 'text',
  page: 'text',
  keys: 'give',
  washer: 'give',
  gas: 'give',
  wood: 'pick',
  thump: 'give',
  phone: 'phone',
  spray: 'give',
  flush: 'give',
  meow: 'crouch',
};

// Отражение в зеркале: повторяет кадр героя, видно только внутри рамы
export function makeMirror(scene) {
  const r = scene.mirrorRect;
  if (!r) return null;
  const refl = scene.add.sprite(0, 0, scene.player.texture.key, 'idle_0').setOrigin(0.5, 1).setDepth(3).setAlpha(0.85);
  refl.setTint(0x9ab8d0);
  const shape = scene.make.graphics({ x: 0, y: 0 }, false);
  shape.fillStyle(0xffffff).fillRect(r.x, r.y, r.w, r.h);
  refl.setMask(shape.createGeometryMask());
  const follow = () => {
    if (!refl.active || !scene.player?.active) return;
    const p = scene.player;
    // Отражение «за стеклом»: чуть меньше и выше (дальше от зрителя), смотрит навстречу
    refl.setTexture(p.texture.key, p.frame.name);
    refl.setScale(p.scaleX * 0.9, p.scaleY * 0.9);
    refl.setFlipX(!p.flipX);
    refl.x = p.x;
    refl.y = p.y - 18;
    refl.setVisible(Math.abs(p.x - (r.x + r.w / 2)) < r.w);
  };
  scene.events.on('update', follow);
  scene.events.once('shutdown', () => scene.events.off('update', follow));
  return refl;
}

// Крупный план зеркала: Марк поправляет капюшон; видно его состояние
export function mirrorCloseup(scene) {
  scene.showCloseup((s, layer) => {
    const spec = markSpec();
    const tired = state.energy < 30;
    const dirty = (state.clean ?? 100) < 35;
    const emo = state.flags.acidNow ? 'surprised' : tired ? 'sad' : 'neutral';
    const keyA = portraitKey(s, 'mark_mirror', spec, emo, 0x8ab0c8);
    const altSpec = { ...spec, hood: !spec.hood };
    const keyB = portraitKey(s, `mark_mirror_${altSpec.hood ? 'h' : 'n'}`, altSpec, emo, 0x8ab0c8);
    // Рама зеркала
    const frame = s.add.rectangle(480, 200, 300, 300, 0x8a6a40).setStrokeStyle(6, 0x0b0912);
    const glass = s.add.image(480, 200, keyA).setDisplaySize(270, 270);
    const shine = s.add.rectangle(380, 120, 20, 180, 0xffffff, 0.12).setAngle(18);
    layer.add([frame, glass, shine]);
    // Состояние: синяки под глазами, грязь, «кислота»
    if (tired) layer.add([s.add.rectangle(445, 220, 36, 6, 0x5a3a6a, 0.35), s.add.rectangle(518, 220, 22, 6, 0x5a3a6a, 0.35)]);
    if (dirty) for (let i = 0; i < 9; i++) layer.add(s.add.rectangle(400 + Math.random() * 160, 160 + Math.random() * 150, 6, 6, 0x4a3a2a, 0.5));
    if (state.flags.acidNow) s.tweens.addCounter({ from: 0, to: 360, duration: 3000, repeat: -1, onUpdate: (t) => glass.setTint(Phaser.Display.Color.HSVToRGB(t.getValue() / 360, 0.35, 1).color) });
    // Поправляет капюшон: картинка меняется туда-сюда и возвращается к текущему образу
    let n = 0;
    const tick = s.time.addEvent({ delay: 450, repeat: 3, callback: () => {
      n++;
      glass.setTexture(n % 2 ? keyB : keyA);
    } });
    layer.onHide = () => tick.remove();
  });
}

// Холодильник: дверца открыта, внутри светло
export function fridgeOpen(scene, x) {
  const y = 456;
  const glow = scene.add.rectangle(x, y - 64, 40, 120, 0xe8f4ff, 0.22).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
  const door = scene.add.rectangle(x - 34, y - 64, 10, 126, 0xd8d8e0).setStrokeStyle(2, 0x0b0912).setDepth(7);
  const light = scene.add.image(x, y - 70, 'glow').setTint(0xc8e4ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 2).setAlpha(0.35).setDepth(31);
  return () => [glow, door, light].forEach((o) => o.destroy());
}

// Лечь спать: герой ложится на кровать, свет гаснет
export function lieDown(scene, bedX, { bedY = 424 } = {}) {
  const p = scene.player;
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: p, x: bedX, duration: 300,
      onComplete: () => {
        pose(p, 'sleep');
        p.__pose = 'sleep';
        p.setOrigin(0.5, 0.62).setAngle(p.flipX ? 90 : -90).setPosition(bedX, bedY);
        const dim = scene.add.rectangle(0, 0, 960, 540, 0x07060d, 0).setOrigin(0).setScrollFactor(0).setDepth(990);
        const z = scene.add.text(bedX + 30, bedY - 60, 'z', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#c9c4ee' }).setDepth(32);
        scene.tweens.add({ targets: z, y: z.y - 40, alpha: 0, duration: 1200, repeat: 1 });
        scene.tweens.add({ targets: dim, fillAlpha: 0.85, duration: 1400, onComplete: () => resolve() });
      },
    });
  });
}

export function standUp(scene) {
  const p = scene.player;
  p.__pose = null;
  p.setOrigin(0.5, 1).setAngle(0).setY(470);
  idle(p);
}

// Душ / ванна: пар, шум воды, затемнение
export function shower(scene, x) {
  return new Promise((resolve) => {
    const steam = scene.add.particles(x, 380, 'puff', {
      x: { min: -60, max: 60 }, speedY: { min: -50, max: -20 }, lifespan: 2400, alpha: { start: 0.3, end: 0 }, scale: { start: 0.6, end: 2.2 },
      tint: 0xeef4ff, frequency: 70,
    }).setDepth(40);
    const veil = scene.add.rectangle(0, 0, 960, 540, 0x0c1420, 0).setOrigin(0).setScrollFactor(0).setDepth(989);
    scene.tweens.add({ targets: veil, fillAlpha: 0.75, duration: 700, yoyo: true, hold: 1200, onComplete: () => {
      steam.stop();
      scene.time.delayedCall(1500, () => steam.destroy());
      veil.destroy();
      resolve();
    } });
  });
}

// Поездка в метро: вагон изнутри, Марк держится за поручень, мимо летят огни туннеля
export function rideCloseup(scene) {
  return new Promise((resolve) => {
    scene.showCloseup((s, layer) => {
      if (!s.textures.exists('metro_car_in')) {
        const p = new Pix(480, 270);
        p.rect(0, 0, 480, 270, 0x2a2e38);
        p.rect(0, 30, 480, 8, 0xb8b8c0);
        for (let x = 20; x < 480; x += 120) {
          p.rect(x, 60, 90, 70, 0x0c0a12);
          p.rect(x + 2, 62, 86, 66, 0x15121c);
        }
        p.rect(0, 150, 480, 50, 0x6a5a3a);
        p.rect(0, 200, 480, 70, 0x3a3a42);
        for (let x = 0; x < 480; x += 3) p.set(x, 46, 0x8a8a92);
        p.texture(s, 'metro_car_in');
      }
      layer.add(s.add.image(0, 0, 'metro_car_in').setOrigin(0).setScale(2));
      // Огни туннеля в окнах
      const lights = [];
      for (let i = 0; i < 4; i++) {
        const l = s.add.rectangle(1000 + i * 260, 190, 40, 8, 0xffe0a0, 0.8);
        lights.push(l);
        layer.add(l);
      }
      s.tweens.add({ targets: lights, x: '-=1300', duration: 900, repeat: -1 });
      const m = s.add.sprite(420, 500, 'mark', 'rail_0').setOrigin(0.5, 1).setScale(2.4);
      layer.add(m);
      s.tweens.add({ targets: m, angle: { from: -1.5, to: 1.5 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    scene.cameras.main.shake(2400, 0.0015);
    scene.time.delayedCall(2600, () => {
      scene.hideCloseup();
      resolve();
    });
  });
}

// Живое поведение NPC: поворачиваются к герою, смотрят в телефон, курят
export function npcLife(scene) {
  return scene.time.addEvent({
    delay: 1300,
    loop: true,
    callback: () => {
      const p = scene.player;
      if (!p || scene.busy) return;
      Object.values(scene.npcs || {}).forEach((s) => {
        if (!s.visible || s.__pose || s.__acting || isWalking(s) || (s.anims.currentAnim?.key || '').endsWith('@talk')) return;
        const d = Math.abs(s.x - p.x);
        // Подошёл близко — посмотреть на него
        if (d < 260 && Math.random() < 0.4) s.setFlipX(p.x < s.x);
        const r = Math.random();
        const act = (name, ms) => {
          if (!s.texture.has(`${name}_0`)) return;
          s.__acting = true;
          play(s, name, true);
          scene.time.delayedCall(ms, () => {
            s.__acting = false;
            if (s.active) idle(s);
          });
        };
        if (r < 0.04) act('text', 2600 + Math.random() * 2000);
        else if (r < 0.1 && s.texture.__spec?.smoker) {
          act('smoke', 3200);
          // Дымок от сигареты
          const puff = scene.add.particles(s.x + (s.flipX ? -22 : 22), s.y - 100, 'puff', {
            speedY: { min: -26, max: -12 }, speedX: { min: -6, max: 6 }, lifespan: 1600, alpha: { start: 0.22, end: 0 },
            scale: { start: 0.15, end: 0.6 }, tint: 0xd8d8e0, frequency: 260, duration: 3000,
          }).setDepth(s.depth + 1);
          scene.time.delayedCall(5000, () => puff.destroy());
        }
        else if (r < 0.08 && d > 300) {
          s.setFlipX(!s.flipX);
        }
      });
    },
  });
}

export { mix };
