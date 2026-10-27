import Phaser from 'phaser';
import { state, loadGame, readSave } from '../state.js';
import { stopMusic, sfx } from '../audio.js';
import { Panel } from '../ui/frame.js';
import { reviveAfterLoad } from '../needs.js';
import { clearRingQueue } from '../ui/Phone.js';

const REASONS = {
  hunger: [
    'Марк не ел почти сутки.',
    'Где-то между аркой и метро асфальт вдруг оказался очень близко.',
    'Скорая приехала через сорок минут. Сцена подождёт. Мама — нет.',
  ],
};

// «Конец»: Марк не справился (голод). Можно загрузить последнее сохранение или выйти в меню
export class OverScene extends Phaser.Scene {
  constructor() {
    super('Over');
  }

  create({ reason = 'hunger' } = {}) {
    this.picked = false;
    stopMusic();
    this.cameras.main.fadeIn(1200, 7, 6, 13);
    this.add.rectangle(0, 0, 960, 540, 0x07060d).setOrigin(0);
    this.add.text(480, 110, 'КОНЕЦ', { fontFamily: '"Press Start 2P"', fontSize: '40px', color: '#ffffff', stroke: '#ff3d3d', strokeThickness: 10 }).setOrigin(0.5);
    (REASONS[reason] || REASONS.hunger).forEach((r, i) => {
      const t = this.add.text(480, 190 + i * 36, r, { fontFamily: '"PT Mono", monospace', fontSize: '19px', color: '#e8e4ff', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 600 + i * 700, duration: 600 });
    });
    this.add.text(480, 316, 'Сытость — в телефоне и в углу экрана. Ешь вовремя.', { fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#77729a' }).setOrigin(0.5);

    const has = !!readSave();
    const opts = [
      has && { label: '1. ЗАГРУЗИТЬ ПОСЛЕДНЕЕ СОХРАНЕНИЕ', run: () => this.reload() },
      { label: `${has ? 2 : 1}. В ГЛАВНОЕ МЕНЮ`, run: () => this.scene.start('Title') },
    ].filter(Boolean);
    this.sel = 0;
    this.btns = opts.map((o, i) => {
      const y = 392 + i * 58;
      const panel = new Panel(this, 230, y - 22, 500, 44, { accent: 0xff3d3d });
      const t = this.add.text(480, y, o.label, { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
      const zone = this.add.rectangle(480, y, 500, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', () => this.pick(i));
      return { panel, t, run: o.run };
    });
    this.select(0);
    this.time.delayedCall(800, () => {
      this.input.keyboard.on('keydown', (ev) => {
        if (ev.key === 'ArrowUp' || ev.key === 'w') this.select((this.sel + this.btns.length - 1) % this.btns.length);
        else if (ev.key === 'ArrowDown' || ev.key === 's') this.select((this.sel + 1) % this.btns.length);
        else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'e') this.pick(this.sel);
        else if (/^[1-9]$/.test(ev.key) && +ev.key <= this.btns.length) this.pick(+ev.key - 1);
      });
    });
  }

  select(i) {
    this.sel = i;
    this.btns.forEach((b, j) => {
      b.panel.setAccent(j === i ? 0xffd166 : 0xff3d3d);
      b.t.setColor(j === i ? '#ffd166' : '#ffffff');
    });
  }

  pick(i) {
    if (this.picked) return;
    this.picked = true;
    sfx('select');
    this.btns[i].run();
  }

  // Загрузка после голодного обморока: Марк «еле живой», но с шансом поесть
  reload() {
    const where = loadGame();
    if (!where) return this.scene.start('Title');
    reviveAfterLoad();
    clearRingQueue();
    this.cameras.main.fadeOut(500, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', { loc: where.loc, spawnX: where.spawnX, facing: where.facing }));
  }
}
