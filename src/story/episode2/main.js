// ЭПИЗОД 2 «ОТКРЫТЫЙ МИКРОФОН» — основной сюжет: утра, мама, Дэн, студия, двор, события по времени.
import { voiced } from '../../voice.js';
import { addContact } from '../../phone/model.js';
import {
  F, state, hasItem, takeItem, giveItem, pulse, energy, now, at, day, addFollowers, feed, quest, questStatus, receive,
  rel, relOf, once, pickOne,
} from './common.js';
import { mood, byMood, nextDay, isNight, studioOccupant, whereIs, initialPulse, pulseLevel } from './world.js';
import { rayMenu } from './courier.js';

// ---------- Старт эпизода ----------

export function startEpisode2() {
  state.episode = 'ep2';
  state.time.day = 'fri';
  state.time.min = at(10);
  state.energy = 90;
  state.pulse = initialPulse();
  F.e2Seed = Math.floor(Math.random() * 1000);
  F.e2Started = true;
  // Строчки, проданные Рею, остаются у него; марочка «на потом» — в кармане, если была
  if (F.markaInInventory && !hasItem('marka')) giveItem('marka');
  if (F.reyLeadgen || F.reyLeadgenHalf) giveItem('flyers');
  if (!hasItem('mic')) giveItem('mic');
  // Контакты из Эпизода 1 (при «Сразу Эпизод 2» их ещё нет)
  addContact('mom', { silent: true });
  addContact('dan', { silent: true });
  if (F.rayMet) addContact('ray', { silent: true });
  if (F.reyDebt) {
    state.debts.ray = { amount: 20000, due: 'через 2 недели' };
    quest('e2_debt', { title: 'Долг Рею — 20 000 ₽', note: 'Отдать, отработать или договориться. Рей у арки вечером', giver: 'ray', status: 'active', silent: true });
  }
  if (hasItem('flyers')) quest('e2_flyers', { title: 'Сто лидов: флаеры Рея', note: 'Раздать в очереди у «Подвала» и не попасться Бульдогу', giver: 'ray', status: 'active', silent: true });
  state.goal = 'Вечером — «Подвал». До семи — свободен';
  return { loc: 'apartment', spawnX: 200 };
}

// ---------- Время: события по часам ----------

export const EVENTS = [
  // Аркаша ставит Марку соцсети
  { id: 'social', day: 'fri', at: at(10, 20), run: () => unlockSocial() },
  { id: 'stas_msg', day: 'fri', at: at(12), run: () => receive('stas', 'Тень? Это Стас, звук «Подвала». Зайди в «Зерно» до 16, обсудим твой слот. Слот. Ладно, это Адам так говорит') },
  { id: 'ray_msg', day: 'fri', at: at(16, 10), run: () => F.rayMet && receive('ray', 'братик я в шаурме. воронка горячая. заходи до подвала') },
  { id: 'dan_call', day: 'fri', at: at(19), run: (scene) => !F.e2InPodval && scene.phone.ring('dan', danCallPodval) },
  { id: 'dan_call2', day: 'fri', at: at(20, 30), run: (scene) => !F.e2InPodval && scene.phone.ring('dan', danCallLate) },
  { id: 'podval_missed', day: 'fri', at: at(22), run: () => !F.e2InPodval && missPodval() },
  { id: 'vibe_sat', day: 'sat', at: at(10, 5), run: () => vibeAfterPodval() },
  { id: 'palych', day: 'sat', at: at(10, 10), run: (scene) => !F.busted && scene.phone.ring('palych', palychCall) },
  { id: 'managers', day: 'sat', at: at(13), run: () => managerOffers() },
  { id: 'kira_cat', day: 'sat', at: at(12, 30), run: () => relOf('kira') >= 1 && receive('kira', 'Гамлет пропал. Мой кот. Чёрный, одно ухо порвано. Если увидишь во дворах — напиши. Пожалуйста.', { replies: [{ id: 'e2_cat_yes', text: 'Поищу' }, { id: 'e2_cat_no', text: 'Сорян, занят' }] }) },
  { id: 'mira_film', day: 'sat', at: at(11), run: () => relOf('mira') >= 1 && receive('mira', 'Привет. У меня плёнка с нашей школы, не проявленная. В «Проявке» на торговой сделают за пару часов. Заберёшь? Мне некогда, я на съёмке', { replies: [{ id: 'e2_film_yes', text: 'Заберу' }, { id: 'e2_film_no', text: 'Не успею' }] }) },
  { id: 'stas_stream', day: 'sat', at: at(11, 30), run: () => receive('stas', 'Сегодня с 12 до 16 стрим из «Зерна». Хочешь вживую почитать? Почитать. Блин, опять Адам', { replies: [{ id: 'e2_stream_yes', text: 'Да, приду' }, { id: 'e2_stream_no', text: 'Не сегодня' }] }) },
  { id: 'arkasha_cover', day: 'sat', at: at(12), run: () => arkashaCoverOffer() },
  { id: 'granny_ticket', day: 'sun', at: at(10, 30), run: () => quest('e2_ticket', { title: 'Лишний билет на «Арену»', note: 'Баба Валя нашла у подъезда. Спроси у неё во дворе', giver: 'granny', status: 'active' }) },
  { id: 'mom_tap', day: 'sun', at: at(11), run: () => receive('mom', 'Марк, кран на кухне опять течёт. Найдёшь мастера? На торговой есть «Кран-Сервис»', { replies: [{ id: 'e2_tap_yes', text: 'Найду, мам' }, { id: 'e2_tap_no', text: 'Сам почини, я занят' }] }) },
  { id: 'kid_track', day: 'sun', at: at(12), run: () => quest('e2_kidtrack', { title: 'Трек про двор для пацана', note: 'Пацан ждёт во дворе. Записать у Дэна (строчки про улицу)', giver: 'kid', status: 'active' }) },
  { id: 'clip', day: 'sun', at: at(20), run: (scene) => clipRelease(scene) },
];

export function checkEvents(scene) {
  for (const ev of EVENTS) {
    if (ev.day !== day() || now() < ev.at || F[`ev_${ev.id}`]) continue;
    F[`ev_${ev.id}`] = true;
    try {
      ev.run(scene);
    } catch (e) {
      console.error(e);
    }
  }
}

function unlockSocial() {
  if (state.social.unlocked) return;
  state.social.unlocked = true;
  const fame = state.stats.fame || 0;
  Object.assign(state.social.followers, { ritm: 14 + fame * 9, kadr: 31 + fame * 6, vibe: 6 + fame * 3 });
  Object.assign(state.social.dayStart, state.social.followers);
  addContact('arkasha', { silent: true });
  receive('arkasha', 'Тень!! Это jeffrY. У тебя что, нет Ритма, Кадра и Вайба?! Я тебе поставил. Не спрашивай как. Это контент. Это всё контент');
  feed('jeffrY#creator', 'Сегодня в «Подвале» — новый голос района. Тень. Запомните. Это контент.');
  feed('подвал_официальный', 'ОТКРЫТЫЙ МИКРОФОН. 19:00. 3g0th2002 · RAY · ??? · twinspeak');
  if (F.reyGhost) feed('RAY', 'сегодня в подвале новые строчки. мои. лидогенерация продолжается');
}

// ---------- Пятница: утро ----------

export async function fridayMorning(ctx) {
  const { d, npc, scene, line, wait } = ctx;
  F.e2FriMorning = true;
  await d.think('Пятница. Десять утра. Сегодня вечером — «Подвал». Первый настоящий выход.');
  const mom = npc('mom');
  if (hasItem('marka') && mom) {
    // Мама нашла марочку при стирке
    F.e2MomFoundMarka = true;
    await wait(300);
    await d.say('Мама', 'Марк. Иди сюда. Это что?');
    await d.think('В её руке — маленький квадратик с улыбающимся солнцем. Марочка Рея. Я забыл её в кармане джинсов.');
    await d.say('Мама', 'Это… марка? Я в новостях видела. Это то, о чём я думаю?');
    const c = await d.choose(['«Наклейка. От друга.»', '«Это Рея. Я выброшу. Честно.»', '[Выхватить и уйти]'], { timer: 8, timeoutIndex: 2 });
    takeItem('marka');
    F.markaInInventory = false;
    if (c === 0) {
      F.liedMom = true;
      pulse(-3);
      const believes = relOf('mom') >= 2 && Math.random() < 0.5;
      if (believes) {
        await d.say('Мама', 'Наклейка… Ладно. Ты уже взрослый, сам разберёшься. Наверное.');
      } else {
        rel('mom', -1);
        await d.say('Мама', 'Наклейка. Марк, я двадцать лет с твоим отцом прожила. Я знаю, как выглядят «наклейки».');
        await d.say('Мама', 'Я её выброшу. А ты подумай, с кем ты водишься.');
      }
    } else if (c === 1) {
      state.stats.honesty += 1;
      pulse(2);
      F.momKnowsRay = true;
      await d.say('Мама', 'Рея… Господи. Хорошо, что сказал. Плохо, что она вообще у тебя была.');
      await d.think('Она молча смывает марочку в раковину. Долго держит руку под водой.');
      await d.say('Мама', 'Сегодня твой вечер. Не испорть его.');
      line({ id: 'e2_sink', text: 'Мама смывает мою ошибку в раковину', tag: 'pain' });
    } else {
      rel('mom', -2);
      pulse(-4);
      giveItem('marka');
      F.markaInInventory = true;
      F.e2MomScandal = true;
      scene.fx.shake(150, 0.006);
      await d.think('Выхватываю. Хлопаю дверью ванной. Слышу, как мама садится на табуретку.');
    }
    await d.say('Мама', 'Мне на смену. До вечера.');
  } else {
    await d.think('На холодильнике записка: «Удачи, артист. Поешь. Мама».');
    if (F.momLoan) await d.think('Внизу приписка, мелко: «Сапоги подождут».');
  }
  if (mom) {
    d.close();
    await ctx.walk(mom, 1850, 140);
    mom.setVisible(false);
  }
  await d.say('', 'Время теперь идёт: разговор — 10 минут, дорога — 5–20, стрижка — час. Часы — в углу и в телефоне (P). До 19:00 — свободен.', '#ffd166');
  ctx.goal('Вечером в 19:00 — «Подвал» (улица за аркой). До этого — город');
}

// ---------- Утро субботы и воскресенья (по тому, где ночевал) ----------

export async function morning(ctx) {
  const { d } = ctx;
  const where = F.e2SleptAt || 'home';
  F[`e2Morning_${day()}`] = true;
  if (day() === 'sat') {
    if (where === 'party') {
      energy(-30);
      await d.think('Просыпаюсь на чужом диване. Во рту — пустыня. В голове — бас.');
    } else if (where === 'garage') {
      await d.think('Просыпаюсь на диване в гараже. Дэн спит за пультом, обняв наушники.');
    } else {
      await d.think('Суббота. Вчерашний вечер ещё гудит в ушах.');
    }
    if (F.e2Night === 'mira') await d.think('В телефоне — фото от Миры: я на краю крыши, город внизу. Подпись: «Не прыгай. Ты нужен».');
    await d.think('Свободный день. Студия у Дэна, город, люди. И «Вайб» уже что-то пишет про вчера.');
    ctx.goal('Свободный день. Смотри «Дела» в телефоне');
  } else {
    if (where === 'party') energy(-20);
    await d.think('Воскресенье. Мама сегодня дома — у неё выходной.');
    ctx.goal('Воскресенье: мама дома. Закрыть долги, дела — и выдохнуть');
  }
}

// ---------- Сон ----------

export async function sleepHere(ctx, place = 'home') {
  const { d, card, go } = ctx;
  if (day() === 'fri' && !F.e2PodvalDone && now() < at(23)) return d.think('Не до сна. Сегодня «Подвал».');
  if (now() < at(20) && now() >= at(8)) {
    const c = await d.choose(['Поспать пару часов (+энергия)', 'Нет']);
    if (c === 1) return;
    energy(35);
    d.close();
    await ctx.lieDown();
    ctx.time(120);
    ctx.standUp();
    ctx.scene.cameras.main.flash(500, 7, 6, 13);
    return d.think('Проваливаюсь в сон. Просыпаюсь через два часа — будто через неделю.');
  }
  if (day() === 'sun') return endSunday(ctx, place);
  const c = await d.choose([`Лечь спать (${day() === 'fri' ? 'суббота' : 'воскресенье'})`, 'Ещё не всё']);
  if (c === 1) return;
  F.e2SleptAt = place;
  if (place === 'home' && !momIsHome()) F.e2MomAlone = false;
  if (place !== 'home') F.e2NightsOut = (F.e2NightsOut || 0) + 1;
  await d.think(pickOne(['Потолок. Строчки. Потолок.', 'Засыпаю под гул холодильника.', 'Город за окном шумит, как бит, который ещё не записан.']));
  d.close();
  await ctx.lieDown();
  state.energy = place === 'home' ? 100 : 80;
  nextDay();
  F.acidNow = false;
  ctx.acid(false);
  await card(day() === 'sat' ? 'СУББОТА' : 'ВОСКРЕСЕНЬЕ', day() === 'sat' ? 'свободный день' : 'дом и последствия');
  go(place === 'garage' ? 'garage' : place === 'party' ? 'ray_party' : 'apartment', place === 'garage' ? 300 : 200);
}

// После 4 утра Марк вырубается там, где стоит
export async function passOut(scene) {
  const ctx = scene.ctx;
  await ctx.d.think('Глаза закрываются сами. Четыре утра. Город выключает меня, как свет в подъезде.');
  ctx.d.close();
  F.e2SleptAt = scene.locKey === 'garage' ? 'garage' : scene.locKey === 'apartment' ? 'home' : 'party';
  if (F.e2SleptAt === 'party' && scene.locKey !== 'ray_party') F.e2SleptAt = 'street';
  state.energy = 45;
  if (day() === 'sun') return endSunday(ctx, F.e2SleptAt);
  nextDay();
  state.time.min = at(11, 30);
  if (F.e2SleptAt === 'street') {
    rel('mom', -1);
    pulse(-3);
    receive('mom', 'Марк!!! Где ты был всю ночь?! Ответь немедленно');
  }
  await ctx.card(day() === 'sat' ? 'СУББОТА' : 'ВОСКРЕСЕНЬЕ', 'проснулся где упал');
  ctx.go(F.e2SleptAt === 'garage' ? 'garage' : F.e2SleptAt === 'party' ? 'ray_party' : 'apartment', 200);
}

// ---------- Мама ----------

export const momIsHome = () => whereIs('mom') === 'apartment';

const MOM_HELLO = voiced('Мама', {
  good: 'Сынок! Садись, я сырников наделала. Ешь, пока горячие.',
  ok: 'Пришёл? Поешь там. Я посижу немножко, ноги гудят.',
  bad: 'Ну? Опять до ночи? Я не железная, Марк.',
  sunday: 'Воскресенье… Можно никуда не бежать. Посиди со мной.',
});

export async function momTalk2(ctx) {
  const { d, line } = ctx;
  if (F.e2GirlHome) return;
  const m = mood('mom');
  await d.say('Мама', day() === 'sun' && m >= 0 ? MOM_HELLO.sunday : m >= 1 ? MOM_HELLO.good : m <= -1 ? MOM_HELLO.bad : MOM_HELLO.ok);
  if (F.e2PodvalDone && !F.e2MomAskedShow) {
    F.e2MomAskedShow = true;
    if (F.e2MomAtShow) {
      await d.say('Мама', 'Я ведь была там, в «Подвале». Стояла сзади. Ты меня не видел.');
      await d.say('Мама', F.podvalResult === 'fail' ? 'Ты был смелый. Это главное. Остальное придёт.' : 'Я не всё поняла. Но люди кричали. Мой сын. Люди кричали.');
    } else {
      await d.say('Мама', 'Ну как твой… «Подвал»? Рассказывай.');
      const c = await d.choose(['«Разнёс зал, мам!»', '«Нормально. Бывало хуже.»', '«Не хочу об этом.»']);
      if (c === 0) await d.say('Мама', F.podvalResult === 'fire' ? 'Правда? Ох… Я знала. Я всегда знала.' : 'Ну-ну. Мне баба Валя потом расскажет, как было.');
      if (c === 2) rel('mom', -1);
    }
  }
  const opts = [];
  if (day() === 'sun' && relOf('mom') >= 1 && !F.e2MomFather) opts.push(['father', '«Мам, расскажи про отца.»']);
  if (questStatus('e2_tap') === 'active') opts.push(['tap', '«Мастера ищу, мам.»']);
  if (F.e2GirlInvited && !F.e2GirlHome && day() === 'sun') opts.push(['girl', '«Мам, ко мне девушка зайдёт.»']);
  opts.push(['eat', 'Поесть (20 мин, +энергия)']);
  opts.push(['bye', '«Я пошёл.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'eat') {
    energy(25);
    ctx.time(20);
    await d.think('Гречка с котлетой. Мир сразу становится чуть терпимее.');
  } else if (pick === 'father') {
    F.e2MomFather = true;
    pulse(3);
    rel('mom', 1);
    await d.say('Мама', 'Про отца… Он пел. Ты знал? Под гитару, во дворе. Весь подъезд выходил слушать.');
    await d.say('Мама', 'А потом ему сказали, что из этого ничего не выйдет. И он поверил. И пел всё меньше, а пил всё больше.');
    await d.say('Мама', 'И однажды просто ушёл. Не от меня, Марк. От себя.');
    await d.think('Она смотрит в окно. Я никогда не слышал, чтобы она говорила о нём так спокойно.');
    await d.say('Мама', 'Ты не он. Слышишь? Ты не он. Ты — ты.');
    line({ id: 'e2_father_song', text: 'Отец пел во дворе, пока ему не сказали, что поздно', tag: 'pain' });
  } else if (pick === 'tap') {
    await d.say('Мама', 'На торговой «Кран-Сервис». Только не первого встречного, ладно? Последний мне пол-кухни залил.');
  } else if (pick === 'girl') {
    await d.say('Мама', 'Девушка? Ко мне домой? Ой… А у меня тут… Ладно. Приводи. Только предупреди, когда.');
    F.e2MomWarned = true;
  }
}

// ---------- Дэн и студия ----------

const DAN_HELLO = voiced('Дэн', {
  good: 'Брат! Заходи. Я тут бит нашёл — ты обалдеешь.',
  ok: 'О, ты. Садись, только провода не дёргай.',
  bad: 'А, это ты. Ну, проходи. Раз пришёл.',
});

export async function danTalk2(ctx) {
  const { d, start } = ctx;
  const m = mood('dan');
  await d.say('Дэн', m >= 1 ? DAN_HELLO.good : m <= -1 ? DAN_HELLO.bad : DAN_HELLO.ok);
  if ((F.e2StudioFight || F.danHurt || F.e2DanAngry) && !F.e2DanTalked && day() !== 'fri') return danHeartToHeart(ctx);
  const opts = [];
  const occ = studioOccupant();
  if (!occ) opts.push(['record', 'Записать трек (1 час)']);
  if (!F.manager && F.e2ManagerOffers) opts.push(['manager', '«Будешь моим менеджером?»']);
  if (questStatus('e2_kidtrack') === 'active') opts.push(['kid', '«Пацану обещал трек про двор.»']);
  if (isNight() && once(`dan_talk_${day()}`)) opts.push(['night', '«Не спится?»']);
  opts.push(['bye', '«Потом.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'record' || pick === 'kid') {
    await d.say('Дэн', pick === 'kid' ? 'Про двор? Святое. Только строчки про улицу бери — пацан поймёт.' : byMood('dan', { good: 'Давай! Ставлю бит, свет, всё как надо.', ok: 'Давай. Только быстро — у меня ещё сведение.', bad: 'Давай. Но если опять полчаса будешь «искать подачу» — выгоню.' }));
    if (pick === 'kid') F.e2KidRecording = true;
    ctx.time(60);
    d.close();
    return start('Studio', { mode: 'track', title: pick === 'kid' ? 'Наш двор' : null, back: { loc: 'garage', spawnX: 780 } });
  }
  if (pick === 'manager') return managerDan(ctx);
  if (pick === 'night') {
    await d.say('Дэн', 'Как думаешь, если нас никто не услышит — это считается, что мы были?');
    const c2 = await d.choose(['«Считается. Мы же слышим.»', '«Не знаю. Поэтому и пишем.»']);
    rel('dan', 1);
    await d.say('Дэн', c2 === 0 ? 'Ну да. Мы друг друга слышим. Этого хватит. На первое время.' : 'Вот и я не знаю. Поэтому и не сплю.');
    ctx.line({ id: 'e2_dan_heard', text: 'Если нас никто не слышит — мы всё равно были', tag: 'dream' });
  }
}

// Разговор по душам — если ссорились из-за студии или строчек
async function danHeartToHeart(ctx) {
  const { d } = ctx;
  F.e2DanTalked = true;
  await d.say('Дэн', 'Слушай. Нам надо поговорить. Нормально, без «потом».');
  if (F.danHurt) await d.say('Дэн', 'Строчки, которые ты продал Рею… Он их вчера со сцены читал. Наши строчки. А я стоял и хлопал. Как дурак.');
  if (F.e2StudioFight) await d.say('Дэн', 'И эта драка в гараже. Это мой гараж, Марк. Бабушкин. Тут ковёр висит, а вы…');
  const c = await d.choose(['«Прости. Я накосячил.»', '«Высказать всё, что накипело.»', '[Уйти]']);
  if (c === 0) {
    rel('dan', 2);
    pulse(3);
    F.e2DanMade = true;
    await d.say('Дэн', '…Ладно. Иди сюда. Только без соплей. Ну всё, всё.');
  } else if (c === 1) {
    await d.say('Марк', 'А ты? Ты всегда «рули», «твоя проблема». Я один бегал за этими деньгами! Один!');
    await d.think('Дэн молчит. Долго. Потом кивает.');
    rel('dan', 1);
    F.e2DanMade = true;
    await d.say('Дэн', 'Справедливо. Я… тоже не идеальный. Мир?');
  } else {
    rel('dan', -2);
    pulse(-3);
    F.e2DanLeft = true;
    await d.think('Ухожу. За спиной — тишина. Даже бит не играет.');
  }
}

// Марк приходит в гараж, а студия занята
export async function studioCheck(ctx) {
  const { d, npc } = ctx;
  const occ = studioOccupant();
  if (!occ || F[`e2StudioMet_${occ}_${day()}`]) return;
  F[`e2StudioMet_${occ}_${day()}`] = true;
  const who = { ray: 'Рей', arkasha: 'Аркаша', adam: 'Адам' }[occ];
  const o = npc(occ);
  o?.setFlipX(true);
  if (occ === 'ray') {
    await d.think('В гараже орёт бит «ЛИДОГЕН 2». Рей у микрофона, в розовых очках, в одних трусах и леопардовой куртке.');
    await d.say('Рей', 'Братик! Тут лиды пишутся. Подожди в коридоре воронки, а?');
  } else if (occ === 'arkasha') {
    await d.think('В гараже — свет, дым-машина и Аркаша с камерой на палке.');
    await d.say('Аркаша', 'Тень! Стой! Не двигайся! Встань в кадр, будешь как будто случайно. Это клип. Это контент!');
  } else {
    await d.think('В гараже — Адам и незнакомый битмейкер. Свет выключен. Только лампочка.');
    await d.say('Адам', 'Садись. Слушай. Слушай.');
  }
  const opts = [['wait', 'Подождать (время идёт)']];
  if (occ === 'ray') opts.push(['fight', '«Это наш гараж.»']);
  else opts.push(['fight', '«Освободите студию, мне надо писать.»']);
  opts.push(['deal', occ === 'ray' ? 'Договориться (флаеры / 1000 ₽)' : occ === 'arkasha' ? '«Сыграю в клипе — потом я пишусь.»' : '«Дай мне полчаса после тебя.»']);
  opts.push(['feat', `Предложить фит с ${occ === 'ray' ? 'Реем' : occ === 'arkasha' ? 'Аркашей' : 'Адамом'}`]);
  const c = await d.choose(opts.map((x) => x[1]));
  const pick = opts[c][0];
  const free = () => (F.e2StudioFree = `${day()}_${Math.floor(now() / 60)}`);
  if (pick === 'wait') {
    ctx.time(45);
    await d.think('Жду. Время тянется, как жвачка на подошве. Можно сходить в туалет за ковром — там всегда что-нибудь интересное.');
    if (occ === 'ray') await d.say('Рей', 'Ещё пять минут, братик! Или пятьдесят. Время — это тоже воронка.');
    return;
  }
  if (pick === 'fight') {
    F.e2StudioFight = occ;
    rel(occ, -2);
    if (occ === 'ray') {
      await d.say('Рей', 'Ваш? ВАШ?! Тут бабкин ковёр твой, что ли? Дэн мне час продал! За лиды!');
      await d.say('Рей', 'Ты, братик, гаражный ноунейм, вчера на сцене трясся, как лист! А туда же — «наш гараж»!');
      ctx.fx.shake(250, 0.01);
      ctx.sfx('punch');
      await d.think('Рей толкает меня в грудь. Я толкаю в ответ. Микрофонная стойка падает.');
      // Дэн выбирает сторону — по тому, как он относится к каждому
      const side = relOf('dan') >= relOf('ray') ? 'mark' : 'ray';
      F.e2DanSide = side;
      if (side === 'mark') {
        await d.say('Дэн', 'Всё! Рей, вон. Час твой кончился. Деньги верну.');
        await d.say('Рей', 'Пайка вы оба. ПАЙКА. Я запомнил, братики. CRM всё помнит.');
        free();
        npc('ray')?.setVisible(false);
        F[`e2Where_ray`] = { place: 'arch', day: day(), until: at(30) };
      } else {
        rel('dan', -1);
        await d.say('Дэн', 'Марк, остынь. Он заплатил. Приходи вечером. Серьёзно, иди проветрись.');
      }
    } else {
      await d.say(who, occ === 'arkasha' ? 'Окей, окей! Без контента так без контента. Но это было грубо. Грубо — тоже эстетика, кстати.' : 'Уйду. Уйду. Но ты услышал меня не до конца. Не до конца.');
      free();
      npc(occ)?.setVisible(false);
    }
    pulse(-3);
    return;
  }
  if (pick === 'deal') {
    if (occ === 'ray') {
      if (hasItem('flyers')) {
        await d.say('Рей', 'Флаеры раздашь в шаурме — и студия твоя. Лидогенерация за лидогенерацию.');
        takeItem('flyers');
        F.e2RayFlyersDeal = true;
      } else if (state.cash >= 1000) {
        ctx.cash(-1000, 'Рею за студию');
        await d.say('Рей', 'Тысяча! Конверсия! Всё, братик, ухожу. Пишись, ноунейм. С любовью.');
      } else {
        return d.say('Рей', 'Ни флаеров, ни бабок? Братик, ты не лид. Ты — холодный трафик.');
      }
    } else if (occ === 'arkasha') {
      state.stats.fame += 1;
      addFollowers('kadr', 40, 'камео в клипе Аркаши');
      await d.say('Аркаша', 'Да! Вот так! Смотри в фонарь! Грусти! Ещё грустнее! …Есть! Всё, студия твоя. Я — монтировать.');
    } else {
      ctx.time(30);
      await d.say('Адам', 'Полчаса. Полчаса. Потом твоё время. Твоё.');
    }
    free();
    npc(occ)?.setVisible(false);
    return;
  }
  // Фит
  F.e2Feat = occ;
  state.stats.fame += 2;
  ctx.time(60);
  if (occ === 'ray') {
    F.featRay = true;
    pulse(-2);
    addFollowers('vibe', 120, '«ЛИДОГЕН 2 feat. Тень»');
    addFollowers('ritm', 60, 'фит с RAY');
    await d.say('Рей', '«ЛИДОГЕН 2 feat. Тень»! Братик, это воронка в воронке! Сучки, лиды, слава!');
    await d.think('Читаю куплет на его бит. Он про деньги, я — про маму. Странно, но склеивается.');
    feed('RAY', 'ЛИДОГЕН 2 feat Тень. скоро. братик в воронке', { notifyMe: true });
  } else if (occ === 'arkasha') {
    addFollowers('kadr', 80, 'клип с Аркашей');
    addFollowers('ritm', 50, 'клип с Аркашей');
    await d.say('Аркаша', 'Фит — это мало. Мы делаем визуальный альбом! Ну, пока клип. Ну, пока тизер.');
  } else {
    F.samizdatInvite = true;
    addFollowers('ritm', 40, 'трек с twinspeak');
    pulse(4);
    await d.say('Адам', 'Ты в «САМИЗДАТЕ». Теперь ты в «САМИЗДАТЕ». Добро пожаловать. Пожаловать.');
    ctx.line({ id: 'e2_samizdat', text: 'Тишина между строчками — тоже моя строчка', tag: 'dream' });
  }
  free();
}

// ---------- Туалет в гараже ----------

export async function garageWc(ctx) {
  const { d, line } = ctx;
  if (once('garage_wc')) {
    await d.think('Каморка за ковром. Унитаз без крышки, лампочка на проводе. Стены исписаны маркером — за годы.');
    line({ id: 'e2_wc_ray', text: 'Здесь был Рей. Здесь была воронка', tag: 'street' });
  }
  if (studioOccupant() === 'ray' && !F.toiletSecret) {
    await d.think('Через тонкую стенку слышно, как Рей говорит по телефону. Тихо. Без «братика».');
    await d.say('Рей', 'Граф, я всё отдам. В воскресенье. Нет, он не знает. Никто не знает. Пацан? Пацан нормальный, лид чистый…');
    const c = await d.choose(['[Промолчать]', 'Рассказать Дэну', 'Запомнить — на будущее («шантаж»)']);
    F.toiletSecret = ['silent', 'dan', 'leverage'][c];
    if (c === 1) {
      rel('dan', 1);
      F.e2DanKnowsGraf = true;
      await d.think('Пишу Дэну: «Рей кому-то должен. Какому-то Графу». Дэн отвечает через минуту: «Я так и думал».');
    } else if (c === 2) {
      pulse(-2);
      await d.think('Граф. Воскресенье. Пацан — это я. Запоминаю.');
    }
    line({ id: 'e2_graf', text: 'У каждого Рея есть свой Граф', tag: 'street' });
    return;
  }
  await d.think(pickOne([
    'На стене: «ТЕНЬ + ДЭН = ПЛАТИНА 2027». Мой почерк. Мне было шестнадцать.',
    'Кто-то написал: «Если ты это читаешь — бит на перемотке». Аркашин почерк.',
    'Надпись под лампочкой: «Тишина. Тишина». Понятно, кто.',
  ]));
}

// ---------- Двор ----------

const GRANNY2 = voiced('Баба Валя', {
  fri: 'Марик! Сегодня выступаешь? Шапку надень, в подвалах сквозняк.',
  sat_fire: 'Говорят, ты вчера весь подвал на уши поставил! Внучка соседкина видела в этом… в Ритме.',
  sat_fail: 'Говорят, вчера не задалось? Ничего. Мой Коля тоже с первого раза на завод не попал.',
  sat_ok: 'Ну как выступил? Мне толком никто не рассказал. Все в телефонах.',
  sun: 'Воскресенье — день тихий. А ты всё бегаешь, бегаешь…',
  ray: 'Опять этот твой, в пятнистом, у арки трётся. Я всё вижу, Марик. Всё.',
});

export async function grannyTalk2(ctx) {
  const { d, line } = ctx;
  if (questStatus('e2_ticket') === 'active' && !F.e2TicketGot) {
    F.e2TicketGot = true;
    await d.say('Баба Валя', 'Марик! Я тут билет нашла у подъезда. На «Арену», на сегодня. Сектор B, ряд семь. Кто-то потерял, растяпа.');
    await d.say('Баба Валя', 'Отнеси на «Арену», а? Там найдут хозяина. Я старая, мне в метро тяжело.');
    giveItem('ticket');
    quest('e2_ticket', { note: 'Отнести на «Арену» (метро, Кольцевая) до вечера', silent: true });
    return;
  }
  const k = `granny2_${day()}`;
  if (once(k)) {
    if (day() === 'fri') await d.say('Баба Валя', GRANNY2.fri);
    else if (day() === 'sat') await d.say('Баба Валя', F.podvalResult === 'fire' ? GRANNY2.sat_fire : F.podvalResult === 'fail' ? GRANNY2.sat_fail : GRANNY2.sat_ok);
    else await d.say('Баба Валя', GRANNY2.sun);
    if (F.e2GirlSeenBy === 'granny_pending') {
      F.e2GirlSeenBy = 'granny';
      await d.say('Баба Валя', 'А это кто с тобой вчера был, а? Ну-ну. Мать-то знает?');
    }
    if (day() === 'sat' && once('granny_1987')) {
      const c = await d.choose(['«Баба Валя, а раньше тут концерты были?»', '«Побегу я.»']);
      if (c === 0) {
        await d.say('Баба Валя', 'В восемьдесят седьмом был! Прямо во дворе, на гаражах сцену сколотили. И я танцевала с одним из «Кино». Ну, он говорил, что из «Кино».');
        await d.say('Баба Валя', 'А потом весь двор пел до утра. Милиция приехала — и тоже пела.');
        line({ id: 'e2_1987', text: 'В восемьдесят седьмом весь двор пел до утра', tag: 'street' });
      }
    }
    return;
  }
  await d.say('Баба Валя', GRANNY2.ray);
}

export async function kidTalk2(ctx) {
  const { d, line } = ctx;
  if (questStatus('e2_kidtrack') === 'active') {
    if (F.e2KidTrackDone) {
      quest('e2_kidtrack', { status: 'done' });
      addFollowers('ritm', 90, 'видео пацана «Наш двор»');
      state.stats.fame += 1;
      pulse(4);
      await d.say('Пацан', 'Вааа! Это про нас! Про качели! Я сейчас сниму и в Ритм! Все пацаны увидят!');
      return line({ id: 'e2_kid_ritm', text: 'Пацан снимает мой трек, как будто это кино', tag: 'street' });
    }
    return d.say('Пацан', 'Ну что, трек про двор будет? Ты обещал! Ну, или почти обещал.');
  }
  if (once(`kid2_${day()}`)) {
    if (day() === 'fri') return d.say('Пацан', 'Сегодня «Подвал»! Мы с пацанами у входа постоим, вдруг пустят. Не пустят. Но постоим.');
    if (day() === 'sat') return d.say('Пацан', F.podvalResult === 'fire' ? 'Я видел видео! Ты там как этот! Как настоящий!' : 'Мне сказали, ты вчера выступал. Как было? Страшно?');
    return d.say('Пацан', 'А тебе за песни платят? Ну, хоть чуть-чуть?');
  }
  await d.say('Пацан', pickOne(['Пни мяч! Нет, не так. Ты вообще спортом занимался?', 'А у Рея правда мерс ворованный?', 'Я тоже буду рэпером. Или ветеринаром. Ещё не решил.']));
}

// ---------- Рей у арки и в шаурме ----------

export async function rayTalk2(ctx, where) {
  const { d } = ctx;
  if (F.busted) return d.say('Рей', 'Братик? Какой братик? Я тебя не знаю. Мы не знакомы. Рей в этой малашечке — один.');
  if (F.quitRay && !F.e2RayForgave) return d.say('Рей', 'А, бывший лид. Проходи, проходи. Не задерживайся в моей воронке.');
  const m = mood('ray');
  await d.say('Рей', m >= 1 ? 'БРАТИК! Иди сюда! Проверка на звонкость!' : m <= -1 ? 'А… это ты. Пайка. Рей сегодня отходит. Не дыши громко.' : 'О, Тень. Рей в этой малашечке. Как воронка?');
  if (m >= 1) {
    ctx.sfx('thump');
    ctx.fx.shake(150, 0.008);
  }
  return rayMenu(ctx, where);
}

// ---------- Звонки Дэна в пятницу ----------

export async function danCallPodval({ d, goal }) {
  await d.say('Дэн', 'Ты где?! Очередь до угла! Аркаша уже снимает очередь, Рей раздаёт… что-то раздаёт.');
  await d.say('Дэн', '«Подвал» — улица за аркой, вниз по лестнице. Давай быстрее, брат!');
  goal('«Подвал»! Улица за аркой — вниз по лестнице');
}

export async function danCallLate({ d }) {
  await d.say('Дэн', 'Марк!!! Полдевятого! Ведущий спрашивает, где «вопросительный знак». Я сказал — в туалете. Час уже в туалете!');
}

function missPodval() {
  F.e2MissedPodval = true;
  pulse(-12);
  rel('dan', -3);
  feed('подвал_официальный', 'Вопросительный знак так и не пришёл. Зато RAY отработал за двоих.', { notifyMe: true });
  feed('Kid_Platina', 'подвальный клоун даже до подвала не дошёл )))');
  receive('dan', 'Ты не пришёл. Я тебя прикрывал два часа. Всё. Не пиши мне сегодня.');
}

// ---------- Суббота: «Вайб», менеджеры, Палыч ----------

function vibeAfterPodval() {
  const r = F.podvalResult;
  const p = pulseLevel().id;
  if (r === 'fire') {
    feed('подвал_официальный', 'Вчера Тень разнёс зал. Видео — в Ритме у Стаса.', { notifyMe: true });
    feed('mira.film', 'кто знал, что тихий мальчик с последней парты так может');
    feed('Kid_Platina', 'опять хайп на подвальных. через неделю никто не вспомнит');
  } else if (r === 'ok') {
    feed('подвал_официальный', 'Новенький по имени Тень — норм. Ждём трек.', { notifyMe: true });
    feed('random_user17', 'кто это?? где трек');
  } else if (r === 'fail') {
    feed('Kid_Platina', 'подвальный клоун трясся как холодец )))', { notifyMe: true });
    feed('подвал_официальный', 'Не у всех получается с первого раза. Тень, ждём ещё.');
  }
  if (p === 'bottom') feed('anon_district', 'говорят, Тень с Реем барыжит. ну-ну');
  if (p === 'rise') feed('QuadroXZ', 'Звук в его куске — 0 дБ лишнего. Чистый. Респект. Респект — 100%.');
  if (F.featRay) feed('RAY', 'Тень теперь в воронке. официально');
}

async function palychCall({ d }) {
  await d.say('Палыч', 'Это Палыч. Со склада. Новенький, худой — ты? Суббота, фура, двое заболели.');
  await d.say('Палыч', 'Выйдешь до двух? Четыре тысячи. Автобус от арки. Или ты теперь звезда?');
  const c = await d.choose(['«Выйду.»', '«Не могу, Палыч.»']);
  if (c === 0) {
    quest('e2_palych', { title: 'Подработка у Палыча', note: 'Суббота до 14:00. Автобус — остановка за аркой во дворе', giver: 'palych', status: 'active' });
    await d.say('Палыч', 'Жду. Опоздаешь — фура уедет без тебя. И деньги тоже.');
  } else {
    await d.say('Палыч', 'Звезда. Ну-ну. Звёзды тоже кушать хотят. Потом поймёшь.');
  }
}

// Предложения менеджеров: Дэн, Рей, «Олимп»
function managerOffers() {
  if (F.e2ManagerOffers) return;
  F.e2ManagerOffers = true;
  quest('e2_manager', { title: 'Выбрать менеджера', note: 'Дэн (бесплатно, друг), Рей (30%, «лидогенерация»), «Олимп» (профи, если позовут)', giver: 'self', status: 'active' });
  if (!F.busted && !F.quitRay) receive('ray', 'братик. тебе нужен менеджер. я. 30% и вся моя воронка твоя. думай до воскресенья', { replies: [{ id: 'e2_mgr_ray_yes', text: 'Согласен' }, { id: 'e2_mgr_ray_no', text: 'Нет, Рей' }] });
  if (state.pulse >= 60 || F.podvalResult === 'fire') {
    addContact('olymp', { silent: true });
    receive('olymp', 'Добрый день. Агентство «Олимп», Карина. Видели вас в «Подвале». Готовы обсудить контракт: 20%, продвижение, площадки. Встреча — кафе «Ночь», сегодня 18–21', { replies: [{ id: 'e2_olymp_yes', text: 'Приду' }, { id: 'e2_olymp_no', text: 'Не интересно' }] });
  }
}

async function managerDan({ d }) {
  await d.say('Дэн', 'Я? Менеджер? Брат, я даже свою маму убедить не могу, что я работаю.');
  await d.say('Дэн', '…Но давай. Бесплатно. Пока. Будем учиться вместе.');
  F.manager = 'dan';
  rel('dan', 2);
  quest('e2_manager', { status: 'done', title: 'Менеджер — Дэн' });
}

function arkashaCoverOffer() {
  if (questStatus('e2_cover')) return;
  quest('e2_cover', { title: 'Обложка с Аркашей', note: 'Сфоткать на телефон три места: граффити «ТЕНЬ» во дворе, неон «Подвала» на улице, платформа метро. Потом — к Аркаше', giver: 'arkasha', status: 'active' });
  receive('arkasha', 'Делаем обложку! Нужны три кадра: твоя стена с граффити, неон «Подвала», платформа метро. Снимай на телефон и неси мне! Это контент!');
}

// ---------- Воскресенье: финал главы ----------

async function clipRelease(scene) {
  if (F.e2ClipOut) return;
  F.e2ClipOut = true;
  const r = F.podvalResult;
  const n = r === 'fire' ? 900 : r === 'ok' ? 300 : 120;
  addFollowers('ritm', n, 'клип с «Подвала» от Стаса и Аркаши');
  addFollowers('kadr', Math.round(n / 3), 'кадры с «Подвала»');
  feed('jeffrY#creator', 'КЛИП. «Подвал», пятница. Тень. Смотреть всем. Это контент.', { notifyMe: true });
  receive('dan', 'Видел?! Клип вышел. Ритм горит. Иди домой, отдохни. Нам завтра ещё жить');
  scene.ctx.goal('Вечер воскресенья. Лечь спать дома — закончить главу');
}

export async function endSunday(ctx, place) {
  const { d } = ctx;
  const c = await d.choose(['Закончить выходные (итоги главы)', 'Ещё не всё']);
  if (c === 1) return;
  F.e2SundayAt = place;
  await d.think('Выходные кончились. Пятница, суббота, воскресенье — а будто год.');
  if (place === 'home') await d.think('За стенкой мама смотрит сериал. Тихо смеётся. Давно я этого не слышал.');
  F.e2Done = true;
  d.close();
  ctx.go('End');
}

export { pulseLevel, mood, whereIs };
