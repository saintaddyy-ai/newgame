#!/usr/bin/env node
// Генерация озвучки для всех реплик игры.
//
//   npm run voice -- --dry             показать, сколько реплик и символов, ничего не генерируя
//   ELEVENLABS_API_KEY=... npm run voice
//   VOICE_PROVIDER=yandex YANDEX_API_KEY=... npm run voice
//   npm run voice -- --redo=Мама,Рей   переозвучить персонажей после смены голоса
//   npm run voice -- --file=episode1   только реплики из одного файла сценария
//   npm run voice -- --dry --prune      удалить файлы реплик, которых больше нет в игре
//   npm run voice -- --dry --list=docs/voice-todo.md   записать список неозвученных реплик (кто, что, файл)
//   В облачной среде Claude Code: NODE_USE_ENV_PROXY=1 (Node ходит через прокси)
//
// Скрипт находит в src/story/*.js вызовы d.say('Имя', '...') и d.think('...'),
// озвучивает только те реплики, которых ещё нет в public/voice, и обновляет manifest.json.
// Голоса персонажей — в src/data/voices.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineId, splitRemarks } from '../src/voice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = path.join(ROOT, 'src/story');
const OUT = path.join(ROOT, 'public/voice');
const VOICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/voices.json'), 'utf8'));

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7); // --only=Рей
const FILE = (args.find((a) => a.startsWith('--file=')) || '').slice(7); // --file=episode1 — только реплики из этого файла
// --redo=Мама,Рей — переозвучить персонажей заново (например, после смены голоса)
const REDO = (args.find((a) => a.startsWith('--redo=')) || '').slice(7).split(',').filter(Boolean);
const PROVIDER = process.env.VOICE_PROVIDER || 'elevenlabs';

const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const unq = (s) => s.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

// Все .js в src/story (и подпапках)
function storyFiles(dir = STORY) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return storyFiles(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

// Аргументы вызова до закрывающей скобки: [[литералы 1-го аргумента], [2-го], …].
// Строки в одинарных кавычках собираются из любых выражений (тернарники и т. п.), шаблоны `${}` пропускаются.
function callArgs(src, from) {
  const args = [[]];
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (ch === "'") {
      let j = i + 1;
      let str = '';
      while (j < src.length && src[j] !== "'") {
        if (src[j] === '\\') {
          str += src[j] + src[j + 1];
          j += 2;
        } else str += src[j++];
      }
      args[args.length - 1].push(unq(str));
      i = j;
    } else if (ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== '`') j += src[j] === '\\' ? 2 : 1;
      i = j;
    } else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return args;
      depth--;
    } else if (ch === ',' && depth === 0) args.push([]);
  }
  return args;
}

function collect() {
  const lines = new Map();
  for (const file of storyFiles()) {
    const f = path.relative(STORY, file);
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\.say\(\s*/g)) {
      const [who, what = []] = callArgs(src, m.index + m[0].length);
      // Имя — только прямой строкой; подсказки интерфейса без имени не озвучиваем
      if (who?.length !== 1 || !who[0]) continue;
      for (const t of what) add(lines, who[0], t, f);
    }
    for (const m of src.matchAll(/\.think\(\s*/g)) {
      const [what = []] = callArgs(src, m.index + m[0].length);
      for (const t of what) add(lines, 'think', t, f);
    }
    // Наборы вариантов: voiced('Дэн', { key: '…', … })
    for (const m of src.matchAll(new RegExp(String.raw`voiced\(\s*${STR}\s*,\s*\{([\s\S]*?)\}\s*\)`, 'g'))) {
      const speaker = unq(m[1]);
      for (const v of m[2].matchAll(new RegExp(STR, 'g'))) add(lines, speaker, unq(v[1]), f);
    }
  }
  return [...lines.values()];
}

function add(map, speaker, text, file) {
  // Озвучиваем без ремарок в скобках — так же, как это делает игра
  const clean = splitRemarks(text).clean;
  if (!clean) return;
  const id = lineId(speaker, clean);
  if (!map.has(id)) map.set(id, { id, speaker, text: clean, file, remark: clean !== text.trim() });
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
  if (FILE) lines = lines.filter((l) => l.file.includes(FILE));
  // --remarks: сначала реплики, у которых убрали ремарку в скобках (раньше они звучали)
  if (args.includes('--remarks')) lines = lines.filter((l) => l.remark);
  fs.mkdirSync(OUT, { recursive: true });
  if (!DRY) for (const l of lines) if (REDO.includes(l.speaker)) fs.rmSync(path.join(OUT, `${l.id}.mp3`), { force: true });
  const todo = lines.filter((l) => !fs.existsSync(path.join(OUT, `${l.id}.mp3`)));
  const chars = todo.reduce((n, l) => n + l.text.length, 0);
  console.log(`Реплик всего: ${lines.length}. Не озвучено: ${todo.length} (${chars} символов).`);

  const bySpeaker = {};
  todo.forEach((l) => (bySpeaker[l.speaker] = (bySpeaker[l.speaker] || 0) + 1));
  console.log('По персонажам:', bySpeaker);

  // --list=файл.md — список того, что нужно озвучить (по персонажам)
  const LIST = (args.find((a) => a.startsWith('--list=')) || '').slice(7);
  if (LIST) {
    const out = [`# Реплики без озвучки\n`, `Всего: ${todo.length} реплик, ${chars} символов. Сгенерировать: \`npm run voice\` (нужен ключ).\n`];
    for (const sp of Object.keys(bySpeaker).sort((a, b) => bySpeaker[b] - bySpeaker[a])) {
      out.push(`\n## ${sp === 'think' ? 'Мысли Марка (think)' : sp} — ${bySpeaker[sp]}\n`);
      todo.filter((l) => l.speaker === sp).forEach((l) => out.push(`- ${l.text.replace(/\n/g, ' ')}  \`${l.file}\``));
    }
    fs.writeFileSync(path.resolve(ROOT, LIST), out.join('\n') + '\n');
    console.log(`Список: ${LIST}`);
  }

  // --prune: удалить файлы реплик, которых больше нет в игре
  if (args.includes('--prune')) {
    const keep = new Set(collect().map((l) => l.id));
    let n = 0;
    for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3'))) {
      if (!keep.has(f.slice(0, -4))) {
        fs.rmSync(path.join(OUT, f));
        n++;
      }
    }
    console.log(`Удалено устаревших файлов: ${n}`);
  }
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
