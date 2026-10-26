import Phaser from 'phaser';
import { state, TAGS } from '../state.js';
import { BEAT, audioCtx, loadBuffer, playBuffer, playMusic, stopMusic, sfx } from '../audio.js';
import { karaokeTimeline, saveDemo, playDemo } from '../demos.js';

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

  create() {
    this.picked = [];
    this.phase = 'pick';
    this.ui = [];
    this.cameras.main.fadeIn(400, 7, 6, 13);
    this.drawBooth();
    // Пока выбираем строчки, бит играет приглушённо — «из-за стенки»
    playMusic(BEAT.url, { offset: BEAT.drop, loop: true, loopStart: BEAT.drop, volume: 0.6, muffled: true });
    this.input.keyboard.on('keydown', (ev) => this.onKey(ev));
    this.events.once('shutdown', () => this.cleanup());
    this.showPick();
  }

  drawBooth() {
    const g = this.add.graphics();
    g.fillStyle(0x0c0a16, 1).fillRect(0, 0, 960, 540);
    // Акустический поролон
    for (let y = 0; y < 540; y += 40) {
      for (let x = (y / 40) % 2 ? 0 : 20; x < 960; x += 40) {
        g.fillStyle(0x15121f, 1).fillTriangle(x, y + 40, x + 20, y, x + 40, y + 40);
      }
    }
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
    this.ui.push(o);
    return o;
  }

  title(text, sub) {
    this.add2(this.add.text(480, 40, text, { fontFamily: PIXEL, fontSize: '24px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6 }).setOrigin(0.5));
    if (sub) this.hint = this.add2(this.add.text(480, 84, sub, { fontFamily: FONT, fontSize: '20px', color: '#c9c4ee', align: 'center' }).setOrigin(0.5));
  }

  // Кнопки внизу экрана. items: [{ label, color, onClick }]
  buttonsRow(items, y = 490) {
    this.buttons = items.map((it, i) => {
      const x = 480 + (i - (items.length - 1) / 2) * 300;
      const b = this.add2(this.add.text(x, y, `${i + 1}. ${it.label}`, {
        fontFamily: PIXEL, fontSize: '13px', color: '#0c0a16', backgroundColor: it.color || '#ffd166', padding: { x: 14, y: 12 },
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
  }

  // ---------- 1. Выбор строчек ----------

  showPick() {
    this.clearUi();
    this.phase = 'pick';
    this.title('ПИШЕМ ТРЕК', `Выбери ${PICK} строчки из тетради`);
    this.cards = state.lines.map((l, i) => this.makeCard(l, i));
    this.recBtn = this.add2(this.add.text(480, 500, '● К МИКРОФОНУ', {
      fontFamily: PIXEL, fontSize: '16px', color: '#0c0a16', backgroundColor: '#ff3d3d', padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setAlpha(0.3));
    this.recBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showSetup());
  }

  makeCard(line, i) {
    const cols = state.lines.length > 6 ? 2 : 1;
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

  showSetup() {
    if (this.phase !== 'pick' || this.picked.length < PICK) return;
    sfx('select');
    this.phase = 'setup';
    this.clearUi();
    this.title('К МИКРОФОНУ', 'Сейчас ты зачитаешь эти строчки под бит Дэна — по-настоящему, своим голосом.\nСтрочки будут подсвечиваться, как в караоке. Лучше в наушниках.');
    this.picked.forEach((l, i) => {
      this.add2(this.add.text(480, 200 + i * 50, `«${l.text}»`, { fontFamily: FONT, fontSize: '22px', color: TAGS[l.tag].color, fontStyle: 'italic' }).setOrigin(0.5));
    });
    this.add2(this.add.text(480, 380, 'Сначала будет отсчёт — 2 такта. Каждая строчка звучит 2 такта, весь куплет — два круга.', {
      fontFamily: FONT, fontSize: '16px', color: '#77729a',
    }).setOrigin(0.5));
    this.buttonsRow([
      { label: '● С МИКРОФОНОМ', color: '#ff3d3d', onClick: () => this.startRecording(true) },
      { label: 'БЕЗ МИКРОФОНА', color: '#c9c4ee', onClick: () => this.startRecording(false) },
      { label: 'НАЗАД', color: '#77729a', onClick: () => this.backToPick() },
    ]);
  }

  backToPick() {
    sfx('click');
    this.picked = [];
    this.showPick();
  }

  async getMic() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
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
    this.voiceAt = 0;
    this.chunks = [];

    // Запуск записи и бита — голос потом ляжет на бит по разнице времени
    if (micOk && window.MediaRecorder) {
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.recorder.onstart = () => (this.recStart = ctx.currentTime);
      this.recorder.start();
    } else {
      this.recorder = null;
    }
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
    this.meter.height = Phaser.Math.Clamp(level * 1400, 0, 200);
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
    this.prog.width = 760 * Phaser.Math.Clamp(t / tl.length, 0, 1);

    if (t >= tl.length) this.finishRecording();
  }

  async finishRecording() {
    this.phase = 'finishing';
    this.beat?.stop(0.3);
    if (this.recorder) {
      await new Promise((r) => {
        this.recorder.onstop = r;
        this.recorder.stop();
      });
      this.blob = new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' });
      this.voiceAt = (this.recStart ?? this.t0) - this.t0;
    }
    // Подача: какую долю времени строк игрок реально звучал
    this.score = this.blob ? Math.min(100, Math.round(((this.voiced / Math.max(1, this.lineFrames)) / 0.6) * 100)) : null;
    this.showResult();
  }

  // ---------- 4. Результат ----------

  showResult() {
    this.phase = 'result';
    this.clearUi();
    const theme = trackTheme(this.picked);
    this.title('ДЕМКА ГОТОВА', `«${TITLES[theme]}»  ·  тема: ${theme === 'mixed' ? 'всё сразу' : TAGS[theme].name}`);
    if (this.score !== null) {
      const verdict = this.score >= 70 ? ['ОГОНЬ', '#ffd166'] : this.score >= 40 ? ['НОРМ', '#3df0ff'] : ['ТИХОВАТО', '#ff6b8a'];
      this.add2(this.add.text(480, 200, `ПОДАЧА: ${this.score}%`, { fontFamily: PIXEL, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
      const v = this.add2(this.add.text(480, 260, verdict[0], { fontFamily: PIXEL, fontSize: '36px', color: verdict[1] }).setOrigin(0.5).setScale(0));
      this.tweens.add({ targets: v, scale: 1, duration: 400, ease: 'Back.out' });
      sfx(this.score >= 40 ? 'line' : 'deny');
    } else {
      this.add2(this.add.text(480, 230, 'Записано без голоса — только бит и текст.', { fontFamily: FONT, fontSize: '22px', color: '#c9c4ee' }).setOrigin(0.5));
    }
    this.add2(this.add.text(480, 340, 'Послушай, перезапиши, если не нравится, или сохрани на комп Дэна.', { fontFamily: FONT, fontSize: '17px', color: '#77729a' }).setOrigin(0.5));
    this.buttonsRow([
      { label: '▶ ПОСЛУШАТЬ', color: '#3df0ff', onClick: () => this.preview() },
      { label: '↻ ПЕРЕЗАПИСАТЬ', color: '#c9c4ee', onClick: () => this.startRecording(!!this.stream) },
      { label: '✓ СОХРАНИТЬ', color: '#ffd166', onClick: () => this.save() },
    ]);
  }

  demoData() {
    const theme = trackTheme(this.picked);
    return {
      title: TITLES[theme],
      theme,
      lines: this.picked.map((l) => ({ ...l })),
      items: this.tl.items,
      voice: this.blob,
      voiceAt: this.voiceAt,
      beatFrom: this.tl.beatFrom,
      length: this.tl.length,
      score: this.score,
    };
  }

  async preview() {
    if (this.previewing) return this.previewStop();
    sfx('click');
    this.previewing = await playDemo(this.demoData());
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
    state.flags.trackDone = true;
    if (demo.theme === 'pain') state.stats.honesty += 1;
    if (demo.theme === 'street') state.stats.fame += 1;
    this.clearUi();
    const t = this.add2(this.add.text(480, 270, 'СОХРАНЕНО: C:\\ДЕМКИ', { fontFamily: PIXEL, fontSize: '18px', color: '#ffd166' }).setOrigin(0.5));
    t.setShadow(0, 0, '#ffd166', 12, true, true);
    sfx('line');
    this.time.delayedCall(1300, () => {
      this.cameras.main.fadeOut(500, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', { loc: 'garage', spawnX: 780 }));
    });
  }

  cleanup() {
    stopMusic(0.3);
    this.beat?.stop(0.1);
    this.previewStop();
    try {
      if (this.recorder?.state === 'recording') this.recorder.stop();
    } catch (e) {}
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }

  update(time) {
    if (this.phase === 'rec') this.updateRecording();
    const beat = (time / (60000 / BEAT.bpm)) % 1;
    this.bars.forEach((b, i) => {
      b.height = 20 + Math.abs(Math.sin(time / 300 + i * 0.7)) * 70 * (1.2 - beat) + (i % 7) * 6;
    });
  }
}
