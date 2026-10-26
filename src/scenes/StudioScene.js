import Phaser from 'phaser';
import { state, TAGS } from '../state.js';
import { startBeat, stopBeat, blip } from '../audio.js';

const PICK = 3;

const TITLES = {
  street: 'Панельки',
  pain: 'Мама, прости',
  dream: 'Выше крыш',
  mixed: 'Подвал',
};

// Тема трека — тег, которого больше всего среди выбранных строчек
export function trackTheme(lines) {
  const count = {};
  lines.forEach((l) => (count[l.tag] = (count[l.tag] || 0) + 1));
  const [tag, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return n >= 2 ? tag : 'mixed';
}

// Мини-игра «Написать трек»: выбираешь строчки из тетради — получается песня
export class StudioScene extends Phaser.Scene {
  constructor() {
    super('Studio');
  }

  create() {
    startBeat(84);
    this.picked = [];
    this.cameras.main.fadeIn(400, 7, 6, 13);

    this.add.rectangle(0, 0, 960, 540, 0x0c0a16).setOrigin(0);
    // Эквалайзер на фоне
    this.bars = [];
    for (let i = 0; i < 48; i++) {
      this.bars.push(this.add.rectangle(10 + i * 20, 540, 14, 40, i % 2 ? 0xff3d8a : 0x3df0ff, 0.15).setOrigin(0, 1));
    }

    this.add.text(480, 40, 'ПИШЕМ ТРЕК', { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6 }).setOrigin(0.5);
    this.hint = this.add.text(480, 84, `Выбери ${PICK} строчки из тетради`, { fontFamily: '"PT Mono", monospace', fontSize: '20px', color: '#c9c4ee' }).setOrigin(0.5);

    this.cards = state.lines.map((l, i) => this.makeCard(l, i));

    this.recBtn = this.add.text(480, 500, '● ЗАПИСАТЬ', {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#0c0a16', backgroundColor: '#ff3d3d', padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setAlpha(0.3);
    this.recBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.record());
    this.input.keyboard.on('keydown-ENTER', () => this.record());
  }

  makeCard(line, i) {
    const cols = state.lines.length > 6 ? 2 : 1;
    const col = cols === 2 ? i % 2 : 0;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const w = cols === 2 ? 430 : 700;
    const x = cols === 2 ? 40 + col * 450 : 130;
    const y = 120 + row * 58;
    const color = Phaser.Display.Color.HexStringToColor(TAGS[line.tag].color).color;

    const bg = this.add.rectangle(x, y, w, 48, 0x1a1530).setOrigin(0).setStrokeStyle(2, color, 0.5);
    const strip = this.add.rectangle(x, y, 8, 48, color).setOrigin(0);
    const txt = this.add.text(x + 20, y + 24, `«${line.text}»`, {
      fontFamily: '"PT Mono", monospace', fontSize: cols === 2 ? '15px' : '19px', color: '#f2f0ff', fontStyle: 'italic',
      wordWrap: { width: w - 110 },
    }).setOrigin(0, 0.5);
    const tag = this.add.text(x + w - 10, y + 24, TAGS[line.tag].name, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: TAGS[line.tag].color,
    }).setOrigin(1, 0.5);
    const card = { line, bg, strip, txt, tag, on: false };
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggle(card));
    if (i < 9) this.input.keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i]}`, () => this.toggle(card));
    return card;
  }

  toggle(card) {
    if (this.recording) return;
    if (!card.on && this.picked.length >= PICK) {
      blip(200, 0.05);
      return;
    }
    card.on = !card.on;
    blip(card.on ? 880 : 440, 0.05);
    if (card.on) this.picked.push(card.line);
    else this.picked = this.picked.filter((l) => l !== card.line);
    card.bg.setFillStyle(card.on ? 0x3a1f45 : 0x1a1530);
    card.bg.setStrokeStyle(card.on ? 3 : 2, card.on ? 0xffd166 : Phaser.Display.Color.HexStringToColor(TAGS[card.line.tag].color).color, card.on ? 1 : 0.5);

    const left = PICK - this.picked.length;
    this.hint.setText(left ? `Ещё ${left}` : 'Готово! Жми «Записать»');
    this.recBtn.setAlpha(left ? 0.3 : 1);
  }

  async record() {
    if (this.picked.length < PICK || this.recording) return;
    this.recording = true;
    blip(1200, 0.06);
    const theme = trackTheme(this.picked);
    const track = { title: TITLES[theme], theme, lines: [...this.picked] };
    state.tracks.push(track);
    state.flags.trackDone = true;
    if (theme === 'pain') state.stats.honesty += 1;
    if (theme === 'street') state.stats.fame += 1;

    this.children.list.filter((o) => !this.bars.includes(o)).forEach((o) => o.setVisible(false));
    const rec = this.add.text(60, 50, '● REC', { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ff3d3d' });
    this.tweens.add({ targets: rec, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    this.add.text(900, 50, `«${track.title}»`, { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffd166' }).setOrigin(1, 0);

    const wait = (ms) => new Promise((r) => this.time.delayedCall(ms, r));
    for (let i = 0; i < track.lines.length; i++) {
      const t = this.add.text(480, 170 + i * 80, track.lines[i].text, {
        fontFamily: '"PT Mono", monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', align: 'center',
        wordWrap: { width: 860 },
      }).setOrigin(0.5).setAlpha(0).setScale(0.9);
      t.setShadow(0, 0, TAGS[track.lines[i].tag].color, 18, true, true);
      this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 500, ease: 'Back.out' });
      await wait(2300);
    }
    await wait(800);
    const name = this.add.text(480, 460, `ТРЕК ЗАПИСАН: «${track.title}»`, {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffd166',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: name, alpha: 1, duration: 500 });
    await wait(2200);
    stopBeat();
    this.cameras.main.fadeOut(600, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', { loc: 'garage', spawnX: 620 }));
  }

  update(time) {
    // Эквалайзер «пляшет» в такт (84 BPM)
    const beat = (time / (60000 / 84)) % 1;
    this.bars.forEach((b, i) => {
      b.height = 20 + Math.abs(Math.sin(time / 300 + i * 0.7)) * 80 * (1.2 - beat) + (i % 7) * 6;
    });
  }
}
