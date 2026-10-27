import Phaser from 'phaser';
import { listDemos, playDemo } from '../demos.js';
import { sfx, audioCtx } from '../audio.js';
import { TAGS } from '../state.js';
import { uiContainer } from './pin.js';

const X = 150;
const Y = 50;
const W = 660;
const H = 420;
const ROWS = 6; // строк на экране; остальные — прокруткой (▲▼, колёсико, стрелки)

// Комп Дэна: папка «ДЕМКИ», где лежат все записанные треки. Можно выбрать и послушать.
export class DemoPC {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.root = uiContainer(scene, 0, 0, 1100).setVisible(false);
    this.demos = [];
    this.sel = 0;
    this.top = 0;
    this.playing = null;
    this.loadToken = 0;
    // Колёсико мыши листает список
    const onWheel = (p, objs, dx, dy) => {
      if (!this.open || !this.demos.length) return;
      this.scrollBy(dy > 0 ? 1 : -1);
    };
    scene.input.on('wheel', onWheel);
    scene.events.once('shutdown', () => scene.input.off('wheel', onWheel));
  }

  async show() {
    const s = this.scene;
    this.open = true;
    this.root.removeAll(true);
    this.root.setVisible(true);
    sfx('boot');
    sfx('keys', 0.3);

    const shade = s.add.rectangle(0, 0, 960, 540, 0x000000, 0.7).setOrigin(0).setInteractive();
    const bezel = s.add.rectangle(X - 16, Y - 16, W + 32, H + 32, 0x1a1a1e).setOrigin(0).setStrokeStyle(2, 0x3a3a44);
    const screen = s.add.rectangle(X, Y, W, H, 0x061420).setOrigin(0);
    const bar = s.add.rectangle(X, Y, W, 30, 0x3df0ff).setOrigin(0);
    const title = s.add.text(X + 12, Y + 8, 'DAN_PC  ▸  C:\\ДЕМКИ', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#061420' });
    const close = s.add.text(X + W - 12, Y + 8, '[X]', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#061420' }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.hide());
    this.hint = s.add.text(X + W / 2, Y + H - 22, 'клик или ↑↓ + ENTER — слушать / стоп · колёсико — листать · ESC — выйти', {
      fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#4a8aa0',
    }).setOrigin(0.5);
    // Строки развёртки старого монитора
    const scan = s.add.graphics();
    for (let y = Y; y < Y + H; y += 4) scan.fillStyle(0x000000, 0.18).fillRect(X, y, W, 1);
    this.root.add([shade, bezel, screen, bar, title, close, this.hint]);

    this.rowsBox = s.add.container(0, 0);
    this.player = s.add.container(0, 0);
    this.root.add([this.rowsBox, this.player, scan]);
    this.root.setAlpha(0);
    s.tweens.add({ targets: this.root, alpha: 1, duration: 200 });

    this.demos = (await listDemos()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    this.sel = 0;
    this.top = 0;
    this.renderRows();
    return new Promise((r) => (this.onClose = r));
  }

  renderRows() {
    const s = this.scene;
    this.rowsBox.removeAll(true);
    if (!this.demos.length) {
      this.rowsBox.add(s.add.text(X + W / 2, Y + 150, 'Папка пуста.\n\nЗапиши первый трек — он появится здесь.', {
        fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#7ab8c8', align: 'center',
      }).setOrigin(0.5));
      return;
    }
    this.downBtn = null;
    this.upBtn = null;
    this.demos.slice(this.top, this.top + ROWS).forEach((d, k) => {
      const i = this.top + k;
      const y = Y + 48 + k * 40;
      const on = i === this.sel;
      const bg = s.add.rectangle(X + 12, y, W - 60, 34, on ? 0x3df0ff : 0x0c2638, on ? 0.25 : 1).setOrigin(0);
      const date = new Date(d.createdAt);
      const dd = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
      const icon = this.playing?.id === d.id ? '■' : '▶';
      const voice = d.voice ? `голос ✓  подача ${d.score ?? '—'}%` : 'без голоса';
      const t = s.add.text(X + 24, y + 8, `${icon}  «${d.title}»`, { fontFamily: '"PT Mono", monospace', fontSize: '17px', color: on ? '#ffffff' : '#bfe8f0' });
      const meta = s.add.text(X + W - 60, y + 9, `${dd}  ·  ${voice}`, { fontFamily: '"PT Mono", monospace', fontSize: '14px', color: '#6aa8b8' }).setOrigin(1, 0);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.sel = i;
        this.toggle();
      });
      this.rowsBox.add([bg, t, meta]);
    });
    // Кнопки прокрутки справа от списка
    const mk = (y, label, d) => {
      const b = s.add.rectangle(X + W - 30, y, 32, 32, 0x0c2638).setStrokeStyle(2, 0x3df0ff, 0.6);
      const t = s.add.text(X + W - 30, y, label, { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#bfe8f0' }).setOrigin(0.5);
      b.setInteractive({ useHandCursor: true }).on('pointerdown', (p, lx, ly, ev) => {
        ev?.stopPropagation?.();
        this.scrollBy(d);
      });
      this.rowsBox.add([b, t]);
      return b;
    };
    if (this.top > 0) this.upBtn = mk(Y + 64, '▲', -1);
    if (this.top + ROWS < this.demos.length) this.downBtn = mk(Y + 48 + (ROWS - 1) * 40 + 16, '▼', 1);
    if (this.demos.length > ROWS) {
      this.rowsBox.add(s.add.text(X + W - 30, Y + 48 + ROWS * 40 / 2, `${this.top + 1}–${Math.min(this.demos.length, this.top + ROWS)}\nиз ${this.demos.length}`, {
        fontFamily: '"PT Mono", monospace', fontSize: '11px', color: '#4a8aa0', align: 'center',
      }).setOrigin(0.5));
    }
  }

  // Прокрутка на d строк; выделение остаётся в видимой части
  scrollBy(d) {
    const max = Math.max(0, this.demos.length - ROWS);
    const top = Phaser.Math.Clamp(this.top + d, 0, max);
    if (top === this.top) return;
    this.top = top;
    this.sel = Phaser.Math.Clamp(this.sel, this.top, this.top + ROWS - 1);
    sfx('click');
    this.renderRows();
  }

  handleKey(ev) {
    if (ev.key === 'Escape' || ev.key === 'q' || ev.key === 'й') return this.hide();
    if (!this.demos.length) {
      if (['Enter', ' ', 'e', 'у'].includes(ev.key)) this.hide();
      return;
    }
    const n = this.demos.length;
    if (ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'ц') this.sel = (this.sel - 1 + n) % n;
    if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'ы') this.sel = (this.sel + 1) % n;
    if (['ArrowUp', 'ArrowDown', 'w', 's', 'ц', 'ы'].includes(ev.key)) {
      // Выделение уехало за край — список едет следом
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel >= this.top + ROWS) this.top = this.sel - ROWS + 1;
      sfx('click');
      this.renderRows();
    }
    if (['Enter', ' ', 'e', 'у'].includes(ev.key)) this.toggle();
  }

  async toggle() {
    const d = this.demos[this.sel];
    if (!d) return;
    const wasSame = this.playing?.id === d.id;
    this.stop();
    sfx('click');
    if (wasSame) return this.renderRows();
    // Пока демка грузится, игрок мог нажать другую — играет только последняя
    const my = ++this.loadToken;
    const h = await playDemo(d);
    if (!h || !this.open || my !== this.loadToken) return h?.stop();
    this.playing = { id: d.id, h, demo: d };
    this.renderRows();
    this.buildPlayer(d);
  }

  buildPlayer(d) {
    const s = this.scene;
    this.player.removeAll(true);
    const py = Y + 300;
    this.lyric = s.add.text(X + W / 2, py, '', {
      fontFamily: '"PT Mono", monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5);
    this.progBg = s.add.rectangle(X + 30, py + 44, W - 60, 6, 0x0c2638).setOrigin(0);
    this.prog = s.add.rectangle(X + 30, py + 44, 1, 6, 0xff3d8a).setOrigin(0);
    this.player.add([this.lyric, this.progBg, this.prog]);
    this.ticker?.remove();
    this.ticker = s.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!this.playing) return;
        const t = audioCtx().currentTime - this.playing.h.startAt;
        const k = Phaser.Math.Clamp(t / d.length, 0, 1);
        this.prog.setSize(Math.max(1, (W - 60) * k), 6);
        const cur = (d.items || []).find((it) => t >= it.start && t < it.end);
        this.lyric.setText(cur ? cur.text : t < (d.items?.[0]?.start ?? 0) ? '· · ·' : '');
        if (cur) this.lyric.setShadow(0, 0, TAGS[cur.tag]?.color || '#ff3d8a', 14, true, true);
        if (k >= 1) {
          this.stop();
          this.renderRows();
        }
      },
    });
  }

  stop() {
    this.playing?.h.stop();
    this.playing = null;
    this.ticker?.remove();
    this.ticker = null;
    this.player?.removeAll(true);
  }

  hide() {
    this.stop();
    sfx('switch');
    this.open = false;
    this.root.setVisible(false);
    this.root.removeAll(true);
    const cb = this.onClose;
    this.onClose = null;
    cb && cb();
  }
}
