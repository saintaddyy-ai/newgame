import Phaser from 'phaser';
import { state } from '../state.js';
import { sfx } from '../audio.js';
import { castKey } from '../story/episode2/people.js';

const GROUND = 440;
const FONT = '"PT Mono", monospace';
const PIXEL = '"Press Start 2P"';

// Облава: Марк убегает дворами. ПРОБЕЛ — прыжок через препятствие, T — выбросить товар (бежать легче).
// Продержаться 30 секунд — ушёл. Догнали — попался.
export class ChaseScene extends Phaser.Scene {
  constructor() {
    super('Chase');
  }

  create(data = {}) {
    this.back = data.back || { loc: 'crossroads', spawnX: 200 };
    this.speed = 330;
    this.gap = 260; // расстояние до полицейского
    this.time0 = this.time.now;
    this.duration = 30000;
    this.done = false;
    this.vy = 0;
    this.dumped = false;
    this.cameras.main.fadeIn(300, 7, 6, 13);

    // Фон: дворы, гаражи, окна — едут с разной скоростью
    this.far = this.add.tileSprite(0, 0, 960, 540, this.makeLayer('chase_far', 0x15102a, 0x221c38, 0xffd27a)).setOrigin(0);
    this.near = this.add.tileSprite(0, 200, 960, 260, this.makeLayer('chase_near', 0x2c2638, 0x3a3f4a, 0x4a505c, 260)).setOrigin(0);
    this.add.rectangle(0, GROUND, 960, 100, 0x2b2b33).setOrigin(0);
    this.ground = this.add.tileSprite(0, GROUND, 960, 20, this.makeStripes()).setOrigin(0);

    this.mark = this.add.sprite(420, GROUND, 'mark_0').setOrigin(0.5, 1).play('mark_walk');
    this.mark.anims.timeScale = 2.2;
    const cop = castKey(this, 'cop');
    this.cop = this.add.sprite(420 - this.gap, GROUND, `${cop}_0`).setOrigin(0.5, 1).play(`${cop}_walk`);
    this.cop.anims.timeScale = 2.2;
    this.siren = this.add.rectangle(0, 0, 960, 540, 0x3a5aff, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.siren, fillAlpha: 0.12, duration: 300, yoyo: true, repeat: -1 });
    sfx('siren');
    this.sirenLoop = this.time.addEvent({ delay: 2000, loop: true, callback: () => sfx('siren') });

    this.obstacles = [];
    this.spawnEvent = this.time.addEvent({ delay: 1100, loop: true, callback: () => this.spawn() });
    this.add.text(480, 30, 'ОБЛАВА! БЕГИ!', { fontFamily: PIXEL, fontSize: '20px', color: '#ff6b6b', stroke: '#0c0a16', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(480, 66, 'ПРОБЕЛ / тап — прыжок     T — выбросить пакеты', { fontFamily: FONT, fontSize: '16px', color: '#c9c4ee' }).setOrigin(0.5);
    this.timer = this.add.text(930, 20, '', { fontFamily: PIXEL, fontSize: '14px', color: '#ffffff' }).setOrigin(1, 0);
    this.gapBar = this.add.rectangle(30, 100, 200, 10, 0xff6b6b).setOrigin(0);
    this.add.text(30, 84, 'ДО КОПА', { fontFamily: PIXEL, fontSize: '8px', color: '#ff6b6b' });

    this.input.keyboard.on('keydown', (ev) => {
      if ([' ', 'ArrowUp', 'w', 'ц', 'e', 'у'].includes(ev.key)) this.jump();
      if (ev.key === 't' || ev.key === 'е') this.dump();
    });
    this.input.on('pointerdown', () => this.jump());
    this.events.once('shutdown', () => this.sirenLoop?.remove());
  }

  makeLayer(key, sky, a, b, h = 540) {
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({}, false);
    g.fillStyle(sky, 1).fillRect(0, 0, 960, h);
    for (let x = 0; x < 960; x += 160) {
      g.fillStyle(a, 1).fillRect(x, h * 0.3, 150, h * 0.7);
      g.fillStyle(b, 1).fillRect(x + 10, h * 0.4, 130, h * 0.6);
      for (let y = h * 0.45; y < h - 20; y += 24) g.fillStyle(0x000000, 0.15).fillRect(x + 10, y, 130, 3);
    }
    g.generateTexture(key, 960, h);
    g.destroy();
    return key;
  }

  makeStripes() {
    if (this.textures.exists('chase_ground')) return 'chase_ground';
    const g = this.make.graphics({}, false);
    g.fillStyle(0x3a3a48, 1).fillRect(0, 0, 960, 20);
    for (let x = 0; x < 960; x += 80) g.fillStyle(0x4a4a58, 1).fillRect(x, 4, 40, 6);
    g.generateTexture('chase_ground', 960, 20);
    g.destroy();
    return 'chase_ground';
  }

  spawn() {
    if (this.done) return;
    const kinds = [
      { w: 44, h: 36, color: 0xc89a5a },
      { w: 70, h: 22, color: 0x6a6a7a },
      { w: 30, h: 56, color: 0x3a6a3a },
    ];
    const k = Phaser.Utils.Array.GetRandom(kinds);
    const o = this.add.rectangle(1000, GROUND, k.w, k.h, k.color).setOrigin(0.5, 1).setStrokeStyle(2, 0x0c0a16);
    o.hit = false;
    this.obstacles.push(o);
  }

  jump() {
    if (this.done || this.mark.y < GROUND - 1) return;
    this.vy = -720;
    sfx('whoosh');
  }

  dump() {
    if (this.dumped || this.done) return;
    this.dumped = true;
    state.flags.e2DumpedPacks = true;
    this.speed += 40;
    sfx('paper');
    const p = this.add.rectangle(this.mark.x, this.mark.y - 60, 20, 14, 0xd8d0c0);
    this.tweens.add({ targets: p, x: p.x - 300, y: GROUND - 10, angle: 360, duration: 700, onComplete: () => p.destroy() });
  }

  update(time, dt) {
    if (this.done) return;
    const s = dt / 1000;
    this.far.tilePositionX += this.speed * 0.2 * s;
    this.near.tilePositionX += this.speed * 0.5 * s;
    this.ground.tilePositionX += this.speed * s;
    // Прыжок
    this.vy += 1900 * s;
    this.mark.y = Math.min(GROUND, this.mark.y + this.vy * s);
    if (this.mark.y >= GROUND) this.vy = 0;
    // Препятствия
    for (const o of this.obstacles) {
      o.x -= this.speed * s;
      if (!o.hit && Math.abs(o.x - this.mark.x) < o.width / 2 + 14 && this.mark.y > GROUND - o.height) {
        o.hit = true;
        this.gap -= 70;
        sfx('crash');
        this.cameras.main.shake(200, 0.01);
      }
    }
    this.obstacles = this.obstacles.filter((o) => (o.x > -100 ? true : (o.destroy(), false)));
    // Коп медленно отстаёт, если бежать чисто
    this.gap = Math.min(320, this.gap + s * (this.dumped ? 14 : 6));
    this.cop.x = this.mark.x - this.gap;
    this.gapBar.setSize(Math.max(1, (200 * this.gap) / 320), 10);
    const left = Math.max(0, this.duration - (time - this.time0));
    this.timer.setText(`${Math.ceil(left / 1000)} с`);
    if (this.gap <= 30) return this.end(false);
    if (left <= 0) this.end(true);
  }

  end(escaped) {
    this.done = true;
    this.spawnEvent.remove();
    state.flags.e2ChaseResult = escaped ? 'escaped' : 'caught';
    const t = this.add.text(480, 260, escaped ? 'УШЁЛ ДВОРАМИ' : 'ПОЙМАЛИ', {
      fontFamily: PIXEL, fontSize: '36px', color: escaped ? '#8ae6a0' : '#ff6b6b', stroke: '#0c0a16', strokeThickness: 8,
    }).setOrigin(0.5);
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
    this.mark.anims.stop();
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', this.back));
    });
  }
}
