// Телефон в Прологе и Эпизоде 1: кто пишет, что отвечать, что говорят по звонку.
import { state } from '../state.js';
import { addContact, receive, quest, questStatus } from '../phone/model.js';

const F = state.flags;
const ph = () => F.e1;
const isDay = () => ['wed', 'thu'].includes(ph());
const later = (sec, fn) => setTimeout(fn, sec * 1000);

// ---------- Ответы на сообщения ----------

export const REPLIES = {
  // Пролог
  p_dan_go: () => later(2, () => receive('dan', 'Давай. Ковёр бабушкин не трогай грязными кедами')),
  p_dan_late: () => later(2, () => receive('dan', 'Брат. Ты всегда «уже бежишь». Бегом бегай')),
  p_mom_love: () => {
    state.rel.mom += 1;
    later(3, () => receive('mom', 'И я тебя. Шапку надень'));
  },
  p_mom_ok: () => {},

  // Эпизод 1
  e1_mom_dan: () => {
    F.toldMomWhere = true;
    later(3, () => receive('mom', 'Хорошо. Только не до утра. Мне в шесть вставать'));
  },
  e1_mom_off: () => {
    state.rel.mom -= 1;
    later(4, () => receive('mom', 'Ладно.'));
  },
  e1_ray_ok: () => later(2, () => receive('ray', 'ВОТ. Это конверсия, братик. Лид прогрет')),
  e1_ray_no: () => {
    state.rel.ray -= 1;
    later(2, () => receive('ray', 'пайка ты братик. но я не обижаюсь. я записываю'));
  },
  e1_night_dan: () => {
    F.warnedMom = true;
    later(3, () => receive('mom', 'Хоть бы раз сам позвонил. Ладно. Спите там'));
  },
  e1_night_lie: () => {
    F.warnedMom = true;
    F.liedMomNight = true;
    later(3, () => receive('mom', 'Опять «у друга»… Утром поговорим'));
  },
  e1_dan_rehearsal: () => later(2, () => receive('dan', 'Жду. Чай заварил. Бабушкин ковёр пропылесосил. Почти')),
};

// ---------- Звонки ----------

const CALLS_PROLOGUE = {
  mom: () => async ({ d }) => {
    await d.say('Мама', 'Марк? Я на смене, сынок, не могу говорить. Гречка на плите.');
  },
  dan: () => async ({ d }) => {
    if (F.danMet) return d.say('Дэн', 'Брат, я в двух метрах от тебя. Обернись.');
    await d.say('Дэн', 'Ты где?! Бит готов, я его три раза послушал. Давай в гараж!');
  },
};

const CALLS_EP1 = {
  mom: () => async ({ d }) => {
    if (F.momKnowsAcid) return d.say('Мама', 'Я на работе. Вечером поговорим. Серьёзно поговорим, Марк.');
    if (isDay()) return d.say('Мама', 'Сынок, я на смене, тут начальство. Поешь там. Целую.');
    if (ph() === 'tue_night') return d.say('Мама', 'Ты спать собираешься? Мне в шесть вставать. Не сиди в гараже до утра.');
    if (ph() === 'wed_night' && !F.momAsked) return d.say('Мама', 'Я в автобусе. Скоро буду. Чайник поставь, если не спишь.');
    return d.say('Мама', 'Марк, ночь на дворе. Ты где? Иди домой.');
  },
  dan: () => async ({ d }) => {
    const p = ph();
    if (p === 'tue_night') return d.say('Дэн', 'Брат, не грузись. Пятнадцать — это не сто. Найдём. Утро вечера мудренее.');
    if (p === 'wed' || p === 'wed_night') {
      if (F.danSawMic) return d.say('Дэн', 'Микро есть — всё, я спокоен. Завтра вечером репетиция. Не пропади.');
      await d.say('Дэн', 'Ну что, как с бабками? Варианты помнишь: склад тёти Любы, мама… и Рей. Рей — на крайний случай.');
      if (!F.watchFound) await d.say('Дэн', 'И это… у тебя дома вообще ничего ценного нет? Подумай.');
      return;
    }
    if (p === 'thu') return d.say('Дэн', hasMic() ? 'Вечером приходи, брат. Я бит свожу, к вечеру будет как надо.' : 'Брат, сегодня вечером репетиция. С микро или без — приходи. Барахолка до восьми.');
    if (p === 'thu_eve') return d.say('Дэн', 'Я в гараже. Жду. Не опаздывай хоть раз в жизни.');
    return d.say('Дэн', 'Иди спать! Завтра в восемь. «Подвал».');
  },
  lyuba: () => async (ctx) => {
    if (isDay() && !F.jobUnlocked) return lyubaCall(ctx);
    return ctx.d.say('Тётя Люба', 'Маркуша, я на складе, тут Палыч орёт! Некогда! Мамке привет!');
  },
  ray: () => async ({ d }) => {
    if (isDay()) return d.say('Рей', '…Братик. Днём лиды спят. И Рей спит. Вечером. У арки.');
    if (F.rayDealDone) return d.say('Рей', 'Братик, я тебе не колл-центр. Хотя… колл-центр — это тоже воронка. Заходи к арке.');
    return d.say('Рей', 'Рей в этой малашечке. Я у арки, братик. Воронка открыта.');
  },
};

function hasMic() {
  return state.inventory.includes('mic');
}

// Звонок тёте Любе — тот же сценарий, что с домашнего телефона (его подставляет episode1.js)
let lyubaCall = async () => {};
export function setLyubaCall(fn) {
  lyubaCall = fn;
}

export function callScript(id) {
  const table = state.episode === 'ep1' ? CALLS_EP1 : state.episode === 'prologue' ? CALLS_PROLOGUE : null;
  return table?.[id]?.() || null;
}

// ---------- Кто и когда пишет сам (проверяется при входе в локацию и после каждой сцены) ----------

export function phoneTick() {
  const once = (key, fn) => {
    if (F[`ph_${key}`]) return;
    F[`ph_${key}`] = true;
    fn();
  };
  if (state.episode === 'prologue') {
    addContact('mom', { silent: true });
    addContact('dan', { silent: true });
    if (F.momLeft) {
      once('p_mom', () => receive('mom', 'Гречка на плите. Поешь обязательно. Люблю', {
        replies: [{ id: 'p_mom_love', text: 'И я тебя, мам' }, { id: 'p_mom_ok', text: 'ок' }],
      }));
    }
    if (F.yardSeen && !F.danMet) {
      once('p_dan', () => receive('dan', 'Бит готов!! Жду в гараже. Не опаздывай как обычно', {
        replies: [{ id: 'p_dan_go', text: 'Иду' }, { id: 'p_dan_late', text: 'Уже бегу, брат' }],
      }));
    }
    return;
  }
  if (state.episode !== 'ep1') return;
  addContact('mom', { silent: true });
  addContact('dan', { silent: true });
  const p = ph();
  if (F.e1MicBroke) {
    once('e1_mom_where', () => receive('mom', 'Ты где? Опять в гараже? Гречка в холодильнике', {
      replies: [{ id: 'e1_mom_dan', text: 'У Дэна. Скоро буду' }, { id: 'e1_mom_off', text: 'Мам, отстань' }],
    }));
    once('e1_quest_money', () => quest('e1_money', { title: 'Найти 15 000 ₽ на микрофон', note: 'Срок — до пятницы. Пути открываются по ходу', giver: 'dan', silent: true }));
  }
  if (F.rayMet) {
    once('e1_ray_contact', () => {
      addContact('ray', { note: 'Рей сам добавил себя: «РЕЙ В ЭТОЙ МАЛАШЕЧКЕ»' });
      setTimeout(() => receive('ray', 'братик это рей. сохрани. воронка открыта 24/7', {
        replies: [{ id: 'e1_ray_ok', text: 'Сохранил' }, { id: 'e1_ray_no', text: 'Удали мой номер' }],
      }), 4000);
    });
    once('e1_quest_ray', () => quest('e1_ray', { title: 'Рей у арки', note: 'По вечерам сидит на «Мерсе» за гаражами. Даст денег — но не просто так', giver: 'ray', silent: true }));
  }
  if (p === 'wed' || p === 'thu') {
    once('e1_lyuba', () => {
      receive('mom', 'Позвони тёте Любе насчёт склада. Номер скинула. Она ждёт');
      addContact('lyuba', { silent: true });
      quest('e1_work', { title: 'Склад тёти Любы', note: 'Позвонить ей (Телефон → Тётя Люба). Смена на весь день, платят наличкой', giver: 'mom' });
    });
  }
  if (F.jobUnlocked && questStatus('e1_work') === 'active') quest('e1_work', { note: 'Автобус от остановки за аркой, днём. Палыч — зверь', silent: true });
  if (p === 'wed_night' || F.momAsked) once('e1_quest_mom', () => quest('e1_mom', { title: 'Попросить у мамы', note: 'Ночью на кухне, когда придёт со смены', giver: 'mom', silent: true }));
  if (F.watchFound) once('e1_quest_watch', () => quest('e1_watch', { title: 'Отцовские часы', note: 'Ломбард «24» — на автобусе от остановки', giver: 'self', silent: true }));
  // Дела закрываются, когда путь пройден
  if (F.shifts && questStatus('e1_work') === 'active') quest('e1_work', { status: 'done' });
  if (F.momLoan && questStatus('e1_mom') === 'active') quest('e1_mom', { status: 'done' });
  if (F.momAsked && !F.momLoan && questStatus('e1_mom') === 'active') quest('e1_mom', { status: 'failed', silent: true });
  if (F.moneyPathRay && questStatus('e1_ray') === 'active') quest('e1_ray', { status: 'done' });
  if (F.soldWatch && questStatus('e1_watch') === 'active') quest('e1_watch', { status: 'done' });
  if (state.inventory.includes('mic') && questStatus('e1_money') === 'active') quest('e1_money', { status: 'done', title: 'Микрофон куплен' });
  if (p === 'thu_eve') once('e1_dan_eve', () => receive('dan', 'Ты где?? Репетиция. Жду в гараже', {
    replies: [{ id: 'e1_dan_rehearsal', text: 'Иду' }],
  }));
}
