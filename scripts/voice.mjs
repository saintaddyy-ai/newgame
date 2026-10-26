#!/usr/bin/env node
// Генерация озвучки для всех реплик игры.
//
//   npm run voice -- --dry             показать, сколько реплик и символов, ничего не генерируя
//   ELEVENLABS_API_KEY=... npm run voice
//   VOICE_PROVIDER=yandex YANDEX_API_KEY=... npm run voice
//   npm run voice -- --redo=Мама,Рей   переозвучить персонажей после смены голоса
//   В облачной среде Claude Code: NODE_USE_ENV_PROXY=1 (Node ходит через прокси)
//
// Скрипт находит в src/story/*.js вызовы d.say('Имя', '...') и d.think('...'),
// озвучивает только те реплики, которых ещё нет в public/voice, и обновляет manifest.json.
// Голоса персонажей — в src/data/voices.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineId } from '../src/voice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = path.join(ROOT, 'src/story');
const OUT = path.join(ROOT, 'public/voice');
const VOICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/voices.json'), 'utf8'));

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7); // --only=Рей
// --redo=Мама,Рей — переозвучить персонажей заново (например, после смены голоса)
const REDO = (args.find((a) => a.startsWith('--redo=')) || '').slice(7).split(',').filter(Boolean);
const PROVIDER = process.env.VOICE_PROVIDER || 'elevenlabs';

const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const unq = (s) => s.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

function collect() {
  const lines = new Map();
  for (const f of fs.readdirSync(STORY).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(STORY, f), 'utf8');
    for (const m of src.matchAll(new RegExp(String.raw`\.say\(\s*${STR}\s*,\s*${STR}`, 'g'))) {
      const speaker = unq(m[1]);
      if (!speaker) continue; // подсказки интерфейса без имени не озвучиваем
      add(lines, speaker, unq(m[2]), f);
    }
    for (const m of src.matchAll(new RegExp(String.raw`\.think\(\s*${STR}`, 'g'))) add(lines, 'think', unq(m[1]), f);
  }
  return [...lines.values()];
}

function add(map, speaker, text, file) {
  const id = lineId(speaker, text);
  if (!map.has(id)) map.set(id, { id, speaker, text, file });
}

function voiceFor(speaker) {
  return { ...VOICES.default, ...(VOICES[speaker] || {}) };
}

async function elevenlabs(line) {
  const key = process.env.ELEVENLABS_API_KEY;
  const v = voiceFor(line.speaker);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.elevenlabs}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: line.text,
      model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
      voice_settings: { stability: v.stability ?? 0.5, similarity_boost: 0.75, style: v.style ?? 0.3, speed: v.speed ?? 1 },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function yandex(line) {
  const v = voiceFor(line.speaker);
  const body = new URLSearchParams({ text: line.text, lang: 'ru-RU', voice: v.yandex, format: 'mp3', speed: String(v.speed ?? 1) });
  if (process.env.YANDEX_FOLDER_ID) body.set('folderId', process.env.YANDEX_FOLDER_ID);
  const r = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers: { Authorization: `Api-Key ${process.env.YANDEX_API_KEY}` },
    body,
  });
  if (!r.ok) throw new Error(`Yandex ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  let lines = collect();
  if (ONLY) lines = lines.filter((l) => l.speaker === ONLY);
  fs.mkdirSync(OUT, { recursive: true });
  if (!DRY) for (const l of lines) if (REDO.includes(l.speaker)) fs.rmSync(path.join(OUT, `${l.id}.mp3`), { force: true });
  const todo = lines.filter((l) => !fs.existsSync(path.join(OUT, `${l.id}.mp3`)));
  const chars = todo.reduce((n, l) => n + l.text.length, 0);
  console.log(`Реплик всего: ${lines.length}. Не озвучено: ${todo.length} (${chars} символов).`);

  const bySpeaker = {};
  todo.forEach((l) => (bySpeaker[l.speaker] = (bySpeaker[l.speaker] || 0) + 1));
  console.log('По персонажам:', bySpeaker);

  if (DRY) return writeManifest();
  const keyName = PROVIDER === 'yandex' ? 'YANDEX_API_KEY' : 'ELEVENLABS_API_KEY';
  if (!process.env[keyName]) {
    console.log(`\nНет ключа ${keyName}. Задай его в окружении и запусти снова. Пока игра работает без озвучки.`);
    return writeManifest();
  }
  const tts = PROVIDER === 'yandex' ? yandex : elevenlabs;
  for (const [i, l] of todo.entries()) {
    try {
      const mp3 = await tts(l);
      fs.writeFileSync(path.join(OUT, `${l.id}.mp3`), mp3);
      console.log(`[${i + 1}/${todo.length}] ${l.speaker}: ${l.text.slice(0, 60)}`);
    } catch (e) {
      console.error(`Ошибка на «${l.text.slice(0, 40)}»: ${e.message}`);
      if (/401|403|quota/i.test(e.message)) break;
    }
  }
  writeManifest();
}

// Манифест — только реально существующие файлы
function writeManifest() {
  const ids = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort() : [];
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ ids }, null, 0) + '\n');
  console.log(`manifest.json: ${ids.length} файлов.`);
}

main();
