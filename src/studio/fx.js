// Студийная обработка голоса: запись без эхо- и шумоподавления, WAV, цепочка эффектов, автотюн.
// Всё считается в браузере, без внешних сервисов.
import { BEAT } from '../audio.js';

// ---------- Захват сырого звука (PCM) ----------

// Пишет микрофон в Float32-кусочки. Работает и там, где нет AudioWorklet (ScriptProcessor).
export function startCapture(ctx, stream) {
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  let startedAt = null;
  proc.onaudioprocess = (e) => {
    if (startedAt === null) startedAt = e.playbackTime - e.inputBuffer.duration;
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  // Процессор должен быть подключён к выходу, иначе браузер его не крутит; глушим нулевой громкостью
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(proc).connect(mute).connect(ctx.destination);
  return {
    src,
    stop() {
      proc.disconnect();
      src.disconnect();
      mute.disconnect();
      const len = chunks.reduce((n, c) => n + c.length, 0);
      const data = new Float32Array(len);
      let o = 0;
      for (const c of chunks) {
        data.set(c, o);
        o += c.length;
      }
      return { data, sampleRate: ctx.sampleRate, startedAt: startedAt ?? ctx.currentTime };
    },
  };
}

// ---------- WAV ----------

export function encodeWav(data, sampleRate) {
  const buf = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + data.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// ---------- Простые фильтры прямо по сэмплам ----------

function biquad(type, f, q, sr, gainDb = 0) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f) / sr;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'highpass') {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'bandpass') {
    b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else {
    // peaking
    b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function runBiquad(x, c) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

// Де-эссер: следим за громкостью шипящих (5–9 кГц) и приглушаем только их
function deEss(x, sr, thresh = 0.06, depth = 0.65) {
  const band = runBiquad(x, biquad('bandpass', 7000, 1.2, sr));
  const out = new Float32Array(x.length);
  let env = 0;
  const att = Math.exp(-1 / (0.002 * sr));
  const rel = Math.exp(-1 / (0.06 * sr));
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(band[i]);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    const over = env > thresh ? Math.min(1, (env - thresh) / thresh) : 0;
    out[i] = x[i] - band[i] * over * depth;
  }
  return out;
}

// Шумовой гейт: тишина между строчками становится чистой
function gate(x, sr, thresh = 0.012) {
  const out = new Float32Array(x.length);
  let env = 0;
  let g = 0;
  const a = Math.exp(-1 / (0.005 * sr));
  const r = Math.exp(-1 / (0.12 * sr));
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i]);
    env = v > env ? a * env + (1 - a) * v : r * env + (1 - r) * v;
    const target = env > thresh ? 1 : 0.08;
    g += (target - g) * (target > g ? 0.01 : 0.0008);
    out[i] = x[i] * g;
  }
  return out;
}

function normalize(x, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m < 1e-4) return x;
  const k = peak / m;
  for (let i = 0; i < x.length; i++) x[i] *= k;
  return x;
}

// ---------- Автотюн ----------

// Ми минор (тональность бита): E F# G A B C D
const SCALE = [4, 6, 7, 9, 11, 0, 2];

function nearestScaleHz(f) {
  const midi = 69 + 12 * Math.log2(f / 440);
  let best = midi;
  let bestD = Infinity;
  for (let m = Math.floor(midi) - 2; m <= Math.ceil(midi) + 2; m++) {
    if (!SCALE.includes(((m % 12) + 12) % 12)) continue;
    const d = Math.abs(m - midi);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return 440 * Math.pow(2, (best - 69) / 12);
}

// Высота голоса по кадрам (YIN на прореженном сигнале). Возвращает период в сэмплах исходной частоты или 0.
function pitchTrack(x, sr, hop) {
  const dec = Math.max(1, Math.round(sr / 11025));
  const ds = new Float32Array(Math.floor(x.length / dec));
  for (let i = 0; i < ds.length; i++) {
    let s = 0;
    for (let j = 0; j < dec; j++) s += x[i * dec + j];
    ds[i] = s / dec;
  }
  const dsr = sr / dec;
  const W = Math.round(dsr * 0.03);
  const minLag = Math.floor(dsr / 600);
  const maxLag = Math.ceil(dsr / 70);
  const frames = Math.floor(x.length / hop);
  const periods = new Float32Array(frames);
  const d = new Float32Array(maxLag + 1);
  for (let f = 0; f < frames; f++) {
    const start = Math.floor((f * hop) / dec);
    if (start + W + maxLag >= ds.length) break;
    let energy = 0;
    for (let i = 0; i < W; i++) energy += ds[start + i] * ds[start + i];
    if (energy / W < 2e-5) continue;
    for (let lag = 1; lag <= maxLag; lag++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const v = ds[start + i] - ds[start + i + lag];
        s += v * v;
      }
      d[lag] = s;
    }
    // Нормированная разность (CMNDF) и первый провал ниже порога
    let sum = 0;
    let found = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
      sum += d[lag];
      if (lag < minLag) continue;
      const cm = (d[lag] * lag) / (sum || 1);
      if (cm < 0.15) {
        while (lag + 1 <= maxLag && d[lag + 1] < d[lag]) lag++;
        found = lag;
        break;
      }
    }
    if (found) periods[f] = found * dec;
  }
  return periods;
}

// Сдвиг высоты наложением окон (TD-PSOLA без точных меток): кусочки по два периода
// кладутся с новым шагом. strength: 0.5 — лёгкий, 1 — жёсткий «роботный» автотюн.
export function autotune(x, sr, strength = 1) {
  const hop = Math.round(sr * 0.01);
  const periods = pitchTrack(x, sr, hop);
  // Сглаживаем трек и считаем, куда тянуть каждую ноту
  const ratio = new Float32Array(periods.length).fill(1);
  let cur = 1;
  const speed = strength >= 1 ? 1 : 0.15;
  for (let f = 0; f < periods.length; f++) {
    const p = periods[f];
    if (!p) {
      cur += (1 - cur) * 0.3;
      ratio[f] = cur;
      continue;
    }
    const hz = sr / p;
    const target = nearestScaleHz(hz);
    const want = 1 + (target / hz - 1) * Math.min(1, strength);
    cur += (want - cur) * speed;
    ratio[f] = cur;
  }
  // Метки анализа идут ровно через период голоса; синтез кладёт те же кусочки с новым шагом
  const marks = [];
  for (let ta = 0; ta < x.length; ) {
    marks.push(ta);
    const p = periods[Math.min(periods.length - 1, Math.floor(ta / hop))];
    ta += p > 0 ? p : hop;
  }
  const out = new Float32Array(x.length);
  const norm = new Float32Array(x.length);
  let mi = 0;
  for (let ts = 0; ts < x.length; ) {
    while (mi + 1 < marks.length && Math.abs(marks[mi + 1] - ts) <= Math.abs(marks[mi] - ts)) mi++;
    const ma = marks[mi];
    const f = Math.min(periods.length - 1, Math.floor(ma / hop));
    const p = periods[f];
    const T0 = p > 0 ? p : hop;
    const T1 = p > 0 ? T0 / ratio[f] : hop;
    const half = Math.round(T0);
    const so0 = Math.round(ts);
    for (let i = -half; i < half; i++) {
      const si = ma + i;
      const so = so0 + i;
      if (si < 0 || si >= x.length || so < 0 || so >= x.length) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * i) / half);
      out[so] += x[si] * w;
      norm[so] += w;
    }
    ts += Math.max(8, T1);
  }
  for (let i = 0; i < x.length; i++) out[i] = norm[i] > 0.05 ? out[i] / Math.max(norm[i], 0.5) : 0;
  return out;
}

// ---------- Вся цепочка ----------

// opts: { autotune: 'off'|'light'|'hard', fx: true }
export async function processVoice(raw, sampleRate, opts = {}) {
  let x = raw.slice();
  // Срез низа (гул, стук) и шумовой гейт
  x = runBiquad(x, biquad('highpass', 90, 0.7, sampleRate));
  x = gate(x, sampleRate);
  if (opts.autotune === 'light') x = autotune(x, sampleRate, 0.5);
  if (opts.autotune === 'hard') x = autotune(x, sampleRate, 1);
  if (opts.fx === false) return normalize(x, 0.85);
  // Эквалайзер: убрать «бубнёж», добавить разборчивости и воздуха
  x = runBiquad(x, biquad('peaking', 300, 1, sampleRate, -3));
  x = runBiquad(x, biquad('peaking', 3500, 1, sampleRate, 3));
  x = runBiquad(x, biquad('peaking', 10000, 0.8, sampleRate, 2));
  x = deEss(x, sampleRate);
  normalize(x, 0.7);

  // Компрессор, реверб, дилей на 1/8 и дабл — в офлайн-графе Web Audio
  const len = x.length + Math.round(sampleRate * 1.6);
  const off = new OfflineAudioContext(2, len, sampleRate);
  const buf = off.createBuffer(1, x.length, sampleRate);
  buf.copyToChannel(x, 0);
  const src = off.createBufferSource();
  src.buffer = buf;
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;
  comp.knee.value = 6;
  const makeup = off.createGain();
  makeup.gain.value = 1.6;
  src.connect(comp).connect(makeup);
  const dry = off.createGain();
  dry.gain.value = 1;
  makeup.connect(dry).connect(off.destination);

  // Дабл: две чуть задержанные «плавающие» копии по краям
  [-0.7, 0.7].forEach((pan, i) => {
    const d = off.createDelay(0.1);
    d.delayTime.value = 0.014 + i * 0.008;
    const lfo = off.createOscillator();
    lfo.frequency.value = 0.4 + i * 0.25;
    const depth = off.createGain();
    depth.gain.value = 0.003;
    lfo.connect(depth).connect(d.delayTime);
    lfo.start();
    const g = off.createGain();
    g.gain.value = 0.28;
    const p = off.createStereoPanner();
    p.pan.value = pan;
    makeup.connect(d).connect(g).connect(p).connect(off.destination);
  });

  // Дилей на восьмую долю бита
  const delay = off.createDelay(1);
  delay.delayTime.value = 60 / BEAT.bpm / 2;
  const fb = off.createGain();
  fb.gain.value = 0.28;
  const dlp = off.createBiquadFilter();
  dlp.type = 'lowpass';
  dlp.frequency.value = 3500;
  const dwet = off.createGain();
  dwet.gain.value = 0.13;
  makeup.connect(delay).connect(dlp).connect(fb).connect(delay);
  dlp.connect(dwet).connect(off.destination);

  // Реверб: свёртка с искусственным «залом»
  const conv = off.createConvolver();
  conv.buffer = impulse(off, 1.3);
  const rwet = off.createGain();
  rwet.gain.value = 0.16;
  makeup.connect(conv).connect(rwet).connect(off.destination);

  src.start();
  const rendered = await off.startRendering();
  // Сводим в моно для демки (две копии каналов пополам)
  const l = rendered.getChannelData(0);
  const r = rendered.getChannelData(1);
  const mono = new Float32Array(rendered.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (l[i] + r[i]) * 0.5;
  return normalize(mono, 0.9);
}

function impulse(ctx, sec) {
  const n = Math.round(ctx.sampleRate * sec);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
  }
  return b;
}
