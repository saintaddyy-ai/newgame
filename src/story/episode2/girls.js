// Девушки Эпизода 2: Мира (честность), Лола (слава и деньги), Кира (странность и правда).
// Ночные сцены, свидания (одно в день), знакомство с мамой со случайной реакцией, ночной город.
import { voiced } from '../../voice.js';
import { addContact } from '../../phone/model.js';
import { F, state, pulse, energy, now, at, day, addFollowers, faceFollowers, feed, quest, questStatus, rel, relOf, once, weighted, hasItem, takeItem } from './common.js';
import { mood } from './world.js';
import { addActor } from '../../gfx/actors.js';
import { castKey } from './people.js';

const canDate = () => (F.e2Dates || 0) < 1;

// ---------- Кира: «Шаурма 24» ----------

export async function kiraTalk(ctx) {
  const { d, line } = ctx;
  if (!F.e2KiraMet) {
    F.e2KiraMet = true;
    addContact('kira', { silent: true });
    await d.think('На кассе — девушка в чёрном. Чёрная помада, серебряное кольцо в губе. Читает что-то с телефона и не поднимает глаз.');
    await d.say('Кира', 'Трупик в лаваше? Классический или острый? Острый — это если хочешь почувствовать, что ещё жив.');
    await d.say('Кира', 'Ты сегодня в «Подвале»? Я видела афишу. Там вопросительный знак — это ты? Смешно.');
    const c = await d.choose(['«У тебя когда смена кончается?»', '«Приходи, если хочешь.»', '«Острый. Без разговоров.»']);
    if (c === 0) {
      F.kiraInvited = true;
      rel('kira', 2);
      await d.say('Кира', 'В два. Ночи. Обычно в это время приходят только таксисты и призраки. Ты кто из них?');
      await d.say('Кира', '…Приходи после своего «Подвала». Посидим на ступеньках. Я расскажу про кота.');
    } else if (c === 1) {
      rel('kira', 1);
      await d.say('Кира', 'Если хочу — приду. Я редко хочу. Но бывает.');
    } else {
      await d.say('Кира', 'Уважаю. Люди слишком много говорят. Держи. Острый.');
    }
    line({ id: 'e2_kira_wrap', text: 'Трупик в лаваше — честнее многих людей', tag: 'street' });
    quest('e2_kira', { title: 'Кира', note: 'Касса «Шаурмы 24». Ночная смена', giver: 'kira', status: 'active', silent: true });
    return;
  }
  const m = mood('kira');
  await d.say('Кира', m >= 1 ? 'О. Ты. Привет, призрак.' : m <= -1 ? 'Не сейчас. У меня день похорон. Ну, внутренних.' : 'Трупик? Классический?');
  const opts = [['eat', 'Шаурма (250 ₽, +энергия)']];
  if (day() === 'sat' && canDate() && relOf('kira') >= 1 && now() < at(22)) opts.push(['date', '«Пойдём погуляем? Ты говорила, любишь кладбища.»']);
  if (day() === 'sun' && relOf('kira') >= 2 && !F.e2GirlInvited) opts.push(['home', '«Зайдёшь ко мне? Познакомлю с мамой.»']);
  if (questStatus('e2_cat') === 'active' && F.e2CatFound) opts.push(['cat', '«Нашёл Гамлета!»']);
  opts.push(['bye', '«Пока.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'eat') {
    if (state.cash < 250) return d.think('Денег нет. Даже на трупик.');
    ctx.cash(-250, 'шаурма');
    await ctx.eat(50, { ms: 1600, energy: 30 });
    ctx.time(20);
    return d.think('Горячо, остро, жирно. Ровно то, что надо.');
  }
  if (pick === 'date') return kiraDate(ctx);
  if (pick === 'home') return inviteHome(ctx, 'kira');
  if (pick === 'cat') return catReturn(ctx);
}

// Ступеньки у «Шаурмы» до рассвета (выбор ночи)
export async function kiraSteps(ctx) {
  const { d, line, sfx } = ctx;
  if (!once('kira_steps')) return;
  sfx('meow');
  await d.think('Ступеньки у «Шаурмы». Кира сидит с двумя чаями в пластиковых стаканчиках. Город спит. Даже таксисты.');
  await d.say('Кира', 'У меня кот. Гамлет. Одно ухо порвано. Он знает, когда кто умрёт. Мой кот знает про тебя.');
  await d.say('Кира', 'Шучу. Или нет.');
  const c = await d.choose(['«И что он про меня знает?»', '«Почему тебе нравятся кладбища?»', '[Просто молчать рядом]']);
  if (c === 0) {
    await d.say('Кира', 'Что ты проживёшь долго. И будешь много раз думать, что всё кончилось. А оно не кончится.');
  } else if (c === 1) {
    await d.say('Кира', 'Там тихо. И никто не притворяется. Все уже всё сказали.');
  } else {
    rel('kira', 1);
    await d.think('Молчим. Это лучший разговор за неделю.');
  }
  rel('kira', 2);
  pulse(2);
  line({ id: 'e2_4am', text: 'В четыре утра даже шаурма честнее людей', tag: 'street' });
  await d.think('Рассветает. Кира зевает, кладёт голову мне на плечо на секунду — и тут же встаёт.');
  await d.say('Кира', 'Всё. Мне сдавать кассу. Иди спать, призрак.');
  ctx.goal('Домой — спать');
  F.e2SleptAt = 'home';
  F.dateWith = null; // свидание кончилось — девушка больше не ждёт там
}

async function kiraDate(ctx) {
  const { d, card, go } = ctx;
  F.e2Dates = (F.e2Dates || 0) + 1;
  F.dateWith = 'kira';
  await d.say('Кира', 'Кладбища? Ты запомнил. Это… неожиданно. Пошли. Только я сначала кассу сдам. Через полчаса у метро.');
  ctx.time(30);
  await card('ПРОМЗОНА', 'старое кладбище за забором');
  F.e2KiraDateNow = true;
  go('promzona', 300);
}

export async function kiraPromzona(ctx) {
  const { d, line, sfx } = ctx;
  if (!F.e2KiraDateNow) {
    if (once('promzona_alone')) await d.think('Промзона. Трубы, забор, старое кладбище. Тихо так, что слышно, как ржавеет железо.');
    return;
  }
  F.e2KiraDateNow = false;
  ctx.time(120);
  sfx('meow');
  await d.think('Кира кормит котов у оградок. Котов тут штук двадцать. У каждого — имя.');
  await d.say('Кира', 'Этого зовут Пастернак. Этого — Крупская. А этот — Кид Платина. Потому что громкий и ничего не умеет.');
  const c = await d.choose(['[Рассмеяться]', '«Почему ты работаешь в шаурме?»', '[Поцеловать её]']);
  if (c === 0) {
    rel('kira', 1);
    await d.say('Кира', 'Смех на кладбище — это как цветы. Им тут нравится.');
  } else if (c === 1) {
    rel('kira', 2);
    await d.say('Кира', 'Потому что ночью никто не спрашивает, кем я хочу стать. А я не знаю. Может, никем. Это тоже профессия.');
    line({ id: 'e2_nobody', text: 'Стать никем — это тоже профессия', tag: 'pain' });
  } else if (relOf('kira') >= 3) {
    rel('kira', 2);
    pulse(3);
    await d.think('Она не отстраняется. Губы холодные и пахнут чаем. Где-то мяукает Пастернак.');
    await d.say('Кира', '…Только никому. Особенно Гамлету.');
    F.e2KissKira = true;
  } else {
    rel('kira', -1);
    await d.say('Кира', 'Эй. Рано. Мы на кладбище, а не в кино. Тут всё медленно.');
  }
  feed('anon_district', 'видели Тень на промзоне с готкой из шаурмы. у артиста — эстетика');
  if (F.e2SeenWith && F.e2SeenWith !== 'kira') F.e2Jealous = true;
  F.e2SeenWith = 'kira';
}

// ---------- Кот Гамлет (задание 5) ----------

export async function catFind(ctx) {
  const { d, sfx, line } = ctx;
  sfx('meow');
  F.e2CatFound = true;
  await d.think('За мусорными баками — чёрный кот. Одно ухо порвано. Смотрит так, будто знает, когда я умру.');
  await d.think('Гамлет. Беру его на руки. Он не против. Он вообще ко всему относится философски.');
  quest('e2_cat', { note: 'Гамлет у меня. Отнести Кире в «Шаурму 24» (или на промзону)', silent: true });
  line({ id: 'e2_hamlet', text: 'Кот с порванным ухом знает про меня больше, чем я', tag: 'street' });
}

async function catReturn(ctx) {
  const { d } = ctx;
  F.e2CatReturned = true;
  rel('kira', 3);
  pulse(3);
  quest('e2_cat', { status: 'done' });
  await d.say('Кира', 'Гамлет! Ты… ты нашёл. Где он был? Неважно. Неважно.');
  await d.think('Она прячет лицо в коте. Кот терпит.');
  await d.say('Кира', 'Я тебе должна. Я никому не бываю должна. Это новое чувство. Неприятное. Спасибо.');
}

// ---------- Мира ----------

export async function miraTalk(ctx) {
  const { d } = ctx;
  if (!F.e2MiraMet) return d.think('Девушка с плёночным фотоаппаратом снимает витрину. Где-то я её видел.');
  const m = mood('mira');
  await d.say('Мира', m >= 1 ? 'Марк! Садись. Я как раз думала, кого бы сфоткать.' : m <= -1 ? 'А. Привет. Я работаю, если что.' : 'Привет, вопросительный знак.');
  const opts = [];
  if (canDate() && relOf('mira') >= 1 && day() !== 'fri') opts.push(['date', '«Пойдём на крышу? Город посмотрим.»']);
  if (questStatus('e2_film') === 'active' && hasItem('photo_old')) opts.push(['film', '«Твоя плёнка. Проявил.»']);
  if (day() === 'sun' && relOf('mira') >= 2 && !F.e2GirlInvited) opts.push(['home', '«Зайдёшь ко мне? Мама тебя помнит.»']);
  if (F.e2SeenWith && F.e2SeenWith !== 'mira' && F.e2Jealous && !F.e2MiraJealousDone) opts.unshift(['jealous', '«Что-то не так?»']);
  opts.push(['bye', '«Увидимся.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'date') return miraDate(ctx);
  if (pick === 'film') return filmReturn(ctx);
  if (pick === 'home') return inviteHome(ctx, 'mira');
  if (pick === 'jealous') return miraJealous(ctx);
}

async function miraJealous(ctx) {
  const { d } = ctx;
  F.e2MiraJealousDone = true;
  const who = F.e2SeenWith === 'lola' ? 'с этой блондинкой из «Ночи»' : 'с готкой из шаурмы';
  await d.say('Мира', `Баба Валя сказала. И «Вайб» сказал. Ты ${who}. Мне всё равно. Правда. Просто… честно скажи.`);
  const c = await d.choose(['«Да. Было. Прости, что не сказал.»', '«Это ничего не значит.»', '«Тебя это не касается.»']);
  if (c === 0) {
    state.stats.honesty += 1;
    rel('mira', 0);
    await d.say('Мира', 'Спасибо, что честно. Мне важно это больше, чем всё остальное.');
  } else if (c === 1) {
    rel('mira', -2);
    await d.say('Мира', '«Ничего не значит» — так говорят, когда значит.');
  } else {
    rel('mira', -3);
    pulse(-2);
    await d.say('Мира', 'Хорошо. Не касается. Тогда и я тебя не касаюсь.');
  }
}

export async function miraRooftop(ctx) {
  const { d, line, sfx } = ctx;
  if (!once(`mira_roof_${day()}`)) return;
  sfx('shutter');
  ctx.fx.screenFlash(0xffffff, 150);
  await d.think('Крыша девятиэтажки. Город внизу — как рассыпанные угли. Мира снимает на плёнку, щёлкает затвором, как сердцем.');
  await d.say('Мира', 'Отсюда всё маленькое. И «Подвал», и Рей, и все наши проблемы. Видишь вон то окно? Это моя школа. Наша.');
  const c = await d.choose(['«Помнишь линейку? Я тогда хотел умереть.»', '«Сфоткай меня. Для обложки.»', '[Взять её за руку]']);
  if (c === 0) {
    rel('mira', 2);
    await d.say('Мира', 'А я тогда подумала: «Он единственный, кто сказал что-то настоящее». Поэтому и сфоткала.');
  } else if (c === 1) {
    rel('mira', 1);
    sfx('shutter');
    faceFollowers('kadr', 40, 'фото Миры с крыши');
    await d.say('Мира', 'Стой. Не позируй. Просто смотри на город. Вот. Это ты.');
  } else if (relOf('mira') >= 2) {
    rel('mira', 2);
    pulse(3);
    F.e2HandMira = true;
    await d.think('Она не убирает руку. Мы сидим так, пока у неё не кончается плёнка.');
  } else {
    await d.say('Мира', 'Эй. Не торопись. Я ещё не решила, ты тот Марк или другой.');
  }
  line({ id: 'e2_roof', text: 'Город с крыши не такой уж большой', tag: 'dream' });
  if (F.e2SeenWith && F.e2SeenWith !== 'mira') F.e2Jealous = true;
  F.e2SeenWith = 'mira';
  ctx.time(120);
  ctx.goal('Домой — спать');
  F.e2SleptAt = 'home';
  F.dateWith = null; // свидание кончилось — девушка больше не ждёт там
}

async function miraDate(ctx) {
  const { d, card, go } = ctx;
  F.e2Dates = (F.e2Dates || 0) + 1;
  F.dateWith = 'mira';
  await d.say('Мира', 'На крышу? Опять? …Пошли. Только плёнку возьму.');
  await card('КРЫШИ', 'с Мирой');
  go('rooftop', 200);
}

async function filmReturn(ctx) {
  const { d, line } = ctx;
  takeItem('photo_old');
  quest('e2_film', { status: 'done' });
  rel('mira', 3);
  pulse(2);
  await d.say('Мира', 'Проявил! Дай… Ой. Это ты. На линейке. Красный, как помидор, а голос — железный.');
  await d.say('Мира', 'Знаешь, я эту фотку десять лет хотела проявить. И боялась. Вдруг там ничего нет.');
  line({ id: 'e2_old_photo', text: 'На старом фото я красный, а голос — железный', tag: 'dream' });
}

// ---------- Лола: афтепати и клуб ----------

export async function rayParty(ctx) {
  const { d, sfx, fx, line } = ctx;
  if (!once(`ray_party_${day()}`)) return;
  sfx('thump');
  await d.think('Квартира Рея — бывший пентхаус бывшего чиновника. Диско-шар, диваны, сорок человек и ни одного знакомого лица.');
  await d.say('Рей', 'БРАТИК! Добро пожаловать в воронку изнутри! Тут лиды, тут сучки, тут вся конверсия района!');
  await d.think('Девушка в блёстках смеётся на всю лестницу. Подходит, будто знает меня сто лет.');
  F.e2LolaMet = true;
  addContact('lola', { silent: true });
  await d.say('Лола', 'Ты тот, кто сегодня всех порвал? Ну, или не порвал — неважно, ты на сцене был. Я Лола. Я знаю всех нужных людей.');
  await d.say('Лола', 'Пойдём, покажу тебе, где настоящая сцена. Не в подвале. Наверху.');
  const c = await d.choose(['[Пойти с Лолой знакомиться с «нужными людьми»]', '[Взять марочку из вазочки]', '[Остаться с Реем]', '[Уйти домой]']);
  if (c === 0) {
    rel('lola', 2);
    state.stats.fame += 1;
    addFollowers('vibe', 60, 'фото с афтепати');
    await d.say('Лола', 'Это Жора — у него студия на Тверской. Это Ника — она ставит треки в плейлисты. Улыбайся. Ты теперь лид для них.');
    line({ id: 'e2_lola', text: 'Наверху улыбаются все — и никто не смотрит в глаза', tag: 'party' });
  } else if (c === 1) {
    state.stats.addiction += 1;
    pulse(-4);
    F.acidNow = true;
    F.triedLSD = true;
    ctx.acid(true);
    await d.think('Квадратик под языком. Диско-шар начинает петь. Лола смеётся, и её смех становится розовым.');
    line({ id: 'e2_disco', text: 'Диско-шар поёт, а я молчу в пятнадцати цветах', tag: 'party' });
  } else if (c === 2) {
    rel('ray', 2);
    await d.say('Рей', 'Я понял, братик. Луна — это лид. Она светит всем, а платит никто.');
    line({ id: 'e2_moon_lead', text: 'Луна светит всем, а платит никто', tag: 'party' });
  } else {
    await d.think('Ухожу. На лестнице пахнет чужими духами и холодом. Домой.');
    F.e2SleptAt = 'home';
    ctx.goal('Домой — спать');
    return;
  }
  fx.shake(150, 0.004);
  if (F.e2SeenWith && F.e2SeenWith !== 'lola') F.e2Jealous = true;
  F.e2SeenWith = 'lola';
  ctx.time(120);
  ctx.goal('Остаться до утра (лечь на диван) — или домой');
}

export async function lolaClub(ctx) {
  const { d, line } = ctx;
  if (!F.e2LolaMet) {
    await d.think('Девушка в блёстках у бара. Смотрит на меня, как на ценник.');
    F.e2LolaMet = true;
    addContact('lola', { silent: true });
    await d.say('Лола', 'Ты Тень? Мне про тебя рассказывали. Я Лола. Угостишь — расскажу, кто тебе нужен.');
    return;
  }
  await d.say('Лола', mood('lola') >= 1 ? 'Тень! Иди сюда, тут все свои!' : 'О. Ты. Ну, садись.');
  const opts = [];
  if (canDate() && relOf('lola') >= 1) opts.push(['date', 'Угостить Лолу коктейлем (600 ₽) — свидание']);
  if (day() === 'sun' && relOf('lola') >= 2 && !F.e2GirlInvited) opts.push(['home', '«Зайдёшь ко мне? Мама дома.»']);
  opts.push(['bye', '«Мне пора.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'home') return inviteHome(ctx, 'lola');
  if (pick !== 'date') return;
  if (state.cash < 600) return d.say('Лола', 'Без денег? Ой, ну ты как маленький. Приходи, когда будешь большой.');
  ctx.cash(-600, 'коктейли в «Неоне»');
  F.e2Dates = (F.e2Dates || 0) + 1;
  F.dateWith = 'lola';
  ctx.time(150);
  rel('lola', 2);
  addFollowers('vibe', 50, 'сторис из «Неона»');
  await d.say('Лола', 'Слушай. Тебе нужен менеджер. Не Рей — Рей тебя в воронку утянет. Тебе нужен «Олимп». Я позвоню Карине. Если захочешь.');
  F.e2LolaOlymp = true;
  await d.think('Она говорит о славе, как о погоде. Будто это просто случится. С ней — может, и случится.');
  line({ id: 'e2_neon', text: 'Слава пахнет коктейлем с зонтиком', tag: 'party' });
  if (F.e2SeenWith && F.e2SeenWith !== 'lola') F.e2Jealous = true;
  F.e2SeenWith = 'lola';
}

// ---------- Привести девушку домой: знакомство с мамой ----------

async function inviteHome(ctx, girl) {
  const { d } = ctx;
  const names = { mira: 'Мира', kira: 'Кира', lola: 'Лола' };
  F.e2GirlInvited = girl;
  await d.say(names[girl], girl === 'mira' ? 'К тебе? Твоя мама меня помнит? Ой. Ладно. Через час буду.' : girl === 'kira' ? 'Познакомиться с мамой. Это страшнее кладбища. Приду.' : 'С мамой? Мило. Ладно, на полчасика. Только не долго.');
  ctx.goal(`${names[girl]} придёт к тебе домой — встретить её дома`);
}

export async function girlArrives(ctx) {
  const { d, scene, fx, sfx, line } = ctx;
  const girl = F.e2GirlInvited;
  if (!girl || F.e2GirlHome) return;
  F.e2GirlHome = true;
  const names = { mira: 'Мира', kira: 'Кира', lola: 'Лола' };
  const name = names[girl];
  sfx('door');
  await d.think(`Звонок в дверь. На пороге — ${name}.`);
  const g = addActor(scene, 1800, 470, castKey(scene, girl), { depth: 11 });
  await ctx.walk(g, 1300, 120);
  // Реакция мамы: веса по характеру девушки, настроению мамы, времени, тому, что она знает, и «Пульсу»
  const w = { warm: 1, awkward: 1, cold: 1, scandal: 0.3 };
  if (girl === 'mira') { w.warm += 3; w.awkward += 1; }
  if (girl === 'lola') { w.awkward += 1; w.cold += 2; w.scandal += 2; }
  if (girl === 'kira') { w.warm += 1; w.awkward += 2; w.cold += 1; }
  if (now() >= at(22) || mood('mom') <= -1) { w.awkward += 1; w.cold += 1; w.scandal += 1; }
  if (F.momKnowsAcid || F.e2MomFoundMarka || F.momKnowsRay) { w.cold += 1; w.scandal += 2; }
  if (state.pulse >= 70) w.warm += 1;
  if (!F.e2MomWarned) { w.awkward += 1; w.scandal += 0.5; }
  const res = weighted(Object.entries(w));
  F.momMeet = res;
  if (res === 'warm') {
    await d.say('Мама', girl === 'mira' ? 'Садитесь, я гречку разогрею. Ты Мира? Господи, как выросла! Ты же на линейке с фотоаппаратом бегала!' : `Ой, проходите, проходите! ${name}? Красивое имя. Чай будете?`);
    rel('mom', 1);
    rel(girl, 2);
    pulse(4);
    await d.think('Мама улыбается. Достаёт парадные чашки. Те, которые «для гостей», то есть ни для кого.');
    line({ id: 'e2_cups', text: 'Мама достала парадные чашки — значит, я не пропащий', tag: 'pain' });
  } else if (res === 'awkward') {
    await d.think('Мама молча моет чистые чашки. Минут пять.');
    await d.say('Мама', 'Очень… приятно. Вы… учитесь? Работаете? Кушать будете?');
    rel(girl, 1);
  } else if (res === 'cold') {
    await d.say('Мама', 'Это кто? …Марк, на минуточку.');
    await d.say('Мама', 'Ты её давно знаешь? Ты уверен? Ладно. Чай на плите. Я в комнату.');
    rel('mom', -1);
    rel(girl, -1);
  } else {
    fx.shake(200, 0.006);
    await d.say('Мама', girl === 'lola' ? 'Это из-за неё ты по ночам шляешься? С этим Реем? Я вижу эти блёстки, Марк, я всё вижу!' : 'Это из-за неё ты по ночам шляешься?!');
    await d.think(`${name} молча надевает куртку и уходит. Дверь хлопает. Мама плачет на кухне.`);
    rel('mom', -2);
    rel(girl, -3);
    pulse(-5);
    F.e2GirlSeenBy = 'granny_pending';
    g.setVisible(false);
  }
  feed('anon_district', `у Тени дома была ${name}. баба Валя в курсе. весь двор в курсе`);
}

// ---------- Ночной город: девушки на улице, Вика ----------

const STREET = voiced('Вика', {
  hello: 'Не бойся, я не кусаюсь. Ты Тень, да? Я тебя в «Подвале» видела. Давно я там не была.',
  story: 'Я тоже думала, что меня услышат. Пела в «Подвале», три года. Потом Рей сказал, что поможет. Видишь — помог.',
  warn: 'Если Рей скажет, что поможет, — беги. Слышишь? Беги.',
});

export async function vikaTalk(ctx) {
  const { d, line } = ctx;
  if (once('vika')) {
    addContact('vika', { silent: true });
    await d.say('Вика', STREET.hello);
    const c = await d.choose(['«Ты пела?»', '«Тебе помочь чем-то?»', '[Уйти]']);
    if (c === 2) return;
    await d.say('Вика', STREET.story);
    await d.say('Вика', STREET.warn);
    if (c === 1) {
      pulse(2);
      await d.say('Вика', 'Помочь? Купи мне чай в шаурме. И не становись Реем. Это вся помощь.');
    }
    line({ id: 'e2_vika', text: 'Её песню тоже кто-то не дослушал', tag: 'pain' });
    F.e2VikaWarned = true;
    return;
  }
  await d.say('Вика', 'Иди домой, Тень. Тут ночью не для песен.');
}

export async function streetGirl(ctx, n) {
  const { d } = ctx;
  const lines = [
    'Мальчик, ты потерялся? Метро там. Иди-иди.',
    'Если от Рея — передай, что я больше не его «лид».',
    'Холодно сегодня. Да всегда холодно.',
  ];
  await d.say('Девушка у дороги', lines[n % lines.length]);
}

// Рей предлагает «скидку для своих»
export async function rayServiceOffer(ctx) {
  const { d, card } = ctx;
  if (!once('ray_service')) return d.say('Рей', 'Ну что, братик, надумал? Скидка для своих ещё действует.');
  await d.say('Рей', 'Братик, это тоже лидогенерация. Лидогенерация услугами. Тебе как своему — скидка. Пятьдесят процентов. Ну, сорок.');
  const c = await d.choose(['«Мне не надо.»', '[Промолчать и уйти]', '[Согласиться]']);
  if (c === 0) {
    F.streetGirls = 'refused';
    pulse(2);
    rel('ray', -1);
    await d.say('Рей', 'Не надо — значит, пайка. Ладно. Обиделся я. Но я отходчивый. Я — воронка.');
  } else if (c === 1) {
    F.streetGirls = 'walked';
  } else {
    F.streetGirls = 'agreed';
    if (state.cash < 3000) return d.say('Рей', 'Братик, у тебя же денег нет. Иди, копи. Я подожду. Я всегда жду.');
    ctx.cash(-3000, 'Рею');
    pulse(-8);
    state.stats.honesty -= 1;
    d.close();
    await card('…', 'ночь, о которой лучше не вспоминать');
    await d.think('Потом я долго стою под душем. Вода не помогает.');
    if (Math.random() < 0.5) {
      F.e2PhotoScandal = true;
      feed('Kid_Platina', 'а вот и наш подвальный «артист» на Портовой. фото не вру', { notifyMe: true });
      addFollowers('vibe', 200, 'скандал');
      pulse(-6);
    }
  }
}

