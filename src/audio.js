// Лоу-фай бит, синтезированный на лету через Web Audio — никаких файлов не нужно.

let ctx = null;
let master = null;
let timer = null;
let noiseBuf = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

function kick(t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.5);
}

function noise(t, freq, dur, vol) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function chord(t, notes, dur) {
  notes.forEach((n) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.15);
    g.gain.linearRampToValueAtTime(0.0, t + dur);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

// Am — F — Dm — E: грустно и по-уличному
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [50, 53, 57],
  [52, 56, 59],
];
const KICKS = [0, 7, 10];
const SNARES = [4, 12];

export function startBeat(bpm = 84) {
  if (!ctx) unlockAudio();
  if (!ctx || timer) return;
  const step = 60 / bpm / 4;
  let next = ctx.currentTime + 0.1;
  let i = 0;
  timer = setInterval(() => {
    while (next < ctx.currentTime + 0.2) {
      const s = i % 16;
      if (KICKS.includes(s)) kick(next);
      if (SNARES.includes(s)) noise(next, 1800, 0.18, 0.45);
      if (s % 2 === 0) noise(next, 7000, 0.04, s % 4 === 2 ? 0.18 : 0.1);
      if (s === 0) chord(next, CHORDS[Math.floor(i / 16) % 4], step * 16);
      next += step;
      i++;
    }
  }, 50);
}

export function stopBeat() {
  clearInterval(timer);
  timer = null;
}

// Короткий «блип» для печати текста и интерфейса
export function blip(freq = 660, vol = 0.04) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.06);
}
