import Phaser from 'phaser';
import { blip } from '../audio.js';
import { state } from '../state.js';
import { playVoice, stopVoice, splitRemarks } from '../voice.js';
import { portraitKey } from '../gfx/portraits.js';
import { SPEAKERS, CAST_SPECS } from '../gfx/cast.js';
import { Panel } from './frame.js';

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

// Внешность говорящего: именные персонажи — из cast.js, остальные — по спрайту на сцене
function speakerSpec(scene, name) {
  const key = SPEAKERS[name];
  if (key) {
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
    return { key, spec: tex?.__spec || CAST_SPECS[key] };
  }
  const def = scene.npcDefs?.find((n) => n.name === name && scene.npcs?.[n.id]?.visible) || scene.npcDefs?.find((n) => n.name === name);
  const tex = def && scene.textures.exists(def.sprite) ? scene.textures.get(def.sprite) : null;
  return tex?.__spec ? { key: def.sprite, spec: tex.__spec } : null;
}
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
    // Пиксельная панель с кантом цвета говорящего
    this.box = new Panel(scene, 20, BOX_Y, W - 40, BOX_H, { accent: 0xff3d8a, fill: 0x0f0c1a, alpha: 0.95 });
    this.nameBg = scene.add.rectangle(40, BOX_Y - 18, 10, 34, 0xff3d8a).setOrigin(0).setStrokeStyle(2, 0x0b0912);
    this.name = scene.add.text(52, BOX_Y - 12, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#0c0a16' });
    this.body = scene.add.text(44, BOX_Y + 30, '', {
      fontFamily: '"PT Mono", monospace',
      fontSize: '21px',
      color: '#f2f0ff',
      wordWrap: { width: W - 100 },
      lineSpacing: 6,
    });
    // Ремарка («шёпотом», «хватает за яйца») — серым рядом с именем, не озвучивается
    this.remark = scene.add.text(0, BOX_Y + 5, '', {
      fontFamily: '"PT Mono", monospace',
      fontSize: '15px',
      fontStyle: 'italic',
      color: '#8f8ab0',
    });
    this.arrow = scene.add.text(W - 58, BOX_Y + BOX_H - 34, '▼', { fontFamily: 'monospace', fontSize: '20px', color: '#ff3d8a' });
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.timerBar = scene.add.rectangle(20, BOX_Y + BOX_H + 8, W - 40, 6, 0xff3d8a).setOrigin(0).setVisible(false);
    this.portraitBg = new Panel(scene, 34, BOX_Y + 22, 124, 124, { accent: 0xff3d8a, fill: 0x2a1b3d, notch: false }).setVisible(false);
    this.portrait = scene.add.image(36, BOX_Y + 24, '__DEFAULT').setOrigin(0).setVisible(false);
    c.add([...this.box.objects, ...this.portraitBg.objects, this.portrait, this.nameBg, this.name, this.remark, this.body, this.arrow, this.timerBar]);
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
    // Брошенный выбор/ожидание не должны ловить нажатия после закрытия окна
    this.onChoice = null;
    this.onAdvance = null;
  }

  setSpeaker(name, color, emo = 'neutral') {
    // Портрет говорящего с нужной эмоцией (рисуется при первом показе)
    const who = name && name !== 'Твой выбор' ? speakerSpec(this.scene, name) : null;
    const hasPortrait = !!who?.spec;
    this.portrait.setVisible(hasPortrait);
    this.portraitBg.setVisible(hasPortrait);
    if (hasPortrait) {
      const col = Phaser.Display.Color.HexStringToColor(color || SPEAKER_COLORS[name] || '#ff3d8a').color;
      const bg = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(col), Phaser.Display.Color.ValueToColor(0x15102a), 100, 72);
      const tex = portraitKey(this.scene, who.key, who.spec, emo, Phaser.Display.Color.GetColor(bg.r, bg.g, bg.b));
      this.portrait.setTexture(tex).setDisplaySize(120, 120);
      this.portraitBg.setAccent(col);
    }
    this.body.x = hasPortrait ? TEXT_X_PORTRAIT : TEXT_X;
    this.body.setWordWrapWidth(hasPortrait ? W - 230 : W - 100);
    if (!name) {
      this.name.setText('');
      this.nameBg.setVisible(false);
      this.box.setAccent(0x6a6390);
      return;
    }
    this.nameBg.setVisible(true);
    this.name.setText(name.toUpperCase());
    this.nameBg.setSize(this.name.width + 24, 34);
    this.nameBg.fillColor = Phaser.Display.Color.HexStringToColor(color || SPEAKER_COLORS[name] || '#ff3d8a').color;
    this.box.setAccent(this.nameBg.fillColor);
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
      delay: state.settings.textSpeed || 22,
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

  setRemark(remark) {
    this.remark.setText(remark ? `(${remark})` : '');
    this.remark.x = this.nameBg.visible ? this.nameBg.x + this.nameBg.width + 14 : TEXT_X;
  }

  // Эмоция по тексту: крик, грусть, удивление, смех — портрет и говорящий оживают
  emotion(text) {
    if (/[А-ЯЁ]{4,}/.test(text) || (text.match(/!/g) || []).length >= 2) return 'shout';
    if (/\?!|!\?/.test(text)) return 'surprise';
    if (/^…|\.\.\.$|…$/.test(text.trim())) return 'sad';
    if (/(ха){2}|хах|хех|\)\s*$|кайф|красав|обожаю|люблю/i.test(text)) return 'happy';
    if (/бля|сука|чёрт|задолбал|заткнись|пошёл|урод/i.test(text)) return 'angry';
    return 'calm';
  }

  animatePortrait(emo) {
    const p = this.portrait;
    if (!p.visible) return;
    this.scene.tweens.killTweensOf(p);
    p.setDisplaySize(120, 120).setPosition(36, BOX_Y + 24).clearTint();
    if (emo === 'shout') {
      this.scene.tweens.add({ targets: p, x: { from: 32, to: 40 }, duration: 50, yoyo: true, repeat: 4, onComplete: () => p.setX(36) });
    } else if (emo === 'surprise') {
      this.scene.tweens.add({ targets: p, displayWidth: 128, displayHeight: 128, x: 32, y: BOX_Y + 20, duration: 120, yoyo: true });
    } else if (emo === 'sad') {
      this.scene.tweens.add({ targets: p, y: BOX_Y + 27, duration: 400 });
    }
  }

  // Реплика персонажа
  say(name, text, color) {
    if (!this.active) this.open();
    this.clearChoices();
    const { clean, display, remark } = splitRemarks(text);
    const emo = this.emotion(clean);
    const face = { shout: 'shout', surprise: 'surprised', sad: 'sad', happy: 'happy', angry: 'angry' }[emo] || 'neutral';
    this.setSpeaker(name, color, face);
    this.setRemark(remark);
    this.type(display, { color: '#f2f0ff', fontStyle: 'normal' });
    this.animatePortrait(emo);
    if (name) this.onSpeak?.(name, emo, display);
    if (name) playVoice(name, clean);
    return new Promise((resolve) => (this.onAdvance = resolve));
  }

  // Мысли героя — серым курсивом, без имени
  think(text) {
    if (!this.active) this.open();
    this.clearChoices();
    this.setSpeaker(null);
    const { clean, display, remark } = splitRemarks(text);
    this.setRemark(remark);
    this.type(display, { color: '#a9a6c8', fontStyle: 'italic' });
    playVoice('think', clean);
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
    this.setRemark('');
    // Больше трёх вариантов — строки плотнее; больше пяти — окно вырастает вниз
    const dense = options.length > 3;
    const rowH = options.length > 5 ? 27 : dense ? 30 : 40;
    const need = (dense ? 10 : 22) + options.length * rowH + 8;
    if (need > BOX_H) this.box.setSize(W - 40, need);
    this.cursor = 0;
    this.readyAt = Date.now() + 250;

    options.forEach((opt, i) => {
      const y = BOX_Y + (dense ? 10 : 22) + i * rowH;
      const bg = this.scene.add.rectangle(40, y, W - 80, rowH - 4, 0xffffff, 0.06).setOrigin(0).setScrollFactor(0);
      const label = this.scene.add.text(54, y + (options.length > 5 ? 4 : dense ? 4 : 6), `${i + 1}. ${opt}`, {
        fontFamily: '"PT Mono", monospace',
        fontSize: options.length > 5 ? '16px' : dense ? '17px' : '20px',
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
        this.timerBar.y = BOX_Y + this.box.height + 8;
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
    if (this.box.height !== BOX_H) this.box.setSize(W - 40, BOX_H);
    this.choiceItems.forEach((c) => {
      c.bg.destroy();
      c.label.destroy();
    });
    this.choiceItems = [];
  }
}
