// Задание 13: «Джингл для „Шаурмы 24“».
// Тимур (хозяин «Шаурмы») в субботу днём просит джингл — если Марк знаком с Кирой.
// Четыре строчки, у каждой три варианта: смешной / честный / пафосный. Записать в гараже, когда студия свободна;
// Стас может свести. Итог зависит от тона: смешной — подписчики и Кира, пафосный — больше денег, Кире неловко,
// честный — строчка в тетрадь. Не принёс до воскресенья 20:00 — провал (Кира пишет).
import { voiced } from '../../voice.js';
import { F, state, now, at, day, quest, questStatus, receive, rel, relOf, addFollowers, feed, post, once } from './common.js';
import { studioOccupant } from './world.js';

export const JINGLE_DEADLINE = at(20);

// Варианты строчек: tag — для студии (смешной — «Тусовки», честный — «Улица», пафосный — «Мечта»)
export const JINGLE_LINES = [
  {
    funny: 'Шаурма двадцать четыре — даже голуби в восторге',
    honest: 'Ночью в городе темно, а тут горит окно',
    pompous: 'Король лаваша на троне из гриля',
  },
  {
    funny: 'Кира на кассе строгая, но соус — бесконечный',
    honest: 'Тимур крутит двадцать лет и не врёт про мясо',
    pompous: 'Здесь кормят чемпионов и будущих легенд',
  },
  {
    funny: 'Съел одну — и бывшая сама тебе пишет',
    honest: 'Двести пятьдесят рублей — и ты снова человек',
    pompous: 'Золотой лаваш — валюта нашего района',
  },
  {
    funny: 'Шаурма двадцать четыре — заходи, пока не съели',
    honest: 'Шаурма двадцать четыре. Открыто, когда всё закрыто',
    pompous: 'Шаурма двадцать четыре. Вкус, который войдёт в историю',
  },
];
const TONE_TAG = { funny: 'party', honest: 'street', pompous: 'dream' };
const TONE_NAME = { funny: 'смешной', honest: 'честный', pompous: 'пафосный' };

const TIMUR = voiced('Тимур', {
  offer: 'Слушай. Кира сказала, ты рэпер. Мне нужен джингл. Короткий, четыре строчки. Чтобы люди в метро слышали — и хотели шаурму.',
  pay: 'Заплачу. Не как Рей, честно заплачу. До воскресенья, до вечера. Потом мне радио не нужно будет — у племянника свадьба.',
  yes: 'Договорились. Пишешь у своего друга в гараже? Только чтоб без мата. Тут дети ходят. И Кира.',
  no: 'Ну и ладно. Сам спою. У меня голос — как у Магомаева. Почти.',
  waiting: 'Джингл где? Я уже людям сказал, что будет. Люди ждут. Шаурма ждёт.',
  funny: 'Ха! «Даже голуби»! Ха-ха! Кира, слышала? Это надо на всю улицу. Держи, заслужил.',
  honest: 'Хм. «Открыто, когда всё закрыто»… Это правда. Это про нас. Спасибо, брат.',
  pompous: '«Король лаваша»! Вот! Вот это уровень! Вот это как по телевизору! Держи, ещё сверху.',
  quiet: 'Тихо как-то. Будто ты из-под прилавка читаешь. Ну, поставим погромче.',
  radio: 'Звучит как радио. Настоящее! Кто сводил? Стас? Скажи ему — шаурма бесплатно. Одна.',
  late: 'Опоздал, брат. Племянник уже женится. Ну… в другой раз.',
});

const KIRA_J = voiced('Кира', {
  funny: 'Ты написал про меня «строгая». На всю улицу. Я теперь знаменитость. Ненавижу тебя. Немножко.',
  pompous: '«Король лаваша»… Мне теперь это слушать каждые пятнадцать минут. Всю смену. Спасибо, призрак.',
  honest: '«Открыто, когда всё закрыто». Я это повешу над кассой. Только никому не говори, что мне понравилось.',
});

const STAS_J = voiced('Стас', {
  mix: 'Джингл для шаурмы? Бро. Ладно. Четыре строчки свести — как кофе остудить. Скинь дорожку, сделаю звук «как по радио». Гад дем, до чего я докатился.',
});

const DAN_J = voiced('Дэн', {
  start: 'Джингл? Для шаурмы? Брат, это же реклама. Это же… деньги! Садись, пиши. Четыре строчки.',
  done: 'Записали. Тимур будет крутить это на всю улицу. Мы теперь звучим из каждой шаурмы. Ну, из одной.',
});

const DONE = () => questStatus('e2_jingle') === 'done' || questStatus('e2_jingle') === 'failed';

// ---------- Тимур: предложение и сдача ----------

// Пункт меню у Тимура (или null)
export function timurJingleOption() {
  if (DONE()) return null;
  const st = questStatus('e2_jingle');
  if (!st && day() === 'sat' && now() >= at(10) && now() < at(18) && F.e2KiraMet) return ['offer', '«Кира говорила, вам что-то нужно?»'];
  if (st === 'active' && F.e2JingleTake) return ['deliver', '«Джингл готов. Слушайте.»'];
  if (st === 'active') return ['waiting', '«Про джингл помню.»'];
  return null;
}

export async function timurJingle(ctx, pick) {
  const { d } = ctx;
  if (pick === 'offer') {
    await d.say('Тимур', TIMUR.offer);
    await d.say('Тимур', TIMUR.pay);
    const c = await d.choose(['«Сделаю.»', '«Не, я рекламу не пишу.»']);
    if (c === 1) {
      F.e2JingleRefused = true;
      quest('e2_jingle', { title: 'Джингл для «Шаурмы 24»', note: 'Отказался', giver: 'timur', status: 'failed', silent: true });
      return d.say('Тимур', TIMUR.no);
    }
    quest('e2_jingle', {
      title: 'Джингл для «Шаурмы 24»',
      note: 'Сочинить 4 строчки и записать у Дэна в гараже, когда студия свободна (Стас может свести). Отнести Тимуру до воскресенья, 20:00. Награда — 1 500–3 000 ₽',
      giver: 'timur',
      status: 'active',
    });
    return d.say('Тимур', TIMUR.yes);
  }
  if (pick === 'waiting') return d.say('Тимур', TIMUR.waiting);
  if (pick === 'deliver') return deliverJingle(ctx);
}

// Тон джингла — какого варианта больше (ничья → честный)
export function jingleTone(tones) {
  const n = { funny: 0, honest: 0, pompous: 0 };
  tones.forEach((t) => n[t]++);
  const best = Math.max(n.funny, n.honest, n.pompous);
  if (n.honest === best) return 'honest';
  return n.funny === best ? 'funny' : 'pompous';
}

async function deliverJingle(ctx) {
  const { d, line, sfx } = ctx;
  const j = F.e2JingleTake;
  if (day() === 'sun' && now() >= JINGLE_DEADLINE) return failJingle(ctx);
  sfx('select');
  await d.think('Тимур включает запись на колонке у кассы. Четыре строчки на всю «Шаурму». Кира закрывает лицо ладонью — и улыбается.');
  const tone = j.tone;
  await d.say('Тимур', TIMUR[tone]);
  let pay = tone === 'pompous' ? 3000 : tone === 'funny' ? 2000 : 1500;
  if (!j.voice || (j.score ?? 0) < 40) {
    pay -= 500;
    await d.say('Тимур', TIMUR.quiet);
  }
  if (j.stas) {
    pay += 500;
    await d.say('Тимур', TIMUR.radio);
  }
  pay = Math.max(1500, Math.min(3000, pay));
  ctx.cash(pay, 'джингл «Шаурма 24»');
  if (tone === 'funny') {
    addFollowers('vibe', 80, 'джингл «Шаурмы 24»');
    addFollowers('ritm', 60, 'джингл «Шаурмы 24»');
    rel('kira', 1);
  }
  if (tone === 'honest') line({ id: 'e2_jingle_open', text: 'Открыто, когда всё закрыто — как я', tag: 'street' });
  if (tone === 'pompous') rel('kira', -1);
  post('vibe', { author: 'шаурма_24', text: `Новый джингл от Тени! ${TONE_NAME[tone]} и вкусный. Заходи — послушай вживую`, likes: tone === 'funny' ? 310 : tone === 'pompous' ? 140 : 190 });
  feed('шаурма_24', `джингл от Тени крутим весь день. ${tone === 'funny' ? 'голуби в восторге' : tone === 'pompous' ? 'король лаваша на месте' : 'открыто, когда всё закрыто'}`);
  F.e2JingleDelivered = tone;
  quest('e2_jingle', { status: 'done', title: 'Джингл для «Шаурмы 24»', note: `Тон: ${TONE_NAME[tone]}. Заплатили ${pay.toLocaleString('ru-RU')} ₽` });
  // Кира тут же, если на смене, — иначе пишет
  const kiraHere = ctx.scene.npcs?.kira?.visible;
  if (kiraHere) await d.say('Кира', KIRA_J[tone]);
  else receive('kira', KIRA_J[tone]);
}

async function failJingle(ctx) {
  F.e2JingleLate = true;
  quest('e2_jingle', { status: 'failed', title: 'Джингл для «Шаурмы 24»', note: 'Не успел до воскресенья, 20:00' });
  rel('kira', -1);
  return ctx.d.say('Тимур', TIMUR.late);
}

// Срок вышел (событие воскресенья, 20:00)
export function jingleDeadline() {
  if (questStatus('e2_jingle') !== 'active') return;
  F.e2JingleLate = true;
  quest('e2_jingle', { status: 'failed', title: 'Джингл для «Шаурмы 24»', note: 'Не успел до воскресенья, 20:00' });
  rel('kira', -1);
  receive('kira', 'Тимур спрашивал про джингл. Я сказала, что ты занят. Он сказал: «Все рэперы заняты». Обидно, вообще-то. За тебя.');
}

// ---------- Гараж: сочинить и записать ----------

// Пункт у Дэна (или null): студия должна быть свободна
export function danJingleOption() {
  if (questStatus('e2_jingle') !== 'active' || F.e2JingleTake) return null;
  return studioOccupant() ? null : ['jingle', 'Записать джингл для «Шаурмы 24» (1 час)'];
}

export async function recordJingle(ctx) {
  const { d, start } = ctx;
  await d.say('Дэн', DAN_J.start);
  const tones = [];
  const lines = [];
  for (let i = 0; i < JINGLE_LINES.length; i++) {
    const v = JINGLE_LINES[i];
    await d.think(`Строчка ${i + 1} из 4.`);
    const c = await d.choose([`«${v.funny}» (смешно)`, `«${v.honest}» (честно)`, `«${v.pompous}» (пафосно)`]);
    const tone = ['funny', 'honest', 'pompous'][c];
    tones.push(tone);
    lines.push({ id: `jingle_${i}_${tone}`, text: v[tone], tag: TONE_TAG[tone] });
  }
  F.e2JingleTone = jingleTone(tones);
  // Стас сводит, если знакомы и он не против
  if (F.e2StasMet && relOf('stas') >= 1 && once('jingle_stas_ask')) {
    const c = await d.choose(['[Написать Стасу: «Сведёшь джингл?»]', '[Свести самим]']);
    if (c === 0) {
      F.e2JingleStas = true;
      await d.say('Стас', STAS_J.mix);
    }
  }
  ctx.time(60);
  d.close();
  return start('Studio', { mode: 'jingle', title: 'Шаурма 24 — джингл', lines, back: { loc: 'garage', spawnX: 780 } });
}

// После студии (вызывается из гаража при входе): запись готова — нести Тимуру
export async function afterJingle(ctx) {
  if (!F.e2JingleRec || F.e2JingleTake) return false;
  const rec = F.e2JingleRec;
  F.e2JingleTake = { tone: F.e2JingleTone || 'honest', score: rec.score, voice: rec.voice, stas: !!F.e2JingleStas };
  quest('e2_jingle', { note: 'Джингл записан. Отнести Тимуру в «Шаурму 24» до воскресенья, 20:00', silent: true });
  await ctx.d.say('Дэн', DAN_J.done);
  return true;
}
