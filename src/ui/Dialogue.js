import Phaser from 'phaser';
import { blip } from '../audio.js';
import { playVoice, stopVoice } from '../voice.js';

const W = 960;
const BOX_Y = 34;
const BOX_H = 156;

const SPEAKER_COLORS = {
  'Марк': '#9ad1ff',
  'Мама': '#ffb38a',
  'Дэн': '#ff6b6b',
  'Баба Валя': '#c9a0ff',
  'Пацан': '#8ae6a0',
  'Рей': '#e8c27a',
  'Аркаша': '#f0f0f0',
  'Стас': '#c0c8d8',
  'Адам': '#b8b8c0',
  'Рома': '#ff8a3a',
  'Палыч': '#ff8a20',
  'Ахмед': '#6a9aff',
  'Тётя Люба': '#ffb38a',
  'Гоша': '#c77dff',
  'Лёва': '#ffd166',
};

// Пиксельные портреты (из фото) — показываются в окне диалога
const PORTRAITS = {
  'Рей': 'portrait_ray',
  'Аркаша': 'portrait_arkasha',
  'Стас': 'portrait_stas',
  'Адам': 'portrait_adam',
  'Рома': 'portrait_roma',
};
const TEXT_X = 44;
const TEXT_X_PORTRAIT = 176;

// Окно диалога с печатающимся текстом и выбором ответов (в том числе на время).
// Сценарии пишутся как async-функции: await d.say(...), const i = await d.choose([...]).
export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.onAdvance = null;
    this.onChoice = null;

    const c = (this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000).setVisible(false));
    this.box = scene.add.rectangle(20, BOX_Y, W - 40, BOX_H, 0x0c0a16, 0.94).setOrigin(0).setStrokeStyle(3, 0xff3d8a);
    this.nameBg = scene.add.rectangle(40, BOX_Y - 18, 10, 34, 0xff3d8a).setOrigin(0);
    this.name = scene.add.text(52, BOX_Y - 12, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#0c0a16' });
    this.body = scene.add.text(44, BOX_Y + 30, '', {
      fontFamily: '"PT Mono", monospace',
      fontSize: '21px',
      color: '#f2f0ff',
      wordWrap: { width: W - 100 },
      lineSpacing: 6,
    });
    this.arrow = scene.add.text(W - 58, BOX_Y + BOX_H - 34, '▼', { fontFamily: 'monospace', fontSize: '20px', color: '#ff3d8a' });
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.timerBar = scene.add.rectangle(20, BOX_Y + BOX_H + 8, W - 40, 6, 0xff3d8a).setOrigin(0).setVisible(false);
    this.portraitBg = scene.add.rectangle(34, BOX_Y + 22, 124, 124, 0x2a1b3d).setOrigin(0).setStrokeStyle(2, 0xff3d8a).setVisible(false);
    this.portrait = scene.add.image(36, BOX_Y + 24, '__DEFAULT').setOrigin(0).setVisible(false);
    c.add([this.box, this.portraitBg, this.portrait, this.nameBg, this.name, this.body, this.arrow, this.timerBar]);
    this.choiceItems = [];

    const kb = scene.input.keyboard;
    kb.on('keydown', (ev) => this.handleKey(ev));
    // Клик или тап по экрану тоже листает реплики
    scene.input.on('pointerdown', () => {
      if (this.active && this.onAdvance && Date.now() > this.readyAt) this.advance();
    });
  }

  handleKey(ev) {
    if (!this.active || Date.now() < this.readyAt) return;
    if (this.onChoice) {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= this.choiceItems.length) this.onChoice(n - 1);
      if (ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'ц') this.moveCursor(-1);
      if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'ы') this.moveCursor(1);
      if (['Enter', ' ', 'e', 'у'].includes(ev.key)) this.onChoice(this.cursor);
      return;
    }
    if (['Enter', ' ', 'e', 'у', 'E', 'У'].includes(ev.key)) this.advance();
  }

  open() {
    this.active = true;
    this.root.setVisible(true);
    this.readyAt = Date.now() + 200;
  }

  close() {
    stopVoice();
    this.active = false;
    this.root.setVisible(false);
    this.clearChoices();
  }

  setSpeaker(name, color) {
    // Портрет, если он есть у этого персонажа
    const tex = PORTRAITS[name];
    const hasPortrait = !!tex && this.scene.textures.exists(tex);
    this.portrait.setVisible(hasPortrait);
    this.portraitBg.setVisible(hasPortrait);
    if (hasPortrait) {
      this.portrait.setTexture(tex).setDisplaySize(120, 120);
      this.portraitBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(SPEAKER_COLORS[name] || '#ff3d8a').color);
    }
    this.body.x = hasPortrait ? TEXT_X_PORTRAIT : TEXT_X;
    this.body.setWordWrapWidth(hasPortrait ? W - 230 : W - 100);
    if (!name) {
      this.name.setText('');
      this.nameBg.setVisible(false);
      return;
    }
    this.nameBg.setVisible(true);
    this.name.setText(name.toUpperCase());
    this.nameBg.width = this.name.width + 24;
    this.nameBg.fillColor = Phaser.Display.Color.HexStringToColor(color || SPEAKER_COLORS[name] || '#ff3d8a').color;
  }

  advance() {
    if (this.typing) {
      this.finishTyping();
      return;
    }
    stopVoice();
    const cb = this.onAdvance;
    this.onAdvance = null;
    cb && cb();
  }

  type(text, style) {
    this.body.setStyle(style);
    this.body.setText('');
    this.arrow.setVisible(false);
    this.full = text;
    this.typing = true;
    let i = 0;
    this.typeEvent?.remove();
    this.typeEvent = this.scene.time.addEvent({
      delay: 22,
      repeat: text.length - 1,
      callback: () => {
        i++;
        this.body.setText(text.slice(0, i));
        if (i % 3 === 0 && text[i] !== ' ') blip(520 + Math.random() * 120, 0.015);
        if (i >= text.length) this.finishTyping();
      },
    });
  }

  finishTyping() {
    this.typeEvent?.remove();
    this.body.setText(this.full);
    this.typing = false;
    this.arrow.setVisible(true);
  }

  // Реплика персонажа
  say(name, text, color) {
    if (!this.active) this.open();
    this.clearChoices();
    this.setSpeaker(name, color);
    this.type(text, { color: '#f2f0ff', fontStyle: 'normal' });
    if (name) playVoice(name, text);
    return new Promise((resolve) => (this.onAdvance = resolve));
  }

  // Мысли героя — серым курсивом, без имени
  think(text) {
    if (!this.active) this.open();
    this.clearChoices();
    this.setSpeaker(null);
    this.type(text, { color: '#a9a6c8', fontStyle: 'italic' });
    playVoice('think', text);
    return new Promise((resolve) => (this.onAdvance = resolve));
  }

  // Выбор ответа. options: строки. timer: секунды (необязательно), timeoutIndex — что выберется само.
  choose(options, { timer = 0, timeoutIndex = options.length - 1 } = {}) {
    if (!this.active) this.open();
    this.clearChoices();
    stopVoice();
    this.typeEvent?.remove();
    this.typing = false;
    this.arrow.setVisible(false);
    this.body.setText('');
    this.setSpeaker('Твой выбор', '#ffd166');
    // Больше трёх вариантов — строки плотнее, чтобы влезли в окно
    const dense = options.length > 3;
    const rowH = options.length > 5 ? 25 : dense ? 30 : 40;
    this.cursor = 0;
    this.readyAt = Date.now() + 250;

    options.forEach((opt, i) => {
      const y = BOX_Y + (dense ? 10 : 22) + i * rowH;
      const bg = this.scene.add.rectangle(40, y, W - 80, rowH - 4, 0xffffff, 0.06).setOrigin(0).setScrollFactor(0);
      const label = this.scene.add.text(54, y + (options.length > 5 ? 3 : dense ? 4 : 6), `${i + 1}. ${opt}`, {
        fontFamily: '"PT Mono", monospace',
        fontSize: options.length > 5 ? '15px' : dense ? '17px' : '20px',
        color: '#f2f0ff',
      }).setScrollFactor(0);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.setCursor(i))
        .on('pointerdown', (p, x, y, ev) => {
          ev?.stopPropagation?.();
          if (Date.now() > this.readyAt) this.onChoice?.(i);
        });
      this.root.add([bg, label]);
      this.choiceItems.push({ bg, label });
    });
    this.setCursor(0);

    return new Promise((resolve) => {
      let timerTween = null;
      if (timer > 0) {
        this.timerBar.setVisible(true).setScale(1, 1);
        timerTween = this.scene.tweens.add({
          targets: this.timerBar,
          scaleX: 0,
          duration: timer * 1000,
          onComplete: () => this.onChoice?.(timeoutIndex),
        });
      }
      this.onChoice = (i) => {
        this.onChoice = null;
        timerTween?.stop();
        this.timerBar.setVisible(false);
        blip(880, 0.05);
        // Короткая подсветка выбранного варианта
        this.setCursor(i);
        this.choiceItems[i].bg.setFillStyle(0xffd166, 0.35);
        this.scene.time.delayedCall(260, () => {
          this.clearChoices();
          resolve(i);
        });
      };
    });
  }

  moveCursor(d) {
    const n = this.choiceItems.length;
    this.setCursor((this.cursor + d + n) % n);
  }

  setCursor(i) {
    this.cursor = i;
    this.choiceItems.forEach((c, j) => {
      c.bg.setFillStyle(j === i ? 0xff3d8a : 0xffffff, j === i ? 0.3 : 0.06);
      c.label.setColor(j === i ? '#ffffff' : '#cfcce6');
    });
  }

  clearChoices() {
    this.choiceItems.forEach((c) => {
      c.bg.destroy();
      c.label.destroy();
    });
    this.choiceItems = [];
  }
}
