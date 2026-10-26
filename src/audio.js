// Звук игры: бит из файла, синтезированные звуковые эффекты и фоновые атмосферы.
// Всё через Web Audio, чтобы точно синхронизировать караоке с битом.

let ctx = null;
let master = null;
let sfxBus = null;
let noiseBuf = null;

export const BEAT = {
  url: './audio/beat-yagoda.mp3',
  bpm: 164,
  drop: 13.17, // момент, когда заходит бочка
  get bar() {
    return (60 / this.bpm) * 4;
  },
};

export function audioCtx() {
  return ctx;
}

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.7;
      sfxBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

// ---------- Файлы и музыка ----------

const buffers = {};

export async function loadBuffer(url) {
  if (!ctx) unlockAudio();
  if (!ctx) return null;
  if (!buffers[url]) {
    buffers[url] = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .catch(() => null);
  }
  return buffers[url];
}

export async function decodeBlob(blob) {
  if (!ctx) unlockAudio();
  return ctx.decodeAudioData(await blob.arrayBuffer());
}

let music = null;

// Играет буфер; возвращает «ручку» с временем старта и stop()
export function playBuffer(buf, { offset = 0, when = 0, loop = false, loopStart = 0, volume = 1, muffled = false, dest = master } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  if (loop) {
    src.loopStart = loopStart;
    src.loopEnd = buf.duration;
  }
  const g = ctx.createGain();
  g.gain.value = volume;
  let node = src;
  if (muffled) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    node = src.connect(f);
  }
  node.connect(g).connect(dest);
  const startAt = when || ctx.currentTime + 0.05;
  src.start(startAt, offset);
  const h = {
    src,
    gain: g,
    startAt,
    offset,
    // Позиция внутри файла в секундах
    position() {
      const p = ctx.currentTime - startAt + offset;
      return loop && p > buf.duration ? loopStart + ((p - loopStart) % (buf.duration - loopStart)) : p;
    },
    stop(fade = 0.3) {
      try {
        g.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
        src.stop(ctx.currentTime + fade + 0.05);
      } catch (e) {}
    },
  };
  src.onended = () => (h.ended = true);
  return h;
}

export async function playMusic(url, opts = {}) {
  stopMusic(0.2);
  const buf = await loadBuffer(url);
  if (!buf) return null;
  music = playBuffer(buf, opts);
  return music;
}

export function currentMusic() {
  return music && !music.ended ? music : null;
}

export function stopMusic(fade = 0.5) {
  music?.stop(fade);
  music = null;
}

// ---------- Синтезированные эффекты ----------

function tone(t, freq, dur, { type = 'sine', vol = 0.2, to = null, attack = 0.005, dest = sfxBus } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t, dur, { type = 'bandpass', freq = 1000, q = 1, vol = 0.2, attack = 0.005, to = null, dest = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// Скрип: пила с «плавающей» высотой через узкий фильтр
function creak(t, dur, base = 180, vol = 0.07) {
  const o = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t);
  o.frequency.linearRampToValueAtTime(base * 1.6, t + dur);
  lfo.frequency.value = 23;
  lg.gain.value = base * 0.25;
  lfo.connect(lg).connect(o.frequency);
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(sfxBus);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

const SFX = {
  click: (t) => tone(t, 1400, 0.03, { type: 'square', vol: 0.05 }),
  select: (t) => {
    tone(t, 880, 0.06, { type: 'square', vol: 0.05 });
    tone(t + 0.05, 1320, 0.08, { type: 'square', vol: 0.04 });
  },
  deny: (t) => tone(t, 220, 0.12, { type: 'square', vol: 0.06, to: 160 }),
  prompt: (t) => tone(t, 1800, 0.025, { vol: 0.03 }),
  talk: (t) => {
    tone(t, 520, 0.05, { type: 'triangle', vol: 0.08 });
    tone(t + 0.06, 700, 0.06, { type: 'triangle', vol: 0.07 });
  },
  line: (t) => {
    [988, 1318, 1760, 2637].forEach((f, i) => tone(t + i * 0.07, f, 0.35, { type: 'triangle', vol: 0.07 }));
    noise(t, 0.5, { type: 'highpass', freq: 8000, vol: 0.03 });
  },
  door: (t) => {
    noise(t, 0.05, { freq: 2500, q: 2, vol: 0.15 }); // щелчок ручки
    creak(t + 0.06, 0.55, 170, 0.06);
  },
  doorClose: (t) => {
    tone(t, 90, 0.18, { vol: 0.35, to: 50 });
    noise(t, 0.12, { type: 'lowpass', freq: 600, vol: 0.25 });
  },
  gate: (t) => {
    for (let i = 0; i < 9; i++) noise(t + i * 0.045, 0.08, { freq: 1800 + Math.random() * 1500, q: 8, vol: 0.1 });
    tone(t + 0.4, 70, 0.35, { vol: 0.3, to: 45 });
  },
  stepWood: (t) => noise(t, 0.06, { type: 'lowpass', freq: 380, vol: 0.12 }),
  stepWet: (t) => {
    noise(t, 0.05, { type: 'lowpass', freq: 500, vol: 0.08 });
    noise(t + 0.01, 0.09, { type: 'bandpass', freq: 3000, q: 1.5, vol: 0.04 });
  },
  stepConcrete: (t) => noise(t, 0.04, { type: 'bandpass', freq: 900, q: 1, vol: 0.07 }),
  paper: (t) => {
    for (let i = 0; i < 5; i++) noise(t + i * 0.05 + Math.random() * 0.02, 0.07, { type: 'highpass', freq: 3000 + Math.random() * 2000, vol: 0.07 });
  },
  page: (t) => noise(t, 0.25, { type: 'bandpass', freq: 2500, to: 6000, q: 0.7, vol: 0.09, attack: 0.08 }),
  coins: (t) => {
    [3520, 4186, 3729, 4699].forEach((f, i) => tone(t + i * 0.06 + Math.random() * 0.02, f, 0.18, { vol: 0.04 }));
  },
  bed: (t) => {
    creak(t, 0.35, 120, 0.05);
    tone(t + 0.02, 80, 0.2, { vol: 0.12, to: 60 });
  },
  fridge: (t) => {
    noise(t, 0.12, { type: 'lowpass', freq: 400, vol: 0.2 }); // чмок уплотнителя
    tone(t + 0.1, 60, 1.4, { vol: 0.05, attack: 0.3 }); // гудение
    tone(t + 0.1, 120, 1.4, { vol: 0.02, attack: 0.3 });
  },
  gas: (t) => {
    for (let i = 0; i < 3; i++) noise(t + i * 0.12, 0.02, { freq: 4000, q: 3, vol: 0.2 }); // пьезо-щелчки
    noise(t + 0.38, 0.9, { type: 'bandpass', freq: 700, q: 0.5, vol: 0.12, attack: 0.05 }); // вспыхнул газ
  },
  drip: (t) => {
    [0, 0.6, 1.2].forEach((d) => tone(t + d, 1400, 0.12, { vol: 0.08, to: 2600 }));
  },
  mirror: (t) => [1568, 2093, 2637].forEach((f, i) => tone(t + i * 0.04, f, 0.6, { vol: 0.03 })),
  spray: (t) => {
    tone(t, 2600, 0.05, { type: 'square', vol: 0.03 }); // шарик в баллончике
    tone(t + 0.12, 2400, 0.05, { type: 'square', vol: 0.03 });
    noise(t + 0.3, 0.8, { type: 'highpass', freq: 5000, vol: 0.12, attack: 0.03 });
  },
  wood: (t) => creak(t, 0.4, 140, 0.05),
  ball: (t) => [0, 0.32, 0.56, 0.72].forEach((d, i) => tone(t + d, 140, 0.1, { vol: 0.25 - i * 0.05, to: 70 })),
  thump: (t) => {
    tone(t, 70, 0.2, { vol: 0.3, to: 40 });
    noise(t, 0.2, { type: 'lowpass', freq: 300, vol: 0.15 });
  },
  feedback: (t) => {
    tone(t, 2900, 0.7, { vol: 0.03, attack: 0.3 });
    noise(t + 0.6, 0.15, { freq: 1200, q: 2, vol: 0.1 });
  },
  keys: (t) => {
    for (let i = 0; i < 7; i++) noise(t + i * 0.07 + Math.random() * 0.03, 0.02, { freq: 3000, q: 3, vol: 0.12 });
  },
  boot: (t) => {
    tone(t, 523, 0.15, { type: 'square', vol: 0.04 });
    tone(t + 0.15, 784, 0.15, { type: 'square', vol: 0.04 });
    tone(t + 0.3, 1046, 0.3, { type: 'square', vol: 0.04 });
  },
  switch: (t) => noise(t, 0.03, { freq: 2000, q: 4, vol: 0.2 }),
  birds: (t) => {
    // Пара птичьих трелей
    for (let i = 0; i < 6; i++) {
      const s = t + i * 0.13 + (i > 2 ? 0.5 : 0);
      tone(s, 3200 + Math.random() * 800, 0.08, { vol: 0.03, to: 4500 + Math.random() * 1000 });
    }
  },
  whoosh: (t) => noise(t, 0.4, { type: 'bandpass', freq: 400, to: 3000, q: 1, vol: 0.1, attack: 0.15 }),
  drop: (t) => {
    tone(t, 55, 0.8, { vol: 0.3, to: 35 });
    noise(t, 0.6, { type: 'lowpass', freq: 200, vol: 0.2 });
  },
  rec: (t) => {
    tone(t, 1000, 0.12, { type: 'square', vol: 0.05 });
    tone(t + 0.15, 1000, 0.12, { type: 'square', vol: 0.05 });
  },
  tick: (t) => tone(t, 1600, 0.04, { type: 'square', vol: 0.06 }),
  tickHi: (t) => tone(t, 2400, 0.05, { type: 'square', vol: 0.08 }),
};

export function sfx(name, delay = 0) {
  if (!ctx || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01 + delay);
}

// Короткий «блип» для печати текста
export function blip(freq = 660, vol = 0.04) {
  if (!ctx) return;
  tone(ctx.currentTime, freq, 0.05, { type: 'square', vol });
}

// ---------- Фоновые атмосферы ----------

let ambience = [];

export function startAmbience(kind) {
  stopAmbience();
  if (!ctx || !kind) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(1, t + 1);
  out.connect(master);
  const nodes = [out];

  const loopNoise = (type, freq, vol, q = 0.7) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(out);
    src.start();
    nodes.push(src);
  };

  if (kind === 'rain') {
    loopNoise('bandpass', 1500, 0.09, 0.4);
    loopNoise('lowpass', 250, 0.06);
  } else if (kind === 'garage') {
    // Гудение лампочки
    const o = ctx.createOscillator();
    o.frequency.value = 100;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    o.connect(g).connect(out);
    o.start();
    nodes.push(o);
    loopNoise('lowpass', 150, 0.02);
  } else if (kind === 'flat') {
    loopNoise('lowpass', 200, 0.015);
  } else if (kind === 'morning') {
    loopNoise('lowpass', 400, 0.05); // далёкий город
    const id = setInterval(() => sfx('birds'), 1900);
    nodes.push({ stop: () => clearInterval(id) });
  }
  ambience = nodes;
}

export function stopAmbience() {
  ambience.forEach((n, i) => {
    if (i === 0 && n.gain) {
      n.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      return;
    }
    try {
      n.stop(ctx ? ctx.currentTime + 0.6 : 0);
    } catch (e) {}
  });
  ambience = [];
}
