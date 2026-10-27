// Рей во втором эпизоде: долг, флаеры, менеджер — и «Курьер Рея» (задание 1).
// Торговля без подробностей: «пакеты» и «марочки» Рея. Шкала «Палево», покупатели, переодетые полицейские, облава.
import { voiced } from '../../voice.js';
import { F, state, giveItem, takeItem, pulse, now, at, day, addFollowers, feed, quest, questStatus, receive, rel, relOf, once, weighted, pickOne } from './common.js';
import { randomSpec, personTexture } from './people.js';
import { nextDay } from './world.js';
import { rayServiceOffer } from './girls.js';
import { addActor } from '../../gfx/actors.js';

export const courierOpen = () => !F.busted && !F.quitRay && (relOf('ray') >= 3 || F.reyLeadgen);

// ---------- Меню разговора с Реем ----------

export async function rayMenu(ctx, where) {
  const { d } = ctx;
  const opts = [];
  if (state.debts.ray?.amount > 0) opts.push(['debt', `Долг: ${state.debts.ray.amount.toLocaleString('ru-RU')} ₽`]);
  if (courierOpen() && !F.courierStage) opts.push(['courier', '«Есть работа?»']);
  if (F.courierStage === 1 && F.courierTask === 'handoff' && !F.courierDone1) opts.push(['remind', '«Куда пакет-то?»']);
  if (F.courierStage === 1 && F.courierDone1) opts.push(['stage2', '«Передал. Что дальше?»']);
  if (F.courierStage === 2 && (F.packs || 0) === 0) opts.push(['settle', '«Всё продал. Рассчитаемся.»']);
  if (F.courierStage >= 1 && !F.quitRay) opts.push(['quit', '«Я пас, Рей.»']);
  if (where === 'arch' && isNightNow() && !F.streetGirls) opts.push(['service', '«Что там у Портовой?»']);
  if (once(`ray_talk_${day()}`)) opts.push(['chat', '«Как жизнь, Рей?»']);
  opts.push(['bye', '«Бывай.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'debt') return payDebt(ctx);
  if (pick === 'courier') return courierOffer(ctx);
  if (pick === 'remind') return d.say('Рей', `Станция «Серпуховская», серая ветка. Лид — ${F.courierSign}. Скажет: «Есть пайка?» Ответишь: «Пайка есть всегда».`);
  if (pick === 'stage2') return courierStage2(ctx);
  if (pick === 'settle') return courierSettle(ctx);
  if (pick === 'quit') return quitRay(ctx);
  if (pick === 'service') return rayServiceOffer(ctx);
  if (pick === 'chat') return rayChat(ctx);
}

function isNightNow() {
  return now() >= at(21) || now() < at(5);
}

const RAY_CHAT = voiced('Рей', {
  a: 'Я понял, братик. Луна — это лид. Она светит всем, а платит никто.',
  b: 'Мама моя звонила. Сказала, что гордится. Я сказал — спасибо. Она сказала — это не тебе, это соседскому. Пайка.',
  c: 'Знаешь, почему я в розовых очках? Потому что без них всё серое. Серое — это не конверсия.',
});

async function rayChat(ctx) {
  const { d, line } = ctx;
  const k = ['a', 'b', 'c'][['fri', 'sat', 'sun'].indexOf(day())];
  await d.say('Рей', RAY_CHAT[k]);
  if (k === 'b') {
    rel('ray', 1);
    line({ id: 'e2_ray_mom', text: 'Рей в розовых очках, потому что без них всё серое', tag: 'pain' });
  }
}

// ---------- Долг ----------

async function payDebt(ctx) {
  const { d } = ctx;
  const debt = state.debts.ray;
  await d.say('Рей', 'Двадцатка, братик. Это CRM. Ты в CRM. Красной строкой.');
  const opts = [];
  if (state.cash >= debt.amount) opts.push(['all', `Отдать всё (${debt.amount.toLocaleString('ru-RU')} ₽)`]);
  if (state.cash >= 5000) opts.push(['part', 'Отдать 5 000 ₽ сейчас']);
  opts.push(['work', '«Отработаю.»']);
  opts.push(['later', '«Потом.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'all') {
    ctx.cash(-debt.amount, 'долг Рею');
    debt.amount = 0;
    F.reyDebtPaid = true;
    pulse(4);
    quest('e2_debt', { title: 'Долг Рею', status: 'done', silent: true });
    return d.say('Рей', 'Закрыл? Весь? Братик… ты первый за три года. Я даже не знаю, как это в CRM записать.');
  }
  if (pick === 'part') {
    ctx.cash(-5000, 'часть долга Рею');
    debt.amount -= 5000;
    return d.say('Рей', 'Частичная конверсия. Уважаю. Осталось — сам знаешь сколько.');
  }
  if (pick === 'work') {
    if (courierOpen()) return courierOffer(ctx, true);
    return d.say('Рей', 'Отработать? Ты мне пока не настолько свой, братик. Флаеры раздай, улыбнись лидам — потом поговорим.');
  }
  rel('ray', -1);
  return d.say('Рей', '«Потом» — это пайка. Но я запомню. Я всегда запоминаю. Иногда.');
}

// ---------- Курьер: часть 1 — передача на «Серпуховской» ----------

async function courierOffer(ctx, forDebt = false) {
  const { d } = ctx;
  await d.say('Рей', 'Братик, у меня лидов больше, чем рук. Возьмёшь часть воронки?');
  await d.say('Рей', 'Пакет. Отвезти. Отдать. Ничего не нюхать, ничего не открывать. Три тысячи за ходку.');
  if (F.e2VikaWarned) await d.think('«Если Рей скажет, что поможет, — беги». Голос Вики в голове.');
  const c = await d.choose(['«Давай.»', '«Нет. Это не моё.»']);
  if (c === 1) {
    rel('ray', -1);
    return d.say('Рей', 'Не твоё — так не твоё. Пайка, но честная.');
  }
  F.courierStage = 1;
  F.courierTask = 'handoff';
  F.courierForDebt = forDebt;
  const signs = ['в серой шапке и жёлтой куртке', 'с красным рюкзаком и в очках', 'в зелёной куртке и белых кедах'];
  F.courierSignIdx = Math.floor(Math.random() * 3);
  F.courierSign = signs[F.courierSignIdx];
  giveItem('package');
  quest('e2_courier', { title: 'Курьер Рея', note: `Пакет — на станцию «Серпуховская» (серая ветка). Лид ${F.courierSign}, пароль «Есть пайка?» — «Пайка есть всегда»`, giver: 'ray', status: 'active' });
  await d.say('Рей', `Станция «Серпуховская», серая ветка. Лид — ${F.courierSign}. Скажет: «Есть пайка?» Ответишь: «Пайка есть всегда».`);
  state.heat = Math.max(state.heat, 10);
  F.courierActive = true;
}

// Люди на платформе «Серпуховской»: один — тот самый лид, один — полицейский в штатском
export function platformPeople(scene) {
  if (F.courierTask !== 'handoff' || F.courierDone1) return [];
  const specs = [
    { hair: 'beanie', accent: '#8a8a8a', top: '#d8c040' },
    { hair: 'short', glasses: true, top: '#4a4a58', accent: '#c03a3a' },
    { hair: 'short', top: '#3a8a5a', shoes: '#eeeeee' },
  ];
  const decoys = [
    { hair: 'cap', top: '#d8c040', accent: '#3a3a44' },
    { hair: 'bob', top: '#c03a3a', glasses: true, female: true },
    { hair: 'curly', top: '#3a8a5a', shoes: '#1a1a1a' },
    { hair: 'cap', top: '#2a3a5a', accent: '#1a2a4a' },
  ];
  const list = [];
  const right = F.courierSignIdx;
  const all = [...decoys];
  all.splice(Math.floor(Math.random() * 4), 0, specs[right]);
  all.forEach((spec, i) => {
    const isLead = spec === specs[right];
    const isCop = !isLead && i === (right + 2) % all.length;
    // Текстура по самой внешности — иначе при повторном визите лид мог бы «надеть» чужую куртку
    const key = personTexture(scene, randomSpec(`plat_${i}_${F.e2Seed}`, spec));
    list.push({ id: `plat_${i}`, name: 'Человек на платформе', sprite: key, x: 520 + i * 300, flip: i % 2 === 1, isLead, isCop });
  });
  return list.map((p) => ({ ...p, label: 'Подойти', talk: (ctx) => platformTalk(ctx, p) }));
}

async function platformTalk(ctx, p) {
  const { d } = ctx;
  if (F.courierDone1) return d.say('Человек на платформе', 'Чего тебе?');
  if (p.isLead) {
    await d.say('Человек на платформе', 'Есть пайка?');
    const c = await d.choose(['«Пайка есть всегда.»', '«Чего?»']);
    if (c === 1) return d.say('Человек на платформе', 'Ничего. Обознался.');
    takeItem('package');
    F.courierDone1 = true;
    F.courierTask = 'return';
    state.heat = Math.max(0, state.heat - 5);
    await d.think('Пакет уходит в чужой рюкзак за секунду. Мне в руку — конверт. Человек растворяется в толпе.');
    ctx.cash(3000, 'Рей: ходка');
    quest('e2_courier', { note: 'Пакет передан. Вернуться к Рею', silent: true });
    return;
  }
  if (p.isCop) {
    await d.say('Человек на платформе', 'Добрый вечер. Простите, вы не подскажете… вы ведь кого-то ждёте? Можно поинтересоваться, кого?');
    await d.think('Слишком вежливый. Слишком внимательный. Ботинки — форменные.');
    const c = await d.choose(['«Есть пайка?»', '«Никого. Просто жду поезд.»']);
    if (c === 0) {
      state.heat += 45;
      await d.say('Человек на платформе', 'Пайка? Интересно. Очень интересно. Я запомню ваше лицо.');
      return checkRaid(ctx);
    }
    return d.say('Человек на платформе', 'Поезд — это хорошо. Поезда возят людей. Хорошего вечера.');
  }
  await d.say('Человек на платформе', pickOne(['Чего уставился?', 'Я не знаю, где выход. Я сам ищу.', 'Мне некогда.', 'Ты рэпер? Я тебя видел. Или не тебя.']));
}

// ---------- Курьер: часть 2 — своя точка ----------

async function courierStage2(ctx) {
  const { d } = ctx;
  await d.say('Рей', 'Конверсия есть! Братик, ты прирождённый лидогенератор.');
  await d.say('Рей', 'Теперь своя точка. Пять пакетов на реализацию. Лиды сами подходят — на улице, у станций. Полторы с пакета: тебе пятьсот, мне тыщу.');
  await d.say('Рей', 'Только смотри: кто подозрительно вежливый — тот мент. Вежливые — самые опасные.');
  const c = await d.choose(['«Давай пакеты.»', '«Нет. Хватит.»']);
  if (c === 1) return quitRay(ctx);
  F.courierStage = 2;
  F.courierTask = 'sell';
  F.packs = 5;
  giveItem('packs');
  quest('e2_courier', { note: 'Продать 5 пакетов. Покупатели подходят на улицах и у метро. Следи за «Палевом»', silent: true });
}

// Покупатель подходит сам (вызывается из зоны на улице или платформе)
export function buyerChance() {
  return F.courierStage === 2 && (F.packs || 0) > 0 && !F.busted;
}

export async function buyerApproach(ctx) {
  const { d, scene } = ctx;
  const kind = weighted([['buyer', 50], ['haggler', 20], ['scam', 10], ['cop', 15 + Math.max(0, state.heat - 40) / 3], ['friend', 5]]);
  const spec = kind === 'cop' ? { hair: 'short', top: '#4a4a58', glasses: Math.random() < 0.5 } : {};
  const key = personTexture(scene, randomSpec(`buyer_${Date.now()}`, spec));
  const npc = addActor(scene, scene.player.x + 300, 470, key, { depth: 11 });
  await ctx.walk(npc, scene.player.x + 100, 150);
  npc.setFlipX(true);
  scene.player.setFlipX(false);
  const who = kind === 'friend' ? 'Знакомый' : 'Прохожий';
  if (kind === 'friend') {
    await d.say(who, 'Марк?! Ты чего тут… А, понятно. Ничего не видел. Ничего.');
    pulse(-4);
    F.e2SeenDealing = true;
    feed('anon_district', 'говорят, Тень у метро стоит не просто так. ну-ну');
    npc.destroy();
    return;
  }
  const hello = {
    buyer: 'Слышь. Ты от Рея? Есть чё?',
    haggler: 'Ты от Рея? Почём? Полторы? Да ладно, давай за тысячу.',
    scam: 'Э, брат, давай сюда, деньги потом занесу. Честно. Я свой.',
    cop: 'Добрый вечер. Простите, пожалуйста. Мне сказали, у вас можно… приобрести? Если вам не трудно. Спасибо.',
  }[kind];
  await d.say(who, hello);
  const opts = ['Продать', 'Отказать'];
  if (kind === 'cop' || kind === 'buyer') opts.push('«А ты откуда про Рея знаешь?»');
  let c = await d.choose(opts);
  if (c === 2) {
    await d.say(who, kind === 'cop' ? 'Ну… все знают. Это же… общеизвестно. Так вы продадите? Пожалуйста.' : 'Ты чё, следак? Все знают Рея. Давай уже.');
    if (kind === 'cop') await d.think('«Пожалуйста». Покупатели не говорят «пожалуйста». Никогда.');
    c = await d.choose(['Продать', 'Отказать']);
  }
  if (c === 1) {
    state.heat = Math.max(0, state.heat - 3);
    await d.say(who, kind === 'cop' ? 'Жаль. Очень жаль. Хорошего вечера.' : 'Ну и стой тут, пайка.');
    npc.destroy();
    return;
  }
  F.packs -= 1;
  if (kind === 'cop') {
    state.heat += 60;
    await d.think('Он слишком спокойно убирает пакет во внутренний карман. Достаёт рацию.');
    npc.destroy();
    return raid(ctx);
  }
  if (kind === 'scam') {
    state.heat += 12;
    await d.think('Он хватает пакет — и бегом. Денег нет. Рею я всё равно должен.');
    state.debts.ray = { amount: (state.debts.ray?.amount || 0) + 1500, due: 'Рей ждёт' };
  } else {
    const price = kind === 'haggler' ? 300 : 500;
    ctx.cash(price, 'точка');
    F.courierEarned = (F.courierEarned || 0) + 1500 - (kind === 'haggler' ? 500 : 0);
    state.heat += 15;
    pulse(-1);
  }
  npc.destroy();
  if (F.packs <= 0) {
    takeItem('packs');
    quest('e2_courier', { note: 'Пакеты кончились. Рассчитаться с Реем', silent: true });
  }
  return checkRaid(ctx);
}

async function checkRaid(ctx) {
  if (state.heat >= 80) return raid(ctx);
}

// ---------- Курьер: часть 3 — облава ----------

export async function raid(ctx) {
  const { d, start, sfx } = ctx;
  sfx('siren');
  await d.think('Сирена. Синие отблески на стенах. Кто-то кричит «Стоять!» — и это мне.');
  const c = await d.choose(['[Бежать дворами]', '[Сдаться]'], { timer: 4, timeoutIndex: 0 });
  if (c === 1) return busted(ctx);
  d.close();
  F.e2RaidFrom = ctx.scene.locKey;
  start('Chase', { back: { loc: 'courtyards', spawnX: 900 } });
}

// После погони (из onEnter дворов)
export async function afterChase(ctx) {
  const { d } = ctx;
  const res = F.e2ChaseResult;
  F.e2ChaseResult = null;
  if (res === 'escaped') {
    state.heat = 30;
    if (F.e2DumpedPacks) {
      F.packs = 0;
      takeItem('packs');
      state.debts.ray = { amount: (state.debts.ray?.amount || 0) + 5000, due: 'Рей ждёт' };
    }
    pulse(-3);
    await d.think('Ушёл. Сердце колотится в горле. Во дворах тихо, только где-то лает собака.');
    if (F.e2DumpedPacks) await d.think('Пакеты остались где-то в кустах. Рей не обрадуется. Рей запишет в CRM.');
    return;
  }
  return busted(ctx);
}

async function busted(ctx) {
  const { d, card, go } = ctx;
  F.busted = true;
  F.courierActive = false;
  state.heat = 0;
  F.packs = 0;
  takeItem('packs');
  takeItem('package');
  pulse(-20);
  rel('mom', -2);
  quest('e2_courier', { status: 'failed', title: 'Курьер Рея: попался' });
  await d.think('Наручники холодные. В отделении пахнет хлоркой и чужим страхом.');
  await d.say('Следователь', 'Ну что, артист. Чьё? Скажешь — отпустим к утру. Не скажешь — посидишь, подумаешь.');
  const c = await d.choose(['«Рея. Его зовут Рей.»', '«Моё. Ничьё. Не знаю.»']);
  if (c === 0) {
    F.snitchedRay = true;
    await d.say('Следователь', 'Рей. Знаем такого. Давно знаем. Ладно. Звони маме.');
  } else {
    pulse(2);
    await d.say('Следователь', 'Гордый. Посиди до утра, гордый.');
  }
  receive('mom', 'Мне звонили из полиции. Я приеду. Господи, Марк.');
  receive('ray', 'братик кто это. я тебя не знаю. номер удалил');
  feed('Kid_Platina', 'подвальный клоун теперь ещё и в отделении. карьера )))', { notifyMe: true });
  d.close();
  await card('ОТДЕЛЕНИЕ', 'ночь на лавке · утром забирает мама');
  F.e2SleptAt = 'police';
  if (day() === 'sun') {
    F.e2Done = true;
    return go('End');
  }
  nextDay();
  state.time.min = at(9);
  state.energy = 40;
  go('apartment', 1700);
}

async function courierSettle(ctx) {
  const { d } = ctx;
  const earned = F.courierEarned || 0;
  await d.say('Рей', `Ну-ка, CRM… ${earned ? 'Всё сходится. Почти.' : 'Хм.'} Братик, ты — лучший лид-менеджер этого квартала.`);
  if (F.courierForDebt && state.debts.ray) {
    state.debts.ray.amount = Math.max(0, state.debts.ray.amount - 5000);
    await d.say('Рей', 'Пятёрку с долга списал. Видишь, как работает воронка?');
  }
  F.courierStage = 3;
  F.courierActive = false;
  state.heat = 0;
  rel('ray', 2);
  quest('e2_courier', { status: 'done', title: 'Курьер Рея: отработал' });
  await d.say('Рей', 'Отдыхай. В понедельник — новая партия. Не благодари.');
  await d.think('В понедельник. Значит, это не кончится. Никогда не кончается.');
}

async function quitRay(ctx) {
  const { d, fx, sfx } = ctx;
  F.quitRay = true;
  F.courierActive = false;
  state.heat = Math.max(0, state.heat - 20);
  takeItem('packs');
  takeItem('package');
  pulse(5);
  rel('ray', -4);
  if (questStatus('e2_courier') === 'active') quest('e2_courier', { status: 'failed', title: 'Курьер Рея: ушёл сам' });
  await d.say('Рей', 'Пас? ПАС?! Ты кто такой вообще, братик? Я тебя из гаража вытащил, я тебе воронку открыл!');
  await d.say('Рей', 'Твой Дэн — пайка, твой подвал — пайка, твоя мама…');
  fx.shake(200, 0.008);
  sfx('punch');
  await d.think('Рей поворачивается к случайному прохожему и толкает его в лужу. «Распогодился». Потом выдыхает.');
  await d.say('Рей', 'Всё. Отпустило. Иди. Но пакеты — верни. И не попадайся мне в воронке.');
  addFollowers('vibe', -20, 'Рей поливает тебя в сторис');
  feed('RAY', 'некоторые лиды не конвертятся. пайка');
}

// Палево остывает, если не стоять на месте
export function coolHeat(min) {
  if (state.heat <= 0) return;
  state.heat = Math.max(0, state.heat - min / 6);
}

