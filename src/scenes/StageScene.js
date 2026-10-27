import Phaser from 'phaser';
import { state, TAGS } from '../state.js';
import { BEAT, audioCtx, loadBuffer, playBuffer, sfx } from '../audio.js';
import { karaokeTimeline } from '../demos.js';

const FONT = '"PT Mono", monospace';
const PIXEL = '"Press Start 2P"';
const HIT_X = 480;
const LANE_Y = 470;
const WINDOW = 0.13;

// Выступление на сцене: караоке + ритм (жми в такт) + шкала толпы + события по сюжету.
// data: { mode: 'podval' | 'stream', back: { loc, spawnX } }
export class StageScene extends Phaser.Scene {
  constructor() {
    super('Stage');
  }

  create(data = {}) {
    this.mode = data.mode || 'podval';
    this.back = data.back || { loc: 'podval', spawnX: 800 };
    this.F = state.flags;
    this.picked = [];
    this.hype = this.startHype();
    this.phase = 'pick';
    this.ui = [];
    this.events.once('shutdown', () => this.cleanup());
    this.drawStage();
    this.input.keyboard.on('keydown', (ev) => this.onKey(ev));
    this.input.on('pointerdown', () => this.phase === 'play' && this.tap());
    this.cameras.main.fadeIn(500, 7, 6, 13);
    this.showPick();
  }

  startHype() {
    const F = this.F;
    let h = this.mode === 'stream' ? 35 : 40;
    if (F.stasLoud) h += 8;
    h += Math.min(10, (state.stats.look || 0) * 3);
    if (state.pulse >= 60) h += 5;
    if (state.pulse < 30) h -= 5;
    if (F.micType === 'toy') h -= 5;
    if (F.micType === 'new' || F.micType === 'shure') h += 3;
    if (state.energy < 30) h -= 6;
    return Phaser.Math.Clamp(h, 10, 70);
  }

  drawStage() {
    const g = this.add.graphics();
    g.fillStyle(0x0c0a16, 1).fillRect(0, 0, 960, 540);
    for (let y = 0; y < 300; y += 20) for (let x = (y / 20) % 2 ? 0 : 24; x < 960; x += 48) g.fillStyle(0x1a1420, 1).fillRect(x, y, 46, 18);
    const title = this.add.text(480, 70, this.mode === 'stream' ? '«ЗЕРНО» · LIVE' : 'ПОДВАЛ', { fontFamily: PIXEL, fontSize: '30px', color: '#ff3d8a' }).setOrigin(0.5);
    title.setShadow(0, 0, '#ff3d8a', 18, true, true);
    // Сцена и прожекторы
    g.fillStyle(0x2a2030, 1).fillRect(160, 300, 640, 30);
    g.fillStyle(0x1a1420, 1).fillRect(160, 330, 640, 40);
    this.beams = [];
    [240, 480, 720].forEach((x, i) => {
      const b = this.add.triangle(0, 0, x, 0, x - 120, 330, x + 120, 330, [0xff3d8a, 0xffd166, 0x3df0ff][i], 0.1).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
      this.beams.push(b);
      this.tweens.add({ targets: b, angle: { from: -4, to: 4 }, duration: 1600 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    // Марк у микрофона
    g.fillStyle(0x2a2a2a, 1).fillRect(504, 200, 5, 100);
    g.fillStyle(0x8a8a9a, 1).fillRect(500, 188, 12, 16);
    this.mark = this.add.sprite(470, 300, 'mark_0').setOrigin(0.5, 1).setScale(0.85);
    // Толпа: ряды голов, качаются в такт
    this.crowd = [];
    for (let row = 0; row < 3; row++) {
      for (let x = -20 + row * 18; x < 980; x += 38) {
        const c = this.add.ellipse(x + Math.random() * 10, 400 + row * 34, 34, 40, [0x15121f, 0x1e1a2e, 0x262036][row]);
        c.baseY = c.y;
        c.row = row;
        this.crowd.push(c);
      }
    }
    if (this.F.e2MomAtShow && this.mode === 'podval') {
      this.mom = this.add.sprite(860, 470, 'mom_0').setOrigin(0.5, 1).setScale(0.6).setTint(0x8a7aa0);
    }
    // Шкала толпы
    this.add.text(30, 22, this.mode === 'stream' ? 'ЗРИТЕЛИ' : 'ТОЛПА', { fontFamily: PIXEL, fontSize: '10px', color: '#ffd166' });
    this.add.rectangle(30, 40, 200, 14, 0x1a1530).setOrigin(0).setStrokeStyle(2, 0x3a3550);
    this.hypeBar = this.add.rectangle(32, 42, 1, 10, 0xffd166).setOrigin(0);
    this.hypeText = this.add.text(240, 38, '', { fontFamily: PIXEL, fontSize: '10px', color: '#ffffff' });
    this.setHype(this.hype);
  }

  setHype(v) {
    this.hype = Phaser.Math.Clamp(v, 0, 100);
    this.hypeBar.setSize(Math.max(1, 196 * (this.hype / 100)), 10);
    this.hypeBar.setFillStyle(this.hype >= 70 ? 0x8ae6a0 : this.hype >= 40 ? 0xffd166 : 0xff6b8a);
    this.hypeText.setText(this.mode === 'stream' ? `${Math.round(40 + this.hype * 3)} смотрят` : `${Math.round(this.hype)}%`);
  }

  clearUi() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
  }

  add2(o) {
    this.ui.push(o);
    return o;
  }

  // ---------- Выбор строчек ----------

  showPick() {
    this.clearUi();
    this.phase = 'pick';
    this.add2(this.add.rectangle(0, 0, 960, 540, 0x07060d, 0.85).setOrigin(0));
    this.add2(this.add.text(480, 40, 'ЧТО ЧИТАЕШЬ?', { fontFamily: PIXEL, fontSize: '22px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6 }).setOrigin(0.5));
    this.hint = this.add2(this.add.text(480, 80, 'Выбери 3 строчки (цифры или клик), потом Enter', { fontFamily: FONT, fontSize: '18px', color: '#c9c4ee' }).setOrigin(0.5));
    this.pool = state.lines.slice(-9);
    // Если строчек мало — подкидываем строчки Дэна
    const spare = [
      { id: 'dan_spare1', text: 'Из подвала в небо — это не мечта, а план', tag: 'dream' },
      { id: 'dan_spare2', text: 'Гараж вместо студии, мечты вместо денег', tag: 'dream' },
      { id: 'dan_spare3', text: 'Наш район не спит, он просто ждёт', tag: 'street' },
    ];
    while (this.pool.length < 3) this.pool.push(spare[this.pool.length]);
    this.cards = this.pool.map((l, i) => {
      const y = 120 + i * 44;
      const color = Phaser.Display.Color.HexStringToColor(TAGS[l.tag].color).color;
      const bg = this.add2(this.add.rectangle(130, y, 700, 38, 0x1a1530).setOrigin(0).setStrokeStyle(2, color, 0.5));
      this.add2(this.add.text(146, y + 19, `${i + 1}. «${l.text}»`, { fontFamily: FONT, fontSize: '17px', color: '#f2f0ff', fontStyle: 'italic' }).setOrigin(0, 0.5));
      const card = { l, bg, color, on: false };
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggle(card));
      return card;
    });
    this.goBtn = this.add2(this.add.text(480, 510, 'НА СЦЕНУ (Enter)', { fontFamily: PIXEL, fontSize: '14px', color: '#0c0a16', backgroundColor: '#ff3d3d', padding: { x: 16, y: 10 } }).setOrigin(0.5).setAlpha(0.3));
    this.goBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.ready());
  }

  toggle(card) {
    if (!card.on && this.picked.length >= 3) return sfx('deny');
    card.on = !card.on;
    sfx(card.on ? 'select' : 'click');
    if (card.on) this.picked.push(card.l);
    else this.picked = this.picked.filter((l) => l !== card.l);
    card.bg.setFillStyle(card.on ? 0x3a1f45 : 0x1a1530).setStrokeStyle(card.on ? 3 : 2, card.on ? 0xffd166 : card.color, card.on ? 1 : 0.5);
    this.hint.setText(this.picked.length < 3 ? `Ещё ${3 - this.picked.length}` : 'Готово! Enter — на сцену');
    this.goBtn.setAlpha(this.picked.length === 3 ? 1 : 0.3);
  }

  ready() {
    if (this.phase !== 'pick' || this.picked.length < 3) return;
    this.clearUi();
    this.phase = 'intro';
    this.add2(this.add.rectangle(0, 0, 960, 540, 0x07060d, 0.75).setOrigin(0));
    this.add2(this.add.text(480, 200, 'Жми ПРОБЕЛ (или тапай), когда кружок\nдоходит до линии — в такт бита.\nЧитай строчки вслух — с микрофоном толпа заводится сильнее.', {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5));
    const opts = [
      { label: '1. С МИКРОФОНОМ', color: '#ff3d3d', mic: true },
      { label: '2. БЕЗ МИКРОФОНА', color: '#c9c4ee', mic: false },
    ];
    opts.forEach((o, i) => {
      const b = this.add2(this.add.text(330 + i * 300, 360, o.label, { fontFamily: PIXEL, fontSize: '13px', color: '#0c0a16', backgroundColor: o.color, padding: { x: 14, y: 12 } }).setOrigin(0.5));
      b.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.start(o.mic));
    });
  }

  async getMic() {
    try {
      const clean = !!state.settings.headphones;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: !clean, noiseSuppression: !clean, autoGainControl: !clean } });
      const src = audioCtx().createMediaStreamSource(this.stream);
      this.analyser = audioCtx().createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      this.buf = new Float32Array(1024);
      return true;
    } catch (e) {
      return false;
    }
  }

  level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let s = 0;
    for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
    return Math.sqrt(s / this.buf.length);
  }

  // ---------- Выступление ----------

  async start(withMic) {
    if (this.phase !== 'intro') return;
    this.phase = 'starting';
    this.clearUi();
    if (withMic) await this.getMic();
    const beat = await loadBuffer(BEAT.url);
    const ctx = audioCtx();
    this.tl = karaokeTimeline(this.picked);
    this.t0 = ctx.currentTime + 0.4;
    if (beat) this.music = playBuffer(beat, { offset: this.tl.beatFrom, when: this.t0, volume: 0.85 });
    // Ритм: метка на каждую вторую долю после отсчёта
    const beatLen = 60 / BEAT.bpm;
    this.notes = [];
    for (let t = this.tl.countIn; t < this.tl.length - beatLen; t += beatLen * 2) this.notes.push({ t, state: 'wait' });
    this.events2 = this.plotEvents();
    this.buildPlayUi();
    this.phase = 'play';
  }

  plotEvents() {
    const F = this.F;
    const L = this.tl.length;
    const list = [];
    if (this.mode === 'podval' && (F.rayOffended || F.e2StudioFight === 'ray' || F.exposedRey || F.quitRay)) list.push({ at: L * 0.45, kind: 'heckle' });
    if (this.mode === 'podval' && F.e2MomAtShow) list.push({ at: L * 0.25, kind: 'mom' });
    if (F.acidNow) list.push({ at: L * 0.6, kind: 'acid' });
    if (this.mode === 'stream') list.push({ at: L * 0.5, kind: 'donate' });
    return list;
  }

  buildPlayUi() {
    const style = { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#4a4560' };
    this.lineBase = this.add2(this.add.text(480, 130, '', style).setOrigin(0.5));
    this.lineHi = this.add2(this.add.text(480, 130, '', { ...style, color: '#ffd166' }).setOrigin(0.5));
    this.countText = this.add2(this.add.text(480, 200, '', { fontFamily: PIXEL, fontSize: '40px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 8 }).setOrigin(0.5));
    // Дорожка ритма внизу
    this.add2(this.add.rectangle(0, LANE_Y - 22, 960, 44, 0x000000, 0.55).setOrigin(0));
    this.hitRing = this.add2(this.add.circle(HIT_X, LANE_Y, 18).setStrokeStyle(4, 0xffd166));
    this.noteDots = this.notes.map(() => this.add2(this.add.circle(-50, LANE_Y, 12, 0xff3d8a).setVisible(false)));
    this.judge = this.add2(this.add.text(480, LANE_Y - 50, '', { fontFamily: PIXEL, fontSize: '14px', color: '#8ae6a0' }).setOrigin(0.5));
    this.cur = null;
  }

  tap() {
    if (this.phase !== 'play') return;
    if (this.qte) return this.qteTap();
    const t = audioCtx().currentTime - this.t0;
    const n = this.notes.find((x) => x.state === 'wait' && Math.abs(x.t - t) <= WINDOW);
    this.mark.setScale(0.88, 0.82);
    this.tweens.add({ targets: this.mark, scaleX: 0.85, scaleY: 0.85, duration: 120 });
    if (!n) {
      this.setHype(this.hype - 0.6);
      return;
    }
    n.state = 'hit';
    const perfect = Math.abs(n.t - t) < WINDOW / 2;
    this.setHype(this.hype + (perfect ? 2.6 : 1.6));
    sfx('tick');
    this.showJudge(perfect ? 'ТОЧНО!' : 'ОК', perfect ? '#8ae6a0' : '#ffd166');
  }

  showJudge(text, color) {
    this.judge.setText(text).setColor(color).setScale(1.3).setAlpha(1);
    this.tweens.killTweensOf(this.judge);
    this.tweens.add({ targets: this.judge, scale: 1, alpha: 0, duration: 500 });
  }

  // Событие: Рей кричит «ПАЙКА!» — ответить фристайлом (4 точных нажатия подряд) или промолчать
  async heckle() {
    this.paused = true;
    const box = this.add2(this.add.rectangle(480, 270, 620, 150, 0x0c0a16, 0.95).setStrokeStyle(3, 0xe8c27a));
    const t1 = this.add2(this.add.text(480, 225, 'РЕЙ ИЗ ЗАЛА: «ПАЙКА-А-А!»', { fontFamily: PIXEL, fontSize: '14px', color: '#e8c27a' }).setOrigin(0.5));
    const t2 = this.add2(this.add.text(480, 275, '1 — ответить фристайлом (4 точных в такт)\n2 — не обращать внимания', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', align: 'center' }).setOrigin(0.5));
    sfx('boo');
    const c = await new Promise((resolve) => {
      this.choiceCb = resolve;
      this.time.delayedCall(3500, () => this.choiceCb && resolve(1));
    });
    this.choiceCb = null;
    [box, t1, t2].forEach((o) => o.destroy());
    this.paused = false;
    if (c === 1) {
      this.setHype(this.hype - 6);
      this.showJudge('ПРОМОЛЧАЛ', '#c9c4ee');
      this.F.e2Heckle = 'ignored';
      return;
    }
    this.qte = { need: 4, got: 0, misses: 0 };
    this.showJudge('ФРИСТАЙЛ!', '#ff3d8a');
  }

  qteTap() {
    const t = audioCtx().currentTime - this.t0;
    const beatLen = 60 / BEAT.bpm;
    const off = Math.abs(((t + beatLen / 2) % beatLen) - beatLen / 2);
    if (off < 0.09) {
      this.qte.got++;
      sfx('tickHi');
      this.showJudge(`${this.qte.got}/4`, '#8ae6a0');
    } else {
      this.qte.misses++;
      this.showJudge('МИМО', '#ff6b8a');
    }
    if (this.qte.got >= 4) {
      this.qte = null;
      this.setHype(this.hype + 15);
      this.F.e2Heckle = 'won';
      sfx('cheer');
      this.cameras.main.flash(200, 255, 61, 138);
    } else if (this.qte.misses >= 3) {
      this.qte = null;
      this.setHype(this.hype - 10);
      this.F.e2Heckle = 'lost';
      sfx('boo');
    }
  }

  onKey(ev) {
    const n = parseInt(ev.key, 10);
    if (this.phase === 'pick') {
      if (n >= 1 && n <= this.cards.length) this.toggle(this.cards[n - 1]);
      if (ev.key === 'Enter') this.ready();
      return;
    }
    if (this.phase === 'intro') {
      if (n === 1) this.start(true);
      if (n === 2) this.start(false);
      return;
    }
    if (this.choiceCb && (n === 1 || n === 2)) return this.choiceCb(n - 1);
    if (this.phase === 'play' && [' ', 'e', 'у', 'Enter'].includes(ev.key)) this.tap();
    if (this.phase === 'result' && ['Enter', ' ', 'e', 'у'].includes(ev.key)) this.finish();
  }

  update(time) {
    const beat = (time / (60000 / BEAT.bpm)) % 1;
    this.crowd.forEach((c, i) => {
      const k = this.phase === 'play' ? this.hype / 100 : 0.15;
      c.y = c.baseY - Math.max(0, Math.sin((beat + i * 0.13) * Math.PI * 2)) * 10 * k * (3 - c.row);
    });
    if (this.phase !== 'play' || this.paused) return;
    const ctx = audioCtx();
    const t = ctx.currentTime - this.t0;
    const tl = this.tl;
    // Отсчёт
    const beatLen = 60 / BEAT.bpm;
    if (t < tl.countIn) {
      const b = Math.floor(Math.max(0, t) / beatLen);
      this.countText.setText(b >= 4 ? String(8 - b) : 'ГОТОВЬСЯ');
    } else if (this.countText.text) this.countText.setText('');
    // Строка караоке
    const item = tl.items.find((it) => t >= it.start && t < it.end);
    if (item !== this.cur) {
      this.cur = item;
      this.lineBase.setText(item ? item.text : '');
      this.lineHi.setText(item ? item.text : '');
      [this.lineBase, this.lineHi].forEach((o) => {
        o.setFontSize(28);
        while (o.width > 900) o.setFontSize(o.style.fontSize.replace('px', '') - 2);
      });
    }
    if (item) {
      const k = Phaser.Math.Clamp((t - item.start) / ((item.end - item.start) * 0.85), 0, 1);
      this.lineHi.setCrop(0, 0, this.lineHi.width * k, this.lineHi.height);
      // Голос заводит толпу
      if (this.level() > 0.03) this.setHype(this.hype + 0.08);
    }
    // Метки ритма едут к линии
    this.notes.forEach((n, i) => {
      const dot = this.noteDots[i];
      const dt = n.t - t;
      if (n.state === 'wait' && dt < -WINDOW) {
        n.state = 'miss';
        this.setHype(this.hype - 1.6);
        this.showJudge('МИМО', '#ff6b8a');
      }
      const visible = n.state === 'wait' && dt < 2.2;
      dot.setVisible(visible);
      if (visible) dot.x = HIT_X + dt * 300;
    });
    this.hitRing.setScale(1 + Math.max(0, 0.25 - ((t / beatLen) % 1) * 0.5));
    // Сюжетные события
    for (const ev of this.events2) {
      if (ev.done || t < ev.at) continue;
      ev.done = true;
      if (ev.kind === 'heckle') this.heckle();
      if (ev.kind === 'mom') {
        this.setHype(this.hype + 5);
        this.showJudge('МАМА В ЗАЛЕ', '#ffb38a');
        if (this.mom) this.tweens.add({ targets: this.mom, y: 460, duration: 300, yoyo: true, repeat: 2 });
      }
      if (ev.kind === 'acid') {
        const swing = Math.random() < 0.5 ? -12 : 12;
        this.setHype(this.hype + swing);
        this.showJudge(swing > 0 ? 'ПОТОК!' : 'ПЛЫВЁШЬ…', swing > 0 ? '#3df0ff' : '#ff6b8a');
        this.cameras.main.shake(400, 0.006);
      }
      if (ev.kind === 'donate') {
        this.setHype(this.hype + 6);
        this.showJudge('ДОНАТ 300 ₽!', '#8ae6a0');
        state.cash += 300;
      }
    }
    if (this.F.acidNow) this.beams.forEach((b, i) => b.setFillStyle(Phaser.Display.Color.HSVToRGB(((t * 0.2 + i * 0.3) % 1), 0.8, 1).color, 0.14));
    if (t >= tl.length) this.result();
  }

  result() {
    this.phase = 'result';
    this.music?.stop(0.4);
    this.stopMic();
    const h = this.hype;
    const res = h >= 70 ? ['fire', 'РАЗЪЕБ', '#8ae6a0'] : h >= 40 ? ['ok', 'НОРМ', '#ffd166'] : ['fail', 'ПРОВАЛ', '#ff6b8a'];
    this.res = res[0];
    this.clearUi();
    this.add2(this.add.rectangle(0, 0, 960, 540, 0x07060d, 0.7).setOrigin(0));
    const v = this.add2(this.add.text(480, 220, res[1], { fontFamily: PIXEL, fontSize: '52px', color: res[2], stroke: '#0c0a16', strokeThickness: 10 }).setOrigin(0.5).setScale(0));
    this.tweens.add({ targets: v, scale: 1, duration: 500, ease: 'Back.out' });
    this.add2(this.add.text(480, 300, `${this.mode === 'stream' ? 'Зрители' : 'Толпа'}: ${Math.round(h)}%`, { fontFamily: FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5));
    this.add2(this.add.text(480, 480, '[ Enter — дальше ]', { fontFamily: FONT, fontSize: '16px', color: '#77729a' }).setOrigin(0.5));
    sfx(res[0] === 'fail' ? 'boo' : 'cheer');
    if (res[0] !== 'fail') sfx('clap', 0.3);
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    const F = this.F;
    if (this.mode === 'stream') F.e2StreamResult = this.res;
    else F.podvalResult = this.res;
    F.e2StageLines = this.picked.map((l) => l.id);
    state.tracks.push({ title: this.mode === 'stream' ? 'Стрим из «Зерна» (live)' : '«Подвал» (live)', theme: 'mixed', lines: this.picked.map((l) => ({ ...l })), voice: false, score: Math.round(this.hype) });
    this.cameras.main.fadeOut(500, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', this.back));
  }

  stopMic() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }

  cleanup() {
    this.music?.stop(0.2);
    this.stopMic();
  }
}
