import Phaser from 'phaser';
import { state } from '../state.js';
import { stopBeat, blip } from '../audio.js';

const MOM = {
  promise: 'Ты пообещал маме всё изменить.',
  rude: 'Ты нагрубил маме.',
  silent: 'Ты промолчал, когда мама ждала ответа.',
};
const FRIDAY = {
  ready: 'Ты сказал Дэну, что готов к «Подвалу».',
  afraid: 'Ты признался Дэну, что боишься.',
  nod: 'Ты молча кивнул Дэну.',
};

// Итоги главы — как схема выборов в Detroit
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create() {
    stopBeat();
    this.cameras.main.fadeIn(800, 7, 6, 13);
    this.add.rectangle(0, 0, 960, 540, 0x07060d).setOrigin(0);

    this.add.text(480, 56, 'ПРОЛОГ ЗАВЕРШЁН', {
      fontFamily: '"Press Start 2P"', fontSize: '26px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(480, 100, '«ГАРАЖ»', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff3d8a' }).setOrigin(0.5);

    const track = state.tracks[state.tracks.length - 1];
    const f = state.flags;
    const rows = [
      MOM[f.momTalk],
      track && `Твой первый трек — «${track.title}».`,
      `Собрано строчек: ${state.lines.length}.`,
      f.kidTalked && 'Пацаны во дворе теперь знают тебя в лицо.',
      f.micNoticed && 'Ты заметил, что микрофон еле живой.',
      FRIDAY[f.fridayAnswer],
    ].filter(Boolean);

    rows.forEach((r, i) => {
      const t = this.add.text(150, 160 + i * 44, `◆  ${r}`, { fontFamily: '"PT Mono", monospace', fontSize: '21px', color: '#e8e4ff' }).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, x: 170, delay: 600 + i * 450, duration: 400, onStart: () => blip(600 + i * 80, 0.03) });
    });

    const next = this.add.text(480, 470, 'ДАЛЕЕ: ЭПИЗОД 1 — «СЛОМАННЫЙ МИКРОФОН»', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd166',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, delay: 600 + rows.length * 450 + 500, duration: 800 });

    const again = this.add.text(480, 510, '[ нажми, чтобы сыграть снова ]', { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#77729a' }).setOrigin(0.5);
    this.time.delayedCall(2500, () => {
      this.input.once('pointerdown', () => this.scene.start('Title'));
      this.input.keyboard.once('keydown', () => this.scene.start('Title'));
    });
    this.tweens.add({ targets: again, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
  }
}
