import Phaser from 'phaser';
import { state } from '../state.js';
import { BEAT, audioCtx, loadBuffer, playBuffer, sfx } from '../audio.js';

const ZONE_X = 300;
const START_X = 1010;
const BEATS_TO_ZONE = 4; // коробка едет до зоны ровно один такт
const EVERY = 2; // новая коробка — каждые две доли
const WINDOW = 0.14; // окно попадания, сек
const BASE_PAY = 4000;
const FINE = 100;

// Мини-игра «Разгрузка»: коробки едут по ленте в ритм бита, ловить в жёлтой зоне
export class WarehouseScene extends Phaser.Scene {
  constructor() {
    super('Warehouse');
  }

  create({ shift = 1, pay = BASE_PAY, back = 'warehouse' }) {
    this.total = shift === 1 ? 24 : 20;
    this.basePay = pay;
    this.backLoc = back;
    this.hits = 0;
    this.misses = 0;
    this.done = false;
    this.cameras.main.fadeIn(400, 7, 6, 13);

    const g = this.add.graphics();
    g.fillStyle(0x3a3e46, 1).fillRect(0, 0, 960, 540);
    for (let x = 0; x < 960; x += 120) g.fillStyle(0x34383f, 1).fillRect(x, 0, 6, 540);
    g.fillStyle(0x2a2c30, 1).fillRect(0, 440, 960, 100);
    // Лента
    g.fillStyle(0x1a1c20, 1).fillRect(140, 360, 900, 30);
    g.fillStyle(0x2a2a30, 1).fillRect(140, 390, 900, 50);
    this.rollers = [];
    for (let x = 150; x < 1040; x += 30) this.rollers.push(this.add.rectangle(x, 375, 4, 26, 0x4a4a52));
    // Зона ловли
    this.zone = this.add.rectangle(ZONE_X, 330, 70, 80, 0xffd166, 0.18).setStrokeStyle(3, 0xffd166);
    this.add.text(ZONE_X, 270, 'ЛОВИ', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd166' }).setOrigin(0.5);
    // Марк и стопка
    this.mark = this.add.sprite(ZONE_X - 120, 440, 'mark_0').setOrigin(0.5, 1).setFlipX(false);
    this.stack = [];
    this.palych = this.add.sprite(860, 440, 'palych_0').setOrigin(0.5, 1).setFlipX(true).setScale(0.8);

    this.add.text(480, 40, 'РАЗГРУЗКА', { fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#ffffff', stroke: '#ff8a20', strokeThickness: 6 }).setOrigin(0.5);
    this.scoreText = this.add.text(480, 84, '', { fontFamily: '"PT Mono", monospace', fontSize: '20px', color: '#c9c4ee' }).setOrigin(0.5);
    // Сколько получишь на руки — видно сразу и меняется с каждой разбитой коробкой
    this.payText = this.add.text(480, 116, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#8ae6a0' }).setOrigin(0.5);
    this.hint = this.add.text(480, 500, 'ПРОБЕЛ / E / тап — поймать коробку в жёлтой зоне', { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#8a8aa0' }).setOrigin(0.5);
    this.updateScore();

    this.input.keyboard.on('keydown', (ev) => {
      if ([' ', 'e', 'у', 'E', 'У', 'Enter'].includes(ev.key)) this.grab();
    });
    this.input.on('pointerdown', () => this.grab());
    this.events.once('shutdown', () => this.beat?.stop(0.2));
    this.start();
  }

  async start() {
    const buf = await loadBuffer(BEAT.url);
    const ctx = audioCtx();
    const beatLen = 60 / BEAT.bpm;
    // Бит с дропа; первая коробка доезжает до зоны через такт после старта
    this.t0 = ctx.currentTime + 0.3;
    if (buf) this.beat = playBuffer(buf, { offset: BEAT.drop, when: this.t0, loop: true, loopStart: BEAT.drop, volume: 0.7 });
    this.boxes = [];
    for (let i = 0; i < this.total; i++) {
      const arrive = (BEATS_TO_ZONE + i * EVERY) * beatLen;
      const fragile = Math.random() < 0.2;
      const spr = this.add.image(START_X, 330, fragile ? 'box_fragile' : 'box').setVisible(false);
      this.boxes.push({ arrive, spawn: arrive - BEATS_TO_ZONE * beatLen, spr, state: 'wait', fragile });
    }
    this.travel = BEATS_TO_ZONE * beatLen;
    this.ready = true;
  }

  now() {
    return audioCtx().currentTime - this.t0;
  }

  grab() {
    if (!this.ready || this.done) return;
    const t = this.now();
    const b = this.boxes.find((x) => x.state === 'move' && Math.abs(x.arrive - t) <= WINDOW);
    this.mark.setScale(1.06, 0.94);
    this.tweens.add({ targets: this.mark, scaleX: 1, scaleY: 1, duration: 120 });
    if (!b) {
      sfx('click');
      return;
    }
    b.state = 'caught';
    this.hits++;
    sfx('catch');
    this.zone.setFillStyle(0x8ae6a0, 0.4);
    this.time.delayedCall(120, () => this.zone.setFillStyle(0xffd166, 0.18));
    // Коробка летит в стопку
    const h = this.stack.length;
    const tx = 90 + (h % 2) * 6;
    const ty = 422 - h * 18;
    this.tweens.add({ targets: b.spr, x: tx, y: ty, angle: Phaser.Math.Between(-4, 4), duration: 260, ease: 'Quad.out' });
    this.stack.push(b.spr);
    this.updateScore();
  }

  miss(b) {
    b.state = 'dropped';
    this.misses++;
    sfx('crash');
    this.cameras.main.shake(180, 0.008);
    this.tweens.add({ targets: b.spr, y: 520, angle: 90, alpha: 0, duration: 400 });
    const t = this.add.text(b.spr.x, 280, `−${FINE} ₽`, { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff6b8a' }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: 240, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    if (this.misses === 3) this.say('Уронил — вычту! Я предупреждал!');
    this.updateScore();
  }

  say(text) {
    const t = this.add.text(this.palych.x, 270, text, {
      fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#0c0a16', backgroundColor: '#ff8a20', padding: { x: 8, y: 6 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, delay: 1600, duration: 400, onComplete: () => t.destroy() });
  }

  updateScore() {
    this.scoreText.setText(`Поймано: ${this.hits} / ${this.total}   ·   Разбито: ${this.misses}   ·   Штраф: −${this.misses * FINE} ₽`);
    const pay = Math.max(0, this.basePay - this.misses * FINE);
    this.payText.setText(`НА РУКИ: ${pay.toLocaleString('ru-RU')} ₽`).setColor(this.misses ? '#ffd166' : '#8ae6a0');
    if (this.misses) {
      this.payText.setScale(1.15);
      this.tweens.add({ targets: this.payText, scale: 1, duration: 200 });
    }
  }

  update() {
    if (!this.ready || this.done) return;
    const t = this.now();
    const beatPhase = ((t / (60 / BEAT.bpm)) % 1 + 1) % 1;
    this.rollers.forEach((r, i) => r.setFillStyle((i + Math.floor(t * 8)) % 2 ? 0x4a4a52 : 0x5a5a64));
    this.zone.setScale(1 + Math.max(0, 0.08 - beatPhase * 0.3));
    for (const b of this.boxes) {
      if (b.state === 'wait' && t >= b.spawn) {
        b.state = 'move';
        b.spr.setVisible(true);
      }
      if (b.state === 'move') {
        const k = (t - b.spawn) / this.travel;
        b.spr.x = START_X + (ZONE_X - START_X) * k;
        if (t > b.arrive + WINDOW) this.miss(b);
      }
    }
    if (this.boxes.every((b) => b.state === 'caught' || b.state === 'dropped')) this.finish();
  }

  finish() {
    this.done = true;
    const pay = Math.max(0, this.basePay - this.misses * FINE);
    state.flags.shiftResult = { hits: this.hits, misses: this.misses, total: this.total, pay };
    const good = this.hits >= Math.ceil(this.total * 0.8);
    this.say(good ? 'Ну… неплохо. Для худого.' : 'Это не разгрузка, это шоу «Разбей сам»!');
    sfx(good ? 'line' : 'deny');
    this.time.delayedCall(1800, () => {
      this.beat?.stop(0.5);
      this.cameras.main.fadeOut(500, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', { loc: this.backLoc, spawnX: 900 }));
    });
  }
}
