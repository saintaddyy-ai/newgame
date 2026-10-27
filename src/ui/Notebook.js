import Phaser from 'phaser';
import { state, TAGS, ITEMS } from '../state.js';
import { sfx } from '../audio.js';
import { uiContainer } from './pin.js';
import { Pix } from '../gfx/pix.js';
import { rng, mix } from '../gfx/color.js';
import { needsOn, FOOD_LOW, CLEAN_LOW } from '../needs.js';

// Вещи, которые можно использовать прямо из тетради
export const USABLE = { marka: 'съесть' };

const PAGE_X = 130;
const PAGE_Y = 30;
const PAGE_W = 700;
const PAGE_H = 480;
const ROW_X = 214;
const ROW_W = 610;
const ROW_H = 28;
const FONT = '"PT Mono", monospace';
const PIXEL = '"Press Start 2P"';

// Лист тетради в клетку-линейку: кремовая бумага, поля, пружина, пятно от кофе
function pageTexture(scene) {
  if (scene.textures.exists('nb_page')) return 'nb_page';
  const w = PAGE_W / 2;
  const h = PAGE_H / 2;
  const p = new Pix(w, h);
  const r = rng(7);
  p.rect(0, 0, w, h, 0xf1ead8);
  p.speckle(0, 0, w, h, [0xe8e0cc, 0xf6f0e2], 0.12, r);
  for (let y = 50; y < h - 6; y += 15) p.hline(10, y, w - 16, 0xa8bcd8);
  p.vline(36, 4, h - 8, 0xd88080);
  // Пружина слева
  for (let y = 10; y < h - 6; y += 12) {
    p.ellipse(9, y, 3, 2.5, 0x2a2238);
    p.rect(2, y - 1, 7, 2, 0x9a9aa8);
    p.set(3, y - 1, 0xd8d8e0);
  }
  // Кофейное кольцо и загнутый угол
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    const x = Math.round(w - 50 + Math.cos(a) * 16);
    const y = Math.round(h - 40 + Math.sin(a) * 14);
    if (r() < 0.8) p.set(x, y, mix(0xf1ead8, 0x8a5a3a, 0.35));
  }
  p.poly([[w - 14, h], [w, h - 14], [w, h]], 0x2a2238);
  p.poly([[w - 14, h - 1], [w - 1, h - 14], [w - 14, h - 14]], 0xe0d8c4);
  // Края и тень
  p.rect(0, 0, w, 1, 0x2a2238);
  p.rect(0, h - 1, w - 14, 1, 0x2a2238);
  p.rect(0, 0, 1, h, 0x2a2238);
  p.rect(w - 1, 0, 1, h - 14, 0x2a2238);
  p.texture(scene, 'nb_page');
  return 'nb_page';
}

// Кнопка на бумаге: прямоугольник-«наклейка» с текстом, большая зона нажатия
function button(scene, x, y, label, color, onClick) {
  const bg = scene.add.rectangle(x, y, 220, 40, color, 1).setStrokeStyle(3, 0x2a2238);
  const t = scene.add.text(x, y, label, { fontFamily: PIXEL, fontSize: '12px', color: '#0c0a16' }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true }).on('pointerdown', (p, lx, ly, ev) => {
    ev?.stopPropagation?.();
    onClick();
  });
  bg.on('pointerover', () => bg.setScale(1.04));
  bg.on('pointerout', () => bg.setScale(1));
  return { bg, t };
}

// Тетрадь Марка: цель, собранные строчки, вещи в карманах.
// pick(n) — выбор строчек (например, отдать Рею). Возвращает массив или null («Отказаться»).
export class Notebook {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.picking = false;
    this.root = uiContainer(scene, 0, 0, 1100).setVisible(false);
    this.onUse = null;
  }

  page(title) {
    const s = this.scene;
    this.root.removeAll(true);
    const shade = s.add.rectangle(0, 0, 960, 540, 0x07060d, 0.7).setOrigin(0).setInteractive();
    const paper = s.add.image(PAGE_X, PAGE_Y, pageTexture(s)).setOrigin(0).setScale(2);
    const head = s.add.text(480, 58, title, { fontFamily: PIXEL, fontSize: '18px', color: '#2a2238' }).setOrigin(0.5);
    this.root.add([shade, paper, head]);
    return shade;
  }

  lineRow(l, i, y, extra = {}) {
    const s = this.scene;
    const key = i < 9 ? i + 1 : ['0', '-', '='][i - 9];
    const t = s.add.text(ROW_X, y - 2, `${extra.num ? `${key}. ` : ''}«${l.text}»`, {
      fontFamily: FONT, fontSize: '17px', color: '#1e1a2e', fontStyle: 'italic',
    });
    // Длинные строчки ужимаем, чтобы не залезали на тег
    if (t.width > ROW_W - 90) t.setScale((ROW_W - 90) / t.width, 1);
    const tag = s.add.text(812, y, TAGS[l.tag].name, {
      fontFamily: PIXEL, fontSize: '9px', color: '#ffffff', backgroundColor: TAGS[l.tag].color, padding: { x: 4, y: 3 },
    }).setOrigin(1, 0);
    this.root.add([t, tag]);
    return t;
  }

  show() {
    const s = this.scene;
    const shade = this.page('ТЕТРАДЬ');
    shade.on('pointerdown', () => this.hide());
    // Самочувствие — карандашом в углу листа
    if (needsOn()) {
      const parts = [
        state.episode === 'ep2' && `силы ${Math.round(state.energy)}`,
        `сытость ${Math.round(state.food)}${state.food < FOOD_LOW ? ' — поесть!' : ''}`,
        `чистота ${Math.round(state.clean)}${state.clean < CLEAN_LOW ? ' — помыться!' : ''}`,
      ].filter(Boolean);
      const low = state.food < FOOD_LOW || state.clean < CLEAN_LOW;
      this.root.add(s.add.text(812, 70, parts.join(' · '), { fontFamily: FONT, fontSize: '13px', color: low ? '#c03a5a' : '#5a5070', fontStyle: 'italic' }).setOrigin(1, 0));
    }
    let y = 92;
    if (state.goal) {
      this.root.add(s.add.text(ROW_X, y, `ЦЕЛЬ: ${state.goal}`, { fontFamily: FONT, fontSize: '17px', color: '#c03a5a', fontStyle: 'bold', wordWrap: { width: 590 } }));
      y += 32;
    }
    if (!state.lines.length) {
      this.root.add(s.add.text(ROW_X, y + 6, 'Пока пусто. Осматривайся и разговаривай —\nстрочки приходят из жизни.', {
        fontFamily: FONT, fontSize: '18px', color: '#5a5070', fontStyle: 'italic', lineSpacing: 10,
      }));
    }
    const max = state.inventory.length ? 10 : 12;
    state.lines.slice(-max).forEach((l, i) => this.lineRow(l, i, y + 6 + i * 30));
    if (state.lines.length > max) {
      this.root.add(s.add.text(812, 92, `ещё ${state.lines.length - max} выше`, { fontFamily: FONT, fontSize: '13px', color: '#7a7090' }).setOrigin(1, 0));
    }
    this.usable = [];
    if (state.inventory.length) {
      this.root.add(s.add.text(ROW_X, 436, 'В карманах:', { fontFamily: FONT, fontSize: '15px', color: '#2a2238' }));
      let x = 330;
      let row = 0;
      state.inventory.forEach((id) => {
        const use = USABLE[id] && this.onUse;
        const n = use ? this.usable.push(id) : 0;
        const label = `${ITEMS[id] || id}${use ? ` [${n}: ${USABLE[id]}]` : ''}`;
        const t = s.add.text(x, 436 + row * 22, label, {
          fontFamily: FONT, fontSize: '15px', color: use ? '#c03a5a' : '#2a2238', fontStyle: use ? 'bold' : 'normal',
        });
        if (x + t.width > 810) {
          row++;
          x = 330;
          t.setPosition(x, 436 + row * 22);
        }
        x += t.width + 18;
        if (use) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.use(id));
        this.root.add(t);
      });
    }
    this.root.add(s.add.text(480, 488, '[Q] закрыть', { fontFamily: FONT, fontSize: '15px', color: '#5a5070' }).setOrigin(0.5));
    this.root.setVisible(true);
    this.open = true;
  }

  // Клавиши 1–9 в обычной тетради — использовать вещь
  handleKey(ev) {
    const n = parseInt(ev.key, 10);
    if (n >= 1 && this.usable?.[n - 1]) this.use(this.usable[n - 1]);
  }

  use(id) {
    const cb = this.onUse;
    this.hide();
    cb?.(id);
  }

  // Выбрать n строчек. Возвращает Promise: массив выбранных или null, если отказался.
  // Нажатия: вся строка целиком (не только текст), цифры 1–9/0/-/=, стрелки + пробел,
  // Enter — готово, Esc/Q/Backspace — отказаться.
  pick(n, title = 'ВЫБЕРИ СТРОЧКИ', { cancel = true } = {}) {
    const s = this.scene;
    s.scale.updateBounds();
    this.page(title);
    const chosen = new Set();
    const lines = state.lines.slice(-12);
    if (lines.length < n) n = lines.length;
    let cursor = 0;
    const hint = s.add.text(480, 86, `Отметь ${n} — нажми на строчку или её номер`, { fontFamily: FONT, fontSize: '16px', color: '#c03a5a' }).setOrigin(0.5);
    this.root.add(hint);
    const rows = lines.map((l, i) => {
      const y = 112 + i * 30;
      // Подсветка-маркер и большая зона нажатия на всю ширину строки
      const mark = s.add.rectangle(ROW_X - 30, y - 4, ROW_W + 36, ROW_H, 0xffe066, 0).setOrigin(0);
      const check = s.add.text(ROW_X - 24, y - 2, '✓', { fontFamily: FONT, fontSize: '18px', color: '#c03a5a', fontStyle: 'bold' }).setVisible(false);
      this.root.add([mark, check]);
      const t = this.lineRow(l, i, y, { num: true });
      const zone = s.add.rectangle(ROW_X - 30, y - 4, ROW_W + 36, ROW_H, 0xffffff, 0.001).setOrigin(0);
      zone.setInteractive({ useHandCursor: true })
        .on('pointerdown', (p, lx, ly, ev) => {
          ev?.stopPropagation?.();
          toggle(i);
        })
        .on('pointerover', () => setCursor(i));
      this.root.add(zone);
      return { t, mark, check, zone };
    });
    const paint = () => rows.forEach((r, j) => {
      const on = chosen.has(j);
      r.t.setColor(on ? '#c03a5a' : '#1e1a2e').setFontStyle(on ? 'bold italic' : 'italic');
      r.check.setVisible(on);
      r.mark.setFillStyle(0xffe066, on ? 0.55 : j === cursor ? 0.25 : 0);
    });
    const setCursor = (i) => {
      cursor = i;
      paint();
    };
    const toggle = (i) => {
      if (i < 0 || i >= lines.length) return;
      cursor = i;
      if (chosen.has(i)) chosen.delete(i);
      else if (chosen.size < n) chosen.add(i);
      else {
        sfx('deny');
        hint.setText(`Уже отмечено ${n}. Сними отметку с лишней строчки`);
        return paint();
      }
      sfx('select');
      hint.setText(chosen.size < n ? `Отметь ещё ${n - chosen.size}` : 'Готово — жми «ГОТОВО» или Enter');
      ok.bg.setAlpha(chosen.size === n ? 1 : 0.45);
      paint();
    };
    const ok = button(s, cancel ? 600 : 480, 488, 'ГОТОВО', 0x8ae6a0, () => finish(true));
    ok.bg.setAlpha(0.45);
    const parts = [ok.bg, ok.t];
    if (cancel) {
      const no = button(s, 360, 488, 'ОТКАЗАТЬСЯ', 0xff9aa8, () => finish(false));
      parts.push(no.bg, no.t);
    }
    this.root.add(parts);
    paint();
    this.root.setVisible(true);
    this.open = true;
    this.picking = true;
    let finish;
    return new Promise((resolve) => {
      const onKey = (ev) => {
        const k = { 0: 10, '-': 11, '=': 12 }[ev.key] ?? parseInt(ev.key, 10);
        if (k >= 1 && k <= lines.length) return toggle(k - 1);
        if (['ArrowUp', 'w', 'ц'].includes(ev.key)) return setCursor((cursor - 1 + lines.length) % lines.length);
        if (['ArrowDown', 's', 'ы'].includes(ev.key)) return setCursor((cursor + 1) % lines.length);
        if (ev.key === ' ') return toggle(cursor);
        if (ev.key === 'Enter') return finish(true);
        if (cancel && ['Escape', 'Backspace', 'q', 'й', 'Q', 'Й'].includes(ev.key)) return finish(false);
      };
      finish = (confirm) => {
        if (confirm && chosen.size !== n) {
          sfx('deny');
          hint.setText(`Нужно отметить ${n}, отмечено ${chosen.size}`);
          return;
        }
        s.input.keyboard.off('keydown', onKey);
        this.picking = false;
        this.hide();
        sfx(confirm ? 'select' : 'page');
        resolve(confirm ? [...chosen].sort((a, b) => a - b).map((i) => lines[i]) : null);
      };
      s.input.keyboard.on('keydown', onKey);
      s.events.once('shutdown', () => s.input.keyboard.off('keydown', onKey));
    });
  }

  hide() {
    if (this.picking) return;
    this.root.setVisible(false);
    this.open = false;
  }
}
