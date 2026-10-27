// ЭПИЗОД 1 «СЛОМАННЫЙ МИКРОФОН»: вторник → четверг. Найти 15 000 ₽ на микрофон до пятницы.
// Пути к деньгам: А — склад, Б — мама, В — Рей, Г (секретный) — отцовские часы. Потом барахолка и репетиция.
import Phaser from 'phaser';
import { state, hasItem, takeItem, saveGame } from '../state.js';
import { voiced } from '../voice.js';
import { setLyubaCall } from './phoneStory.js';
import { receive } from '../phone/model.js';
import { drawApartment, drawYard, drawGarage, drawWarehouse, drawPawnshop, drawFlea } from './backdrops.js';
import { BATHROOM } from './shared.js';
import { posterView } from './prologue.js';
import { BEAT, playMusic, stopMusic, sfx } from '../audio.js';
import { addActor } from '../gfx/actors.js';
import { drainPhase, food, clean } from '../needs.js';

const F = state.flags;
const FLOOR = 470;

export const PHASES = {
  tue: 'ВТОРНИК · ВЕЧЕР',
  tue_night: 'ВТОРНИК · НОЧЬ',
  wed: 'СРЕДА · ДЕНЬ',
  wed_night: 'СРЕДА · НОЧЬ',
  thu: 'ЧЕТВЕРГ · ДЕНЬ',
  thu_eve: 'ЧЕТВЕРГ · ВЕЧЕР',
  final: 'ЧЕТВЕРГ · НОЧЬ',
  outro: 'ЧЕТВЕРГ · НОЧЬ',
};

const phase = () => F.e1;
// Марочка действует несколько часов: текущая фаза и следующая, сон обрывает сразу
const setPhase = (p) => {
  // Между фазами проходят часы: голод и грязь копятся (на старте эпизода — нет)
  if (F.e1 && F.e1 !== p) drainPhase();
  F.e1 = p;
  if (F.acidNow && --F.acidLeft <= 0) endAcid();
};
const isNight = () => ['tue_night', 'wed_night', 'final', 'outro'].includes(phase());
const isDay = () => ['wed', 'thu'].includes(phase());
const rayAtArch = () => ['tue_night', 'wed_night', 'thu_eve', 'outro'].includes(phase());
const dayOf = (p) => (p.startsWith('tue') ? 'tue' : p.startsWith('wed') ? 'wed' : 'thu');

function startAcid() {
  F.triedLSD = true;
  F.acidNow = true;
  F.acidLeft = 2;
  F.acidDay = dayOf(phase());
  state.stats.addiction += 1;
}

function endAcid() {
  F.acidNow = false;
  F.acidLeft = 0;
}

// Вчера была марочка, а сегодня уже отпустило
const acidYesterday = () => F.triedLSD && !F.acidNow && F.acidDay && F.acidDay !== dayOf(phase());

// Марочка «на потом» из кармана — съесть, когда сам решишь
export const ITEM_USE = {
  async marka(ctx) {
    const { d, acid, line, fx } = ctx;
    if (F.acidNow) return d.think('Хватит. Меня и так ещё несёт.');
    await d.think('Марочка Рея. Маленький квадратик с улыбающимся солнцем.');
    const c = await d.choose(['[Положить под язык]', 'Нет. Не сейчас.']);
    if (c === 1) return d.think('Убираю обратно в карман. Пусть лежит.');
    takeItem('marka');
    F.markaInInventory = false;
    startAcid();
    fx.screenFlash(0xff7ab8, 500);
    acid(true);
    await d.think('Бумажка горчит. Минут через двадцать стены начинают дышать в такт чему-то, чего я не слышу.');
    line({ id: 'acid_concrete', text: 'Бетон течёт, а я стою на месте', tag: 'pain' });
    line({ id: 'acid_bubble', text: 'Мой город — это пузырь, и я в нём лопаюсь', tag: 'dream' });
  },
};

export const MICS = [
  { id: 'stolen', name: '«Подозрительно дешёвый»', price: 2000 },
  { id: 'rey', name: 'Микро с наклейкой «ЛИДОГЕН»', price: 4000 },
  { id: 'oktava', name: '«Октава», б/у', price: 6000 },
  { id: 'shure', name: '«Шур» с рук', price: 9000 },
  { id: 'new', name: 'Новый, в коробке', price: 15000 },
];

const momHome = () => phase() === 'wed_night';

// Свет фонарей, подъезда, гаража и арки
const YARD_LAMPS = () => [
  { x: 155, y: 238, r: 120, color: 0xfff0b0, cone: true },
  { x: 506, y: 210, r: 130, color: 0xffe0a0, cone: true, flicker: true },
  { x: 1346, y: 210, r: 130, color: 0xffe0a0, cone: true },
  { x: 2017, y: 440, r: 120, color: 0xffd27a },
  { x: 2515, y: 212, r: 120, color: 0xffe0a0, cone: true },
  { x: 236, y: 170, r: 40, color: 0xffd27a, nightOnly: true },
  { x: 2222, y: 170, r: 40, color: 0xffd27a, nightOnly: true },
];

// Места для фото с телефона
const YARD_PHOTOS = [
  { id: 'e1_graffiti', x: 1400, text: 'Граффити «ТЕНЬ» в кадре. Обложка сама просится.' },
  { id: 'e1_garages', x: 1950, line: { id: 'photo_garages', text: 'Ряд гаражей — как клавиши, на которых никто не играет', tag: 'street' } },
  { id: 'e1_arch', x: 2515, text: 'Фонарь над аркой и мокрый асфальт. Кадр как из клипа.' },
];

// Старт эпизода (после пролога или из меню глав)
export function startEpisode1() {
  state.episode = 'ep1';
  setPhase('tue');
  state.food = 75;
  state.clean = 70;
  state.starve = 0;
  state.cash = 500;
  state.goal = '';
  F.shifts = 0;
  return { loc: 'garage', spawnX: 640 };
}

// ---------- Крупный план афиши «Подвала» ----------
function openMicView(s, c) {
  const img = s.add.image(480, 180, 'poster_openmic').setScale(1.02).setAngle(1.5);
  c.add(img);
  sfx('paper');
}

// ---------- Локации ----------

export const LOCATIONS = {
  bathroom: BATHROOM,

  garage: {
    title: 'ГАРАЖ №17',
    width: 1100,
    spawnX: 200,
    ambience: 'garage',
    steps: 'stepConcrete',
    draw: (s) => drawGarage(s, 1100),
    lamps: [{ x: 720, y: 72, r: 150, color: 0xffe8a8, alpha: 0.4 }, { x: 730, y: 371, r: 50, color: 0x3df0ff, alpha: 0.35 }],
    doors: [{ id: 'gate', x: 69, w: 122, h: 228, metal: true, color: 0x4a505c }],

    async onEnter(ctx) {
      if (F.garageWake && F.garageWake === phase()) return garageMorning(ctx);
      if (phase() === 'tue' && !F.e1MicBroke) return micBreaks(ctx);
      if (phase() === 'final' && F.e1Rehearsal && !F.e1FinaleTalk) return afterRehearsal(ctx);
      // Репетиция — только в четверг вечером, даже если микрофон купили раньше
      if (phase() === 'thu_eve') return hasItem('mic') ? finale(ctx) : toyMic(ctx);
      if (hasItem('mic') && !F.danSawMic && ['wed', 'wed_night', 'thu'].includes(phase())) return micEarly(ctx);
    },

    npcs: [
      {
        id: 'dan', name: 'Дэн', sprite: 'dan', x: 880, flip: true,
        async talk(ctx) {
          const { d } = ctx;
          if (phase() === 'tue') return d.say('Дэн', 'Иди, брат. Подумай ночью. Утро вечера мудренее — так бабушка говорила.');
          if (phase() === 'final' || phase() === 'outro') return d.say('Дэн', 'Иди спи. Завтра в восемь. И не смей опаздывать.');
          if (phase() === 'thu' && hasItem('mic')) return waitForEvening(ctx);
          if (hasItem('mic')) return d.say('Дэн', 'Микро есть — я спокоен. Репетиция завтра вечером. Береги его, как бабушкин ковёр.');
          if (F.reyDebt) await d.say('Дэн', 'Слышал, ты у Рея занял. Он уже всем рассказал. Он всем всё рассказывает.');
          if (phase() === 'tue_night' || phase() === 'wed_night') return d.say('Дэн', 'Ночь, брат. Хочешь — оставайся на диване. Только не храпи, как в прошлый раз.');
          await d.say('Дэн', 'Без микро не приходи, брат. Время тикает. Барахолка у станции до восьми.');
        },
      },
    ],

    items: [
      {
        x: 69, label: 'Выйти', sfx: 'click',
        async use({ go, door, wait, d, sfx: play }) {
          if (phase() === 'tue') return d.say('Дэн', 'Погоди, не убегай. Дослушай.');
          door('gate', true);
          await wait(450);
          stopMusic(0.6);
          if (F.e1FinaleTalk) setPhase('outro');
          go('yard', 2017, 'left');
        },
      },
      {
        x: 210, label: () => (['tue_night', 'wed_night'].includes(phase()) ? 'Диван: переночевать у Дэна' : 'Диван'), sfx: 'bed',
        async use(ctx) {
          if (['tue_night', 'wed_night'].includes(phase())) return sleepInGarage(ctx);
          ctx.fx.dust(300, 380, 260);
          await ctx.d.think('Диван, на котором написано больше треков, чем в студиях всего района.');
        },
      },
      {
        x: 370, y: 110, label: 'Ковёр', range: 60, sfx: 'thump',
        async use({ d, fx }) {
          fx.dust(300, 210, 260);
          await d.think('Ковёр от Дэновой бабушки. Если продать — тысячи три. Нет. Это святое.');
        },
      },
      {
        x: 520, label: 'Афиша «Арены»', sfx: 'paper',
        async use({ d, closeup }) {
          closeup(posterView);
          await d.think('Двадцать тысяч мест. А у нас даже одного микрофона нет.');
        },
      },
      {
        x: 730, label: 'Комп Дэна', sfx: 'keys',
        async use({ pc, fx }) {
          fx.flash(730, 371, 70, 36, 0x3df0ff, 0.9, 500);
          await pc();
        },
      },
      {
        x: 1029, label: 'Микрофон', sfx: 'feedback',
        async use({ d, fx }) {
          fx.burst(1029, 316, { color: 0x3df0ff, count: 6, tex: 'spark', speed: 120 });
          if (phase() === 'final') return d.think('Новый микрофон на стойке. Блестит, как будто извиняется за старый.');
          await d.think('Труп микрофона. Изолента его не спасла. Покойся с миром, дед.');
        },
      },
    ],
  },

  yard: {
    title: 'ДВОР',
    width: 2700,
    spawnX: 155,
    rain: true,
    ambience: 'rain',
    steps: 'stepWet',
    night: () => isNight(),
    draw: (s) => drawYard(s, 2700, {
      time: isDay() ? 'day' : phase() === 'thu_eve' ? 'dusk' : 'night',
      merc: true,
      openMic: ['thu', 'thu_eve', 'final', 'outro'].includes(phase()),
      barberSign: ['thu', 'thu_eve', 'final', 'outro'].includes(phase()),
    }),
    lamps: YARD_LAMPS,
    critters: () => (isDay() ? [{ type: 'pigeons', x: 1180, n: 4 }, { type: 'cat', x: 1700, y: 266, depth: 4 }] : [{ type: 'cat', x: 1700, y: 266, depth: 4 }]),
    photoSpots: YARD_PHOTOS,
    doors: [{ id: 'entrance', x: 155, w: 126, h: 208, color: 0x3a4658 }],

    async onEnter(ctx) {
      if (['tue_night', 'wed_night'].includes(phase()) && !F.rayMet) return rayMeeting(ctx);
      if (phase() === 'outro') return outro(ctx);
    },

    npcs: [
      {
        id: 'ray', name: 'Рей', sprite: 'ray', x: 2400, flip: true,
        when: () => rayAtArch(),
        talkWhen: () => phase() !== 'outro',
        async talk(ctx) {
          if (phase() === 'tue_night') return ctx.d.say('Рей', 'Сегодня я отдыхаю, братик. Смотрю, как фонарь думает. Приходи завтра вечером — поговорим о воронке.');
          await rayDeal(ctx);
        },
      },
      {
        id: 'kid', name: 'Пацан', sprite: 'kid', x: 760,
        when: () => isDay(),
        talk: kidTalk,
      },
      {
        id: 'granny', name: 'Баба Валя', sprite: 'granny', x: 1160, flip: true,
        when: () => isDay(),
        talk: grannyTalk,
      },
    ],

    items: [
      {
        x: 155, label: 'Домой', sfx: 'click',
        async use({ go, door, wait }) {
          door('entrance', true);
          await wait(350);
          go('apartment', 1840, 'left');
        },
      },
      {
        x: 1400, label: 'Граффити «ТЕНЬ»', sfx: 'spray',
        async use({ d, fx, scene }) {
          fx.flicker(scene.graffiti, 6);
          await d.think('Тень. Если в пятницу облажаюсь — закрашу сам.');
        },
      },
      {
        x: 2017, label: 'Гараж №17', sfx: 'gate',
        async use({ go, fx, wait }) {
          fx.shake(300, 0.004);
          await wait(300);
          go('garage', 200);
        },
      },
      {
        x: 2300, label: 'Записка на «Мерсе»', sfx: 'paper',
        when: () => isDay(),
        async use({ d, fx }) {
          fx.flash(2300, FLOOR - 60, 60, 24, 0xffffff, 0.6);
          await d.think('Под дворником — записка маркером: «УЕХАЛ ЗА ЛИДАМИ. ВЕЧЕРОМ ТУТ. НЕ ТРОГАЙ МЕРС — ОН ЧУВСТВУЕТ. РЕЙ».');
          if (!F.rayMet) await d.think('Какой ещё Рей? А, этот, в леопардовом. Про него Дэн говорил.');
        },
      },
      {
        x: 1700, y: 236, label: 'Кот на гараже', range: 50, sfx: 'meow',
        async use({ d, line }) {
          if (F.catPet) return d.think('Кот смотрит сверху вниз. Как критик.');
          F.catPet = true;
          await d.think('Чёрный кот на крыше гаража. Живёт тут дольше, чем мы с Дэном пишемся. Видел все наши провалы.');
          line({ id: 'roof_cat', text: 'Кот на гараже видел все мои провалы', tag: 'street' });
        },
      },
      {
        x: 2515, label: 'К остановке', sfx: 'click',
        when: () => phase() !== 'outro',
        async use(ctx) {
          await travel(ctx);
        },
      },
      {
        x: 2660, y: 210, label: 'Афиша «Подвала»', range: 60, sfx: 'paper',
        when: () => ['thu', 'thu_eve', 'final'].includes(phase()),
        async use({ d, closeup }) {
          closeup(openMicView);
          await d.think('3g0th2002, RAY, вопросительный знак… и twinspeak.');
          await d.think('Вопросительный знак — это я.');
        },
      },
    ],
  },

  apartment: {
    title: 'ДОМ',
    width: 1900,
    spawnX: 200,
    ambience: 'flat',
    steps: 'stepWood',
    night: () => (isNight() ? 0.38 : 0),
    draw: (s) => drawApartment(s, 1900),
    lamps: () => (isNight() ? [{ x: 686, y: 352, r: 90, color: 0xffd27a }, ...(momHome() ? [{ x: 1150, y: 120, r: 170, color: 0xfff0c8, alpha: 0.35 }] : [])] : []),
    doors: [
      { id: 'd1', x: 775, w: 58, h: 206, auto: true, interior: true, inside: 0x4a4f66, insideFloor: 0x4a3a3a },
      { id: 'd2', x: 1375, w: 58, h: 206, auto: true, interior: true, inside: 0x34463f },
      { id: 'bath', x: 1703, w: 80, h: 200, color: 0xd8d0c0, interior: true, inside: 0x8ab4c8, insideFloor: 0x5a6a78 },
      { id: 'front', x: 1840, w: 94, h: 210, color: 0x6a3a2a },
    ],

    async onEnter(ctx) {
      if (phase() === 'wed' && !F.wedWake) return wakeWednesday(ctx);
      if (phase() === 'thu' && !F.thuWake) return wakeThursday(ctx);
      if (phase() === 'tue_night' && !F.tueNightHome) {
        F.tueNightHome = true;
        await ctx.d.think('Мама уже спит — ей в шесть вставать. Из-за её двери тихо бормочет радио.');
        await ctx.d.say('', 'Shift + ← → — идти тихо. Так можно проскользнуть мимо тех, с кем не хочешь говорить.', '#ffd166');
      }
      if (phase() === 'wed_night' && !F.momNightIntro) {
        F.momNightIntro = true;
        await ctx.d.think('На кухне горит свет. Мама пришла со смены.');
      }
    },

    // Мама на кухне окликает сама — если не прокрасться мимо (Shift)
    zones: [
      { id: 'mom_kitchen', x1: 830, x2: 1330, sneak: true, when: () => momHome() && !F.momGreeted, run: momCallsOut },
    ],

    npcs: [
      {
        id: 'mom', name: 'Мама', sprite: 'mom', x: 1150, flip: true,
        when: () => momHome(),
        label: 'Поговорить: Мама',
        talk: momTalk,
      },
    ],

    items: [
      {
        x: 110, label: 'Телефон', sfx: 'phone',
        when: () => isDay() && !F.jobUnlocked,
        async use(ctx) {
          await callLyuba(ctx);
        },
      },
      {
        x: 200, label: 'Лечь спать', sfx: 'bed',
        async use(ctx) {
          await sleep(ctx);
        },
      },
      {
        x: 480, label: 'Окно', sfx: 'whoosh',
        async use({ d }) {
          if (isNight()) return d.think('Ночь. В доме напротив горит три окна. В одном кто-то тоже не спит и тоже, наверное, что-то пишет.');
          await d.think('Серый день. Панельки до горизонта. Где-то там — пятница.');
        },
      },
      {
        x: 690, label: 'Ящик стола', sfx: 'wood',
        when: () => !F.watchTaken,
        async use(ctx) {
          await fatherWatch(ctx);
        },
      },
      {
        x: 872, label: 'Холодильник', sfx: 'fridge',
        async use(ctx) {
          const { d, fx } = ctx;
          fx.flash(872, 380, 84, 180, 0xbfe8ff, 0.7, 900);
          // Мама оставляет еду: раз за фазу можно поесть
          const fed = !F[`fridge_${phase()}`];
          if (isDay()) await d.think('На дверце записка: «Ушла на смены. Поешь. Не грусти. М.» Рядом — магнит «Анапа 2009».');
          else await d.think('Холодильник гудит в темноте, как маленький трансформатор.');
          if (!fed) return d.think('Всё, что было, я уже съел. Остался кетчуп и надежда.');
          const c = await d.choose([isDay() ? '[Поесть: макароны по-флотски]' : '[Поесть: холодная гречка с котлетой]', '[Закрыть]']);
          if (c === 1) return;
          F[`fridge_${phase()}`] = true;
          await ctx.eat(45);
          await d.think(isDay() ? 'Макароны по-флотски. Мама — гений экономики.' : 'Ем холодную гречку прямо из кастрюли. Вкус детства и одиночества.');
        },
      },
      {
        x: 1190, label: 'Бумаги на столе', sfx: 'paper',
        async use({ d }) {
          await d.think('Квитанций стало больше. «Последнее предупреждение» теперь в двух экземплярах.');
        },
      },
      {
        x: 1605, label: 'Зеркало', sfx: 'mirror',
        async use({ d, fx }) {
          fx.flash(1605, 235, 58, 118, 0xc8e0ff, 0.7, 700);
          if (F.triedLSD && F.acidNow) return d.think('Зеркало дышит. Я в нём — розовый. Рей говорил, что так будет. Рей много чего говорил.');
          await d.think('Тень. Через три дня — сцена. Выгляжу так, будто через три дня — экзамен.');
        },
      },
      {
        x: 1703, label: 'Ванная', sfx: 'click',
        async use({ door, wait, go }) {
          door('bath', true);
          await wait(300);
          go('bathroom', 120);
        },
      },
      {
        x: 1840, label: 'Выйти во двор', sfx: 'click',
        async use({ go, door, wait }) {
          door('front', true);
          await wait(350);
          go('yard', 155);
        },
      },
    ],
  },

  warehouse: {
    title: 'СКЛАД «ЛОГИСТЛАЙН»',
    width: 1500,
    spawnX: 1370,
    ambience: 'warehouse',
    steps: 'stepConcrete',
    draw: (s) => drawWarehouse(s, 1500),

    async onEnter(ctx) {
      if (F.shiftResult) return afterShift(ctx);
      return startShift(ctx);
    },

    npcs: [
      { id: 'palych', name: 'Палыч', sprite: 'palych', x: 760, flip: true },
      { id: 'akhmed', name: 'Ахмед', sprite: 'akhmed', x: 440 },
      { id: 'ray', name: 'Рей', sprite: 'ray', x: 1400, flip: true, when: () => F.rayAtWarehouse },
    ],
  },

  pawnshop: {
    title: 'ЛОМБАРД «24»',
    width: 1000,
    spawnX: 940,
    ambience: 'flat',
    steps: 'stepWood',
    draw: (s) => drawPawnshop(s, 1000),

    npcs: [
      {
        id: 'leva', name: 'Лёва', sprite: 'leva', x: 680, flip: true,
        async talk(ctx) {
          await pawnWatch(ctx);
        },
      },
    ],

    items: [
      {
        x: 950, label: 'Выйти', sfx: 'doorSoft',
        async use({ go }) {
          go('yard', 2515, 'left');
        },
      },
      {
        x: 300, label: 'Полки', sfx: 'wood',
        async use({ d }) {
          await d.think('Гитары, телевизоры, свадебное платье. У каждой вещи тут была своя пятница, которая не случилась.');
        },
      },
    ],
  },

  flea: {
    title: 'БАРАХОЛКА · СТ. ЗАВОДСКАЯ',
    width: 1600,
    spawnX: 100,
    ambience: 'market',
    steps: 'stepWet',
    draw: (s) => drawFlea(s, 1600),

    npcs: [
      {
        id: 'gosha', name: 'Гоша', sprite: 'gosha', x: 1000,
        async talk(ctx) {
          await buyMic(ctx);
        },
      },
    ],

    items: [
      {
        x: 60, label: 'Обратно во двор', sfx: 'click',
        async use({ go, card }) {
          await card('ДВОР', 'обратно на автобусе');
          go('yard', 2515, 'left');
        },
      },
      {
        x: 290, label: 'Кассеты', sfx: 'paper',
        async use({ d, line, fx }) {
          fx.burst(290, 370, { color: 0xe8e0d0, count: 8, speed: 80 });
          await d.think('Кассеты по полтиннику. «Сектор Газа», «Кино», какой-то «Рэп Района-2003». Чьи-то мечты на развес.');
          line({ id: 'cassettes', text: 'Кассеты по полтиннику — чьи-то мечты на развес', tag: 'street' });
        },
      },
      {
        x: 600, label: 'Колонки', sfx: 'feedback',
        async use({ d, fx }) {
          fx.shake(150, 0.004);
          await d.think('Колонки «Радиотехника». Продавец включает их на полную, чтобы показать бас. Бас показывает, что колонкам конец.');
        },
      },
    ],
  },
};

// ---------- Вторник: микрофон умирает ----------

async function micBreaks({ d, fx, wait, sfx: play, goal, scene, hud }) {
  F.e1MicBroke = true;
  await playMusic(BEAT.url, { offset: BEAT.drop, loop: true, loopStart: BEAT.drop, volume: 0.8 });
  await d.say('Дэн', 'Давай с первого куплета. Как вчера, только злее.');
  await d.think('Подхожу к микрофону. Первая строчка ложится в бит как родная.');
  d.close();
  await wait(1600);
  // Хрип, треск — и тишина
  play('feedback');
  fx.burst(1029, 316, { color: 0xffd166, count: 24, tex: 'spark', speed: 260 });
  fx.shake(400, 0.01);
  await wait(500);
  stopMusic(0.05);
  play('crash');
  fx.screenFlash(0xffffff, 200);
  scene.screen?.setFillStyle(0x1a1a1e);
  await wait(900);
  await d.think('На второй строчке микрофон хрипит, трещит… и тишина. Лампочка на пульте гаснет.');
  await d.say('Дэн', 'Не-не-не-не… Только не сейчас.');
  await d.think('Дэн трясёт провод, разматывает изоленту. Из корпуса вываливается кусок платы.');
  await d.say('Дэн', 'Всё. Отмучился дед.');
  if (F.micNoticed) await d.think('Я же знал. Чувствовал, что он сдохнет.');
  await d.say('Дэн', 'Нормальный стоит тысяч пятнадцать. У меня есть… триста сорок рублей и жвачка.');
  await d.say('Дэн', 'До пятницы три дня. Без микро нас на «Подвал» даже не пустят — там свой только у ведущего, и он его никому не даёт.');
  const c = await d.choose(['Найду деньги. Это моя проблема.', 'Может, ну его, этот «Подвал»?', '[Пнуть ведро]'], { timer: 8, timeoutIndex: 0 });
  if (c === 0) {
    state.stats.honesty += 1;
    await d.say('Дэн', 'Наша, брат. Но ладно, рули.');
  } else if (c === 1) {
    state.rel.dan -= 1;
    await d.say('Дэн', 'Ты серьёзно? Мы три года в этом гараже сидим. Нет. Не «ну его».');
  } else {
    F.hotTempered = true;
    play('crash');
    fx.shake(250, 0.01);
    await d.think('Ведро летит в стену. Дэн молча смотрит.');
    await d.say('Дэн', 'Полегчало? Теперь думаем.');
  }
  await d.say('Дэн', 'Короче, варианты. Можно подработать — твоя мама говорила про склад, у тёти Любы.');
  await d.say('Дэн', 'Можно у мамы попросить, но ты сам знаешь…');
  await d.say('Дэн', '…И есть Рей.');
  await d.say('Марк', 'Рей? Который «Рей в этой малышечке»?');
  await d.say('Дэн', 'Он самый. У него всегда есть бабки. И всегда есть… всё остальное.');
  await d.say('Дэн', 'Только не ведись на его движ, понял? Он на кислоте с девятого класса. Он тебя улыбнёт, а потом распогодится так, что мать родная не узнает.');
  setPhase('tue_night');
  hud();
  goal('Найти 15 000 ₽ на микрофон до пятницы');
  await d.say('', 'Пути к деньгам открываются по ходу: склад, мама, Рей… и, может, что-то ещё. Можно пройти несколько.', '#ffd166');
}

// ---------- Вторник, ночь: Рей ----------

async function rayMeeting({ d, npc, walk, wait, fx, scene, sfx: play, line, goal }) {
  F.rayMet = true;
  const ray = npc('ray');
  const p = scene.player;
  await wait(400);
  await d.think('У арки за гаражами кто-то стоит над лужей и разговаривает с ней. Розовые очки, леопардовая куртка, пар изо рта.');
  await d.say('Рей', 'Не, ты не дыши так громко, братик, ты мне лиды пугаешь…');
  ray.setFlipX(true);
  await d.say('Рей', 'О-о-опа! Тень! Это ж ты в гараже по ночам воешь? Рей в этой малышечке, знаешь же.');
  d.close();
  await walk(ray, p.x + 90, 170);
  p.setFlipX(false);
  // Фирменное приветствие
  play('thump');
  fx.shake(250, 0.012);
  fx.burst(p.x + 20, FLOOR - 80, { color: 0xff7ab8, count: 10, tex: 'spark' });
  await d.think('Он без предупреждения хватает меня за яйца.');
  await d.say('Рей', 'Проверка на звонкость! …Есть. Звенит. Значит, будет и трек.');
  let c = await d.choose(['[Оттолкнуть]', '[Схватить его в ответ]', '«Ты больной?»']);
  if (c === 0) {
    state.stats.honesty += 1;
    fx.shake(120, 0.006);
    await d.say('Рей', 'Ха-ха, резкий! Люблю резких. Резкие быстрее конвертятся.');
  } else if (c === 1) {
    state.rel.ray += 2;
    F.rayFriend = true;
    fx.shake(150, 0.008);
    await d.say('Рей', 'А-А-А, БРАТИК! Всё, ты свой. Ты теперь в моей воронке.');
  } else {
    state.rel.ray -= 1;
    await d.say('Рей', 'Больной — это когда пайка. А я, братик, здоровее всех. Я вижу, как фонарь думает.');
  }
  await d.say('Рей', 'Слыхал, у вас микро сдох. Пайка, братик. Чистая пайка.');
  await d.say('Рей', 'Окно в гараже тонкое, а твой Дэн по телефону орёт, будто лиды на том конце глухие.');
  await d.say('Рей', 'Вы там с ним вдвоём по ночам, в гаражике, на бабкином коврике… Я ничё не говорю, братик. Ничё не говорю. Просто наблюдение.');
  c = await d.choose(['«Очень смешно.»', '«Зато у нас трек есть. А у тебя?»', '[Посмеяться вместе]']);
  if (c === 0) await d.say('Рей', 'Не смешно — это пайка. А это лидогенерация юмора.');
  else if (c === 1) {
    state.stats.honesty += 1;
    await d.say('Рей', '…У меня есть трек. У меня есть «ЛИДОГЕН». Его в двух районах знают, братик. В двух.');
  } else {
    state.rel.ray += 1;
    await d.say('Рей', 'Во-о-от. С юмором — значит, с воронкой.');
  }
  await d.say('Рей', 'Короче. Музыка — это лидогенерация. Каждый слушатель — лид. Каждый лид — бабки. А каждые бабки — сучки.');
  await d.say('Рей', 'Это воронка, братик. А ты пока сверху стоишь и в неё плюёшь.');
  await d.say('Рей', 'Будут нужны бабки — я тут. Каждый вечер. Рей в этой малышечке.');
  c = await d.choose(['«Спасибо. Подумаю.»', '«Откуда ты вообще всё знаешь?»', '«Мне от тебя ничего не надо.»']);
  if (c === 0) await d.say('Рей', 'Думай. Только пятница не резиновая, братик. Пятница — она как сучка: ждать не будет.');
  else if (c === 1) {
    F.rayWary = true;
    await d.say('Рей', 'Город маленький, Тень. Все всё знают. А кто не знает — тот лид.');
  } else await rayRage({ d, scene, walk, wait, fx, sfx: play });
  line({ id: 'every_lead', text: 'Во дворе каждый — чей-то лид', tag: 'street' });
  d.close();
  await walk(ray, 2400, 120);
  ray.setFlipX(true);
  goal(phase() === 'tue_night' ? 'Иди домой спать. Утром — думать, где взять деньги' : 'Деньги: Рей у арки — или мама на кухне');
}

// Злой Рей засирает всех, а потом распогоживается на случайном прохожем
async function rayRage({ d, scene, walk, wait, fx, sfx: play }) {
  state.stats.honesty += 1;
  state.rel.ray -= 2;
  F.rayOffended = true;
  fx.shake(200, 0.006);
  await d.say('Рей', 'Тебе не надо? ТЕБЕ? Ты кто такой вообще, братик? Гаражный ноунейм с микрофоном на изоленте!');
  await d.say('Рей', 'Твой Дэн биты с ютуба тырит. Ваш гараж воняет бабкиными коврами. Ваш двор — пайка, ваш район — пайка, ваш рэп — пайка в квадрате!');
  d.close();
  // Мимо идёт пацан с мячом
  const kid = addActor(scene, scene.player.x - 300, FLOOR, 'kid', { depth: 10 });
  await walk(kid, scene.player.x - 140, 110);
  await d.say('Рей', '…Щас распогодимся.');
  play('ball');
  const ball = scene.add.circle(kid.x + 20, FLOOR - 10, 9, 0xd8b040).setDepth(11);
  scene.tweens.add({ targets: ball, x: ball.x - 220, y: FLOOR + 30, duration: 500, ease: 'Quad.out' });
  fx.splash(kid.x - 200, FLOOR + 30);
  await d.say('Рей', 'Чё смотришь, лид? Лови.');
  d.close();
  await walk(kid, scene.player.x - 700, 260);
  kid.destroy();
  ball.destroy();
  await d.say('Рей', 'Всё, отпустило. Видишь, как работает? Заходи, если что.');
}

// ---------- Двор днём: пацан и баба Валя помнят вчерашнее ----------

const KID_IDLE = voiced('Пацан', {
  a: 'Я тебе мяч не дам. Ты его пнёшь, как тот, в леопардовом.',
  b: 'А правда, что у рэперов всегда есть деньги? …А у тебя почему нет?',
  c: 'Мой брат говорит, рэп — это для лохов. Мой брат лох.',
});

async function kidTalk({ d, sfx: play, line }) {
  play('ball');
  if (F.rayOffended && !F.kidRayTalk) {
    F.kidRayTalk = true;
    await d.say('Пацан', 'Тот, в леопардовом… он мой мяч в лужу пнул. Он больной?');
    const c = await d.choose(['Больной. Держись от него подальше.', 'Не бери в голову.']);
    if (c === 0) F.protectKid = true;
    return d.say('Пацан', c === 0 ? 'Ладно… А ты его не боишься?' : 'Ага. Тебе легко говорить.');
  }
  const key = `kid_${phase()}`;
  if (!F[key]) {
    F[key] = true;
    if (phase() === 'wed') {
      if (F.kidTalked) {
        await d.say('Пацан', 'Тень! Ты вчера обещал трек про двор! Я пацанам уже сказал, что ты про нас читать будешь.');
        const c = await d.choose(['«Будет трек. Обещаю.»', '«Посмотрим.»']);
        if (c === 0) {
          F.kidPromise = true;
          return d.say('Пацан', 'Йес! Я знал! Только про качели не забудь — они скрипят, как в фильме ужасов.');
        }
        return d.say('Пацан', '«Посмотрим» — так взрослые говорят, когда «нет».');
      }
      return d.say('Пацан', 'Тень! Ты в пятницу в «Подвале»? Нас не пустят, нам по двенадцать. Запиши потом, а?');
    }
    if (hasItem('mic')) {
      await d.say('Пацан', 'Это микрофон?! Настоящий? Дай подержать! …Тяжёлый. Как у настоящих.');
      line({ id: 'kid_mic', text: 'Пацан держит мой микрофон, как будто это кубок', tag: 'dream' });
    } else {
      await d.say('Пацан', 'Завтра же «Подвал»? Мы с пацанами под окнами будем стоять. Вдруг слышно.');
    }
    if (F.kidPromise) await d.say('Пацан', 'И про двор не забудь! Ты обещал.');
    return;
  }
  const pool = Object.values(KID_IDLE);
  await d.say('Пацан', pool[(F.kidIdle = ((F.kidIdle || 0) + 1)) % pool.length]);
}

const GRANNY_IDLE = voiced('Баба Валя', {
  a: 'Иди-иди, артист. Шапку надень только.',
  b: 'В наше время за такие штаны на комсомольском собрании разбирали. Ладно, иди.',
  c: 'Я в восемьдесят седьмом во дворе с самим… ну, неважно с кем, танцевала. Иди.',
});

async function grannyTalk({ d, line }) {
  const key = `granny_${phase()}`;
  if (!F[key]) {
    F[key] = true;
    if (phase() === 'wed') {
      if (F.grannyTalked) await d.say('Баба Валя', 'Марик! Шапку-то надел, как я вчера говорила? …Не надел. Весь в мать — упрямый.');
      else await d.say('Баба Валя', 'Опять бегаешь? Сядь, отдохни. Все вы бегаете, а потом бац — и сорок лет.');
      if (F.rayMet) {
        F.grannySawRay = true;
        await d.say('Баба Валя', 'Я в окно всё вижу, Марик. Ты ночью с этим… в пятнистом у арки стоял. Держись от него подальше. Он маме своей всю жизнь испортил.');
        const c = await d.choose(['«Он просто знакомый.»', '«Не говорите маме, ладно?»']);
        if (c === 1) {
          await d.say('Баба Валя', 'Я-то не скажу. А глаза у матери свои есть.');
        } else {
          await d.say('Баба Валя', 'Знакомый… У меня тоже был знакомый. Сорок лет потом знакомилась с последствиями.');
        }
      }
      return;
    }
    if (F.momLoan) await d.say('Баба Валя', 'Мать твоя ночью со смены шла, еле живая. Сапоги новые хотела, а теперь говорит — потом. Что ж ты, Марик…');
    else if (F.momKnowsAcid) await d.say('Баба Валя', 'Что ж ты мать-то доводишь? Она утром на остановке стояла — глаза красные.');
    else if (F.sleptOut && !F.warnedMom) await d.say('Баба Валя', 'Мать твоя ночью по двору бегала, тебя искала. Ты бы хоть звонил.');
    else await d.say('Баба Валя', 'Завтра выступаешь? Я к телевизору сяду. …Ах, не по телевизору. Ну, ты всё равно спой хорошо.');
    line({ id: 'granny_window', text: 'Баба Валя видит всё — даже то, чего я сам не вижу', tag: 'street' });
    return;
  }
  const pool = Object.values(GRANNY_IDLE);
  await d.say('Баба Валя', pool[(F.grannyIdle = ((F.grannyIdle || 0) + 1)) % pool.length]);
}

// ---------- Сон и утро ----------

async function sleep({ d, card, go, lieDown }) {
  const p = phase();
  if (p === 'tue_night') {
    await d.think('Ложусь. Потолок. Пятнадцать тысяч. Потолок. Рей. Потолок.');
    d.close();
    await lieDown();
    endAcid();
    setPhase('wed');
    saveGame({ loc: 'apartment', spawnX: 200 });
    await card('СРЕДА', 'до «Подвала» — два дня');
    return go('apartment', 200);
  }
  if (p === 'wed_night') {
    if (!F.momAsked && !F.momNightSeen) {
      F.momNightSeen = true;
      await d.think('Слышу, как мама возится на кухне. Пришла со смены. Может, поговорить с ней?');
      const c = await d.choose(['Поговорить с мамой', 'Спать']);
      if (c === 0) return;
    }
    await d.think('Засыпаю под гул холодильника. Снится, что я на сцене, а микрофон — это банан.');
    d.close();
    await lieDown();
    endAcid();
    setPhase('thu');
    await card('ЧЕТВЕРГ', 'до «Подвала» — один день');
    return go('apartment', 200);
  }
  if (p === 'thu_eve') return d.think('Не до сна. Дэн ждёт в гараже.');
  if (p === 'final' || p === 'outro') return d.think('Сначала — Дэн. Потом спать.');
  // День: можно скоротать время до вечера (иначе без склада не попасть к маме и Рею)
  const c = await d.choose(['Вздремнуть до вечера', 'Нет, есть дела']);
  if (c === 1) return;
  const next = p === 'wed' ? 'wed_night' : 'thu_eve';
  await d.think(next === 'wed_night' ? 'Закрываю глаза на минуту. Открываю — за окном темно.' : 'Проваливаюсь в сон. Просыпаюсь от сообщения Дэна: «ТЫ ГДЕ».');
  d.close();
  await lieDown();
  setPhase(next);
  await card(next === 'wed_night' ? 'СРЕДА · НОЧЬ' : 'ЧЕТВЕРГ · ВЕЧЕР', next === 'wed_night' ? 'мама скоро придёт со смены' : 'Дэн ждёт в гараже');
  go('apartment', 200);
}

async function wakeWednesday(ctx) {
  const { d } = ctx;
  F.wedWake = true;
  await d.think('Среда. Мама ушла на смену в шесть. На холодильнике — записка.');
  await d.think('Пятнадцать тысяч до пятницы. В кармане — пятьсот.');
  await d.think('Дэн говорил про склад тёти Любы. Мама вечером придёт со смены. Рей сказал — он у арки каждый вечер.');
  await d.think('И ещё… я давно не открывал ящик стола.');
  const c = await d.choose(['Позвонить тёте Любе', 'Потом']);
  if (c === 0) await callLyuba(ctx);
}

async function wakeThursday({ d }) {
  F.thuWake = true;
  await d.think('Четверг. Завтра — «Подвал».');
  if (hasItem('mic')) return d.think('Микрофон уже есть. Вечером — к Дэну на репетицию.');
  if (state.cash >= 2000) await d.think('Деньги есть. Пора на барахолку у станции — она до восьми.');
  else await d.think('Денег всё ещё почти нет. Плохо. Очень плохо.');
  if (F.momKnowsAcid) await d.think('На холодильнике записка, мамин почерк сильнее обычного вдавлен в бумагу: «Нам надо поговорить».');
}

setLyubaCall((ctx) => callLyuba(ctx));

async function callLyuba({ d, goal, sfx: play }) {
  play('phone');
  F.jobUnlocked = true;
  await d.think('Гудки. Долгие.');
  await d.say('Тётя Люба', 'Алё! Маркуша? Мамка говорила, говорила! На склад хочешь?');
  await d.say('Тётя Люба', 'Приходи к семи. Автобус от арки, сорок минут. Только не опаздывай — у нас бригадир, Палыч, зверь. Зверь, Маркуша!');
  await d.say('Тётя Люба', 'Смена — весь день. Платят в конце. Наличкой. Ну, давай, целую, мамке привет!');
  goal('Склад: автобус от остановки за аркой. Смена — весь день');
}

// ---------- Путь Г: часы отца ----------

async function fatherWatch({ d, item, line, goal, fx }) {
  fx.dust(690, 400, 60);
  if (!F.watchFound) {
    F.watchFound = true;
    await d.think('Ящик стола. Под старыми тетрадями и сломанными наушниками — отцовские часы «Полёт».');
    await d.think('Стоят. Остановились в тот год, когда он ушёл. Единственное, что от него осталось.');
  } else {
    await d.think('Часы «Полёт». Снова держу их в руке.');
  }
  const c = await d.choose(['Взять с собой (в ломбарде за них дадут денег)', 'Оставить']);
  if (c === 0) {
    F.watchTaken = true;
    item('watch');
    goal('Ломбард «24» — на автобусе от остановки за аркой');
  } else {
    await d.think('Пусть лежат. Его часы стоят. Как и он сам для меня.');
    line({ id: 'father_watch', text: 'Его часы стоят. Как и он сам для меня', tag: 'pain' });
  }
}

async function pawnWatch({ d, cash, goal, sfx: play, fx }) {
  if (!hasItem('watch')) {
    return d.say('Лёва', 'Сдавать нечего? Тогда не загораживай свет, молодой человек. Свет — он тоже денег стоит.');
  }
  await d.say('Лёва', 'Ну-ка, ну-ка… «Полёт». Семьдесят девятый год. Механика, позолота. Хорошие.');
  await d.say('Лёва', 'Двенадцать дам. Больше тебе никто не даст. Рей подтвердит — он у меня постоянный.');
  const c = await d.choose(['«Продаю.»', '«Нет. Это отца.»']);
  if (c === 0) {
    takeItem('watch');
    F.soldWatch = true;
    play('register');
    fx.burst(680, 380, { color: 0xffd166, count: 14, speed: 160 });
    cash(12000);
    await d.say('Лёва', 'Приятно иметь дело. Рею привет. Шучу. Или нет.');
    await d.think('Двенадцать тысяч. Почему так тяжело в кармане, если это просто бумажки?');
    goal(state.cash >= 2000 ? 'Купить микрофон на барахолке у станции' : 'Найти ещё денег на микрофон');
  } else {
    await d.say('Лёва', 'Сентиментальный. Сентиментальные долго не живут, но живут красиво.');
  }
}

// ---------- Мама живая: окликает сама, палит марочку ----------

// Настроение мамы: устала после смены, плюс отношение, плюс то, что она знает
function momMood() {
  let m = -1 + (state.rel.mom >= 2 ? 1 : state.rel.mom <= -1 ? -1 : 0);
  if (F.momWorried) m -= 1;
  if (F.grannySawRay) m -= 1;
  if (F.toldMomWhere) m += 1;
  return Phaser.Math.Clamp(m, -2, 2);
}

const MOM_OPENER = voiced('Мама', {
  warm: 'Ой, ты не спишь? Иди сюда. Я пирожков из столовой принесла, ещё тёплые.',
  ok: 'Марк? Ты чего не спишь? Есть будешь? Там гречка.',
  tired: 'Опять до ночи где-то был? Я с ног валюсь, а ты…',
  cold: 'Садись. Мне баба Валя кое-что рассказала.',
});

async function momCallsOut(ctx) {
  const { d, npc, scene } = ctx;
  F.momGreeted = true;
  const mom = npc('mom');
  mom?.setFlipX(scene.player.x < mom.x);
  if (F.acidNow) return momSeesAcid(ctx);
  const mood = momMood();
  await d.say('Мама', mood >= 1 ? MOM_OPENER.warm : mood === 0 ? MOM_OPENER.ok : mood === -1 ? MOM_OPENER.tired : MOM_OPENER.cold);
  const opts = [];
  if (!F.momAsked) opts.push(['money', '«Мам, мне нужно поговорить. Про деньги.»']);
  opts.push(['night', '«Всё нормально. Спокойной ночи.»']);
  opts.push(['pass', '[Молча пройти мимо]']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'money') return momPath(ctx);
  if (pick === 'night') {
    await d.say('Мама', 'Спокойной… Ты поешь только. И не сиди до утра.');
    return;
  }
  state.rel.mom -= 1;
  await d.say('Мама', 'Даже не поздороваешься? …Ну и ладно.');
}

async function momTalk(ctx) {
  const { d } = ctx;
  F.momGreeted = true;
  if (F.acidNow && !F.momSawAcid) return momSeesAcid(ctx);
  if (!F.momAsked) return momPath(ctx);
  if (F.momKnowsAcid) return d.say('Мама', 'Иди спать, Марк. Я не могу сейчас. Утром.');
  if (F.momLoan) return d.say('Мама', 'Иди спать, артист. Мне вставать через пять часов.');
  await d.say('Мама', 'Ты всё ещё тут? Иди спи. Утро вечера мудренее.');
}

// Марк под марочкой, а мама — нет
async function momSeesAcid(ctx) {
  const { d, fx } = ctx;
  F.momSawAcid = true;
  // Почти всегда палит: она этого насмотрелась
  const chance = 0.8 + (state.rel.mom >= 1 ? 0.1 : 0) + (momMood() <= -1 ? 0.05 : 0);
  await d.say('Мама', 'Марк? Подойди-ка.');
  if (Math.random() > chance) {
    await d.say('Мама', 'Ты какой-то бледный. Поешь и спать. Слышишь?');
    return;
  }
  F.momKnowsAcid = true;
  fx.shake(150, 0.004);
  await d.say('Мама', 'Посмотри на меня. Посмотри, говорю.');
  await d.say('Мама', 'Ты чё, упоролся? Зрачки! У тебя зрачки во всё лицо!');
  const c = await d.choose(['«Мам, я просто устал.»', '«Да. Рей дал. Один раз.»', '[Уйти в комнату]'], { timer: 8, timeoutIndex: 2 });
  if (c === 0) {
    state.pulse -= 2;
    if (state.rel.mom >= 2 && Math.random() < 0.4) {
      F.momKnowsAcid = false;
      F.liedMom = true;
      await d.say('Мама', 'Устал он… Ладно. Иди ложись. Я тебе чай принесу.');
      await d.think('Она поверила. От этого почему-то ещё хуже.');
      return;
    }
    state.rel.mom -= 1;
    F.liedMom = true;
    F.momNoMoney = true;
    await d.say('Мама', 'Не ври мне. Я твоего отца двадцать лет таким видела. Таким же «уставшим».');
    await d.say('Мама', 'Иди. Видеть тебя сейчас не могу.');
  } else if (c === 1) {
    state.stats.honesty += 1;
    state.pulse += 1;
    F.momKnowsRay = true;
    F.momNoMoney = true;
    await d.say('Мама', 'Рей?! …Господи. Его мать до сих пор по ночам плачет. Ты хочешь, чтобы и я?');
    await d.think('Она садится обратно на табуретку и закрывает лицо руками. Потом встаёт и обнимает меня. Крепко, как в детстве.');
    await d.say('Мама', 'Ещё раз — и я не знаю, что сделаю. Иди спать. Утром поговорим.');
    ctx.line({ id: 'mom_pupils', text: 'Мама смотрит в мои зрачки и видит отца', tag: 'pain' });
  } else {
    state.rel.mom -= 1;
    state.pulse -= 1;
    F.momNoMoney = true;
    await d.say('Мама', 'Марк! Марк, вернись! …Ну и иди.');
    await d.think('Закрываю дверь. Слышу, как она звонит кому-то и говорит шёпотом.');
  }
}

// ---------- Путь Б: мама ----------

async function momPath({ d, cash, line, goal, sfx: play, fx, wait }) {
  F.momAsked = true;
  if (F.momNoMoney) {
    await d.say('Марк', 'Мам… мне нужны деньги. На микрофон.');
    await d.say('Мама', 'Деньги? Сейчас? Чтобы ты их этому Рею отнёс? Нет, Марк. Не сегодня.');
    return;
  }
  await d.think('Мама сидит на кухне в пальто. Не раздевается — нет сил. Двадцать три сорок.');
  if (F.momTalk === 'promise') {
    await d.say('Мама', 'Ты чего не спишь? …Ты же обещал всё изменить, Марк. Вот и меняй.');
    await d.say('Мама', 'Сколько надо?');
  } else if (F.momTalk === 'rude') {
    await d.say('Мама', 'Утром «отстань», а ночью «мам, дай денег»? Я по лицу вижу, что ты за деньгами.');
    await d.say('Мама', 'Сначала извинись.');
    const c = await d.choose(['«Прости, мам.»', '[Уйти]']);
    if (c === 1) {
      state.rel.mom -= 1;
      return d.think('Ухожу в комнату. Слышу, как она тихо плачет на кухне. Или мне кажется.');
    }
    state.rel.mom += 1;
    await d.say('Мама', '…Ладно. Говори.');
  } else {
    await d.say('Мама', 'Ну? Говори. Ты же не просто так не спишь.');
  }
  if (F.rayFriend || F.grannySawRay) {
    await d.say('Мама', 'Мне баба Валя сказала, тебя с этим… в леопардовом у арки видели.');
    await d.say('Мама', 'Марк. Только не он. Его мать до сих пор по ночам плачет.');
  }
  await d.say('Марк', 'Пятнадцать тысяч. На микрофон. В пятницу выступление.');
  play('wood');
  await d.think('Мама достаёт с антресолей жестяную коробку из-под печенья. Внутри — конверт. На нём её почерком: «НА ЗИМУ».');
  await d.say('Мама', 'Это на сапоги было. Мои совсем протекают.');
  const c = await d.choose(['«Я верну. С первого гонорара.»', '«Не надо. Я сам.»', '[Молча взять конверт]'], { timer: 10, timeoutIndex: 2 });
  if (c === 0) {
    F.momLoan = true;
    state.rel.mom += 1;
    cash(15000);
    await d.say('Мама', 'Гонорара… Ладно, артист.');
    await d.think('Она улыбается. Впервые за неделю.');
    line({ id: 'mom_boots', text: 'Её зимние сапоги — мой микрофон', tag: 'pain' });
  } else if (c === 1) {
    state.stats.honesty += 1;
    state.rel.mom += 1;
    await d.say('Мама', '…Весь в меня. Упрямый.');
    await d.think('Она прячет конверт обратно. Я никогда не видел, чтобы она так быстро что-то прятала.');
  } else {
    F.momLoan = true;
    state.rel.mom -= 1;
    cash(15000);
    await d.think('Беру конверт. Мама смотрит, как я ухожу. Ничего не говорит.');
    line({ id: 'mom_boots', text: 'Её зимние сапоги — мой микрофон', tag: 'pain' });
  }
  await d.say('Мама', 'Иди спать. Завтра твой четверг, а у меня — две смены.');
  if (F.momLoan) goal('Купить микрофон на барахолке у станции (днём)');
}

// ---------- Путь А: склад ----------

async function startShift({ d, start, npc }) {
  const first = !F.shifts;
  if (first) {
    await d.say('Палыч', 'Ты кто? Новенький? Мне сказали — двоих пришлют. Прислали одного. И худого.');
    await d.say('Палыч', 'Фура — сорок коробок. Разгрузил — получил. Уронил — вычту. Сто рублей за коробку. Вопросы?');
    const c = await d.choose(['«Нет вопросов.»', '«А обед будет?»']);
    if (c === 1) await d.say('Палыч', 'Обед будет, когда фура будет пустая. Мотивация, понял?');
    await d.say('', 'Лови коробки в ритм: жми ПРОБЕЛ / E (или тапни), когда коробка в жёлтой зоне. Красные — хрупкие.', '#ffd166');
  } else {
    await d.say('Палыч', 'О, вернулся. Не сбежал. Уже уважаю на десять процентов. Фура ждёт.');
  }
  d.close();
  F.shiftInProgress = true;
  start('Warehouse', { shift: (F.shifts || 0) + 1 });
}

async function afterShift({ d, npc, walk, wait, cash, line, goal, card, go, fx, scene }) {
  const r = F.shiftResult;
  F.shiftResult = null;
  F.shiftInProgress = false;
  F.shifts = (F.shifts || 0) + 1;
  // Смена на складе: обед из столовой, но пыль и пот до костей
  food(25);
  clean(-35);
  scene.refreshHud?.();
  if (phase() === 'wed') F.workedWed = true;
  if (phase() === 'thu') F.workedThu = true;
  if (r.hits >= Math.ceil(r.total * 0.8)) F.goodRhythm = true;
  let pay = r.pay;

  if (F.shifts === 1) {
    await d.think('Перерыв. Руки гудят. Спина говорит со мной на языке, которого я раньше не знал.');
    await d.say('Ахмед', 'Ты чего такой задумчивый? Я тоже музыку писал. В твоём возрасте. На гитаре. Про горы.');
    await d.say('Ахмед', 'Потом дети, ипотека, склад… Не бросай, понял? Не бросай.');
    line({ id: 'warehouse', text: 'Склад глотает мечты по сорок коробок за смену', tag: 'pain' });
    // Рей подъезжает к воротам
    F.rayAtWarehouse = true;
    const ray = addActor(scene, 1560, FLOOR, 'ray', { depth: 10, flip: true });
    await walk(ray, 1400, 140);
    await d.say('Рей', 'Братик! Ты тут коробки таскаешь? Пайка какая… Рей в этой малышечке, если что.');
    await d.think('Рей что-то передаёт Палычу через окошко. Палыч быстро прячет это в карман жилета.');
    d.close();
    await walk(ray, 1560, 160);
    ray.destroy();
    F.rayAtWarehouse = false;
    // Палыч орёт на Ахмеда
    fx.shake(200, 0.006);
    await d.say('Палыч', 'АХМЕД! Кто коробку с плазмой разбил?! Из твоих вычту, понял?! Из твоих!');
    const c = await d.choose(['«Это я уронил.»', '[Промолчать]', '«Сам бы попробовал так быстро таскать!»']);
    if (c === 0) {
      state.stats.honesty += 1;
      F.akhmedFriend = true;
      pay -= 1000;
      await d.say('Палыч', 'Ты?! …Тысяча из зарплаты. Честный, значит. Честные у меня долго не задерживаются.');
      await d.say('Ахмед', '(шёпотом) Спасибо, брат. Должен буду.');
    } else if (c === 1) {
      await d.think('Ахмед опускает глаза. Я — тоже.');
    } else {
      F.cheeky = true;
      F.fired = true;
      pay = Math.round(pay / 2);
      await d.say('Палыч', 'Что?! Ты мне ещё указывать будешь? Вон! Полсмены — и чтоб я тебя больше не видел!');
    }
  } else {
    await d.say('Палыч', 'Вторая смена — уже мужик. Держи. Не пропей.');
  }

  pay = Math.max(0, pay);
  await d.say('', `Смена: поймано ${r.hits} из ${r.total} коробок. Штраф за разбитые: −${r.misses * 100} ₽. На руки: ${pay.toLocaleString('ru-RU')} ₽.`, '#ffd166');
  cash(pay);
  d.close();
  const next = phase() === 'wed' ? 'wed_night' : 'thu_eve';
  setPhase(next);
  goal(hasItem('mic') ? 'Отнести микрофон Дэну' : 'Купить микрофон на барахолке у станции');
  await card(next === 'wed_night' ? 'СРЕДА · НОЧЬ' : 'ЧЕТВЕРГ · ВЕЧЕР', 'автобус обратно, сорок минут');
  go('yard', 2515, 'left');
}

// ---------- Остановка: куда едем ----------

function canWork() {
  if (!F.jobUnlocked || F.fired) return false;
  if (phase() === 'wed') return !F.workedWed;
  if (phase() === 'thu') return !F.workedThu;
  return false;
}

async function travel({ d, card, go, sfx: play }) {
  if (['tue_night', 'wed_night', 'final'].includes(phase())) {
    play('deny');
    return d.think('Автобусы уже не ходят. Через арку видно пустую остановку и мокрую урну.');
  }
  const opts = [];
  if (canWork()) opts.push(['work', 'Склад «ЛогистЛайн» — смена на весь день']);
  if (hasItem('watch')) opts.push(['pawn', 'Ломбард «24»']);
  opts.push(['flea', 'Барахолка у станции «Заводская»']);
  opts.push(['stay', 'Остаться во дворе']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'stay') return;
  d.close();
  if (pick === 'work') {
    await card('СКЛАД «ЛОГИСТЛАЙН»', '7:00 · автобус, сорок минут');
    return go('warehouse', 1370, 'left');
  }
  if (pick === 'pawn') {
    await card('ЛОМБАРД «24»', 'две остановки');
    return go('pawnshop', 940, 'left');
  }
  await card('БАРАХОЛКА', 'ст. Заводская');
  go('flea', 100);
}

// ---------- Барахолка: Гоша и микрофоны ----------

async function buyMic({ d, cash, item, goal, fx, sfx: play }) {
  if (hasItem('mic')) return d.say('Гоша', 'У тебя уже есть микрофон. Не изменяй ему. Они всё чувствуют.');
  if (!F.goshaMet) {
    F.goshaMet = true;
    await d.say('Гоша', 'Тихо, тихо, Марусенька, не нервничай… (тебе) Вам кого? Динамического или конденсаторного?');
    await d.say('Гоша', 'Конденсаторные — капризные, как бывшие. Динамические — как собака: бьёшь, а он всё равно работает.');
  }
  const opts = MICS.map((m) => `${m.name} — ${m.price.toLocaleString('ru-RU')} ₽${state.cash < m.price ? '  (не хватает)' : ''}`);
  opts.push('Просто смотрю');
  const c = await d.choose(opts);
  if (c === MICS.length) return d.say('Гоша', 'Смотри. За смотреть денег не беру. Пока.');
  const mic = MICS[c];
  if (state.cash < mic.price) {
    play('deny');
    return d.say('Гоша', 'Денег нет — любви нет. Приходи с деньгами, Марусенька подождёт.');
  }
  cash(-mic.price);
  F.micType = mic.id;
  item('mic');
  fx.burst(1000, 360, { color: 0x3df0ff, count: 16, tex: 'spark', speed: 180 });
  await d.say('Гоша', GOSHA_MIC[mic.id]);
  if (mic.id === 'stolen') F.stolenMic = true;
  goal(phase() === 'thu_eve' ? 'Отнести микрофон Дэну в гараж №17 — репетиция' : 'Репетиция у Дэна — в четверг вечером');
}

const GOSHA_MIC = voiced('Гоша', {
  stolen: 'Этот… ты не спрашивай, откуда он. Он сам пришёл. Ночью. Без коробки.',
  rey: 'Это Рея. Он его мне за долги сдал. Говорил, микрофон «лидогенерирует». Я не понял. Ты понял?',
  oktava: '«Октава»! Наша, тульская. Тёплая, как бабушкины руки. Иногда шипит — это она дышит.',
  shure: '«Шур». Надёжный, как налоговая. Звучит как у всех. Зато звучит.',
  new: 'В коробке! С плёнкой! Последний такой. Пахнет как будущее. Я его сам чуть не оставил себе.',
});

// ---------- Путь В: Рей у арки ----------

async function rayDeal(ctx) {
  const { d, cash, item, line, pickLines, fx, scene, sfx: play, goal, acid } = ctx;
  for (let i = 0; i < 6; i++) {
    const b = scene.add.image(2400 + Phaser.Math.Between(-20, 20), FLOOR - 130, 'bubble').setDepth(25).setScale(Phaser.Math.FloatBetween(0.8, 1.6));
    scene.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(80, 200), x: b.x + Phaser.Math.Between(-60, 60), alpha: 0, duration: 2000 + i * 200, delay: i * 150, onStart: () => play('bubble'), onComplete: () => b.destroy() });
  }
  if (F.rayDealDone) {
    if (F.reyDebt) return d.say('Рей', 'Двадцатка через две недели, помнишь? Не помнишь — я напомню. Я всегда напоминаю. Это CRM, братик.');
    if (F.reyLeadgen) return d.say('Рей', 'Флаеры не потерял? В пятницу сто лидов. Сучки — в первую очередь. Они конвертятся лучше всех.');
    return d.say('Рей', 'Смотри, пузырь лопнул. Пайка. Ещё один — тоже пайка. Жизнь, братик — это воронка из пузырей.');
  }
  await d.think('Рей сидит на капоте старого «Мерса» и пускает мыльные пузыри. Внимательно смотрит, как лопается каждый.');
  if (F.rayOffended) {
    await d.say('Рей', 'О. Гаражный. Обиделся я на тебя, братик. Но бизнес — это не обиды. Бизнес — это лиды.');
  } else {
    await d.say('Рей', 'О, братик пришёл. Я знал. Я видел тебя в пузыре.');
  }
  await d.say('Рей', 'Сколько?');
  await d.say('Марк', 'Пятнадцать.');
  await d.say('Рей', 'Пятнадцать… (считает на пальцах, сбивается) Ладно. Есть воронки, выбирай.');
  const opts = ['«Просто в долг.»', '«Чем могу отработать?»'];
  const canSell = state.lines.length >= 6;
  if (canSell) opts.push('«Купи у меня текст.»');
  opts.push('«Забудь. Я передумал.»');
  const c = await d.choose(opts);
  const pick = opts[c];

  if (pick.includes('долг')) {
    F.rayDealDone = true;
    F.reyDebt = true;
    F.moneyPathRay = true;
    cash(15000);
    await d.say('Рей', 'Даю пятнашку. Через две недели — двадцатка. Проценты — это тоже лидогенерация, братик.');
    play('thump');
    fx.shake(200, 0.01);
    await d.say('Рей', '(хватает за яйца на прощание) Залог принят!');
  } else if (pick.includes('отработать')) {
    await d.say('Рей', 'О, деловой! Будешь моим лидогенератором. В пятницу ты в «Подвале», да? Там сто человек. Сто лидов, братик.');
    await d.say('Рей', 'И сучки. Сучки — горячие лиды, самые конверсионные.');
    await d.say('Рей', 'Раздаёшь флаеры «ЛИДОГЕН». А тем, кто спросит «а есть чё?», — вот эти, потолще. Внутри марочки. Не открывай, не нюхай, не лижи.');
    const c2 = await d.choose(['«Ладно.»', '«Флаеры раздам. Марки — нет.»', '«Нет.»']);
    if (c2 === 0) {
      F.rayDealDone = true;
      F.reyLeadgen = true;
      F.moneyPathRay = true;
      state.stats.addiction += 1;
      item('flyers');
      cash(15000);
      await d.say('Рей', 'Вот это воронка! Ты теперь в штате, братик. В штате Рея.');
    } else if (c2 === 1) {
      F.rayDealDone = true;
      F.reyLeadgenHalf = true;
      F.moneyPathRay = true;
      item('flyers');
      cash(7000);
      await d.say('Рей', 'Половина воронки — половина бабок. Пайка, но честно.');
    } else {
      await d.say('Рей', 'Нет так нет. Пайка, братик. Но я запомнил.');
    }
  } else if (pick.includes('текст')) {
    await d.say('Рей', '(снимает очки — впервые) …А ну. Покажи.');
    await d.think('Читаю ему пару строчек из тетради. Рей молчит дольше обычного.');
    await d.say('Рей', 'Братик… это не пайка. Это вообще не пайка. Это я забираю. На свой «ЛИДОГЕН».');
    await d.say('Рей', 'Пятнашка — и строчки мои. Насовсем. Ты их больше нигде не читаешь.');
    const c2 = await d.choose(['«Забирай.» (выбрать 3 строчки)', '«Не продаются.»']);
    if (c2 === 0) {
      d.close();
      const sold = await pickLines(3, 'ОТДАТЬ РЕЮ');
      if (!sold) {
        // Передумал в последний момент — строчки остаются при мне
        state.stats.honesty += 1;
        await d.think('Смотрю на страницу и закрываю тетрадь. Не могу. Это не товар.');
        await d.say('Рей', '(надевает очки обратно) Пайка… Но я понял. Своё не продают. Пока.');
        return;
      }
      sold.forEach((l) => {
        const i = state.lines.indexOf(l);
        if (i >= 0) state.lines.splice(i, 1);
        state.soldLines.push(l);
      });
      F.rayDealDone = true;
      F.reyGhost = true;
      F.moneyPathRay = true;
      cash(15000);
      scene.bookCount?.setText(String(state.lines.length));
      fx.flash(scene.player.x, FLOOR - 80, 200, 200, 0xff3d8a, 0.6, 600);
      await d.think(`Рей перечитывает вслух: «${sold[0].text}». Смакует каждое слово.`);
      await d.say('Рей', 'Это теперь моё, братик. Лидогенерация чужого таланта — самая честная.');
      await d.think('Три строчки исчезли из тетради. Будто вырвал страницу из себя.');
    } else {
      state.stats.honesty += 1;
      state.rel.ray += 1;
      await d.say('Рей', 'Уважаю. Пайка, но уважаю.');
    }
  } else {
    return d.say('Рей', 'Передумаешь обратно — я тут. Рей в этой малышечке. Всегда.');
  }

  // Марочка — один раз
  if (!F.markaOffered) {
    F.markaOffered = true;
    await d.say('Рей', 'Слушай, братик. Тебе для вдохновения надо. Одна марочка — и ты бит цветами увидишь.');
    await d.say('Рей', 'Я так «ЛИДОГЕН» писал. Двенадцать часов писал. Или три. Или я его не писал… неважно.');
    const c3 = await d.choose(['[Взять]', '«Не, я так.»', '[Взять на потом]']);
    if (c3 === 0) {
      startAcid();
      d.close();
      fx.screenFlash(0xff7ab8, 500);
      acid(true);
      await d.think('Кладу под язык. Бумажка горчит. Минут через двадцать лужа у арки начинает дышать.');
      await d.say('Рей', 'Во-о-от. Теперь ты видишь, как фонарь думает. Добро пожаловать в воронку, братик.');
      line({ id: 'acid_concrete', text: 'Бетон течёт, а я стою на месте', tag: 'pain' });
      line({ id: 'acid_bubble', text: 'Мой город — это пузырь, и я в нём лопаюсь', tag: 'dream' });
    } else if (c3 === 1) {
      await d.say('Рей', 'Пайка ты, братик. Но чистая пайка. Это тоже бренд.');
    } else {
      F.markaInInventory = true;
      item('marka');
      await d.say('Рей', 'На потом — это по-взрослому. Отложенная конверсия.');
    }
  }
  if (state.cash >= 2000 && !hasItem('mic')) goal('Купить микрофон на барахолке у станции (днём)');
}

// ---------- Четверг: финал в гараже ----------

const MIC_REACTION = voiced('Дэн', {
  new: 'Новый?! В коробке?! Брат, ты банк ограбил?',
  oktava: '«Октава»! Старая школа. Тёплая. Будет шипеть — значит, живая.',
  shure: '«Шур». Как у всех. Но работает — это главное.',
  stolen: '…Тут серийник сточен. Ты где его взял? Ладно. Не говори. Не хочу знать.',
  rey: 'Это… мик Рея? С наклейкой «ЛИДОГЕН»? Ты серьёзно? Он в него плевал. Буквально.',
  toy: 'Розовый. Со стразами. Поёт голосом феи. Но это микрофон, и он работает.',
});

// Микрофон принесли раньше четверга вечера: Дэн радуется, но репетиция всё равно вечером
async function micEarly(ctx) {
  const { d, goal, npc, fx, sfx: play } = ctx;
  F.danSawMic = true;
  const dan = npc('dan');
  dan.setFlipX(true);
  play('feedback');
  fx.burst(dan.x - 40, FLOOR - 120, { color: 0x3df0ff, count: 12, tex: 'spark', speed: 140 });
  await d.say('Марк', 'Смотри, что есть.');
  await d.say('Дэн', MIC_REACTION[F.micType] || MIC_REACTION.shure);
  if (phase() === 'thu') return waitForEvening(ctx, true);
  await d.say('Дэн', 'Репетируем завтра вечером. Сегодня бит недосведённый, а у тебя голос — как будто ты фуру разгрузил.');
  await d.say('Дэн', 'Иди отдыхай. Или ищи строчки. Строчки лишними не бывают.');
  goal('Репетиция у Дэна — в четверг вечером');
}

async function waitForEvening(ctx, fresh = false) {
  const { d, card, go } = ctx;
  if (!fresh) await d.say('Дэн', 'Вечером, брат. Я бит досвожу — к вечеру будет как надо.');
  else await d.say('Дэн', 'Слушай, давай вечером. Я бит досвожу, а ты пока распоёшься.');
  const c = await d.choose(['Подождать здесь до вечера', 'Ещё погуляю']);
  if (c === 1) return ctx.goal('Репетиция у Дэна — вечером');
  await d.think('Сижу на диване. Дэн крутит ручки, бормочет «низы, низы». За воротами темнеет.');
  d.close();
  setPhase('thu_eve');
  await card('ЧЕТВЕРГ · ВЕЧЕР', 'гараж №17');
  go('garage', 640);
}

// Ночёвка на диване у Дэна: мама будет волноваться, если не предупредить
async function sleepInGarage(ctx) {
  const { d, card, go } = ctx;
  const c = await d.choose(['Остаться на ночь у Дэна', 'Нет, пойду домой']);
  if (c === 1) return;
  {
    await d.think('Надо бы маме написать, что я у Дэна. Или не надо?');
    receive('mom', 'Марк, ты где? Уже ночь', {
      replies: [{ id: 'e1_night_dan', text: 'Я у Дэна, всё ок. Утром буду' }, { id: 'e1_night_lie', text: 'У друга. Не жди' }],
    });
    await d.say('', 'Мама пишет. Ответить можно в телефоне — клавиша P. Или не отвечать.', '#ffd166');
  }
  await d.say('Дэн', 'Плед в шкафу. Если ночью замёрзнешь — бабушкин ковёр снимай. Шучу. Не трогай ковёр.');
  d.close();
  await ctx.lieDown(210);
  F.sleptOut = (F.sleptOut || 0) + 1;
  endAcid();
  const next = phase() === 'tue_night' ? 'wed' : 'thu';
  setPhase(next);
  F.garageWake = next;
  await card(next === 'wed' ? 'СРЕДА' : 'ЧЕТВЕРГ', 'диван в гараже №17');
  go('garage', 300);
}

async function garageMorning(ctx) {
  const { d } = ctx;
  F.garageWake = null;
  await d.think('Просыпаюсь на диване. Пахнет бабушкиным ковром и остывшим паяльником.');
  await d.say('Дэн', 'Доброе. Ты храпишь, как фура Палыча. Чай будешь? Он без сахара. И без чая.');
  if (!F.warnedMom) {
    state.rel.mom -= 1;
    F.momWorried = true;
    await d.think('В телефоне — четыре пропущенных от мамы. Она не спала.');
    receive('mom', 'Марк!!! Ты где?! Я всю ночь не спала. Позвони немедленно');
  } else if (F.liedMomNight) {
    await d.think('Мама написала: «Позавтракай нормально». Сухо. Она поняла, что я соврал.');
  } else {
    await d.think('Мама написала: «Позавтракай нормально». Значит, не сердится. Почти.');
  }
  if (phase() === 'wed') {
    F.wedWake = true;
    await d.think('Среда. До «Подвала» два дня. Пятнадцать тысяч не появятся сами.');
    await d.think('Склад тёти Любы, мама вечером, Рей у арки… и ящик стола дома.');
  } else {
    F.thuWake = true;
    await d.think('Четверг. Завтра — «Подвал».');
    if (hasItem('mic')) await d.think('Микрофон есть. Вечером — репетиция. Прямо здесь.');
  }
}

async function toyMic(ctx) {
  const { d, item } = ctx;
  await d.say('Дэн', 'Ну? Есть?');
  await d.say('Марк', '…Нет.');
  await d.say('Дэн', '(долго молчит, потом лезет под диван) Значит, будешь читать в караоке-микрофон моей сестры.');
  await d.say('Дэн', 'Розовый. Со стразами. Работает от батареек. Не спрашивай.');
  F.micType = 'toy';
  item('mic');
  await finale(ctx, true);
}

async function finale(ctx, skipCard = false) {
  const { d, card, scene, acid, npc, start, wait } = ctx;
  if (!skipCard) await card('ЧЕТВЕРГ · НОЧЬ', 'гараж №17');
  setPhase('final');
  ctx.hud();
  acid(!!F.acidNow);
  const dan = npc('dan');
  dan.setFlipX(true);
  scene.player.x = 780;
  scene.player.setFlipX(false);
  await wait(300);
  if (F.danSawMic) {
    await d.think('Микрофон на стойке. Дэн протирает его рукавом, как трофей.');
  } else {
    F.danSawMic = true;
    await d.think('Новый микрофон на стойке. Дэн бережно снимает плёнку, как с иконы.');
    await d.say('Дэн', MIC_REACTION[F.micType] || MIC_REACTION.shure);
  }

  // Как добыли деньги — Дэн всё равно узнает
  if (F.shifts) {
    state.rel.dan += 1;
    await d.say('Дэн', 'Ты чего, реально фуры таскал? Брат… Уважение.');
  }
  if (F.momLoan) await d.say('Дэн', 'От мамы? …Ну, теперь точно нельзя облажаться.');
  if (F.reyDebt) {
    state.rel.dan -= 1;
    await d.say('Дэн', '(долго молчит) Я же говорил — аккуратно. Он тебя улыбнёт, а потом распогодится. Ладно. Разберёмся.');
  }
  if (F.reyLeadgen || F.reyLeadgenHalf) {
    await d.say('Дэн', 'А это что за пачка в кармане? «ЛИДОГЕН»?');
    const c = await d.choose(['[Рассказать всё]', '«Флаеры. Просто флаеры.»']);
    if (c === 0) {
      state.rel.dan -= 1;
      F.danKnowsFlyers = true;
      await d.say('Дэн', 'Ты в пятницу должен читать, а не марки раздавать! …Ладно. Я буду рядом. Если что — сваливаем.');
    } else {
      F.liedDan = true;
      await d.say('Дэн', '…Ну, флаеры так флаеры.');
    }
  }
  if (F.reyGhost) {
    state.rel.dan -= 2;
    F.danHurt = true;
    await d.say('Дэн', 'Погоди. Тут страницы не хватает. Где наши строчки? Их нет в тетради.');
    await d.say('Дэн', 'Ты продал… наши строчки? Рею? Брат, это не микрофон. Это ты сам себя продал.');
  }
  if (F.soldWatch) await d.say('Дэн', 'Ты продал… часы? Отцовские? Марк…');
  // Дэн замечает марочку, только если она действует прямо сейчас
  if (F.acidNow) await d.say('Дэн', 'Ты чего такой… стеклянный? Глаза как блюдца. Ты у Рея был?');
  else if (acidYesterday()) await d.say('Дэн', 'Ты вчера у Рея был? Выглядишь как после стирки. Ладно, не моё дело. Пока.');

  await d.say('Дэн', 'Ну что, проверим? Зачитай новое. Я пишу.');
  d.close();
  start('Studio', { mode: 'rehearsal', acid: !!F.acidNow });
}

const REHEARSAL_VERDICT = voiced('Дэн', {
  toy: 'Звучит… как фея с района. Но звучит.',
  normal: 'Звучит. Чёрт, как звучит.',
});

async function afterRehearsal({ d, acid, goal, npc, scene, wait }) {
  F.e1FinaleTalk = true;
  const dan = npc('dan');
  dan.setFlipX(true);
  scene.player.setFlipX(false);
  acid(!!F.acidNow);
  await wait(300);
  await d.say('Дэн', F.micType === 'toy' ? REHEARSAL_VERDICT.toy : REHEARSAL_VERDICT.normal);
  await d.say('Дэн', 'Завтра в восемь. «Подвал». Не опаздывай.');
  const c = await d.choose(['«Я никогда не опаздываю.»', '«Если облажаюсь — ты меня вытащишь?»', '[Молча обнять]']);
  if (c === 1) {
    state.rel.dan += 1;
    await d.say('Дэн', 'Я тебя оттуда на руках вынесу. Со сцены или в больницу — по ситуации.');
  } else if (c === 2) {
    state.rel.dan += 1;
    await d.say('Дэн', '…Ну всё, всё. Иди. А то я сейчас расплачусь, и это будет не контент.');
  } else {
    await d.say('Дэн', 'Ага. В прошлый раз ты на сорок минут опоздал. На свой день рождения.');
  }
  goal('Иди домой. Завтра — «Подвал»');
}

// ---------- Дорога домой: Аркаша, афиша, Рей под фонарём ----------

async function outro({ d, npc, walk, wait, fx, scene, sfx: play, line, item, go }) {
  const p = scene.player;
  // Аркаша клеит стикеры на гаражи
  const ark = addActor(scene, 2190, FLOOR, 'arkasha', { depth: 10, flip: true });
  await wait(500);
  await walk(p, 2090, 150);
  p.setFlipX(false);
  play('switch');
  fx.screenFlash(0xffffff, 250);
  await d.say('Аркаша', 'О! Не двигайся! Свет фонаря, мокрый асфальт, грустный пацан — это контент. Это ВСЁ контент.');
  await d.say('Аркаша', 'Ты Тень? Тень из гаража? Я jeffrY#creator. Креатор. Обложки, клипы, мерч — всё, что глазами.');
  const c = await d.choose(['[Позировать]', '«Убери телефон.»', '«Что за стикеры?»']);
  if (c === 0) {
    state.rel.arkasha = (state.rel.arkasha || 0) + 1;
    state.stats.fame += 1;
    fx.screenFlash(0xffffff, 200);
    play('switch');
    await d.say('Аркаша', 'Да-да-да! Вот так! Это обложка, брат. Я тебе её сделаю. Скину. Завтра. Или послезавтра. Или…');
  } else if (c === 1) {
    state.rel.arkasha = (state.rel.arkasha || 0) - 1;
    await d.say('Аркаша', 'Окей-окей. Без контента. Аналоговый ты. Это тоже эстетика, кстати.');
  } else {
    item('sticker');
    await d.say('Аркаша', 'Мои! Держи. Клей куда хочешь — на гараж, на лоб, на маму. Шучу. На маму не надо.');
  }
  await d.say('Аркаша', 'В пятницу «Подвал»? Я там снимаю. Давай коллаб: ты — звук, я — визуал, вместе мы — экосистема.');
  await d.say('Аркаша', 'Всё, бегу, мне ещё три района обклеить!');
  line({ id: 'lamp_cover', text: 'В свете фонаря я почти обложка', tag: 'dream' });
  d.close();
  walk(ark, 1500, 220).then(() => ark.destroy());
  await wait(400);

  // Через арку — улица, барбершоп и свежая афиша
  await walk(p, 2420, 140);
  await d.think('Через арку видно улицу. Новая вывеска: «ОПАСНАЯ БРИТВА — ОТКРЫТИЕ В ПЯТНИЦУ». Надо бы постричься перед сценой. Если успею.');
  await d.think('На стене свежая афиша «Подвала»: 3g0th2002, RAY, вопросительный знак… и twinspeak. Вопросительный знак — это я.');

  // Рей под фонарём — впервые без понтов
  const ray = npc('ray');
  ray.x = 2560;
  ray.setFlipX(true);
  await wait(300);
  await d.think('Под фонарём у арки стоит Рей. Тихо читает что-то сам себе. Без пузырей. Без «братика».');
  await d.say('Рей', '(не оборачиваясь) Я тоже когда-то в «Подвале» первый раз выступал, братик. Мне хлопали.');
  await d.say('Рей', 'Потом перестали.');
  await d.say('Рей', 'Пайка, да?');
  d.close();
  ray.setFlipX(false);
  walk(ray, 2760, 90);
  scene.tweens.add({ targets: ray, alpha: 0, duration: 1600, delay: 600 });
  await wait(2200);
  await d.think('Завтра — «Подвал». Первый настоящий выход.');
  F.e1Done = true;
  d.close();
  go('End');
}
