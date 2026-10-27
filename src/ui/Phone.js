import Phaser from 'phaser';
import { QUALITY_LABEL } from '../gfx/quality.js';
import { applyLook } from '../gfx/fx.js';
import { needsOn, needsTodo, FOOD_LOW, CLEAN_LOW } from '../needs.js';
import { state, clockShort, saveSettings, DAYS } from '../state.js';
import { sfx, setVolumes, audioCtx, decodeBlob, playBuffer } from '../audio.js';
import { voiceSettings } from '../voice.js';
import { listDemos, playDemo } from '../demos.js';
import { dbAll, dbPut, dbDelete } from '../db.js';
import { uiContainer } from './pin.js';
import {
  CONTACTS, APPS_SOCIAL, onPhone, contactName, threadList, pendingReplies, markAnswered, markRead, send,
  unreadTotal, logCall, addFollowers, post, phoneChanged,
} from '../phone/model.js';
import { phoneCallScript, phoneReplyHandler, phoneMapInfo } from '../story/index.js';

// Телефон Марка: выезжает снизу по клавише P. Обычный смартфон без логотипов.
const PX = 640;
const PY = 16;
const PW = 290;
const PH = 508;
const SX = 14;
const SY = 46;
const SW = PW - 28;
const SH = 418;
const HIDDEN_Y = 560;
// Звонки, которые ждут своей очереди, живут дольше одной локации: смена сцены их не теряет
const RING_QUEUE = [];
// Новая игра или загрузка — старые звонки не переносятся
export function clearRingQueue() {
  RING_QUEUE.length = 0;
}
const FONT = '"PT Mono", monospace';
const PIXEL = '"Press Start 2P"';

const WALLPAPERS = [
  [0x1a0f2e, 0x3a1f45, 0xff3d8a],
  [0x061420, 0x0c2a3a, 0x3df0ff],
  [0x1a1408, 0x3a2a10, 0xffd166],
];

const APPS = [
  { id: 'quests', name: 'Дела', color: 0xffd166, icon: 'list' },
  { id: 'messages', name: 'Сообщ.', color: 0x8ae6a0, icon: 'chat' },
  { id: 'contacts', name: 'Телефон', color: 0x3df0ff, icon: 'call' },
  { id: 'camera', name: 'Камера', color: 0xc9c4ee, icon: 'cam' },
  { id: 'gallery', name: 'Галерея', color: 0xff9a5a, icon: 'photo' },
  { id: 'player', name: 'Плеер', color: 0xff3d8a, icon: 'play' },
  { id: 'recorder', name: 'Диктофон', color: 0xff6b6b, icon: 'mic' },
  { id: 'bank', name: 'Банк', color: 0x6ad88a, icon: 'bank' },
  { id: 'ritm', name: 'Ритм', color: 0xff3d8a, icon: 'note', social: true },
  { id: 'kadr', name: 'Кадр', color: 0xffd166, icon: 'square', social: true },
  { id: 'vibe', name: 'Вайб', color: 0x3df0ff, icon: 'wave', social: true },
  { id: 'map', name: 'Карта', color: 0x9ab0ff, icon: 'map', ep2: true },
  { id: 'settings', name: 'Настр.', color: 0x9a96b8, icon: 'gear' },
];

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

export class Phone {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.page = 'home';
    this.stack = [];
    this.sel = 0;
    this.focus = [];
    this.root = uiContainer(scene, phoneX(), HIDDEN_Y, 1500).setVisible(false);
    this.buildBody();
    this.scr = scene.add.container(SX, SY);
    this.root.add(this.scr);
    this.banner = uiContainer(scene, 0, 0, 1490);
    this.bannerQueue = [];
    this.queue = RING_QUEUE;
    this.makeDrag();
    // Колёсико мыши — прокрутка списков
    const onWheel = (pointer, objs, dx, dy) => {
      if (!this.open || this.inCamera) return;
      if (this.overPhone(pointer)) this.scroll(dy > 0 ? 1 : -1);
    };
    scene.input.on('wheel', onWheel);
    this.unsub = onPhone((ev) => this.onEvent(ev));
    scene.events.once('shutdown', () => {
      // Ушёл из локации, пока звонят, — звонок повторится в следующей
      if (this.ringing) RING_QUEUE.unshift(this.ringing);
      this.ringing = null;
      scene.input.off('wheel', onWheel);
      this.unsub();
      this.stopAudio();
      this.ringLoop?.remove();
    });
  }

  // ---------- Корпус ----------

  buildBody() {
    const s = this.scene;
    const g = s.add.graphics();
    // Корпус — рамка вокруг экрана, а не сплошная плашка: в режиме камеры сквозь экран видно игру
    const bottom = SY + SH;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(PW, 30, 6, PH - 30, 3).fillRoundedRect(20, PH, PW - 14, 8, 3);
    g.fillStyle(0x15151c, 1);
    g.fillRoundedRect(0, 0, PW, SY, { tl: 30, tr: 30, bl: 0, br: 0 });
    g.fillRoundedRect(0, bottom, PW, PH - bottom, { tl: 0, tr: 0, bl: 30, br: 30 });
    g.fillRect(0, SY, SX, SH).fillRect(SX + SW, SY, PW - SX - SW, SH);
    g.lineStyle(3, 0x2e2e3a, 1).strokeRoundedRect(0, 0, PW, PH, 30);
    g.lineStyle(2, 0x0a0a10, 1).strokeRect(SX - 1, SY - 1, SW + 2, SH + 2);
    g.fillStyle(0x24242e, 1).fillRect(-3, 90, 3, 40).fillRect(PW, 120, 3, 60);
    // Динамик и фронталка
    g.fillStyle(0x2a2a36, 1).fillRoundedRect(PW / 2 - 30, 18, 60, 7, 3);
    g.fillStyle(0x0a0a10, 1).fillCircle(PW / 2 + 46, 21, 5);
    // Полоска «домой»
    this.homeBar = s.add.rectangle(PW / 2, PH - 22, 90, 6, 0x5a5a6a).setInteractive({ useHandCursor: true });
    this.homeBar.on('pointerdown', () => (this.page === 'home' ? this.hide() : this.goHome()));
    this.screenBg = s.add.graphics();
    this.root.add([g, this.screenBg, this.homeBar]);
  }

  drawWallpaper(plain = false) {
    const g = this.screenBg;
    g.clear();
    if (plain) {
      g.fillStyle(0x0c0b12, 1).fillRect(SX, SY, SW, SH);
      return;
    }
    const [a, b, c] = WALLPAPERS[state.phone.wallpaper % WALLPAPERS.length];
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), steps, i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1).fillRect(SX, SY + (SH / steps) * i, SW, SH / steps + 1);
    }
    g.fillStyle(c, 0.12).fillCircle(SX + SW * 0.75, SY + SH * 0.7, 90);
    g.fillStyle(c, 0.08).fillCircle(SX + SW * 0.2, SY + SH * 0.85, 60);
  }

  // ---------- Открыть / закрыть ----------

  toggle() {
    if (this.open) this.hide();
    else this.show();
  }

  show(page = 'home', arg) {
    if (this.open && page === this.page) return;
    const s = this.scene;
    this.open = true;
    this.root.setVisible(true);
    sfx('phoneOpen');
    s.tweens.killTweensOf(this.root);
    s.tweens.add({ targets: this.root, y: PY, duration: 320, ease: 'Back.out' });
    this.stack = [];
    this.go(page, arg, false);
  }

  hide(instant = false) {
    if (!this.open) return;
    const s = this.scene;
    this.open = false;
    this.stopAudio();
    this.leaveCamera();
    sfx('phoneClose');
    s.tweens.killTweensOf(this.root);
    if (instant) {
      this.root.y = HIDDEN_Y;
      this.root.setVisible(false);
    } else {
      s.tweens.add({ targets: this.root, y: HIDDEN_Y, duration: 260, ease: 'Cubic.in', onComplete: () => !this.open && this.root.setVisible(false) });
    }
    s.refreshPhoneBadge?.();
  }

  goHome() {
    this.stack = [];
    this.go('home', null, false);
  }

  go(page, arg, push = true) {
    if (push) this.stack.push({ page: this.page, arg: this.arg });
    this.stopAudio();
    if (page !== 'camera') this.leaveCamera();
    this.page = page;
    this.arg = arg;
    this.sel = 0;
    this.offset = 0;
    this.render();
    this.slide(1);
  }

  // Экран «въезжает» при переходе: вперёд — справа, назад — слева
  slide(dir) {
    const s = this.scene;
    s.tweens.killTweensOf(this.scr);
    this.scr.x = SX + 18 * dir;
    this.scr.alpha = 0.3;
    s.tweens.add({ targets: this.scr, x: SX, alpha: 1, duration: 140, ease: 'Cubic.out' });
  }

  back() {
    sfx('tap');
    const prev = this.stack.pop();
    if (!prev) {
      if (this.page === 'home') return this.hide();
      return this.goHome();
    }
    this.stopAudio();
    if (prev.page !== 'camera') this.leaveCamera();
    this.page = prev.page;
    this.arg = prev.arg;
    this.sel = 0;
    this.offset = 0;
    this.render();
    this.slide(-1);
  }

  // ---------- Отрисовка ----------

  clear() {
    this.scr.removeAll(true);
    this.focus = [];
  }

  add(o) {
    this.scr.add(o);
    return o;
  }

  text(x, y, str, style = {}) {
    return this.add(this.scene.add.text(x, y, str, { fontFamily: FONT, fontSize: '14px', color: '#f2f0ff', ...style }));
  }

  rect(x, y, w, h, color, alpha = 1) {
    return this.add(this.scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0));
  }

  statusBar(dark = false) {
    const col = dark ? '#c9c4ee' : '#ffffff';
    this.text(10, 4, clockShort(), { fontFamily: PIXEL, fontSize: '8px', color: col });
    const g = this.add(this.scene.add.graphics());
    for (let i = 0; i < 4; i++) g.fillStyle(0xffffff, i < 3 ? 0.9 : 0.35).fillRect(SW - 62 + i * 5, 12 - i * 2, 3, 2 + i * 2);
    g.lineStyle(1, 0xffffff, 0.9).strokeRect(SW - 34, 4, 20, 9);
    g.fillStyle(0xffffff, 0.9).fillRect(SW - 14, 7, 2, 3);
    const bat = state.episode === 'ep2' ? Math.max(8, 100 - Math.floor((state.time.min - 480) / 12)) : 76;
    g.fillStyle(bat < 20 ? 0xff6b6b : 0x8ae6a0, 1).fillRect(SW - 32, 6, Math.round((16 * bat) / 100), 5);
  }

  header(title, color = 0xffd166) {
    this.rect(0, 0, SW, 46, 0x0c0b12, 1);
    this.statusBar(true);
    const back = this.text(10, 22, '◀', { fontFamily: PIXEL, fontSize: '11px', color: hex(color) });
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    this.text(SW / 2, 23, title, { fontFamily: PIXEL, fontSize: '10px', color: hex(color) }).setOrigin(0.5, 0);
    this.rect(0, 45, SW, 1, color, 0.4);
  }

  // Фокусируемая строка: клик или ↑↓ + Enter
  row(y, h, draw, onPick, { bg = 0xffffff, alpha = 0.05 } = {}) {
    const i = this.focus.length;
    const r = this.rect(6, y, SW - 12, h, bg, alpha);
    r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.sel = i;
      this.highlight();
      sfx('tap');
      onPick();
    });
    draw(y);
    this.focus.push({ r, onPick, bg, alpha });
    return r;
  }

  // Полоса прокрутки и кнопки ▲▼ — для мыши и пальца
  scrollBar() {
    if (!this.scrollMax) return;
    const top = 50;
    const h = SH - top - 10;
    const frac = (this.offset || 0) / this.scrollMax;
    this.rect(SW - 4, top, 3, h, 0xffffff, 0.12);
    this.rect(SW - 4, top + frac * (h - 30), 3, 30, 0xffffff, 0.6);
    const mk = (y, label, d) => {
      const b = this.add(this.scene.add.rectangle(SW - 20, y, 28, 24, 0x000000, 0.45).setStrokeStyle(1, 0xffffff, 0.3));
      this.text(SW - 20, y, label, { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
      b.setInteractive({ useHandCursor: true }).on('pointerdown', (p, lx, ly, ev) => {
        ev?.stopPropagation?.();
        this.scroll(d);
      });
    };
    if ((this.offset || 0) > 0) mk(top + 14, '▲', -1);
    if ((this.offset || 0) < this.scrollMax) mk(SH - 18, '▼', 1);
  }

  highlight() {
    this.focus.forEach((f, j) => {
      if (f.grid) f.r.setStrokeStyle(j === this.sel ? 2 : 0, 0xffffff, 0.9);
      else f.r.setFillStyle(j === this.sel ? 0xff3d8a : f.bg, j === this.sel ? 0.28 : f.alpha);
    });
  }

  render() {
    this.clear();
    const fn = this[`page_${this.page}`];
    this.drawWallpaper(this.page !== 'home' && this.page !== 'camera');
    this.scrollMax = undefined;
    fn ? fn.call(this, this.arg) : this.page_home();
    this.scrollBar();
    this.sel = Phaser.Math.Clamp(this.sel, 0, Math.max(0, this.focus.length - 1));
    this.highlight();
    this.scene.refreshPhoneBadge?.();
  }

  // ---------- Главный экран ----------

  visibleApps() {
    return APPS.filter((a) => (!a.social || state.social.unlocked) && (!a.ep2 || state.episode === 'ep2'));
  }

  page_home() {
    this.statusBar();
    let y = 26;
    const soc = state.social;
    if (soc.unlocked) {
      // Виджет: подписчики в каждой соцсети и прирост за день
      this.rect(8, y, SW - 16, 62, 0x000000, 0.35).setStrokeStyle(1, 0xffffff, 0.15);
      Object.entries(APPS_SOCIAL).forEach(([id, a], i) => {
        const x = 14 + i * ((SW - 28) / 3);
        const n = soc.followers[id] || 0;
        const d = n - (soc.dayStart[id] || 0);
        this.text(x, y + 6, a.name.toUpperCase(), { fontFamily: PIXEL, fontSize: '7px', color: a.color });
        this.text(x, y + 20, fmtNum(n), { fontFamily: PIXEL, fontSize: '11px', color: '#ffffff' });
        this.text(x, y + 40, `${d >= 0 ? '+' : ''}${fmtNum(d)} сегодня`, { fontSize: '10px', color: d >= 0 ? '#8ae6a0' : '#ff6b8a' });
      });
      y += 72;
    } else {
      this.text(SW / 2, y + 14, clockShort(), { fontFamily: PIXEL, fontSize: '26px', color: '#ffffff' }).setOrigin(0.5, 0);
      this.text(SW / 2, y + 50, dayName(), { fontFamily: PIXEL, fontSize: '8px', color: '#c9c4ee' }).setOrigin(0.5, 0);
      y += 84;
    }
    const apps = this.visibleApps();
    const cols = 4;
    const cw = (SW - 8) / cols;
    apps.forEach((a, i) => {
      const cx = 4 + (i % cols) * cw + cw / 2;
      const cy = y + Math.floor(i / cols) * 74 + 4;
      const ic = this.add(this.scene.add.rectangle(cx, cy + 22, 46, 46, a.color, 1).setStrokeStyle(0, 0xffffff));
      this.drawIcon(a.icon, cx, cy + 22);
      const badge = this.badgeFor(a.id);
      if (badge) {
        this.add(this.scene.add.circle(cx + 21, cy + 2, 9, 0xff3d3d));
        this.text(cx + 21, cy + 2, String(badge), { fontFamily: PIXEL, fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
      }
      this.text(cx, cy + 50, a.name, { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5, 0);
      ic.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.sel = i;
        sfx('tap');
        this.openApp(a.id);
      });
      this.focus.push({ r: ic, grid: true, onPick: () => this.openApp(a.id) });
    });
    this.homeCols = cols;
  }

  badgeFor(id) {
    if (id === 'messages') return unreadTotal();
    if (id === 'quests') return Object.values(state.quests).filter((q) => q.status === 'active' && !q.seen).length;
    return 0;
  }

  drawIcon(kind, x, y) {
    const g = this.add(this.scene.add.graphics());
    g.fillStyle(0x0c0b12, 0.85);
    g.lineStyle(3, 0x0c0b12, 0.85);
    if (kind === 'list') {
      for (let i = 0; i < 3; i++) g.fillRect(x - 12, y - 10 + i * 9, 4, 4).fillRect(x - 5, y - 10 + i * 9, 17, 4);
    } else if (kind === 'chat') {
      g.fillRoundedRect(x - 14, y - 12, 28, 19, 6);
      g.fillTriangle(x - 8, y + 6, x - 2, y + 6, x - 10, y + 13);
    } else if (kind === 'call') {
      g.fillRoundedRect(x - 13, y - 13, 9, 11, 3).fillRoundedRect(x + 4, y + 2, 11, 9, 3);
      g.lineStyle(5, 0x0c0b12, 0.85).beginPath().arc(x + 2, y - 2, 12, Math.PI * 0.55, Math.PI * 1.0, false).strokePath();
    } else if (kind === 'cam') {
      g.fillRoundedRect(x - 15, y - 9, 30, 21, 4).fillRect(x - 6, y - 13, 12, 5);
      g.fillStyle(0xffffff, 0.9).fillCircle(x, y + 1, 7);
      g.fillStyle(0x0c0b12, 0.85).fillCircle(x, y + 1, 4);
    } else if (kind === 'photo') {
      g.strokeRect(x - 14, y - 11, 28, 22);
      g.fillTriangle(x - 12, y + 9, x - 3, y - 2, x + 6, y + 9);
      g.fillCircle(x + 7, y - 4, 3);
    } else if (kind === 'play') {
      g.fillTriangle(x - 8, y - 12, x - 8, y + 12, x + 12, y);
    } else if (kind === 'mic') {
      g.fillRoundedRect(x - 6, y - 15, 12, 19, 6).fillRect(x - 1, y + 6, 3, 7).fillRect(x - 7, y + 12, 15, 3);
    } else if (kind === 'bank') {
      g.fillTriangle(x - 15, y - 5, x + 15, y - 5, x, y - 15);
      for (let i = 0; i < 4; i++) g.fillRect(x - 12 + i * 7, y - 3, 4, 13);
      g.fillRect(x - 15, y + 11, 30, 3);
    } else if (kind === 'note') {
      g.fillCircle(x - 6, y + 9, 5).fillRect(x - 2, y - 12, 3, 21).fillRect(x - 2, y - 12, 12, 4).fillRect(x + 7, y - 12, 3, 9);
    } else if (kind === 'square') {
      g.strokeRoundedRect(x - 13, y - 13, 26, 26, 7);
      g.strokeCircle(x, y, 6);
      g.fillCircle(x + 8, y - 8, 2);
    } else if (kind === 'wave') {
      g.lineStyle(4, 0x0c0b12, 0.85).beginPath();
      for (let i = 0; i <= 28; i++) g.lineTo(x - 14 + i, y + Math.sin(i / 3) * 7);
      g.strokePath();
    } else if (kind === 'map') {
      g.lineStyle(3, 0x0c0b12, 0.85).strokeCircle(x, y, 13);
      g.lineBetween(x - 13, y, x + 13, y).lineBetween(x, y - 13, x, y + 13);
      g.fillCircle(x + 6, y - 6, 3);
    } else if (kind === 'gear') {
      g.fillCircle(x, y, 10);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 3);
      }
      g.fillStyle(0x9a96b8, 1).fillCircle(x, y, 4);
    }
  }

  openApp(id) {
    if (id === 'quests') Object.values(state.quests).forEach((q) => (q.seen = true));
    this.go(id);
  }

  // ---------- Дела ----------

  page_quests() {
    this.header('ДЕЛА', 0xffd166);
    let y = 54;
    this.text(10, y, 'СЮЖЕТ', { fontFamily: PIXEL, fontSize: '8px', color: '#ffd166' });
    y += 14;
    const goal = this.text(10, y, state.goal || 'Пока ничего — просто живи.', { fontSize: '13px', color: '#ffffff', wordWrap: { width: SW - 20 } });
    y += goal.height + 12;
    // Самочувствие: силы (Эп.2), сытость, чистота
    if (needsOn() && !this.offset) {
      this.text(10, y, 'САМОЧУВСТВИЕ', { fontFamily: PIXEL, fontSize: '8px', color: '#6ad8ff' });
      y += 14;
      const bars = [
        state.episode === 'ep2' && ['Силы', state.energy, state.energy < 25 ? 0xff6b6b : 0x8ae6a0],
        ['Сытость', state.food, state.food < FOOD_LOW ? 0xff6b6b : 0xf0c060],
        ['Чистота', state.clean, state.clean < CLEAN_LOW ? 0xb8a070 : 0x6ad8ff],
      ].filter(Boolean);
      const bw = Math.floor((SW - 20 - (bars.length - 1) * 8) / bars.length);
      bars.forEach(([label, v, c], i) => {
        const x = 10 + i * (bw + 8);
        this.text(x, y, `${label} ${Math.round(v)}`, { fontSize: '10px', color: '#c9c4ee' });
        this.rect(x, y + 14, bw, 5, 0x2a2838);
        this.rect(x, y + 14, Math.max(1, (bw * Math.max(0, Math.min(100, v))) / 100), 5, c);
      });
      y += 28;
    }
    const qs = Object.entries(state.quests);
    // «Поесть» / «Помыться» — живые дела, появляются, когда пора
    const needs = needsTodo().map((n, i) => [`need_${i}`, { title: n.title, note: n.note, status: 'active', urgent: n.urgent }]);
    const groups = [
      ['ДЕЛА', [...needs, ...qs.filter(([, q]) => q.status === 'active')], '#8ae6a0'],
      ['СДЕЛАНО', qs.filter(([, q]) => q.status === 'done'), '#77729a'],
      ['ПРОВАЛЕНО', qs.filter(([, q]) => q.status === 'failed'), '#ff6b8a'],
    ];
    if (!qs.length && !needs.length) this.text(10, y, 'Независимых дел нет.\nЛюди дают их сами — разговаривай.', { fontSize: '12px', color: '#77729a' });
    const all = [];
    groups.forEach(([title, list, color]) => list.length && all.push({ title, color }, ...list.map(([id, q]) => ({ q, color }))));
    const start = this.offset || 0;
    all.slice(start).forEach((it) => {
      if (y > SH - 30) return;
      if (it.title) {
        this.text(10, y, it.title, { fontFamily: PIXEL, fontSize: '8px', color: it.color });
        y += 14;
        return;
      }
      const t = this.text(16, y, `• ${it.q.title}`, { fontSize: '13px', color: it.q.urgent ? '#ff6b8a' : it.q.status === 'active' ? '#ffffff' : '#77729a', wordWrap: { width: SW - 30 } });
      y += t.height + 2;
      if (it.q.note && it.q.status === 'active') {
        const n = this.text(26, y, it.q.note, { fontSize: '11px', color: '#a9a6c8', wordWrap: { width: SW - 40 } });
        y += n.height + 6;
      } else y += 4;
    });
    if (all.length > 6) this.text(SW - 10, SH - 16, '↑↓ листать', { fontSize: '10px', color: '#77729a' }).setOrigin(1, 0);
    this.scrollMax = Math.max(0, all.length - 4);
  }

  // ---------- Сообщения ----------

  page_messages() {
    this.header('СООБЩЕНИЯ', 0x8ae6a0);
    const list = threadList();
    if (!list.length) this.text(SW / 2, 120, 'Сообщений нет', { color: '#77729a' }).setOrigin(0.5);
    list.slice(0, 7).forEach((th, i) => {
      const y = 54 + i * 52;
      const c = CONTACTS[th.id] || CONTACTS.unknown;
      this.row(y, 48, () => {
        this.add(this.scene.add.circle(30, y + 24, 16, Phaser.Display.Color.HexStringToColor(c.color).color));
        this.text(30, y + 24, c.letter, { fontFamily: PIXEL, fontSize: '10px', color: '#0c0b12' }).setOrigin(0.5);
        this.text(54, y + 6, contactName(th.id), { fontSize: '13px', color: '#ffffff', fontStyle: th.unread ? 'bold' : 'normal' });
        const prev = (th.last.dir === 'out' ? 'Вы: ' : '') + th.last.text;
        this.text(54, y + 26, prev.length > 26 ? `${prev.slice(0, 25)}…` : prev, { fontSize: '11px', color: th.unread ? '#8ae6a0' : '#a9a6c8' });
        this.text(SW - 14, y + 6, th.last.when || '', { fontSize: '10px', color: '#77729a' }).setOrigin(1, 0);
        if (th.unread) {
          this.add(this.scene.add.circle(SW - 22, y + 32, 8, 0x8ae6a0));
          this.text(SW - 22, y + 32, String(th.unread), { fontFamily: PIXEL, fontSize: '7px', color: '#0c0b12' }).setOrigin(0.5);
        }
      }, () => this.go('thread', th.id));
    });
  }

  page_thread(id) {
    markRead(id);
    this.header(contactName(id).slice(0, 18), 0x8ae6a0);
    const msgs = state.phone.threads[id] || [];
    const replies = pendingReplies(id);
    const bottom = replies ? SH - 8 - replies.length * 34 : SH - 10;
    // Пузыри снизу вверх, сколько влезет
    let y = bottom;
    const end = msgs.length - (this.offset || 0);
    for (let i = end - 1; i >= 0 && y > 60; i--) {
      const m = msgs[i];
      const out = m.dir === 'out';
      const t = this.scene.add.text(0, 0, m.text, { fontFamily: FONT, fontSize: '13px', color: out ? '#0c0b12' : '#ffffff', wordWrap: { width: SW - 70 } });
      const w = t.width + 16;
      const h = t.height + 12;
      y -= h + 14;
      if (y < 52) {
        t.destroy();
        break;
      }
      const x = out ? SW - 8 - w : 8;
      this.add(this.scene.add.rectangle(x, y, w, h, out ? 0x8ae6a0 : 0x2a2838, 1).setOrigin(0));
      t.setPosition(x + 8, y + 6);
      this.add(t);
      this.text(out ? SW - 10 : 10, y + h + 1, m.when || '', { fontSize: '9px', color: '#77729a' }).setOrigin(out ? 1 : 0, 0);
    }
    this.scrollMax = Math.max(0, msgs.length - 3);
    if (replies) {
      replies.forEach((r, i) => {
        const ry = SH - 4 - (replies.length - i) * 34;
        this.row(ry, 30, () => {
          this.text(14, ry + 7, `${i + 1}. ${r.text}`, { fontSize: '12px', color: '#ffffff', wordWrap: { width: SW - 36 } });
        }, () => this.reply(id, r), { bg: 0x8ae6a0, alpha: 0.12 });
      });
    }
  }

  async reply(id, r) {
    markAnswered(id);
    send(id, r.text);
    sfx('notify');
    this.render();
    const handler = phoneReplyHandler(r.id);
    if (handler) {
      try {
        await handler({ scene: this.scene, state, phone: this });
      } catch (e) {
        console.error(e);
      }
    }
    if (this.open && this.page === 'thread') this.render();
  }

  // ---------- Телефон и звонки ----------

  page_contacts() {
    this.header('ТЕЛЕФОН', 0x3df0ff);
    const ids = state.phone.contacts;
    if (!ids.length) this.text(SW / 2, 120, 'Контактов нет', { color: '#77729a' }).setOrigin(0.5);
    const per = 7;
    ids.slice(this.offset || 0, (this.offset || 0) + per).forEach((cid, i) => {
      const y = 54 + i * 48;
      const c = CONTACTS[cid] || CONTACTS.unknown;
      this.row(y, 44, () => {
        this.add(this.scene.add.circle(28, y + 22, 15, Phaser.Display.Color.HexStringToColor(c.color).color));
        this.text(28, y + 22, c.letter, { fontFamily: PIXEL, fontSize: '9px', color: '#0c0b12' }).setOrigin(0.5);
        this.text(52, y + 13, contactName(cid), { fontSize: '13px', color: '#ffffff' });
        this.text(SW - 16, y + 13, '☏', { fontSize: '16px', color: '#3df0ff' }).setOrigin(1, 0);
      }, () => this.call(cid));
    });
    this.scrollMax = Math.max(0, ids.length - per);
    if (ids.length > per) this.text(SW - 10, SH - 16, '↑↓ листать', { fontSize: '10px', color: '#77729a' }).setOrigin(1, 0);
  }

  // Исходящий звонок: гудки, потом сценарий звонка (если у персонажа есть, что сказать)
  async call(cid) {
    const script = phoneCallScript(cid);
    this.callScreen(cid, 'Вызов…');
    sfx('dial');
    await this.wait(1100);
    sfx('dial');
    await this.wait(1100);
    if (!this.open) return;
    if (!script) {
      logCall(cid, 'out', false);
      sfx('hangup');
      this.callStatus?.setText('Не отвечает');
      await this.wait(1200);
      if (this.open && this.page === 'call') this.back();
      return;
    }
    logCall(cid, 'out', true);
    this.runCall(cid, script);
  }

  callScreen(cid, status) {
    this.go('call', cid);
    this.callStatus?.setText(status);
  }

  page_call(cid) {
    const c = CONTACTS[cid] || CONTACTS.unknown;
    this.rect(0, 0, SW, SH, 0x0c1420, 1);
    this.statusBar();
    this.add(this.scene.add.circle(SW / 2, 130, 46, Phaser.Display.Color.HexStringToColor(c.color).color));
    this.text(SW / 2, 130, c.letter, { fontFamily: PIXEL, fontSize: '28px', color: '#0c0b12' }).setOrigin(0.5);
    this.text(SW / 2, 196, contactName(cid), { fontSize: '17px', color: '#ffffff', align: 'center', wordWrap: { width: SW - 30 } }).setOrigin(0.5, 0);
    this.callStatus = this.text(SW / 2, 236, '', { fontSize: '13px', color: '#a9a6c8' }).setOrigin(0.5, 0);
    if (this.incoming) {
      const ok = this.add(this.scene.add.circle(SW / 2 - 60, SH - 70, 28, 0x3ad86a));
      const no = this.add(this.scene.add.circle(SW / 2 + 60, SH - 70, 28, 0xff3d3d));
      this.text(SW / 2 - 60, SH - 70, '1', { fontFamily: PIXEL, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
      this.text(SW / 2 + 60, SH - 70, '2', { fontFamily: PIXEL, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
      this.text(SW / 2 - 60, SH - 34, 'Ответить', { fontSize: '11px' }).setOrigin(0.5, 0);
      this.text(SW / 2 + 60, SH - 34, 'Сбросить', { fontSize: '11px' }).setOrigin(0.5, 0);
      ok.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.answer(true));
      no.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.answer(false));
      this.scene.tweens.add({ targets: ok, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
    } else {
      const no = this.add(this.scene.add.circle(SW / 2, SH - 70, 28, 0xff3d3d));
      this.text(SW / 2, SH - 70, '✕', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
      no.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    }
  }

  // Разговор идёт в обычном окне диалога, телефон на это время прячется
  runCall(cid, script) {
    const s = this.scene;
    this.hide(true);
    s.callPill?.(contactName(cid));
    s.runScript(async (ctx) => {
      await script(ctx);
    }).then(() => s.callPill?.(null));
  }

  // Входящий звонок от сюжета
  // stale() — звонок уже неактуален (например, Марк сам пришёл в «Подвал»): тогда не звоним
  ring(from, script, { onDecline, stale } = {}) {
    if (stale?.()) return;
    if (this.scene.busy || this.ringing) {
      (this.queue ||= []).push({ from, script, onDecline, stale });
      return;
    }
    this.ringing = { from, script, onDecline, stale };
    this.incoming = true;
    if (!this.open) this.show('call', from);
    else this.go('call', from);
    this.callStatus?.setText('Входящий вызов');
    sfx('ringtone');
    sfx('buzz');
    this.ringLoop = this.scene.time.addEvent({ delay: 1400, loop: true, callback: () => {
      sfx('ringtone');
      sfx('buzz');
    } });
  }

  answer(yes) {
    const r = this.ringing;
    if (!r) return;
    this.ringing = null;
    this.incoming = false;
    this.ringLoop?.remove();
    logCall(r.from, 'in', yes);
    if (yes) {
      sfx('select');
      this.runCall(r.from, r.script);
    } else {
      sfx('hangup');
      this.hide();
      r.onDecline?.();
    }
  }

  // Сцена началась, пока звонит телефон: звонок ждёт конца сцены и зазвонит снова
  deferRinging() {
    const r = this.ringing;
    if (!r) return;
    this.ringing = null;
    this.incoming = false;
    this.ringLoop?.remove();
    (this.queue ||= []).unshift(r);
  }

  // Вызывается сценой, когда она освободилась
  flushQueue() {
    if (!this.queue?.length || this.scene.busy || this.ringing || this.scene.leaving) return;
    const next = this.queue.shift();
    this.ring(next.from, next.script, next);
  }

  // ---------- Камера ----------

  page_camera() {
    // Экран прозрачный — сквозь него видно игру; камера сдвигается, чтобы Марк попал в кадр
    const s = this.scene;
    this.screenBg.clear();
    this.inCamera = true;
    const cam = s.cameras.main;
    this.savedOffset ??= { x: cam.followOffset.x, y: cam.followOffset.y };
    cam.setFollowOffset(300, this.savedOffset.y);
    const g = this.add(s.add.graphics());
    g.lineStyle(1, 0xffffff, 0.35);
    g.lineBetween(SW / 3, 30, SW / 3, SH - 70).lineBetween((SW * 2) / 3, 30, (SW * 2) / 3, SH - 70);
    g.lineBetween(0, SH / 3, SW, SH / 3).lineBetween(0, (SH * 2) / 3 - 20, SW, (SH * 2) / 3 - 20);
    g.lineStyle(3, 0xffd166, 0.9);
    const b = 18;
    [[8, 30], [SW - 8, 30], [8, SH - 78], [SW - 8, SH - 78]].forEach(([x, y], i) => {
      const dx = i % 2 ? -b : b;
      const dy = i < 2 ? b : -b;
      g.lineBetween(x, y, x + dx, y).lineBetween(x, y, x, y + dy);
    });
    this.rect(0, SH - 66, SW, 66, 0x000000, 0.55);
    this.text(10, 8, 'ФОТО', { fontFamily: PIXEL, fontSize: '8px', color: '#ffd166' });
    const back = this.text(SW - 10, 8, '✕', { fontSize: '14px', color: '#ffffff' }).setOrigin(1, 0);
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    const shot = this.add(s.add.circle(SW / 2, SH - 33, 22, 0xffffff).setStrokeStyle(4, 0x9a96b8));
    shot.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.snap());
    this.text(SW / 2 + 40, SH - 40, 'Enter', { fontSize: '10px', color: '#c9c4ee' });
    this.cameraOverlay = this.scr.list.slice();
  }

  leaveCamera() {
    if (!this.inCamera) return;
    this.inCamera = false;
    const cam = this.scene.cameras.main;
    if (this.savedOffset) cam.setFollowOffset(this.savedOffset.x, this.savedOffset.y);
    this.savedOffset = null;
  }

  snap() {
    if (this.snapping) return;
    this.snapping = true;
    const s = this.scene;
    const x = PX + SX;
    const y = PY + SY + 24;
    const w = SW;
    const h = SH - 92;
    this.cameraOverlay.forEach((o) => o.setVisible(false));
    s.game.renderer.snapshotArea(x, y, w, h, (img) => {
      this.cameraOverlay.forEach((o) => o.active && o.setVisible(true));
      sfx('shutter');
      const flash = this.rect(0, 0, SW, SH, 0xffffff, 1);
      s.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
      this.savePhoto(img).finally(() => (this.snapping = false));
      s.onPhoto?.();
    });
  }

  async savePhoto(img) {
    // Уменьшаем, чтобы фото не занимали много места
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = Math.round((160 * img.height) / img.width);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.8);
    const spot = this.scene.photoSpotNear?.();
    await dbPut('photos', { id: `ph_${Date.now()}`, createdAt: Date.now(), data, loc: this.scene.cfg?.title || '', spot: spot?.id || null, when: clockShort() });
  }

  // ---------- Галерея ----------

  async page_gallery() {
    this.header('ГАЛЕРЕЯ', 0xff9a5a);
    const token = (this.galleryToken = (this.galleryToken || 0) + 1);
    const photos = await dbAll('photos');
    if (token !== this.galleryToken || this.page !== 'gallery') return;
    this.photos = photos;
    if (!photos.length) {
      this.text(SW / 2, 140, 'Фото нет.\nОткрой «Камеру» и сними что-нибудь.', { color: '#77729a', align: 'center', fontSize: '13px' }).setOrigin(0.5);
      return;
    }
    const cw = (SW - 16) / 3;
    const per = 12;
    photos.slice(this.offset || 0, (this.offset || 0) + per).forEach((p, i) => {
      const x = 8 + (i % 3) * cw;
      const y = 54 + Math.floor(i / 3) * 88;
      const r = this.add(this.scene.add.rectangle(x + 2, y, cw - 4, 84, 0x2a2838).setOrigin(0));
      this.photoTexture(p).then((key) => {
        if (!key || this.page !== 'gallery' || !r.active) return;
        const im = this.add(this.scene.add.image(x + cw / 2, y + 42, key));
        im.setScale(Math.min((cw - 8) / im.width, 80 / im.height));
      });
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.go('photo', (this.offset || 0) + i));
      this.focus.push({ r, grid: true, onPick: () => this.go('photo', (this.offset || 0) + i) });
    });
    this.homeCols = 3;
    this.scrollMax = Math.max(0, photos.length - per);
    this.highlight();
  }

  photoTexture(p) {
    const key = `photo_${p.id}`;
    const tex = this.scene.textures;
    if (tex.exists(key)) return Promise.resolve(key);
    return new Promise((resolve) => {
      tex.once(`addtexture-${key}`, () => resolve(key));
      tex.once('onerror', () => resolve(null));
      tex.addBase64(key, p.data);
    });
  }

  page_photo(idx) {
    this.header('ФОТО', 0xff9a5a);
    const p = this.photos?.[idx];
    if (!p) return;
    this.photoTexture(p).then((key) => {
      if (!key || this.page !== 'photo') return;
      const im = this.add(this.scene.add.image(SW / 2, 170, key));
      im.setScale(Math.min((SW - 16) / im.width, 230 / im.height));
    });
    this.text(10, 296, `${p.loc || ''}  ${p.when || ''}`, { fontSize: '11px', color: '#a9a6c8' });
    let y = 318;
    if (state.social.unlocked && !p.posted) {
      this.row(y, 30, () => this.text(16, y + 7, '1. Выложить в «Кадр»', { fontSize: '12px' }), () => this.postPhoto(p));
      y += 34;
    }
    this.row(y, 30, () => this.text(16, y + 7, `${state.social.unlocked && !p.posted ? 2 : 1}. Удалить`, { fontSize: '12px', color: '#ff6b8a' }), async () => {
      await dbDelete('photos', p.id);
      this.back();
    });
    this.text(SW / 2, SH - 18, '← → листать', { fontSize: '10px', color: '#77729a' }).setOrigin(0.5, 0);
  }

  async postPhoto(p) {
    p.posted = true;
    await dbPut('photos', p);
    const good = p.spot ? 1 : 0;
    const likes = Math.round((20 + Math.random() * 40 + good * 80) * (0.5 + state.pulse / 100));
    post('kadr', { text: p.spot ? 'новый кадр' : 'просто кадр', likes, photo: p.id });
    addFollowers('kadr', 6 + good * 18 + Math.round(Math.random() * 8), 'новое фото');
    sfx('line');
    this.render();
  }

  // ---------- Плеер демок ----------

  async page_player() {
    this.header('ПЛЕЕР', 0xff3d8a);
    const token = (this.playerToken = (this.playerToken || 0) + 1);
    // Новые демки — сверху; список листается (колёсико, ▲▼, стрелки)
    const demos = (await listDemos()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (token !== this.playerToken || this.page !== 'player') return;
    this.demos = demos;
    if (!demos.length) {
      this.text(SW / 2, 140, 'Демок пока нет.\nЗапиши трек у Дэна.', { color: '#77729a', align: 'center', fontSize: '13px' }).setOrigin(0.5);
      return;
    }
    const per = 6;
    demos.slice(this.offset || 0, (this.offset || 0) + per).forEach((d, i) => {
      const y = 54 + i * 44;
      const playing = this.playingId === d.id;
      this.row(y, 40, () => {
        this.text(14, y + 4, `${playing ? '■' : '▶'} ${d.title}`.slice(0, 28), { fontSize: '13px', color: playing ? '#ff3d8a' : '#ffffff' });
        this.text(30, y + 22, d.voice ? `голос · подача ${d.score ?? '—'}%` : 'без голоса', { fontSize: '10px', color: '#a9a6c8' });
      }, () => this.toggleDemo(d));
    });
    this.lyric = this.text(SW / 2, SH - 70, '', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: SW - 20 } }).setOrigin(0.5);
    this.scrollMax = Math.max(0, demos.length - per);
    this.scrollBar();
    this.highlight();
  }

  async toggleDemo(d) {
    const was = this.playingId === d.id;
    this.stopAudio();
    if (!was) {
      const h = await playDemo(d);
      if (!h || !this.open || this.page !== 'player') return h?.stop();
      this.playing = h;
      this.playingId = d.id;
      this.lyricTimer = this.scene.time.addEvent({ delay: 80, loop: true, callback: () => {
        const t = audioCtx().currentTime - h.startAt;
        const cur = (d.items || []).find((it) => t >= it.start && t < it.end);
        this.lyric?.active && this.lyric.setText(cur ? cur.text : '');
        if (t > d.length) {
          this.stopAudio();
          this.render();
        }
      } });
    }
    this.render();
  }

  stopAudio() {
    this.playing?.stop();
    this.playing = null;
    this.playingId = null;
    this.lyricTimer?.remove();
    this.lyricTimer = null;
    this.memoPlaying?.stop();
    this.memoPlaying = null;
    if (this.recording) this.stopMemo(true);
  }

  // ---------- Диктофон ----------

  async page_recorder() {
    this.header('ДИКТОФОН', 0xff6b6b);
    const rec = this.recording;
    const btn = this.add(this.scene.add.circle(SW / 2, 110, 36, rec ? 0xff3d3d : 0x2a2838).setStrokeStyle(4, 0xff6b6b));
    this.text(SW / 2, 110, rec ? '■' : '●', { fontSize: '26px', color: rec ? '#ffffff' : '#ff6b6b' }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.recording ? this.stopMemo() : this.startMemo()));
    this.focus.push({ r: btn, grid: true, onPick: () => (this.recording ? this.stopMemo() : this.startMemo()) });
    this.recLabel = this.text(SW / 2, 156, rec ? 'Запись… (до 20 сек)' : 'Нажми, чтобы записать мысль', { fontSize: '12px', color: '#a9a6c8' }).setOrigin(0.5, 0);
    if (rec) this.scene.tweens.add({ targets: btn, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
    const token = (this.memoToken = (this.memoToken || 0) + 1);
    const memos = (await dbAll('memos')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (token !== this.memoToken || this.page !== 'recorder') return;
    const per = 5;
    const off = this.offset || 0;
    memos.slice(off, off + per).forEach((m, i) => {
      const y = 190 + i * 42;
      this.row(y, 38, () => {
        this.text(14, y + 10, `▶ Запись ${memos.length - off - i}`, { fontSize: '13px' });
        this.text(SW - 14, y + 10, `${m.when || ''} · ${Math.round(m.length || 0)} с`, { fontSize: '10px', color: '#a9a6c8' }).setOrigin(1, 0);
      }, () => this.playMemo(m));
    });
    if (!memos.length) this.text(SW / 2, 230, 'Записей нет', { fontSize: '12px', color: '#77729a' }).setOrigin(0.5, 0);
    this.scrollMax = Math.max(0, memos.length - per);
    this.scrollBar();
    this.highlight();
  }

  async startMemo() {
    try {
      this.memoStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      sfx('deny');
      this.recLabel?.setText('Микрофон недоступен');
      return;
    }
    const chunks = [];
    const rec = new MediaRecorder(this.memoStream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const t0 = Date.now();
    rec.onstop = async () => {
      this.memoStream?.getTracks().forEach((t) => t.stop());
      this.memoStream = null;
      if (this.discardMemo) return;
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      await dbPut('memos', { id: `memo_${Date.now()}`, createdAt: Date.now(), blob, length: (Date.now() - t0) / 1000, when: clockShort() });
      if (this.open && this.page === 'recorder') this.render();
    };
    this.discardMemo = false;
    this.recording = rec;
    rec.start();
    sfx('rec');
    this.memoTimer = this.scene.time.delayedCall(20000, () => this.stopMemo());
    this.render();
  }

  stopMemo(discard = false) {
    const rec = this.recording;
    if (!rec) return;
    this.recording = null;
    this.discardMemo = discard;
    this.memoTimer?.remove();
    try {
      rec.stop();
    } catch (e) {}
    if (!discard && this.open) this.render();
  }

  async playMemo(m) {
    this.stopAudio();
    try {
      const buf = await decodeBlob(m.blob);
      this.memoPlaying = playBuffer(buf, { volume: 1.4 });
    } catch (e) {
      sfx('deny');
    }
  }

  // ---------- Банк ----------

  page_bank() {
    this.header('БАНК', 0x6ad88a);
    this.text(14, 56, 'НА КАРТЕ И В КАРМАНЕ', { fontFamily: PIXEL, fontSize: '7px', color: '#a9a6c8' });
    this.text(14, 72, `${state.cash.toLocaleString('ru-RU')} ₽`, { fontFamily: PIXEL, fontSize: '18px', color: '#ffffff' });
    let y = 106;
    const debts = Object.entries(state.debts).filter(([, d]) => d && d.amount > 0);
    if (debts.length) {
      this.text(14, y, 'ДОЛГИ', { fontFamily: PIXEL, fontSize: '7px', color: '#ff6b8a' });
      y += 14;
      debts.forEach(([who, d]) => {
        this.text(14, y, `${contactName(who)}: ${d.amount.toLocaleString('ru-RU')} ₽`, { fontSize: '12px', color: '#ff9ab0' });
        if (d.due) this.text(SW - 14, y, d.due, { fontSize: '10px', color: '#a9a6c8' }).setOrigin(1, 0);
        y += 18;
      });
      y += 6;
    }
    this.text(14, y, 'ИСТОРИЯ', { fontFamily: PIXEL, fontSize: '7px', color: '#a9a6c8' });
    y += 16;
    if (!state.bank.length) this.text(14, y, 'Операций нет', { fontSize: '12px', color: '#77729a' });
    // Если список прокручивается — суммы левее, чтобы не прятались под кнопками ▲▼
    const right = state.bank.length > 10 ? SW - 40 : SW - 14;
    state.bank.slice(this.offset || 0).forEach((tx) => {
      if (y > SH - 24) return;
      this.text(14, y, (tx.label || (tx.amount > 0 ? 'Пополнение' : 'Расход')).slice(0, 22), { fontSize: '12px', color: '#e8e4ff' });
      this.text(right, y, `${tx.amount > 0 ? '+' : '−'}${Math.abs(tx.amount).toLocaleString('ru-RU')}`, { fontSize: '12px', color: tx.amount > 0 ? '#8ae6a0' : '#ff6b8a' }).setOrigin(1, 0);
      y += 20;
    });
    this.scrollMax = Math.max(0, state.bank.length - 10);
  }

  // ---------- Соцсети ----------

  socialHeader(id) {
    const a = APPS_SOCIAL[id];
    const color = Phaser.Display.Color.HexStringToColor(a.color).color;
    this.header(a.name.toUpperCase(), color);
    const n = state.social.followers[id] || 0;
    const d = n - (state.social.dayStart[id] || 0);
    this.text(14, 54, `@ten_garage · ${fmtNum(n)} подписчиков`, { fontSize: '12px', color: '#ffffff' });
    this.text(14, 70, `${d >= 0 ? '+' : ''}${fmtNum(d)} за сегодня`, { fontSize: '11px', color: d >= 0 ? '#8ae6a0' : '#ff6b8a' });
    this.rect(0, 88, SW, 1, color, 0.3);
    return color;
  }

  page_ritm() {
    this.socialHeader('ritm');
    const posts = state.social.posts.filter((p) => p.app === 'ritm');
    let y = 96;
    if (!posts.length) this.text(SW / 2, 150, 'Видео нет.\nВыступления и стримы\nпопадут сюда.', { fontSize: '12px', color: '#77729a', align: 'center' }).setOrigin(0.5, 0);
    posts.slice(this.offset || 0).forEach((p) => {
      if (y > SH - 60) return;
      this.rect(8, y, SW - 16, 62, 0x1a1530, 1).setStrokeStyle(1, 0xff3d8a, 0.4);
      this.rect(14, y + 6, 36, 50, 0xff3d8a, 0.35);
      this.text(32, y + 31, '▶', { fontSize: '14px' }).setOrigin(0.5);
      this.text(58, y + 6, p.text.slice(0, 26), { fontSize: '12px', color: '#ffffff', wordWrap: { width: SW - 80 } });
      this.text(58, y + 40, `♥ ${fmtNum(p.likes)}  · ${p.author}`, { fontSize: '10px', color: '#ff9ab0' });
      y += 68;
    });
    this.scrollMax = Math.max(0, posts.length - 4);
  }

  page_kadr() {
    this.socialHeader('kadr');
    const posts = state.social.posts.filter((p) => p.app === 'kadr');
    let y = 96;
    if (!posts.length) this.text(SW / 2, 150, 'Постов нет.\nСними фото и выложи\nиз «Галереи».', { fontSize: '12px', color: '#77729a', align: 'center' }).setOrigin(0.5, 0);
    posts.slice(this.offset || 0).forEach((p) => {
      if (y > SH - 44) return;
      this.rect(8, y, SW - 16, 44, 0x1a1530, 1).setStrokeStyle(1, 0xffd166, 0.4);
      this.text(16, y + 6, `${p.author}: ${p.text}`.slice(0, 32), { fontSize: '12px', color: '#ffffff' });
      this.text(16, y + 24, `♥ ${fmtNum(p.likes)}   ${p.comments?.length ? `💬 ${p.comments.length}` : ''}  ${p.when}`, { fontSize: '10px', color: '#ffd166' });
      y += 50;
    });
    this.scrollMax = Math.max(0, posts.length - 5);
  }

  page_vibe() {
    this.socialHeader('vibe');
    const items = state.social.feed;
    let y = 96;
    if (!items.length) this.text(SW / 2, 150, 'Лента пуста.', { fontSize: '12px', color: '#77729a' }).setOrigin(0.5, 0);
    items.slice(this.offset || 0).forEach((it) => {
      if (y > SH - 30) return;
      this.text(12, y, it.author, { fontSize: '11px', color: '#3df0ff', fontStyle: 'bold' });
      this.text(SW - 12, y, `${it.when}`, { fontSize: '9px', color: '#77729a' }).setOrigin(1, 0);
      const t = this.text(12, y + 15, it.text, { fontSize: '12px', color: '#e8e4ff', wordWrap: { width: SW - 24 } });
      y += t.height + 24;
      this.rect(12, y - 6, SW - 24, 1, 0xffffff, 0.08);
    });
    this.scrollMax = Math.max(0, items.length - 4);
  }

  // ---------- Карта (Эп. 2) ----------

  page_map() {
    this.header('КАРТА', 0x9ab0ff);
    const info = phoneMapInfo?.();
    if (!info) return;
    info.draw?.(this, 0, 50, SW, 220);
    let y = 280;
    this.text(12, y, 'ГДЕ СЕЙЧАС ЗНАКОМЫЕ', { fontFamily: PIXEL, fontSize: '7px', color: '#9ab0ff' });
    y += 14;
    (info.people || []).slice(0, 7).forEach((p) => {
      this.text(12, y, `${p.name}`, { fontSize: '11px', color: '#ffffff' });
      this.text(SW - 12, y, p.where, { fontSize: '11px', color: '#a9a6c8' }).setOrigin(1, 0);
      y += 17;
    });
  }

  // ---------- Настройки ----------

  settingsRows() {
    const st = state.settings;
    const speed = { 40: 'медленно', 22: 'нормально', 10: 'быстро' };
    const at = { off: 'выкл', light: 'лёгкий', hard: 'жёсткий' };
    return [
      { label: 'Музыка', value: `${Math.round(st.music * 100)}%`, change: (d) => (st.music = clamp01(st.music + d * 0.1)) },
      { label: 'Звуки', value: `${Math.round(st.sfx * 100)}%`, change: (d) => (st.sfx = clamp01(st.sfx + d * 0.1)) },
      { label: 'Озвучка', value: st.voice ? 'вкл' : 'выкл', change: () => (st.voice = !st.voice) },
      { label: 'Громкость голосов', value: `${Math.round((st.voiceVol / 1.4) * 100)}%`, change: (d) => (st.voiceVol = Math.max(0, Math.min(2.8, st.voiceVol + d * 0.14))) },
      { label: 'Скорость текста', value: speed[st.textSpeed] || 'нормально', change: (d) => (st.textSpeed = cycle([40, 22, 10], st.textSpeed, d)) },
      { label: 'Автотюн в студии', value: at[st.autotune], change: (d) => (st.autotune = cycle(['off', 'light', 'hard'], st.autotune, d)) },
      { label: 'Наушники в студии', value: st.headphones ? 'да' : 'нет', change: () => (st.headphones = !st.headphones) },
      { label: 'Телефон', value: phoneX() < 200 ? 'слева' : phoneX() < 500 ? 'в центре' : 'справа', change: (d) => {
        const spots = [20, 335, PX];
        const cur = spots.reduce((best, x) => (Math.abs(x - phoneX()) < Math.abs(best - phoneX()) ? x : best), PX);
        st.phoneX = spots[(spots.indexOf(cur) + d + spots.length) % spots.length];
        this.root.x = st.phoneX;
      } },
      { label: 'Графика', value: QUALITY_LABEL[st.graphics || 'high'], change: (d) => (st.graphics = cycle(['low', 'medium', 'high'], st.graphics || 'high', d)) },
      { label: 'Обои', value: String((state.phone.wallpaper % WALLPAPERS.length) + 1), change: (d) => (state.phone.wallpaper = (state.phone.wallpaper + d + WALLPAPERS.length) % WALLPAPERS.length) },
    ];
  }

  page_settings() {
    this.header('НАСТРОЙКИ', 0x9a96b8);
    this.settingsRows().forEach((r, i) => {
      const y = 50 + i * 33;
      this.row(y, 30, () => {
        this.text(14, y + 10, r.label, { fontSize: '12px' });
        const minus = this.text(SW - 116, y + 8, '◀', { fontSize: '13px', color: '#9a96b8' });
        this.text(SW - 64, y + 10, r.value, { fontSize: '12px', color: '#ffd166' }).setOrigin(0.5, 0);
        const plus = this.text(SW - 22, y + 8, '▶', { fontSize: '13px', color: '#9a96b8' });
        minus.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.changeSetting(i, -1));
        plus.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.changeSetting(i, 1));
      }, () => this.changeSetting(i, 1));
    });
    this.text(SW / 2, SH - 26, '← → менять · [ ] — сдвинуть телефон', { fontSize: '10px', color: '#77729a' }).setOrigin(0.5, 0);
    this.text(SW / 2, SH - 13, 'или тяни его за рамку', { fontSize: '10px', color: '#77729a' }).setOrigin(0.5, 0);
  }

  changeSetting(i, d) {
    const before = state.settings.graphics;
    this.settingsRows()[i].change(d);
    if (state.settings.graphics !== before) {
      // Плёночный эффект — сразу; остальное (облака, передний план, частицы) — со следующей локации
      this.scene.children.list.filter((o) => o.depth === 985 || o.depth === 986).forEach((o) => o.destroy());
      applyLook(this.scene);
      this.scene.showToast?.('ГРАФИКА', `${QUALITY_LABEL[state.settings.graphics]} — полностью со следующей локации`, '#9a96b8');
    }
    applySettings();
    saveSettings();
    sfx('tap');
    const sel = i;
    this.render();
    this.sel = sel;
    this.highlight();
  }

  // ---------- Клавиатура ----------

  handleKey(ev) {
    const k = ev.key;
    if (this.ringing) {
      if (k === '1' || k === 'Enter' || k === 'e' || k === 'у') this.answer(true);
      if (k === '2' || k === 'Escape' || k === 'Backspace') this.answer(false);
      return;
    }
    if (k === 'p' || k === 'з' || k === 'P' || k === 'З') return this.hide();
    // [ и ] — сдвинуть телефон влево/вправо (в русской раскладке — х и ъ)
    if (['[', 'х', 'Х', '{'].includes(k)) return this.moveBy(-110);
    if ([']', 'ъ', 'Ъ', '}'].includes(k)) return this.moveBy(110);
    if (k === 'Escape' || k === 'Backspace' || k === 'q' || k === 'й') return this.back();
    if (this.page === 'camera') {
      if (['Enter', ' ', 'e', 'у'].includes(k)) this.snap();
      return;
    }
    if (this.page === 'photo' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd')) {
      const d = k === 'ArrowLeft' || k === 'a' ? -1 : 1;
      const n = this.photos?.length || 0;
      if (n) {
        this.arg = (this.arg + d + n) % n;
        this.render();
      }
      return;
    }
    if (this.page === 'settings' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd')) {
      return this.changeSetting(this.sel, k === 'ArrowLeft' || k === 'a' ? -1 : 1);
    }
    const n = parseInt(k, 10);
    if (n >= 1 && n <= 9 && this.page === 'thread') {
      const r = pendingReplies(this.arg);
      if (r?.[n - 1]) return this.reply(this.arg, r[n - 1]);
    }
    const grid = ['home', 'gallery', 'recorder'].includes(this.page);
    const cols = grid ? this.homeCols || 4 : 1;
    const up = k === 'ArrowUp' || k === 'w' || k === 'ц';
    const down = k === 'ArrowDown' || k === 's' || k === 'ы';
    const left = k === 'ArrowLeft' || k === 'a' || k === 'ф';
    const right = k === 'ArrowRight' || k === 'd' || k === 'в';
    if (!this.focus.length) {
      if (up || down) this.scroll(up ? -1 : 1);
      return;
    }
    let sel = this.sel;
    if (up) sel -= cols;
    if (down) sel += cols;
    if (grid && left) sel -= 1;
    if (grid && right) sel += 1;
    if (up || down || left || right) {
      if (sel < 0 || sel >= this.focus.length) {
        if (!grid) this.scroll(up ? -1 : 1);
        return;
      }
      this.sel = sel;
      sfx('tap');
      this.highlight();
      return;
    }
    if (['Enter', ' ', 'e', 'у'].includes(k)) {
      sfx('tap');
      this.focus[this.sel]?.onPick();
    }
  }

  scroll(d) {
    if (this.scrollMax === undefined) return;
    const o = Phaser.Math.Clamp((this.offset || 0) + d, 0, this.scrollMax);
    if (o === this.offset) return;
    this.offset = o;
    sfx('tap');
    const keep = this.offset;
    this.render();
    this.offset = keep;
  }

  // ---------- Положение телефона ----------

  // Перетаскивание за рамку (верх и низ корпуса), мышью или пальцем
  makeDrag() {
    const s = this.scene;
    const handles = [s.add.rectangle(0, 0, PW, SY - 2, 0xffffff, 0.001).setOrigin(0), s.add.rectangle(0, SY + SH + 2, PW, PH - SY - SH - 30, 0xffffff, 0.001).setOrigin(0)];
    handles.forEach((h) => {
      h.setInteractive({ useHandCursor: true, draggable: true });
      this.root.add(h);
      h.on('dragstart', (pointer) => {
        this.dragFrom = { px: pointer.x, x: this.root.x };
      });
      h.on('drag', (pointer) => {
        if (!this.dragFrom) return;
        this.root.x = clampX(this.dragFrom.x + (pointer.x - this.dragFrom.px));
      });
      h.on('dragend', () => {
        this.dragFrom = null;
        this.savePos();
      });
    });
    this.root.sendToBack?.(handles[0]);
  }

  moveBy(dx) {
    const s = this.scene;
    const x = clampX(this.root.x + dx);
    if (x === this.root.x) return sfx('deny');
    sfx('tap');
    s.tweens.add({ targets: this.root, x, duration: 160, ease: 'Cubic.out', onComplete: () => this.savePos() });
  }

  savePos() {
    state.settings.phoneX = Math.round(this.root.x);
    saveSettings();
  }

  overPhone(pointer) {
    return pointer.x >= this.root.x && pointer.x <= this.root.x + PW && pointer.y >= this.root.y && pointer.y <= this.root.y + PH;
  }

  // ---------- Уведомления ----------

  onEvent(ev) {
    if (ev.type === 'changed') {
      this.scene.refreshPhoneBadge?.();
      if (this.open && ['home', 'messages', 'thread', 'quests', 'ritm', 'kadr', 'vibe', 'bank'].includes(this.page)) this.renderSoon();
      return;
    }
    if (ev.type === 'call') return this.ring(ev.from, ev.script);
    if (ev.type === 'notify') {
      sfx('buzz');
      sfx('notify', 0.05);
      this.showBanner(ev);
      this.scene.refreshPhoneBadge?.();
      if (this.open) this.renderSoon();
    }
  }

  renderSoon() {
    if (this.renderPending) return;
    this.renderPending = true;
    this.scene.time.delayedCall(30, () => {
      this.renderPending = false;
      if (this.open && !this.inCamera && this.page !== 'call') this.render();
    });
  }

  // Баннер не должен закрывать диалог, тетрадь, комп и сам телефон
  flushBanners() {
    const s = this.scene;
    if (!this.bannerQueue.length || s.notebook?.open || s.pc?.open || s.closeup || this.open) return;
    this.showBanner(this.bannerQueue.shift());
  }

  showBanner(ev) {
    const { app, title, text } = ev;
    const s = this.scene;
    if (s.notebook?.open || s.pc?.open || s.closeup || this.open) {
      // Сейчас некуда — покажем, когда закроется (не больше трёх в очереди)
      this.bannerQueue.push(ev);
      if (this.bannerQueue.length > 3) this.bannerQueue.shift();
      return;
    }
    const appDef = APPS.find((a) => a.id === app) || APPS[1];
    const b = this.banner;
    s.tweens.killTweensOf(b);
    b.removeAll(true);
    const w = 330;
    const x = 960 - w - 14;
    const bg = s.add.rectangle(x, 0, w, 58, 0x15151c, 0.96).setOrigin(0).setStrokeStyle(2, appDef.color, 0.9);
    const ic = s.add.rectangle(x + 12, 12, 34, 34, appDef.color).setOrigin(0);
    const t1 = s.add.text(x + 56, 9, String(title).slice(0, 30), { fontFamily: PIXEL, fontSize: '8px', color: hex(appDef.color) });
    const str = String(text);
    const t2 = s.add.text(x + 56, 26, str.length > 34 ? `${str.slice(0, 33)}…` : str, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' });
    b.add([bg, ic, t1, t2]);
    // Во время диалога (окно сверху) баннер выезжает под ним
    const top = s.dialogue?.active ? 34 + (s.dialogue.box?.height || 156) + 12 : 12;
    b.y = top - 82;
    b.setAlpha(1);
    // Вибрация: баннер дрожит
    s.tweens.add({
      targets: b, y: top, duration: 300, ease: 'Back.out',
      onComplete: () => s.tweens.add({ targets: b, x: { from: -3, to: 3 }, duration: 40, yoyo: true, repeat: 4, onComplete: () => (b.x = 0) }),
    });
    s.tweens.add({ targets: b, alpha: 0, delay: 3600, duration: 300, ease: 'Cubic.in' });
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (s.busy) return;
      if (app === 'messages' && ev.from) this.show('thread', ev.from);
      else if (app !== 'contacts') this.show(app);
    });
  }

  wait(ms) {
    return new Promise((r) => this.scene.time.delayedCall(ms, r));
  }
}

function dayName() {
  if (state.episode === 'ep2') return DAYS[state.time.day];
  if (state.episode === 'ep1') {
    const p = state.flags.e1 || '';
    if (p.startsWith('thu') || p === 'final' || p === 'outro') return 'ЧЕТВЕРГ';
    if (p.startsWith('wed')) return 'СРЕДА';
    return 'ВТОРНИК';
  }
  return 'ПОНЕДЕЛЬНИК';
}

// Где стоит телефон: по умолчанию справа; запоминается в настройках
export function phoneX() {
  const x = state.settings?.phoneX;
  return typeof x === 'number' ? clampX(x) : PX;
}

function clampX(x) {
  return Phaser.Math.Clamp(Math.round(x), 8, 960 - PW - 12);
}

function clamp01(v) {
  return Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
}

function cycle(list, cur, d) {
  const i = list.indexOf(cur);
  return list[(i + d + list.length) % list.length];
}

export function fmtNum(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// Применить настройки к звуку и озвучке
export function applySettings() {
  const st = state.settings;
  setVolumes({ music: st.music, sfx: st.sfx });
  voiceSettings.enabled = st.voice;
  voiceSettings.volume = st.voiceVol;
  phoneChanged();
}

