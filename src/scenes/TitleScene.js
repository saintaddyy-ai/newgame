import Phaser from 'phaser';
import { unlockAudio, blip } from '../audio.js';
import { resetState } from '../state.js';
import { drawSkyline } from '../story/backdrops.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    drawSkyline(this, 960, { seed: 7 });

    this.add.particles(0, -20, 'drop', {
      x: { min: -100, max: 1060 }, lifespan: 900, speedY: { min: 700, max: 900 }, speedX: -120,
      alpha: { start: 0.35, end: 0.1 }, quantity: 3, frequency: 16,
    }).setDepth(5);

    const title = this.add.text(480, 190, 'ПЛАТИНА', {
      fontFamily: '"Press Start 2P"', fontSize: '64px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(10);
    title.setShadow(0, 0, '#ff3d8a', 24, true, true);
    // Неоновая вывеска иногда «мигает»
    this.time.addEvent({
      delay: 2200, loop: true,
      callback: () => this.tweens.add({ targets: title, alpha: 0.35, duration: 60, yoyo: true, repeat: 2 }),
    });

    this.add.text(480, 270, 'ИЗ ПОДВАЛА — НА ВЕРШИНУ. ИЛИ НА ДНО.', {
      fontFamily: '"PT Mono", monospace', fontSize: '20px', color: '#c9c4ee',
    }).setOrigin(0.5).setDepth(10);

    const start = this.add.text(480, 400, '▶ НАЖМИ, ЧТОБЫ НАЧАТЬ', {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffd166',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(480, 500, 'ДЕМО • ПРОЛОГ «ГАРАЖ»  |  18+  |  ← → / A D — ходить   E — действие   Q — тетрадь', {
      fontFamily: '"PT Mono", monospace', fontSize: '14px', color: '#77729a',
    }).setOrigin(0.5).setDepth(10);

    const go = () => {
      unlockAudio();
      blip(660, 0.06);
      resetState();
      this.cameras.main.fadeOut(600, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', { loc: 'apartment' }));
    };
    this.input.once('pointerdown', go);
    this.input.keyboard.once('keydown', go);
  }
}
