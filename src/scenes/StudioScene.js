import Phaser from 'phaser';
import { addActor, play as actorPlay } from '../gfx/actors.js';
import { paintBooth } from '../gfx/places/scenes.js';
import { state, TAGS, addLine } from '../state.js';
import { BEAT, audioCtx, loadBuffer, playBuffer, playMusic, stopMusic, sfx } from '../audio.js';
import { karaokeTimeline, saveDemo, playDemo } from '../demos.js';
import { startCapture, encodeWav, processVoice } from '../studio/fx.js';

const AUTOTUNE = { off: 'выкл', light: 'лёгкий', hard: 'жёсткий' };

const PICK = 3;
const VOICE_LEVEL = 0.03; // громкость, выше которой считаем, что игрок читает

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

const FONT = '"PT Mono", monospace';
const PIXEL = '"Press Start 2P"';

// Будка звукозаписи: выбор строчек → караоке-запись под бит → прослушивание и сохранение на комп Дэна
export class StudioScene extends Phaser.Scene {
  constructor() {
    super('Studio');
  }

  create(data = {}) {
    // mode: 'prologue' — первый трек; 'rehearsal' — репетиция в финале Эпизода 1; 'track' — трек в Эпизоде 2;
    // 'jingle' — готовые строчки (data.lines), без выбора из тетради
    this.mode = data.mode || 'prologue';
    this.fixedLines = data.lines || null;
    this.need = this.fixedLines ? this.fixedLines.length : PICK;
    this.back = data.back || { loc: 'garage', spawnX: 780 };
    this.trackTitle = data.title || null;
    this.autotune = state.settings.autotune || 'off';
    this.picked = [];
    // Подстраховка: если строчек меньше трёх (часть продана Рею) — Дэн подкидывает свои
    const spare = [
      { id: 'dan_spare1', text: 'Из подвала в небо — это не мечта, а план', tag: 'dream' },
      { id: 'dan_spare2', text: 'Гараж вместо студии, мечты вместо денег', tag: 'dream' },
      { id: 'dan_spare3', text: 'Наш район не спит, он просто ждёт', tag: 'street' },
    ];
    for (const l of spare) if (state.lines.length < 3) addLine(l);
    if (data.acid) this.startAcid();
    this.phase = 'pick';
    this.ui = [];
    this.cameras.main.fadeIn(400, 7, 6, 13);
    this.drawBooth();
    // Пока выбираем строчки, бит играет приглушённо — «из-за стенки»
    playMusic(BEAT.url, { offset: BEAT.drop, loop: true, loopStart: BEAT.drop, volume: 0.6, muffled: true });
    this.input.keyboard.on('keydown', (ev) => this.onKey(ev));
    this.events.once('shutdown', () => this.cleanup());
    if (this.fixedLines) {
      this.picked = this.fixedLines.map((l) => ({ ...l }));
      this.showSetup(true);
    } else this.showPick();
  }

  drawBooth() {
    // Будка: поролон, окно в аппаратную, Марк в наушниках у микрофона
    this.add.image(0, 0, paintBooth(this)).setOrigin(0).setScale(2);
    this.markActor = addActor(this, 150, 520, 'mark', { scale: 1.1 });
    actorPlay(this.markActor, 'mic');
    const st = this.add.graphics();
    st.fillStyle(0x2a2a2a, 1).fillRect(214, 330, 4, 190).fillRect(196, 516, 40, 4).fillRect(214, 330, 22, 4);
    st.fillStyle(0x8a8a9a, 1).fillRect(230, 312, 14, 26);
    this.bars = [];
    for (let i = 0; i < 48; i++) {
      this.bars.push(this.add.rectangle(10 + i * 20, 540, 14, 40, i % 2 ? 0xff3d8a : 0x3df0ff, 0.15).setOrigin(0, 1));
    }
  }

  clearUi() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
    this.buttons = [];
  }

  add2(o) {
    // Интерфейс — поверх будки (стойка микрофона, Марк, эквалайзер)
    o.setDepth?.(50);
    this.ui.push(o);
    return o;
  }

  title(text, sub) {
    this.add2(this.add.text(480, 40, text, { fontFamily: PIXEL, fontSize: '24px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6 }).setOrigin(0.5));
    if (sub) {
      this.hint = this.add2(this.add.text(480, 84, sub, { fontFamily: FONT, fontSize: '20px', color: '#c9c4ee', align: 'center' }).setOrigin(0.5));
      // Подложка, чтобы неон будки не лез в текст
      const bg = this.add2(this.add.rectangle(480, 84, this.hint.width + 28, this.hint.height + 10, 0x0c0a16, 0.72));
      bg.setDepth(49);
    }
  }

  // Кнопки внизу экрана. items: [{ label, color, onClick }]
  buttonsRow(items, y = 490) {
    this.buttons = items.map((it, i) => {
      const gap = items.length > 3 ? 228 : 300;
      const x = 480 + (i - (items.length - 1) / 2) * gap;
      const b = this.add2(this.add.text(x, y, `${i + 1}. ${it.label}`, {
        fontFamily: PIXEL, fontSize: items.length > 3 ? '11px' : '13px', color: '#0c0a16', backgroundColor: it.color || '#ffd166', padding: { x: items.length > 3 ? 10 : 14, y: 12 },
      }).setOrigin(0.5));
      b.setInteractive({ useHandCursor: true }).on('pointerdown', () => it.onClick());
      b.on('pointerover', () => b.setScale(1.05)).on('pointerout', () => b.setScale(1));
      return { b, ...it };
    });
  }

  onKey(ev) {
    const n = parseInt(ev.key, 10);
    if (this.phase === 'pick') {
      if (n >= 1 && n <= this.cards.length) this.toggle(this.cards[n - 1]);
      if (ev.key === 'Enter') this.showSetup();
      return;
    }
    if (this.buttons?.length && n >= 1 && n <= this.buttons.length) this.buttons[n - 1].onClick();
    if ((ev.key === 'a' || ev.key === 'ф') && (this.phase === 'setup' || this.phase === 'result')) this.cycleAutotune();
    if ((ev.key === 'h' || ev.key === 'р') && this.phase === 'setup') this.toggleHeadphones();
  }

  cycleAutotune() {
    const order = ['off', 'light', 'hard'];
    this.autotune = order[(order.indexOf(this.autotune) + 1) % 3];
    state.settings.autotune = this.autotune;
    sfx('click');
    if (this.phase === 'result' && this.raw) return this.remix();
    if (this.phase === 'setup') this.showSetup(true);
  }

  toggleHeadphones() {
    state.settings.headphones = !state.settings.headphones;
    // Другие настройки звука — заново спрашиваем микрофон
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    sfx('click');
    this.showSetup(true);
  }

  // Строка настроек студии: наушники и автотюн (кликабельные)
  studioOptions(y) {
    const hp = state.settings.headphones;
    const a = this.add2(this.add.text(300, y, `[H] Наушники: ${hp ? 'да — чистый студийный звук' : 'нет — с подавлением эха'}`, {
      fontFamily: FONT, fontSize: '16px', color: hp ? '#8ae6a0' : '#ffd166',
    }).setOrigin(0.5));
    const b = this.add2(this.add.text(700, y, `[A] Автотюн: ${AUTOTUNE[this.autotune]}`, {
      fontFamily: FONT, fontSize: '16px', color: this.autotune === 'off' ? '#c9c4ee' : '#ff3d8a',
    }).setOrigin(0.5));
    a.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.phase === 'setup' && this.toggleHeadphones());
    b.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cycleAutotune());
  }

  // ---------- 1. Выбор строчек ----------

  showPick() {
    this.clearUi();
    this.phase = 'pick';
    this.title(this.mode === 'rehearsal' ? 'РЕПЕТИЦИЯ' : 'ПИШЕМ ТРЕК', `Выбери ${PICK} строчки из тетради`);
    // На экран влезает 12 карточек — берём последние собранные
    this.pool = state.lines.slice(-12);
    this.cards = this.pool.map((l, i) => this.makeCard(l, i));
    this.recBtn = this.add2(this.add.text(480, 500, 'К МИКРОФОНУ ▶', {
      fontFamily: PIXEL, fontSize: '16px', color: '#0c0a16', backgroundColor: '#ff3d3d', padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setAlpha(0.3));
    this.recBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showSetup());
  }

  makeCard(line, i) {
    const cols = this.pool.length > 6 ? 2 : 1;
    const col = cols === 2 ? i % 2 : 0;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const w = cols === 2 ? 430 : 700;
    const x = cols === 2 ? 40 + col * 450 : 130;
    const y = 116 + row * 56;
    const color = Phaser.Display.Color.HexStringToColor(TAGS[line.tag].color).color;

    const bg = this.add2(this.add.rectangle(x, y, w, 48, 0x1a1530).setOrigin(0).setStrokeStyle(2, color, 0.5));
    this.add2(this.add.rectangle(x, y, 8, 48, color).setOrigin(0));
    this.add2(this.add.text(x + 20, y + 24, `${i + 1}. «${line.text}»`, {
      fontFamily: FONT, fontSize: cols === 2 ? '15px' : '19px', color: '#f2f0ff', fontStyle: 'italic', wordWrap: { width: w - 110 },
    }).setOrigin(0, 0.5));
    this.add2(this.add.text(x + w - 10, y + 24, TAGS[line.tag].name, { fontFamily: PIXEL, fontSize: '9px', color: TAGS[line.tag].color }).setOrigin(1, 0.5));
    const card = { line, bg, color, on: false };
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggle(card));
    return card;
  }

  toggle(card) {
    if (!card.on && this.picked.length >= PICK) return sfx('deny');
    card.on = !card.on;
    sfx(card.on ? 'select' : 'click');
    if (card.on) this.picked.push(card.line);
    else this.picked = this.picked.filter((l) => l !== card.line);
    card.bg.setFillStyle(card.on ? 0x3a1f45 : 0x1a1530);
    card.bg.setStrokeStyle(card.on ? 3 : 2, card.on ? 0xffd166 : card.color, card.on ? 1 : 0.5);
    if (card.on) this.tweens.add({ targets: card.bg, scaleX: 1.02, duration: 80, yoyo: true });
    const left = PICK - this.picked.length;
    this.hint.setText(left ? `Ещё ${left}` : 'Готово! Жми «К микрофону» (Enter)');
    this.recBtn.setAlpha(left ? 0.3 : 1);
  }

  // ---------- 2. Подготовка: микрофон ----------

  showSetup(refresh = false) {
    if (!refresh && (this.phase !== 'pick' || this.picked.length < this.need)) return;
    if (!refresh) sfx('select');
    this.phase = 'setup';
    this.clearUi();
    this.title(this.mode === 'jingle' ? 'ДЖИНГЛ «ШАУРМА 24»' : 'К МИКРОФОНУ', 'Сейчас ты зачитаешь эти строчки под бит Дэна — по-настоящему, своим голосом.\nСтрочки будут подсвечиваться, как в караоке.');
    const step = this.picked.length > 3 ? 34 : 44;
    this.picked.forEach((l, i) => {
      this.add2(this.add.text(480, 166 + i * step, `«${l.text}»`, { fontFamily: FONT, fontSize: this.picked.length > 3 ? '18px' : '21px', color: TAGS[l.tag].color, fontStyle: 'italic' }).setOrigin(0.5));
    });
    this.add2(this.add.text(480, 316, 'Сначала отсчёт — 2 такта. Каждая строчка звучит 2 такта, весь куплет — два круга.', {
      fontFamily: FONT, fontSize: '15px', color: '#77729a',
    }).setOrigin(0.5));
    this.studioOptions(356);
    this.add2(this.add.text(480, 392, 'В наушниках звук пишется без эхо- и шумоподавления: компрессор, эквалайзер, реверб и дилей — потом, как в студии.', {
      fontFamily: FONT, fontSize: '13px', color: '#5a5570', align: 'center', wordWrap: { width: 860 },
    }).setOrigin(0.5));
    this.testMeter = null;
    this.buttonsRow([
      { label: 'ЗАПИСЬ', color: '#ff3d3d', onClick: () => this.startRecording(true) },
      { label: 'БЕЗ ГОЛОСА', color: '#c9c4ee', onClick: () => this.startRecording(false) },
      { label: 'ТЕСТ МИКРО', color: '#3df0ff', onClick: () => this.micTest() },
      { label: 'НАЗАД', color: '#77729a', onClick: () => this.backToPick() },
    ]);
  }

  // Тест микрофона: 3 секунды голоса — и сразу слышно, как он звучит после обработки
  async micTest() {
    if (this.phase !== 'setup' || this.testing) return;
    this.testing = true;
    sfx('click');
    const ok = this.stream ? true : await this.getMic();
    if (!ok) {
      this.testing = false;
      sfx('deny');
      return this.hint?.setText('Микрофон недоступен. Можно записать без голоса.');
    }
    const ctx = audioCtx();
    const label = this.add2(this.add.text(480, 440, 'Скажи что-нибудь… 3', { fontFamily: PIXEL, fontSize: '14px', color: '#3df0ff' }).setOrigin(0.5));
    const cap = startCapture(ctx, this.stream);
    for (const n of [2, 1]) {
      await new Promise((r) => this.time.delayedCall(1000, r));
      label.active && label.setText(`Скажи что-нибудь… ${n}`);
    }
    await new Promise((r) => this.time.delayedCall(1000, r));
    const { data, sampleRate } = cap.stop();
    label.active && label.setText('Сведение…');
    const processed = await processVoice(data, sampleRate, { autotune: this.autotune });
    if (!label.active) return (this.testing = false);
    label.setText('▶ Так звучит твой голос в студии');
    const buf = ctx.createBuffer(1, processed.length, sampleRate);
    buf.copyToChannel(processed, 0);
    playBuffer(buf, { volume: 1.3 });
    this.time.delayedCall(buf.duration * 1000 + 300, () => {
      label.active && label.destroy();
      this.testing = false;
    });
  }

  backToPick() {
    sfx('click');
    // Готовые строчки (джингл) — «Назад» выходит из студии, задание остаётся
    if (this.fixedLines) return this.leave();
    this.picked = [];
    this.showPick();
  }

  leave() {
    this.phase = 'saving';
    this.cameras.main.fadeOut(400, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', this.back));
  }

  async getMic() {
    try {
      // В наушниках эхо нет — пишем голос как есть, без «телефонной» обработки браузера
      const clean = !!state.settings.headphones;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: !clean, noiseSuppression: !clean, autoGainControl: !clean, channelCount: 1 },
      });
      const ctx = audioCtx();
      const src = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      this.levelBuf = new Float32Array(this.analyser.fftSize);
      return true;
    } catch (e) {
      return false;
    }
  }

  micLevel() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] * this.levelBuf[i];
    return Math.sqrt(sum / this.levelBuf.length);
  }

  // ---------- 3. Запись ----------

  async startRecording(withMic) {
    if (this.phase !== 'setup' && this.phase !== 'result') return;
    this.phase = 'starting';
    this.clearUi();
    stopMusic(0.3);
    this.previewStop();

    let micOk = false;
    if (withMic) {
      this.add2(this.add.text(480, 270, 'Разреши доступ к микрофону...', { fontFamily: FONT, fontSize: '22px', color: '#c9c4ee' }).setOrigin(0.5));
      micOk = this.stream ? true : await this.getMic();
      this.clearUi();
      if (!micOk) {
        sfx('deny');
        this.add2(this.add.text(480, 270, 'Микрофон недоступен — пишем без голоса.\nСтрочки всё равно будут подсвечиваться.', {
          fontFamily: FONT, fontSize: '22px', color: '#ff6b8a', align: 'center',
        }).setOrigin(0.5));
        await new Promise((r) => this.time.delayedCall(1800, r));
        this.clearUi();
      }
    }

    const beat = await loadBuffer(BEAT.url);
    if (!beat) return this.showPick();
    const ctx = audioCtx();
    this.tl = karaokeTimeline(this.picked);
    this.voiced = 0;
    this.lineFrames = 0;
    this.blob = null;
    this.rawBlob = null;
    this.voiceAt = 0;

    // Запуск записи и бита — голос потом ляжет на бит по разнице времени
    this.raw = null;
    this.processed = null;
    this.recorder = micOk ? startCapture(ctx, this.stream) : null;
    this.t0 = ctx.currentTime + 0.3;
    this.beat = playBuffer(beat, { offset: this.tl.beatFrom, when: this.t0, volume: 0.8 });

    this.buildKaraokeUi(!!this.recorder);
    this.phase = 'rec';
    this.lastBeat = -1;
  }

  buildKaraokeUi(withMic) {
    this.rec = this.add2(this.add.text(40, 30, withMic ? '● REC' : '○ БЕЗ ГОЛОСА', { fontFamily: PIXEL, fontSize: '16px', color: withMic ? '#ff3d3d' : '#77729a' }));
    if (withMic) this.tweens.add({ targets: this.rec, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    this.add2(this.add.text(920, 30, `«${TITLES[trackTheme(this.picked)]}»`, { fontFamily: PIXEL, fontSize: '12px', color: '#ffd166' }).setOrigin(1, 0));
    this.count = this.add2(this.add.text(480, 230, '', { fontFamily: PIXEL, fontSize: '64px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 10 }).setOrigin(0.5));

    // Строка караоке: тусклая подложка + яркая копия, которая «заливается» слева направо
    const style = { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#4a4560' };
    this.lineBase = this.add2(this.add.text(480, 240, '', style).setOrigin(0.5));
    this.lineHi = this.add2(this.add.text(480, 240, '', { ...style, color: '#ffd166' }).setOrigin(0.5));
    this.lineNext = this.add2(this.add.text(480, 300, '', { fontFamily: FONT, fontSize: '20px', color: '#5a5570' }).setOrigin(0.5));
    this.curItem = null;

    // Индикатор громкости голоса
    this.meterBg = this.add2(this.add.rectangle(920, 420, 18, 200, 0x1a1530).setOrigin(0.5, 1).setStrokeStyle(2, 0x3a3550));
    this.meter = this.add2(this.add.rectangle(920, 420, 14, 0, 0x3df0ff).setOrigin(0.5, 1));
    this.add2(this.add.text(920, 440, 'ГОЛОС', { fontFamily: PIXEL, fontSize: '8px', color: '#77729a' }).setOrigin(0.5));
    this.progBg = this.add2(this.add.rectangle(80, 440, 760, 6, 0x1a1530).setOrigin(0));
    this.prog = this.add2(this.add.rectangle(80, 440, 1, 6, 0xff3d8a).setOrigin(0));
    this.add2(this.add.text(480, 470, 'Читай в такт — строчка заливается золотом', { fontFamily: FONT, fontSize: '15px', color: '#5a5570' }).setOrigin(0.5));
  }

  setLine(item, next) {
    this.curItem = item;
    const fit = (t, size) => {
      t.setFontSize(size);
      while (t.width > 880 && size > 16) t.setFontSize((size -= 2));
    };
    this.lineBase.setText(item ? item.text : '');
    this.lineHi.setText(item ? item.text : '');
    fit(this.lineBase, 30);
    fit(this.lineHi, 30);
    if (item) this.lineHi.setShadow(0, 0, TAGS[item.tag].color, 16, true, true);
    this.lineNext.setText(next ? `дальше: ${next.text}` : '');
    if (item) {
      this.lineBase.setScale(1.08);
      this.tweens.add({ targets: [this.lineBase, this.lineHi], scale: 1, duration: 180 });
    }
  }

  updateRecording() {
    const ctx = audioCtx();
    const t = ctx.currentTime - this.t0;
    const tl = this.tl;
    const beatLen = 60 / BEAT.bpm;
    const level = this.micLevel();

    // Отсчёт: «приготовься», потом 4-3-2-1 на последнем такте
    if (t < tl.countIn) {
      const b = Math.floor(Math.max(0, t) / beatLen);
      if (b !== this.lastBeat && t >= 0) {
        this.lastBeat = b;
        if (b >= 4) {
          this.count.setText(String(8 - b)).setFontSize(64).setScale(1.4);
          this.tweens.add({ targets: this.count, scale: 1, duration: 200 });
          sfx(b === 7 ? 'tickHi' : 'tick');
        } else if (b === 0) {
          this.count.setText('ПРИГОТОВЬСЯ').setFontSize(28);
        }
      }
    } else if (this.count.text) {
      this.count.setText('').setFontSize(64);
    }

    const idx = tl.items.findIndex((it) => t >= it.start && t < it.end);
    const item = tl.items[idx];
    if (item !== this.curItem) this.setLine(item, tl.items[idx + 1]);
    if (item) {
      // Заливка строки за 85% её времени — последние доли для вдоха
      const k = Phaser.Math.Clamp((t - item.start) / ((item.end - item.start) * 0.85), 0, 1);
      this.lineHi.setCrop(0, 0, this.lineHi.width * k, this.lineHi.height);
      this.lineFrames++;
      if (level > VOICE_LEVEL) this.voiced++;
    }

    // Голос — на индикаторе и искрами
    this.meter.setSize(14, Phaser.Math.Clamp(level * 1400, 0, 200));
    this.meter.setFillStyle(level > VOICE_LEVEL ? 0x3df0ff : 0x3a3550);
    if (level > VOICE_LEVEL * 2 && Math.random() < 0.3) {
      const sp = this.add.image(920, 420 - this.meter.height, 'spark').setTint(0x3df0ff).setScale(1.5);
      this.tweens.add({ targets: sp, x: 920 + Phaser.Math.Between(-40, 10), y: sp.y - 60, alpha: 0, duration: 500, onComplete: () => sp.destroy() });
    }

    // Пульс на каждую долю после отсчёта
    const beatIdx = Math.floor(t / beatLen);
    if (t > tl.countIn && beatIdx !== this.lastBeat) {
      this.lastBeat = beatIdx;
      this.cameras.main.zoomTo(1.015, 40, 'Linear', true);
      this.time.delayedCall(60, () => this.cameras.main.zoomTo(1, 120, 'Linear', true));
    }
    this.prog.setSize(Math.max(1, 760 * Phaser.Math.Clamp(t / tl.length, 0, 1)), 6);

    if (t >= tl.length) this.finishRecording();
  }

  async finishRecording() {
    this.phase = 'finishing';
    this.beat?.stop(0.3);
    if (this.recorder) {
      const ctx = audioCtx();
      const rec = this.recorder.stop();
      this.recorder = null;
      this.raw = rec;
      // Голос приходит позже бита на задержку вывода (наушники) и ввода (микрофон)
      const latency = (ctx.outputLatency || ctx.baseLatency || 0) + 0.015;
      this.voiceAt = rec.startedAt - this.t0 - latency;
      this.clearUi();
      this.title('СВЕДЕНИЕ', 'Компрессор, эквалайзер, де-эссер, реверб, дилей, дабл…');
      await new Promise((r) => this.time.delayedCall(60, r));
      await this.mixVoice();
    }
    // Подача: какую долю времени строк игрок реально звучал
    this.score = this.raw ? Math.min(100, Math.round(((this.voiced / Math.max(1, this.lineFrames)) / 0.6) * 100)) : null;
    // Уроки сведения от Стаса (Эп.2) и его сведение джингла — звук чище, подача чуть выше
    if (this.score !== null) {
      if (state.flags.e2StasSchool) this.score = Math.min(100, this.score + 5);
      if (this.mode === 'jingle' && state.flags.e2JingleStas) this.score = Math.min(100, this.score + 10);
    }
    this.showResult();
  }

  async mixVoice() {
    const { data, sampleRate } = this.raw;
    this.processed = await processVoice(data, sampleRate, { autotune: this.autotune });
    this.blob = encodeWav(this.processed, sampleRate);
    this.rawBlob = encodeWav(data, sampleRate);
  }

  async remix() {
    this.previewStop();
    this.phase = 'mixing';
    this.clearUi();
    this.title('СВЕДЕНИЕ', `Автотюн: ${AUTOTUNE[this.autotune]}`);
    await new Promise((r) => this.time.delayedCall(60, r));
    await this.mixVoice();
    this.showResult();
  }

  // ---------- 4. Результат ----------

  showResult() {
    this.phase = 'result';
    this.clearUi();
    const theme = trackTheme(this.picked);
    this.title(this.mode === 'jingle' ? 'ДЖИНГЛ ГОТОВ' : 'ДЕМКА ГОТОВА', `«${this.trackTitle || TITLES[theme]}»  ·  тема: ${theme === 'mixed' ? 'всё сразу' : TAGS[theme].name}`);
    if (this.score !== null) {
      const verdict = this.score >= 70 ? ['ОГОНЬ', '#ffd166'] : this.score >= 40 ? ['НОРМ', '#3df0ff'] : ['ТИХОВАТО', '#ff6b8a'];
      this.add2(this.add.text(480, 200, `ПОДАЧА: ${this.score}%`, { fontFamily: PIXEL, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
      const v = this.add2(this.add.text(480, 260, verdict[0], { fontFamily: PIXEL, fontSize: '36px', color: verdict[1] }).setOrigin(0.5).setScale(0));
      this.tweens.add({ targets: v, scale: 1, duration: 400, ease: 'Back.out' });
      sfx(this.score >= 40 ? 'line' : 'deny');
    } else {
      this.add2(this.add.text(480, 230, 'Записано без голоса — только бит и текст.', { fontFamily: FONT, fontSize: '22px', color: '#c9c4ee' }).setOrigin(0.5));
    }
    this.add2(this.add.text(480, 330, 'Послушай до и после сведения, перезапиши или сохрани на комп Дэна.', { fontFamily: FONT, fontSize: '17px', color: '#77729a' }).setOrigin(0.5));
    if (this.raw) this.studioOptions(380);
    const rows = [{ label: this.raw ? '▶ ПОСЛЕ' : '▶ ПОСЛУШАТЬ', color: '#3df0ff', onClick: () => this.preview() }];
    if (this.raw) rows.push({ label: '▶ ДО', color: '#9ab0ff', onClick: () => this.preview(true) });
    rows.push({ label: '↻ ЗАНОВО', color: '#c9c4ee', onClick: () => this.startRecording(!!this.stream) });
    rows.push({ label: '✓ СОХРАНИТЬ', color: '#ffd166', onClick: () => this.save() });
    this.buttonsRow(rows);
  }

  demoData(before = false) {
    const theme = trackTheme(this.picked);
    const base = this.trackTitle || TITLES[theme];
    return {
      title: this.mode === 'rehearsal' ? `${base} (репетиция)` : base,
      theme,
      lines: this.picked.map((l) => ({ ...l })),
      items: this.tl.items,
      voice: before ? this.rawBlob : this.blob,
      autotune: this.autotune,
      voiceAt: this.voiceAt,
      beatFrom: this.tl.beatFrom,
      length: this.tl.length,
      score: this.score,
    };
  }

  async preview(before = false) {
    const was = this.previewing;
    this.previewStop();
    if (was && this.previewBefore === before) return;
    sfx('click');
    this.previewBefore = before;
    this.previewing = await playDemo(this.demoData(before));
    if (this.previewing) this.time.delayedCall(this.tl.length * 1000, () => (this.previewing = null));
  }

  previewStop() {
    this.previewing?.stop();
    this.previewing = null;
  }

  async save() {
    if (this.phase !== 'result') return;
    this.phase = 'saving';
    this.previewStop();
    sfx('keys');
    const demo = this.demoData();
    await saveDemo(demo);
    state.tracks.push({ title: demo.title, theme: demo.theme, lines: demo.lines, voice: !!demo.voice, score: demo.score });
    if (this.mode === 'rehearsal') state.flags.e1Rehearsal = true;
    else if (this.mode === 'jingle') state.flags.e2JingleRec = { score: demo.score, voice: !!demo.voice };
    else if (this.mode === 'track') state.flags.lastTrack = { title: demo.title, theme: demo.theme, score: demo.score };
    else state.flags.trackDone = true;
    if (demo.theme === 'pain') state.stats.honesty += 1;
    if (demo.theme === 'street') state.stats.fame += 1;
    this.clearUi();
    const t = this.add2(this.add.text(480, 270, 'СОХРАНЕНО: C:\\ДЕМКИ', { fontFamily: PIXEL, fontSize: '18px', color: '#ffd166' }).setOrigin(0.5));
    t.setShadow(0, 0, '#ffd166', 12, true, true);
    sfx('line');
    this.time.delayedCall(1300, () => {
      this.cameras.main.fadeOut(500, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', this.back));
    });
  }

  // Кислотный режим (если Марк взял марочку у Рея): цвета плывут
  startAcid() {
    const cam = this.cameras.main;
    if (!cam.postFX) return;
    const fx = cam.postFX.addColorMatrix();
    const st = { a: 0 };
    this.tweens.add({ targets: st, a: 360, duration: 6000, repeat: -1, onUpdate: () => fx.hue(st.a) });
  }

  cleanup() {
    stopMusic(0.3);
    this.beat?.stop(0.1);
    this.previewStop();
    try {
      this.recorder?.stop();
    } catch (e) {}
    this.recorder = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }

  update(time) {
    if (this.phase === 'rec') this.updateRecording();
    const beat = (time / (60000 / BEAT.bpm)) % 1;
    this.bars.forEach((b, i) => {
      b.setSize(14, 20 + Math.abs(Math.sin(time / 300 + i * 0.7)) * 70 * (1.2 - beat) + (i % 7) * 6);
    });
  }
}
