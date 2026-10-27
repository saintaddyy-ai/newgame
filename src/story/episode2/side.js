// Независимые задания Эпизода 2 (раздел 7 сценария) и ответы на сообщения в телефоне.
import { F, state, hasItem, giveItem, takeItem, pulse, energy, now, at, day, addFollowers, feed, quest, questStatus, receive, rel, relOf, once, later, hasDemo, post } from './common.js';
import { mood, whereIs, PLACE_NAMES } from './world.js';

// ---------- 3. Обложка с Аркашей: три фото на телефон ----------

export const COVER_SPOTS = { e2_cover_graffiti: 'граффити «ТЕНЬ»', e2_cover_neon: 'неон «Подвала»', e2_cover_metro: 'платформа метро' };

export function coverProgress() {
  return Object.keys(COVER_SPOTS).filter((k) => F[`photo_${k}`]).length;
}

export async function arkashaTalk(ctx) {
  const { d } = ctx;
  if (questStatus('e2_cover') === 'active') {
    const n = coverProgress();
    if (n < 3) return d.say('Аркаша', `Кадров: ${n} из трёх. Граффити во дворе, неон «Подвала», платформа метро. Снимай телефоном! Это контент!`);
    quest('e2_cover', { status: 'done', title: 'Обложка готова' });
    addFollowers('kadr', 120, 'обложка от jeffrY#creator');
    state.stats.fame += 1;
    pulse(3);
    rel('arkasha', 2);
    F.e2Cover = true;
    post('kadr', { author: 'jeffrY#creator', text: 'ОБЛОЖКА. Тень. Скоро.', likes: 340 });
    await d.say('Аркаша', 'О-о-о! Вот это! Неон, бетон, грусть! Я из этого сделаю обложку, которую будут печатать на футболках!');
    return d.say('Аркаша', 'Коллаб, брат. Ты — звук, я — визуал. Мы — экосистема!');
  }
  await d.say('Аркаша', mood('arkasha') >= 1 ? 'Тень! Стоп! Свет падает идеально! Это… ладно, это просто свет. Но контент!' : 'Тень. Привет. У меня творческий кризис. Это тоже контент, кстати.');
}

// ---------- 4. Стрим у Стаса ----------

export async function stasCafe(ctx) {
  const { d, start } = ctx;
  if (F.e2StreamOk && !F.e2StreamDone && day() === 'sat' && now() >= at(12) && now() < at(16)) {
    await d.say('Стас', 'Пришёл! Камера, микро, свет — всё на сто процентов. Читаешь три строчки — и всё. Двести человек онлайн. Уже двести десять.');
    const c = await d.choose(['«Поехали.»', '«Не сейчас.»']);
    if (c === 1) return;
    F.e2StreamDone = true;
    ctx.time(60);
    d.close();
    return start('Stage', { mode: 'stream', back: { loc: 'cafe_zerno', spawnX: 600 } });
  }
  if (F.e2StreamResult && once('stream_after')) {
    const r = F.e2StreamResult;
    addFollowers('ritm', r === 'fire' ? 220 : r === 'ok' ? 90 : 20, 'стрим из «Зерна»');
    state.stats.fame += r === 'fail' ? 0 : 1;
    quest('e2_stream', { status: 'done', title: 'Стрим у Стаса' });
    return d.say('Стас', r === 'fire' ? 'Девяносто восемь процентов досмотров. Это рекорд. Рекорд — это я сказал, а я не преувеличиваю.' : r === 'ok' ? 'Нормально. Шестьдесят процентов. Для первого раза — сто процентов нормально.' : 'Двенадцать процентов досмотров. Бывает. Звук был хороший. Звук не виноват.');
  }
  if (!F.e2StasMet) {
    F.e2StasMet = true;
    await d.think('У окна — парень в авиаторах и с цепью. Ноутбук, наушники, американо. Пальцы двигают невидимые фейдеры.');
    await d.say('Стас', 'Тень? QuadroXZ. Звук «Подвала». Сегодня твой слот. Слот. Тьфу, заразился от Адама.');
    await d.say('Стас', 'Что у тебя за микро? Скажи модель — скажу, сколько процентов зала ты потеряешь.');
    const mic = { new: 'Новый — ноль процентов потерь. Красавец.', oktava: '«Октава»? Тепло, шипит. Минус пять процентов. Зато душевно.', shure: '«Шур». Стандарт. Ноль дБ сюрпризов.', stolen: 'Без серийника? Ха. Минус пятнадцать процентов и плюс сто процентов риска.', rey: 'Микро Рея? Там слюни в сетке. Минус двадцать процентов. Я его промою.', toy: 'Розовый караоке? …Я выставлю минус шесть дБ и помолюсь. Сто процентов молюсь.' };
    await d.say('Стас', mic[F.micType] || mic.shure);
    rel('stas', 1);
    return;
  }
  await d.say('Стас', 'Сижу. Свожу. Пью американо. Сто процентов моей жизни.');
}

// ---------- 6. Плёнка Миры: «Проявка» ----------

export async function photolabTalk(ctx) {
  const { d } = ctx;
  if (questStatus('e2_film') === 'active') {
    if (!F.e2FilmGiven) {
      F.e2FilmGiven = true;
      F.e2FilmReady = now() + 120;
      ctx.cash(-300, 'проявка плёнки');
      return d.say('Фотограф', 'Плёнка? Школьная? Ох, ностальгия. Через два часа будет. Триста рублей.');
    }
    if (now() < F.e2FilmReady) return d.say('Фотограф', 'Ещё сохнет. Плёнка, как люди, не любит, когда торопят.');
    if (!hasItem('photo_old') && !F.e2FilmPicked) {
      F.e2FilmPicked = true;
      giveItem('photo_old');
      quest('e2_film', { note: 'Фото готовы. Отдать Мире (кофейня «Зерно» вечером)', silent: true });
      await d.say('Фотограф', 'Держи. Там на одной парнишка на линейке. Красный весь. Но голос, видно, железный.');
      return d.think('Это я. Восьмой класс. Я и забыл, что меня кто-то снимал.');
    }
  }
  await d.say('Фотограф', 'Плёнка, печать, паспорт за пять минут. Цифру не уважаем.');
}

// ---------- 7. «САМИЗДАТ» на «Речной» ----------

export async function adamRechnaya(ctx) {
  const { d, line } = ctx;
  if (questStatus('e2_samizdat') === 'active') {
    if (!hasDemo()) return d.say('Адам', 'Нужна демка. Демка. Запиши у Дэна — и приходи. Приходи.');
    quest('e2_samizdat', { status: 'done', title: '«САМИЗДАТ»: демка у Адама' });
    F.samizdat = true;
    addFollowers('ritm', 70, 'релиз на «САМИЗДАТЕ»');
    pulse(5);
    rel('adam', 2);
    await d.say('Адам', 'Слушаю. Слушаю.');
    await d.think('Адам слушает демку дважды. Не моргая. Потом кивает.');
    await d.say('Адам', 'Выпустим. Без лейбла, без Рея, без «Олимпа». Сами. Сами.');
    return line({ id: 'e2_samizdat_release', text: 'Без лейбла, без воронки — сами', tag: 'dream' });
  }
  await d.say('Адам', 'Тишина — тоже бит. Бит.');
}

// ---------- 8. Подработка у Палыча ----------

export async function palychShift(ctx) {
  const { d, start, card } = ctx;
  if (questStatus('e2_palych') !== 'active' || F.e2PalychDone) return false;
  if (day() !== 'sat' || now() >= at(14)) {
    quest('e2_palych', { status: 'failed', title: 'Подработка у Палыча: опоздал' });
    await d.think('Фура уехала без меня. Палыч прислал одно слово: «Звезда».');
    return true;
  }
  F.e2PalychDone = true;
  await card('СКЛАД «ЛОГИСТЛАЙН»', 'суббота · автобус, сорок минут');
  ctx.time(Math.max(0, at(14) - now()));
  energy(-40);
  start('Warehouse', { shift: 2, pay: 4000, back: 'warehouse' });
  return true;
}

// ---------- 9. Лишний билет на «Арену» ----------

export async function arenaTicket(ctx) {
  const { d } = ctx;
  if (!hasItem('ticket')) return d.think('«Арена». Двадцать тысяч мест. Когда-нибудь.');
  takeItem('ticket');
  quest('e2_ticket', { status: 'done', title: 'Билет вернулся к хозяйке' });
  pulse(3);
  await d.think('У служебного входа «Арены» — женщина в чёрном пальто, кричит в телефон: «Сектор B, ряд семь, я его потеряла!»');
  await d.say('Карина', 'Это… мой билет? Где вы его взяли? У подъезда? На Заводской? Боже. Это пропуск для моего артиста.');
  await d.say('Карина', 'Карина. Агентство «Олимп». Вы… подождите. Вы Тень? Из «Подвала»? Мне про вас говорили.');
  F.e2KarinaMet = true;
  if (!F.manager) {
    await d.say('Карина', 'Вот визитка. Если нужен менеджер — настоящий, а не «воронка» — звоните.');
    F.e2OlymOffer = true;
  }
}

// ---------- 12. Сантехник для мамы ----------

export async function plumberTalk(ctx) {
  const { d } = ctx;
  if (questStatus('e2_tap') !== 'active') return d.say('Виталик', 'Краны, трубы, унитазы. Всё течёт, всё меняется. Особенно трубы.');
  if (F.e2PlumberHired) return d.say('Виталик', 'Сказал же — к пяти буду. Я пунктуальный. Почти.');
  await d.say('Виталик', 'Кран течёт? Классика. Полторы тысячи — и забудете, как он капает.');
  const c = await d.choose(['Заплатить 1 500 ₽', '«Сам починю — продайте прокладку (200 ₽).»', '«Дорого.»']);
  if (c === 0) {
    if (state.cash < 1500) return d.say('Виталик', 'Денег нет? Тогда тазик под кран. Тазик — лучший друг.');
    ctx.cash(-1500, 'сантехник');
    F.e2PlumberHired = true;
    return d.say('Виталик', 'К пяти буду. Адрес? Заводская, двенадцать? Знаю. Там все краны текут с восемьдесят седьмого.');
  }
  if (c === 1) {
    if (state.cash < 200) return d.think('Даже на прокладку нет. Позор.');
    ctx.cash(-200, 'прокладка для крана');
    giveItem('gasket');
    return d.say('Виталик', 'Сам? Уважаю. Перекрой воду. Сначала воду, потом геройство.');
  }
}

// Починить кран дома самому (если купил прокладку) или встретить мастера
export async function fixTap(ctx) {
  const { d, sfx, fx } = ctx;
  if (questStatus('e2_tap') !== 'active') return d.think('Кран как кран. Капает себе, как метроном.');
  if (F.e2PlumberHired) {
    quest('e2_tap', { status: 'done', title: 'Кран починен (мастер)' });
    rel('mom', 1);
    pulse(2);
    await d.think('Виталик приходит в пять, ровно в пять ноль семь. Двадцать минут — и тишина. Кран не капает.');
    return d.say('Мама', 'Не капает! Марк, ты нашёл мастера! Сам! Ой, как хорошо… Я десять лет под это капанье засыпала.');
  }
  if (!hasItem('gasket')) return d.think('Кран капает. Нужен мастер — или хотя бы прокладка из «Кран-Сервиса».');
  const c = await d.choose(['Перекрыть воду, потом менять', 'Сразу откручивать', 'Позвать маму подержать фонарик']);
  if (c === 1) {
    sfx('water');
    fx.shake(300, 0.008);
    await d.think('Фонтан. Кухня в воде. Мама кричит из комнаты. Я стою мокрый, с краном в руке, как с микрофоном.');
    rel('mom', -1);
    pulse(-1);
    takeItem('gasket');
    return quest('e2_tap', { status: 'failed', title: 'Кран: потоп' });
  }
  takeItem('gasket');
  sfx('wood');
  quest('e2_tap', { status: 'done', title: 'Кран починен (сам)' });
  rel('mom', c === 2 ? 3 : 2);
  pulse(3);
  if (c === 2) {
    await d.think('Мама светит фонариком и смеётся, когда я ругаюсь на гайку. Мы давно так не смеялись вместе.');
    ctx.line({ id: 'e2_tap_mom', text: 'Мама держит фонарик, а я чиню наш кран', tag: 'pain' });
  }
  return d.say('Мама', 'Сам починил?! Весь в… нет. Весь в себя.');
}

// ---------- Ответы на сообщения ----------

export const REPLIES = {
  e2_cat_yes: () => quest('e2_cat', { title: 'Кот Киры', note: 'Чёрный, одно ухо порвано. Искать во дворах за кафе-кварталом', giver: 'kira', status: 'active' }),
  e2_cat_no: () => rel('kira', -1),
  e2_film_yes: () => quest('e2_film', { title: 'Плёнка Миры', note: 'Сдать в «Проявку» на торговой (2 часа), потом отдать Мире', giver: 'mira', status: 'active' }),
  e2_film_no: () => rel('mira', -1),
  e2_stream_yes: () => {
    F.e2StreamOk = true;
    quest('e2_stream', { title: 'Стрим у Стаса', note: 'Кофейня «Зерно», суббота 12–16', giver: 'stas', status: 'active' });
  },
  e2_stream_no: () => rel('stas', -1),
  e2_tap_yes: () => quest('e2_tap', { title: 'Кран для мамы', note: '«Кран-Сервис» на торговой: мастер или прокладка', giver: 'mom', status: 'active' }),
  e2_tap_no: () => {
    rel('mom', -1);
    later(3, () => receive('mom', 'Ладно. Сама.'));
  },
  e2_mgr_ray_yes: () => {
    F.manager = 'ray';
    pulse(-5);
    quest('e2_manager', { status: 'done', title: 'Менеджер — Рей (30%)' });
    later(2, () => receive('ray', 'ВОТ. теперь ты в воронке официально. 30% это братская цена. понедельник — первый лид'));
  },
  e2_mgr_ray_no: () => {
    rel('ray', -1);
    later(2, () => receive('ray', 'пайка. но я терпеливый. я воронка'));
  },
  e2_olymp_yes: () => {
    F.e2OlymOffer = true;
    later(2, () => receive('olymp', 'Отлично. Кафе «Ночь», сегодня 18–21. Спросите Карину'));
  },
  e2_olymp_no: () => {},
};

// Встреча с «Олимпом» в кафе «Ночь»
export async function karinaTalk(ctx) {
  const { d } = ctx;
  if (F.manager) return d.say('Карина', 'У вас уже есть менеджер? Жаль. Если что — вы знаете, где меня найти.');
  await d.say('Карина', 'Карина, «Олимп». Двадцать процентов, площадки, плейлисты, юрист. И никаких «воронок».');
  if (state.pulse < 45) await d.say('Карина', 'Правда, про вас в «Вайбе» всякое пишут. Нам важна репутация. Подумайте, с кем вы.');
  const c = await d.choose(['«Подписываем.»', '«Мне надо подумать.»', '«Нет. Я с Дэном.»']);
  if (c === 0) {
    if (state.pulse < 45) return d.say('Карина', 'Пока — нет. Почистите репутацию — вернёмся к разговору.');
    F.manager = 'olymp';
    pulse(6);
    quest('e2_manager', { status: 'done', title: 'Менеджер — «Олимп» (20%)' });
    feed('olymp_agency', 'Рады сообщить: Тень теперь с нами.', { notifyMe: true });
    return d.say('Карина', 'Добро пожаловать. В понедельник — первые встречи. Еженедельные выплаты — по пятницам.');
  }
  if (c === 2) {
    F.manager = 'dan';
    rel('dan', 2);
    quest('e2_manager', { status: 'done', title: 'Менеджер — Дэн' });
    return d.say('Карина', 'Верность — редкость. Уважаю. Визитку оставьте.');
  }
}

// ---------- Звонки ----------

export function callScript(id) {
  const where = whereIs(id);
  const place = PLACE_NAMES[where] || 'неизвестно где';
  const T = {
    mom: async ({ d }) => d.say('Мама', where === 'work' ? 'Сынок, я на смене, не могу. Поешь. Целую.' : day() === 'sun' ? 'Ты где? Я пирог поставила. Приходи.' : 'Марк? Я дома. Ты когда будешь?'),
    dan: async ({ d }) => {
      if (F.e2DanLeft) return d.say('Дэн', '…Не сейчас.');
      if (day() === 'fri' && !F.e2PodvalDone) return d.say('Дэн', now() < at(19) ? 'В семь «Подвал»! Не опаздывай! Я уже потею.' : 'Ты где?! Очередь до угла!');
      return d.say('Дэн', where === 'sleep' ? '…Брат. Я сплю. Перезвони через… никогда.' : 'Я в гараже. Где ещё. Заходи.');
    },
    ray: async ({ d }) => {
      if (F.busted || F.quitRay) return d.say('Рей', 'Абонент не в воронке.');
      return d.say('Рей', now() < at(14) ? '…Братик. Днём Рей спит. Лиды — тоже.' : `Рей в этой малашечке! Я — ${place}. Заходи.`);
    },
    arkasha: async ({ d }) => d.say('Аркаша', `Тень! Я ${place}! Снимаю! Не могу говорить! Говорю! Это контент!`),
    stas: async ({ d }) => d.say('Стас', `Стас. Я — ${place}. Связь — девяносто процентов. Говори.`),
    adam: async ({ d }) => d.say('Адам', `Я — ${place}. ${place}.`),
    mira: async ({ d }) => d.say('Мира', relOf('mira') >= 1 ? 'Привет! Я на съёмке, но для тебя — минутка. Увидимся?' : 'Да? А, это ты. Я занята.'),
    kira: async ({ d }) => d.say('Кира', now() >= at(10) && now() < at(16) ? '…Я сплю. Днём я мёртвая. Пиши.' : 'Призрак? Говори. Только тихо.'),
    lola: async ({ d }) => d.say('Лола', 'Котик! Я сейчас не могу, у меня встреча с нужными людьми. Приходи вечером в «Неон»!'),
    olymp: async ({ d }) => d.say('Карина', 'Агентство «Олимп», Карина. Перезвоню. Или нет.'),
    palych: async ({ d }) => d.say('Палыч', 'Склад. Говори быстро, фура ждёт.'),
    vika: async ({ d }) => d.say('Вика', 'Не звони мне, Тень. Живи своей песней.'),
    lyuba: async ({ d }) => d.say('Тётя Люба', 'Маркуша! Слышала, ты в «Подвале» выступал! Мамка твоя всем рассказывает!'),
  };
  return T[id] || null;
}
