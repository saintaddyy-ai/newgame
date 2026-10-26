import { state, TAGS, ITEMS } from '../state.js';
import { sfx } from '../audio.js';

// Тетрадь Марка: цель, собранные строчки, вещи в карманах.
// pick(n) — режим выбора строчек (например, чтобы продать их Рею).
export class Notebook {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1100).setVisible(false);
  }

  page(title) {
    const s = this.scene;
    this.root.removeAll(true);
    const shade = s.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0).setInteractive();
    const page = s.add.rectangle(130, 30, 700, 480, 0xf1ead8).setOrigin(0).setStrokeStyle(4, 0x2a2238);
    const items = [shade, page];
    for (let y = 130; y < 500; y += 30) items.push(s.add.rectangle(150, y, 660, 1, 0x9ab0d8, 0.6).setOrigin(0));
    items.push(s.add.rectangle(200, 40, 2, 460, 0xd86a6a, 0.7).setOrigin(0));
    items.push(s.add.text(480, 58, title, { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#2a2238' }).setOrigin(0.5));
    this.root.add(items);
    return shade;
  }

  lineRow(l, i, y, extra = {}) {
    const s = this.scene;
    const t = s.add.text(214, y - 2, `${extra.num ? `${i + 1}. ` : ''}«${l.text}»`, {
      fontFamily: '"PT Mono", monospace', fontSize: '17px', color: '#1e1a2e', fontStyle: 'italic',
    });
    const tag = s.add.text(812, y, TAGS[l.tag].name, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff', backgroundColor: TAGS[l.tag].color, padding: { x: 4, y: 3 },
    }).setOrigin(1, 0);
    this.root.add([t, tag]);
    return t;
  }

  show() {
    const s = this.scene;
    const shade = this.page('ТЕТРАДЬ');
    shade.on('pointerdown', () => this.hide());
    let y = 92;
    if (state.goal) {
      this.root.add(s.add.text(214, y, `ЦЕЛЬ: ${state.goal}`, { fontFamily: '"PT Mono", monospace', fontSize: '17px', color: '#c03a5a', fontStyle: 'bold', wordWrap: { width: 590 } }));
      y += 32;
    }
    if (!state.lines.length) {
      this.root.add(s.add.text(214, y + 6, 'Пока пусто. Осматривайся и разговаривай —\nстрочки приходят из жизни.', {
        fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#5a5070', fontStyle: 'italic', lineSpacing: 10,
      }));
    }
    const max = state.inventory.length ? 10 : 12;
    state.lines.slice(-max).forEach((l, i) => this.lineRow(l, i, y + 6 + i * 30));
    if (state.lines.length > max) {
      this.root.add(s.add.text(812, 92, `ещё ${state.lines.length - max} выше`, { fontFamily: '"PT Mono", monospace', fontSize: '13px', color: '#7a7090' }).setOrigin(1, 0));
    }
    if (state.inventory.length) {
      const inv = state.inventory.map((id) => ITEMS[id] || id).join(' · ');
      this.root.add(s.add.text(214, 440, `В карманах: ${inv}`, { fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#2a2238', wordWrap: { width: 590 } }));
    }
    this.root.add(s.add.text(480, 488, '[Q] закрыть', { fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#5a5070' }).setOrigin(0.5));
    this.root.setVisible(true);
    this.open = true;
  }

  // Выбрать n строчек. Возвращает Promise с массивом выбранных.
  pick(n, title = 'ВЫБЕРИ СТРОЧКИ') {
    const s = this.scene;
    this.page(title);
    const chosen = new Set();
    const lines = state.lines.slice(0, 12);
    const hint = s.add.text(480, 86, `Отметь ${n}`, { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#c03a5a' }).setOrigin(0.5);
    this.root.add(hint);
    const rows = lines.map((l, i) => {
      const t = this.lineRow(l, i, 112 + i * 30, { num: true });
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => toggle(i));
      return t;
    });
    const toggle = (i) => {
      if (chosen.has(i)) chosen.delete(i);
      else if (chosen.size < n) chosen.add(i);
      else return sfx('deny');
      sfx('select');
      rows.forEach((r, j) => r.setColor(chosen.has(j) ? '#c03a5a' : '#1e1a2e').setFontStyle(chosen.has(j) ? 'bold italic' : 'italic'));
      hint.setText(chosen.size < n ? `Отметь ещё ${n - chosen.size}` : 'Готово — Enter');
    };
    this.root.setVisible(true);
    this.open = true;
    this.picking = true;
    return new Promise((resolve) => {
      const onKey = (ev) => {
        const k = parseInt(ev.key, 10);
        if (k >= 1 && k <= Math.min(9, lines.length)) toggle(k - 1);
        if (ev.key === 'Enter' && chosen.size === n) {
          s.input.keyboard.off('keydown', onKey);
          this.picking = false;
          this.hide();
          resolve([...chosen].map((i) => lines[i]));
        }
      };
      s.input.keyboard.on('keydown', onKey);
      const ok = s.add.text(480, 488, '[ ГОТОВО ]', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#2a2238' }).setOrigin(0.5);
      ok.setInteractive({ useHandCursor: true }).on('pointerdown', () => onKey({ key: 'Enter' }));
      this.root.add(ok);
    });
  }

  hide() {
    if (this.picking) return;
    this.root.setVisible(false);
    this.open = false;
  }
}
