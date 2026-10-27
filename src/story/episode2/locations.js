// Локации Эпизода 2: дом, двор, гараж, улица за аркой, кафе-квартал, торговая улица, дворы,
// интерьеры (шаурма, барбер, тату, одежда, три кафе, «Проявка», «Кран-Сервис», ломбард),
// метро, «Подвал», афтепати, крыши, клуб, ночной порт, промзона, «Речная», «Арена».
import { drawApartment, drawYard, drawGarage, drawPawnshop, drawWarehouse } from '../backdrops.js';
import { drawStreet, drawInterior, drawMetro, drawRooftop, drawPort, drawPromzona, drawRechnaya, isDarkNow, trainArrive } from './scenery.js';
import { F, state, hasItem, now, at, day, exit, once, pickOne, quest, questStatus } from './common.js';
import { isAt, whereIs, studioOccupant, isNight } from './world.js';
import { castKey, personTexture, randomSpec } from './people.js';
import { addActor } from '../../gfx/actors.js';
import { paintCourtyards } from '../../gfx/places/misc.js';
import { WORKERS, onShift, prepareWorkers } from './workers.js';
import * as M from './main.js';
import * as P from './podval.js';
import * as G from './girls.js';
import * as C from './city.js';
import * as S from './side.js';
import * as R from './courier.js';
import { STATIONS, station, chooseStation, metroOpen } from './metro.js';

const FLOOR = 470;

// Человек из сюжета (спрайт из генератора) — текстура готовится в prepare
const cast = (id) => `cast_${id}`;
const prepCast = (ids) => (scene) => ids.forEach((id) => castKey(scene, id));

// ---------- Дом ----------

const apartment = {
  title: 'ДОМ',
  width: 1900,
  spawnX: 200,
  ambience: 'flat',
  steps: 'stepWood',
  night: () => (isNight() ? 0.38 : 0),
  draw: (s) => drawApartment(s, 1900),
  prepare: prepCast(['mira', 'kira', 'lola']),
  lamps: () => (isNight() ? [{ x: 686, y: 352, r: 90 }, ...(M.momIsHome() ? [{ x: 1150, y: 120, r: 170, color: 0xfff0c8, alpha: 0.35 }] : [])] : []),
  doors: [
    { id: 'd1', x: 775, w: 58, h: 206, auto: true, interior: true, inside: 0x4a4f66, insideFloor: 0x4a3a3a },
    { id: 'd2', x: 1375, w: 58, h: 206, auto: true, interior: true, inside: 0x34463f },
    { id: 'bath', x: 1703, w: 80, h: 200, color: 0xd8d0c0, interior: true, inside: 0x8ab4c8, insideFloor: 0x5a6a78 },
    { id: 'front', x: 1840, w: 94, h: 210, color: 0x6a3a2a },
  ],
  async onEnter(ctx) {
    if (day() === 'fri' && !F.e2FriMorning) return M.fridayMorning(ctx);
    if (day() !== 'fri' && !F[`e2Morning_${day()}`] && F.e2SleptAt !== 'garage' && F.e2SleptAt !== 'party') {
      if (F.e2SleptAt === 'police') return policeMorning(ctx);
      return M.morning(ctx);
    }
    if (F.e2GirlInvited && !F.e2GirlHome && day() === 'sun') return G.girlArrives(ctx);
  },
  npcs: () => [
    { id: 'mom', name: 'Мама', sprite: 'mom', x: 1150, flip: true, dynamic: true, when: () => (day() === 'fri' && !F.e2FriMorning) || M.momIsHome(), talk: M.momTalk2 },
  ],
  items: [
    { x: 200, label: 'Кровать', sfx: 'bed', use: (ctx) => M.sleepHere(ctx, 'home') },
    { x: 480, label: 'Окно', sfx: 'whoosh', async use({ d }) {
      await d.think(isNight() ? 'Ночь. Три окна в доме напротив. В одном кто-то тоже не спит.' : day() === 'sun' ? 'Воскресенье. Даже голуби ходят медленнее.' : 'Город. Где-то там — «Подвал», Рей, кафе, люди. Все чего-то хотят.');
    } },
    { x: 872, label: 'Холодильник', sfx: 'fridge', cost: 15, async use({ d, fx }) {
      fx.flash(872, 380, 84, 180, 0xbfe8ff, 0.7, 900);
      if (once(`fridge_${day()}`)) {
        state.energy = Math.min(100, state.energy + 15);
        return d.think('Гречка, котлета, мамин компот. Съел стоя, как в детстве.');
      }
      return d.think('Пусто. Я всё съел. Холодильник гудит с укором.');
    } },
    { x: 985, label: 'Кран на кухне', sfx: 'drip', when: () => day() === 'sun', use: S.fixTap },
    { x: 1605, label: 'Зеркало', sfx: 'mirror', async use({ d, fx }) {
      fx.flash(1605, 235, 58, 118, 0xc8e0ff, 0.7, 700);
      const look = state.stats.look || 0;
      await d.think(look >= 3 ? 'В зеркале — кто-то, кого я хотел бы увидеть на афише.' : look >= 1 ? 'Уже не просто тень. Почти образ.' : 'Тень. Капюшон. Синяки под глазами. Образ — на любителя.');
    } },
    { x: 1703, label: 'Ванная', sfx: 'click', async use({ door, wait, go }) {
      door('bath', true);
      await wait(300);
      go('bathroom', 120);
    } },
    { x: 1840, label: 'Выйти во двор', sfx: 'click', async use({ go, door, wait, d }) {
      if (F.e2GirlInvited && !F.e2GirlHome && day() === 'sun') await d.think('Она скоро придёт. Может, подождать дома?');
      door('front', true);
      await wait(350);
      go('yard', 155);
    } },
  ],
};

async function policeMorning(ctx) {
  const { d } = ctx;
  F[`e2Morning_${day()}`] = true;
  await d.think('Мама забрала меня в девять утра. Всю дорогу молчала. Дома тоже молчит.');
  await d.say('Мама', 'Я не буду кричать. Я уже накричалась. В автобусе. Про себя.');
  await d.say('Мама', 'Твой отец тоже думал, что «один раз». Иди спать, Марк. Просто иди спать.');
}

// ---------- Двор ----------

const yard = {
  title: 'ДВОР',
  width: 2700,
  spawnX: 155,
  rain: () => day() === 'sat' && now() < at(14),
  ambience: () => (day() === 'sat' && now() < at(14) ? 'rain' : 'morning'),
  steps: 'stepWet',
  night: () => isNight(),
  draw: (s) => drawYard(s, 2700, { time: isDarkNow() ? 'night' : now() >= at(17) ? 'dusk' : 'day', merc: true, openMic: day() === 'fri', barberSign: true }),
  prepare: prepCast(['cop']),
  lamps: () => [
    { x: 155, y: 238, r: 120, color: 0xfff0b0, cone: true },
    { x: 506, y: 210, r: 130, color: 0xffe0a0, cone: true, flicker: true },
    { x: 1346, y: 210, r: 130, color: 0xffe0a0, cone: true },
    { x: 2017, y: 440, r: 120, color: 0xffd27a },
    { x: 2515, y: 212, r: 120, color: 0xffe0a0, cone: true },
  ],
  critters: () => (isNight() ? [{ type: 'cat', x: 1700, y: 266, depth: 4 }] : [{ type: 'pigeons', x: 1180, n: 5 }, { type: 'cat', x: 1700, y: 266, depth: 4 }]),
  photoSpots: [
    { id: 'e2_cover_graffiti', x: 1400, text: 'Граффити «ТЕНЬ» — кадр для обложки' },
    { id: 'e2_swings', x: 760, line: { id: 'e2_photo_swings', text: 'Качели во дворе скрипят, как старая пластинка', tag: 'street' } },
  ],
  doors: [{ id: 'entrance', x: 155, w: 126, h: 208, color: 0x3a4658 }],
  npcs: () => [
    { id: 'granny', name: 'Баба Валя', sprite: 'granny', x: 1160, flip: true, dynamic: true, when: () => isAt('granny', 'yard'), talk: M.grannyTalk2 },
    { id: 'kid', name: 'Пацан', sprite: 'kid', x: 760, dynamic: true, when: () => isAt('kid', 'yard'), talk: M.kidTalk2 },
    { id: 'ray', name: 'Рей', sprite: 'ray', x: 2400, flip: true, dynamic: true, when: () => isAt('ray', 'arch') && !F.busted, talk: (ctx) => M.rayTalk2(ctx, 'arch') },
  ],
  items: [
    { x: 155, label: 'Домой', sfx: 'click', async use({ go, door, wait }) {
      door('entrance', true);
      await wait(350);
      go('apartment', 1840, 'left');
    } },
    { x: 2017, label: () => (studioOccupant() ? `Гараж №17 (там ${({ ray: 'Рей', arkasha: 'Аркаша', adam: 'Адам' })[studioOccupant()]})` : 'Гараж №17'), sfx: 'gate', async use({ go, fx, wait }) {
      fx.shake(300, 0.004);
      await wait(300);
      go('garage', 200);
    } },
    { x: 2300, label: 'К остановке автобуса', sfx: 'click', async use(ctx) {
      if (await S.palychShift(ctx)) return;
      const { d } = ctx;
      if (hasItem('watch') || F.e2PawnAsk) return d.think('Автобусом — только на склад или в ломбард. Ломбард теперь и на торговой улице есть.');
      await d.think('Автобусы ходят на склад и обратно. Мне сейчас не туда.');
    } },
    exit(2515, 'Через арку — на улицу', 'crossroads', 120, { cost: 5 }),
  ],
};

// ---------- Гараж и туалет ----------

const garage = {
  title: 'ГАРАЖ №17',
  width: 1100,
  spawnX: 200,
  ambience: 'garage',
  steps: 'stepConcrete',
  draw: (s) => drawGarage(s, 1100),
  lamps: [{ x: 720, y: 72, r: 150, color: 0xffe8a8, alpha: 0.4 }, { x: 730, y: 371, r: 50, color: 0x3df0ff, alpha: 0.35 }],
  doors: [{ id: 'gate', x: 69, w: 122, h: 228, metal: true, color: 0x4a505c }],
  async onEnter(ctx) {
    if (F.e2SleptAt === 'garage' && !F[`e2Morning_${day()}`]) return M.morning(ctx);
    if (F.e2Night === 'dan' && !F.e2DanNightTrack && day() === 'fri') return danNightTrack(ctx);
    if (F.e2KidRecording && state.flags.lastTrack && !F.e2KidTrackDone) {
      F.e2KidTrackDone = true;
      return ctx.d.say('Дэн', 'Трек про двор готов. Беги к пацану, пусть снимает.');
    }
    return M.studioCheck(ctx);
  },
  npcs: () => [
    { id: 'dan', name: 'Дэн', sprite: 'dan', x: 880, flip: true, dynamic: true, when: () => whereIs('dan') === 'garage' && !F.e2DanLeft, talk: M.danTalk2 },
    { id: 'ray', name: 'Рей', sprite: 'ray', x: 1000, flip: true, dynamic: true, when: () => studioOccupant() === 'ray', talk: async ({ d }) => d.say('Рей', 'Братик, не мешай, тут лиды пишутся. Подожди в коридоре воронки.') },
    { id: 'arkasha', name: 'Аркаша', sprite: 'arkasha', x: 560, flip: true, dynamic: true, when: () => studioOccupant() === 'arkasha', talk: S.arkashaTalk },
    { id: 'adam', name: 'Адам', sprite: 'adam', x: 1000, flip: true, dynamic: true, when: () => studioOccupant() === 'adam', talk: async ({ d }) => d.say('Адам', 'Ещё немного. Немного.') },
  ],
  items: [
    { x: 69, label: 'Выйти', sfx: 'click', async use({ go, door, wait }) {
      door('gate', true);
      await wait(400);
      go('yard', 2017, 'left');
    } },
    { x: 210, label: 'Диван', sfx: 'bed', use: (ctx) => M.sleepHere(ctx, 'garage') },
    { x: 370, y: 110, label: 'Ковёр (за ним — туалет)', range: 60, sfx: 'thump', async use({ go, fx }) {
      fx.dust(300, 210, 260);
      go('garage_wc', 200);
    } },
    { x: 730, label: 'Комп Дэна', sfx: 'keys', async use({ pc, fx }) {
      fx.flash(730, 371, 70, 36, 0x3df0ff, 0.9, 500);
      await pc();
    } },
  ],
};

async function danNightTrack(ctx) {
  const { d, start } = ctx;
  F.e2DanNightTrack = true;
  await d.say('Дэн', 'Всё, брат. Пока горячо — пишем. Не думай. Читай, как дышишь.');
  d.close();
  F.e2SleptAt = 'garage';
  start('Studio', { mode: 'track', title: 'После «Подвала»', back: { loc: 'garage', spawnX: 300 } });
}

const garage_wc = {
  title: 'КАМОРКА ЗА КОВРОМ',
  width: 960,
  spawnX: 200,
  ambience: 'bath',
  steps: 'stepTile',
  draw: (s) => drawInterior(s, 960, {
    wall: 'concrete', wallColor: 0x4a4a52, floor: 0x3a3a40,
    props: [{ type: 'bulb', x: 300, y: 70 }, { type: 'toilet', x: 380 }, { type: 'sink', x: 150 },
      { type: 'scribbles', x: 60, y: 120, lines: ['ТЕНЬ + ДЭН = ПЛАТИНА', 'здесь был Рей', 'тишина. тишина.', 'это контент'] }],
  }),
  lamps: [{ x: 300, y: 72, r: 110, color: 0xffe8a8, alpha: 0.4 }],
  items: [
    { x: 380, label: 'Унитаз и стены', sfx: 'flush', cost: 10, use: M.garageWc },
    { x: 60, label: 'Обратно в гараж', sfx: 'click', async use({ go }) {
      go('garage', 370);
    } },
  ],
};

// ---------- Улица за аркой (развилка) ----------

const crossroads = {
  title: 'УЛИЦА ЗА АРКОЙ',
  width: 2500,
  spawnX: 120,
  ambience: () => (isNight() ? 'night' : 'street'),
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.35 : 0),
  draw: (s) => drawStreet(s, 2500, {
    seed: 21,
    lamps: [300, 1300, 2200],
    buildings: [
      { x: 220, w: 320, h: 330, color: 0x3a2e48, shop: true, sign: 'ОПАСНАЯ БРИТВА', signColor: '#ff3d8a' },
      { x: 560, w: 380, h: 300, color: 0x2e3a48, shop: true, sign: 'ШАУРМА 24', signColor: '#ffd166', awning: 0xc0303a },
      { x: 960, w: 320, h: 360, color: 0x2a2236 },
      { x: 1700, w: 380, h: 320, color: 0x3a3440 },
      { x: 2100, w: 400, h: 340, color: 0x2e2a40 },
    ],
    features: [
      { type: 'arch', x: 100 },
      { type: 'podval', x: 1120 },
      { type: 'metro', x: 1500 },
      { type: 'neon', x: 1900, y: 236, text: '← КАФЕ-КВАРТАЛ →', color: '#ffd166' },
      { type: 'neon', x: 2300, y: 236, text: 'ТОРГОВАЯ →', color: '#8ae6a0' },
    ],
    parked: [[1800, 0x3a5a8a, 1], [2180, 0xd8d8d8, -1]],
  }),
  prepare: (scene) => {
    ['cop', 'vika'].forEach((id) => castKey(scene, id));
    scene.__people = C.streetPeople(scene, 'crossroads', [560, 1300]);
  },
  setup: (scene) => C.ambientWalkers(scene, 2500, 3),
  lamps: () => [{ x: 286, y: 200, r: 120, cone: true }, { x: 1286, y: 200, r: 120, cone: true, flicker: true }, { x: 2186, y: 200, r: 120, cone: true }, { x: 1120, y: FLOOR - 170, r: 90, color: 0x3df0ff, alpha: 0.5 }],
  photoSpots: [
    { id: 'e2_cover_neon', x: 1120, text: 'Неон «Подвала» — кадр для обложки' },
    { id: 'e2_photo_metro_m', x: 1500, text: 'Красная «М» светится, как обещание уехать' },
  ],
  zones: () => (R.buyerChance() ? [{ id: `buyer_${Math.floor(now() / 30)}`, x1: 1350, x2: 1700, when: () => Math.random() < 0.6, run: R.buyerApproach }] : []),
  npcs: (scene) => [
    ...(scene?.__people || []),
    { id: 'vika', name: 'Вика', sprite: cast('vika'), x: 2380, flip: true, dynamic: true, when: () => isNight() && now() >= at(23), talk: G.vikaTalk },
  ],
  items: [
    exit(100, 'Во двор (арка)', 'yard', 2515, { cost: 5, facing: 'left' }),
    exit(380, '«Опасная бритва»', 'barber', 900, { cost: 2, open: () => now() >= at(10) && now() < at(21) }),
    exit(760, '«Шаурма 24»', 'shawarma', 980, { cost: 2 }),
    { x: 1120, label: () => (P.podvalOpen() || (day() === 'fri' && now() >= at(18))) ? 'Вниз — в «Подвал»' : '«Подвал»', sfx: 'click', async use(ctx) {
      ctx.time(2);
      ctx.go('podval_entrance', 200);
    } },
    { x: 1500, label: 'Метро «Заводская»', sfx: 'click', async use(ctx) {
      if (!metroOpen()) return ctx.d.think('Метро закрыто. Час ночи — город выключил подземку.');
      F.e2Station = 'zavodskaya';
      ctx.time(3);
      ctx.go('metro', 300);
    } },
    exit(1900, 'Кафе-квартал', 'cafes', 120, { cost: 5 }),
    exit(2300, 'Торговая улица', 'shops', 120, { cost: 5 }),
  ],
};

// ---------- Кафе-квартал ----------

const cafes = {
  title: 'КАФЕ-КВАРТАЛ',
  width: 2600,
  spawnX: 120,
  ambience: () => (isNight() ? 'night' : 'street'),
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.32 : 0),
  draw: (s) => drawStreet(s, 2600, {
    seed: 33,
    lamps: [250, 1350, 2350],
    buildings: [
      { x: 280, w: 380, h: 320, color: 0x4a3a2a, shop: true, sign: 'ЗЕРНО', signColor: '#ffd166', awning: 0x6a4a30 },
      { x: 860, w: 380, h: 300, color: 0x3a3a4a, shop: true, sign: 'ПЫШКА', signColor: '#ff9a5a', awning: 0xe8a040 },
      { x: 1460, w: 380, h: 360, color: 0x1e1a2a, shop: true, sign: 'НОЧЬ', signColor: '#c77dff' },
      { x: 2000, w: 500, h: 300, color: 0x2e3440 },
    ],
    features: [{ type: 'neon', x: 2250, y: 236, text: 'ДВОРЫ →', color: '#c9c4ee' }],
    parked: [[2150, 0x8a3a2a, -1]],
  }),
  prepare: (scene) => {
    castKey(scene, 'mira');
    scene.__people = C.streetPeople(scene, 'cafes', [760, 1350, 1800]);
  },
  setup: (scene) => C.ambientWalkers(scene, 2600, 3),
  lamps: () => [{ x: 236, y: 200, r: 120, cone: true }, { x: 1336, y: 200, r: 120, cone: true }, { x: 2336, y: 200, r: 120, cone: true, flicker: true }],
  zones: () => (R.buyerChance() ? [{ id: `buyer_c_${Math.floor(now() / 30)}`, x1: 1200, x2: 1500, when: () => Math.random() < 0.5, run: R.buyerApproach }] : []),
  npcs: (scene) => [
    ...(scene?.__people || []),
    { id: 'arkasha', name: 'Аркаша', sprite: 'arkasha', x: 1950, dynamic: true, when: () => isAt('arkasha', 'cafes'), talk: S.arkashaTalk },
    { id: 'mira', name: 'Мира', sprite: cast('mira'), x: 2150, dynamic: true, when: () => isAt('mira', 'cafes'), talk: G.miraTalk },
  ],
  items: [
    exit(100, 'На улицу за аркой', 'crossroads', 1900, { cost: 5, facing: 'left' }),
    exit(470, 'Кофейня «Зерно»', 'cafe_zerno', 1200, { cost: 2, open: () => now() >= at(8) && now() < at(23) }),
    exit(1050, 'Пышечная «Пышка»', 'cafe_pyshka', 1200, { cost: 2, open: () => now() >= at(8) && now() < at(22) }),
    exit(1650, 'Бар-кафе «Ночь»', 'cafe_noch', 1200, { cost: 2, open: () => now() >= at(17) || now() < at(4) }),
    exit(2400, 'Во дворы', 'courtyards', 120, { cost: 5 }),
  ],
};

// ---------- Торговая улица ----------

const shops = {
  title: 'ТОРГОВАЯ УЛИЦА',
  width: 2600,
  spawnX: 120,
  ambience: () => (isNight() ? 'night' : 'street'),
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.32 : 0),
  draw: (s) => drawStreet(s, 2600, {
    seed: 44,
    lamps: [700, 1800],
    buildings: [
      { x: 240, w: 360, h: 320, color: 0x2a3a4a, shop: true, sign: 'ВТОРАЯ КОЖА', signColor: '#3df0ff' },
      { x: 800, w: 360, h: 340, color: 0x1a1a22, shop: true, sign: 'ЧЕРНИЛА', signColor: '#ff3d8a' },
      { x: 1340, w: 360, h: 300, color: 0x3a3a3a, shop: true, sign: 'ПРОЯВКА', signColor: '#ffd166' },
      { x: 1820, w: 360, h: 320, color: 0x2a4a3a, shop: true, sign: 'КРАН-СЕРВИС', signColor: '#8ae6a0' },
      { x: 2280, w: 300, h: 300, color: 0x3a2a2a, shop: true, sign: 'ЛОМБАРД 24', signColor: '#ff8a20' },
    ],
  }),
  prepare: (scene) => (scene.__people = C.streetPeople(scene, 'shops', [700, 1780, 2220])),
  setup: (scene) => C.ambientWalkers(scene, 2600, 3),
  lamps: () => [{ x: 686, y: 200, r: 120, cone: true }, { x: 1786, y: 200, r: 120, cone: true }],
  zones: () => (R.buyerChance() ? [{ id: `buyer_s_${Math.floor(now() / 30)}`, x1: 1100, x2: 1400, when: () => Math.random() < 0.5, run: R.buyerApproach }] : []),
  npcs: (scene) => [
    ...(scene?.__people || []),
    { id: 'arkasha', name: 'Аркаша', sprite: 'arkasha', x: 1250, dynamic: true, when: () => isAt('arkasha', 'shops'), talk: S.arkashaTalk },
  ],
  items: [
    exit(100, 'На улицу за аркой', 'crossroads', 2300, { cost: 5, facing: 'left' }),
    exit(420, '«Вторая кожа»', 'clothes', 1100, { cost: 2, open: () => now() >= at(10) && now() < at(21) }),
    exit(980, 'Тату «Чернила»', 'tattoo', 900, { cost: 2, open: () => now() >= at(12) && now() < at(22) }),
    exit(1520, 'Фотолаборатория «Проявка»', 'photolab', 800, { cost: 2, open: () => now() >= at(10) && now() < at(20) }),
    exit(2000, '«Кран-Сервис»', 'plumbing', 800, { cost: 2, open: () => now() >= at(9) && now() < at(19) }),
    exit(2430, 'Ломбард «24»', 'pawnshop', 900, { cost: 2 }),
  ],
};

// ---------- Дворы (кот Киры, сюда же уходишь от облавы) ----------

const courtyards = {
  title: 'ДВОРЫ',
  width: 1800,
  spawnX: 120,
  ambience: 'night',
  steps: 'stepWet',
  night: () => (isDarkNow() ? 0.4 : 0.1),
  draw: (s) => paintCourtyards(s, 1800),
  critters: () => (questStatus('e2_cat') === 'active' && !F.e2CatFound ? [] : [{ type: 'pigeons', x: 700, n: 3 }]),
  photoSpots: [{ id: 'e2_samizdat_wall', x: 600, line: { id: 'e2_photo_samizdat', text: 'На стене во дворе: «тишина — тоже бит»', tag: 'street' } }],
  async onEnter(ctx) {
    if (F.e2ChaseResult) return R.afterChase(ctx);
  },
  npcs: () => [],
  items: [
    exit(80, 'На кафе-квартал', 'cafes', 2400, { cost: 5, facing: 'left' }),
    { x: 1450, label: 'Мусорные баки', sfx: 'wood', cost: 5, async use(ctx) {
      if (questStatus('e2_cat') === 'active' && !F.e2CatFound) return G.catFind(ctx);
      await ctx.d.think(pickOne(['Баки. Пахнет пышками и безысходностью.', 'За баками кто-то спал. Остался картон и пустая бутылка.']));
    } },
  ],
};

// ---------- Интерьеры ----------

function cafeLocation(id, title, spec, extraNpcs = () => [], extraItems = []) {
  return {
    title,
    width: 1300,
    spawnX: 1200,
    ambience: 'cafe',
    steps: 'stepWood',
    draw: (s) => drawInterior(s, 1300, spec),
    lamps: () => [{ x: 400, y: 100, r: 140, color: 0xffe0a0, alpha: 0.35 }, { x: 900, y: 100, r: 140, color: 0xffe0a0, alpha: 0.35 }],
    prepare: (scene) => {
      prepareWorkers(scene, WORKERS[id]);
      ['mira', 'lola', 'olymp'].forEach((c) => castKey(scene, c));
      // Посетители — на свободных местах, не на Стасе, Мире, Лоле и Карине
      const slots = { zerno: [650, 760, 1130], pyshka: [650, 800, 950, 1100], noch: [650, 760, 1000] }[id];
      scene.__visitors = C.visitorSpecs(id).slice(0, slots.length).map(({ seed, i }) => ({
        id: `vis_${i}`, name: 'Посетитель', sprite: personTexture(scene, randomSpec(seed)), x: slots[i], flip: i % 2 === 0, label: 'Поговорить', talk: C.visitorTalk, cost: 5,
      }));
    },
    async onEnter(ctx) {
      F.e2WcFrom = id;
      // Драка посетителей — раз в день, не во всех кафе
      if (id !== 'zerno' && once(`fight_${id}_${day()}`) && Math.random() < 0.45) return C.cafeFight(ctx);
    },
    npcs: (scene) => [
      ...WORKERS[id].map((w, i) => ({ id: w.id, name: w.name, sprite: w.sprite, x: 250 + i * 34, dynamic: true, when: () => onShift(w), talk: (ctx) => C.workerTalk(ctx, w) })),
      ...(scene?.__visitors || []),
      ...extraNpcs(),
    ],
    items: [
      exit(1240, 'Выйти на улицу', 'cafes', { zerno: 470, pyshka: 1050, noch: 1650 }[id], { cost: 2, facing: 'left' }),
      { x: 90, label: 'Туалет', sfx: 'doorSoft', async use({ go }) {
        go('cafe_wc', 400);
      } },
      ...extraItems,
    ],
  };
}

const cafeProps = (machine) => [
  { type: 'counter', x: 200, w: 420, machine, register: true },
  { type: 'shelf', x: 230, w: 360, y: 120 },
  { type: 'door', x: 90, sign: 'WC' },
  { type: 'table', x: 760, cup: true }, { type: 'table', x: 920 }, { type: 'table', x: 1080, cup: true },
  { type: 'window', x: 760, y: 110, w: 360, h: 140 },
];

const cafe_zerno = cafeLocation('zerno', 'КОФЕЙНЯ «ЗЕРНО»', { wall: 'brick', wallColor: 0x6a4a3a, floor: 0x3a2a20, props: [...cafeProps(true), { type: 'plant', x: 660 }] },
  () => [
    { id: 'stas', name: 'Стас', sprite: 'stas', x: 1000, flip: true, dynamic: true, when: () => isAt('stas', 'cafe_zerno'), talk: S.stasCafe },
    { id: 'mira', name: 'Мира', sprite: cast('mira'), x: 860, flip: true, dynamic: true, when: () => isAt('mira', 'cafe_zerno'), talk: G.miraTalk },
  ]);

const cafe_pyshka = cafeLocation('pyshka', 'ПЫШЕЧНАЯ «ПЫШКА»', { wall: 'tile', wallColor: 0xd8c8a8, floor: 0x5a4a3a, floorTiles: 0x6a5a48, props: [...cafeProps(false), { type: 'poster', x: 660, y: 140, color: 0xe8a040, text: 'ПЫШКИ' }] });

const cafe_noch = cafeLocation('noch', 'БАР-КАФЕ «НОЧЬ»', { wall: 'paint', wallColor: 0x1e1a2a, floor: 0x15121f, props: [...cafeProps(false), { type: 'text', x: 650, y: 90, text: 'НОЧЬ', color: '#c77dff', size: 16 }, { type: 'sofa', x: 700, color: 0x3a1a4a, w: 200 }] },
  () => [
    { id: 'lola', name: 'Лола', sprite: cast('lola'), x: 900, flip: true, dynamic: true, when: () => day() === 'sat' && now() >= at(19), talk: G.lolaClub },
    { id: 'karina', name: 'Карина', sprite: cast('olymp'), x: 1100, flip: true, dynamic: true, when: () => F.e2OlymOffer && day() === 'sat' && now() >= at(18) && now() < at(21), talk: S.karinaTalk },
  ]);

const cafe_wc = {
  title: 'ТУАЛЕТ',
  width: 960,
  spawnX: 400,
  ambience: 'bath',
  steps: 'stepTile',
  draw: (s) => drawInterior(s, 960, {
    wall: 'tile', wallColor: 0x8aa0a8, floor: 0x4a5a60,
    props: [{ type: 'mirror', x: 250 }, { type: 'sink', x: 250 }, { type: 'toilet', x: 560 }, { type: 'bulb', x: 400, y: 50 },
      { type: 'scribbles', x: 430, y: 130, lines: ['здесь была жизнь', 'Кид Платина — фуфло', 'позвони маме'] }],
  }),
  lamps: [{ x: 400, y: 52, r: 120, color: 0xfff0c8, alpha: 0.35 }],
  items: [
    { x: 250, label: 'Зеркало', sfx: 'mirror', async use({ d }) {
      await d.think(pickOne(['Умываю лицо. Холодная вода — лучший продюсер.', 'Под глазами синяки. Это образ. Это не образ.']));
    } },
    { x: 560, label: 'Кабинка', sfx: 'flush', cost: 5, use: C.cafeWc },
    { x: 60, label: 'Выйти', sfx: 'doorSoft', async use({ go }) {
      go(`cafe_${F.e2WcFrom || 'zerno'}`, 150);
    } },
  ],
};

const shawarma = {
  title: '«ШАУРМА 24»',
  width: 1100,
  spawnX: 980,
  ambience: 'cafe',
  steps: 'stepTile',
  draw: (s) => drawInterior(s, 1100, {
    wall: 'tile', wallColor: 0xd8d8c8, floor: 0x5a5a5a, floorTiles: 0x4a4a4a,
    props: [{ type: 'counter', x: 160, w: 460, register: true, color: 0x8a8a9a, top: 0xb8b8c0 }, { type: 'grill', x: 300 }, { type: 'fridge', x: 660 },
      { type: 'poster', x: 780, y: 150, color: 0xc0303a, text: 'ШАУРМА 250' }, { type: 'table', x: 880 }],
  }),
  prepare: prepCast(['timur', 'kira']),
  lamps: [{ x: 400, y: 80, r: 170, color: 0xfff0c8, alpha: 0.35 }],
  npcs: () => [
    { id: 'timur', name: 'Тимур', sprite: cast('timur'), x: 260, talk: timurTalk },
    { id: 'kira', name: 'Кира', sprite: cast('kira'), x: 520, flip: true, dynamic: true, when: () => isAt('kira', 'shawarma'), talk: G.kiraTalk },
    { id: 'ray', name: 'Рей', sprite: 'ray', x: 420, flip: true, dy: -60, pose: 'sit', depth: 9, dynamic: true, when: () => isAt('ray', 'shawarma') && !F.busted, talk: (ctx) => M.rayTalk2(ctx, 'shawarma') },
  ],
  items: [exit(1040, 'Выйти на улицу', 'crossroads', 760, { cost: 2, facing: 'left' })],
};

async function timurTalk(ctx) {
  const { d } = ctx;
  if (isAt('ray', 'shawarma') && once('timur_ray')) {
    await d.say('Тимур', 'Этот твой друг, в очках, полчаса мне объясняет, что шаурма — это «воронка». Я двадцать лет шаурму кручу. Какая воронка?');
    return d.say('Рей', 'Тимур, братик, лаваш — это верх воронки, мясо — середина, соус — конверсия! Это же очевидно!');
  }
  await d.say('Тимур', pickOne(['Шаурма — это как жизнь. Главное — соус.', 'Кира хорошая. Странная, но хорошая. Котов кормит.', 'Ночью тут все честные. Днём — все спешат.']));
}

// «Шаурма» ночью: ступеньки у входа (выбор ночи — Кира)
const shawarma_steps = {
  title: 'СТУПЕНЬКИ У «ШАУРМЫ»',
  width: 960,
  spawnX: 400,
  ambience: 'night',
  steps: 'stepConcrete',
  night: 0.45,
  draw: (s) => drawStreet(s, 960, { seed: 5, lamps: [700], buildings: [{ x: 100, w: 500, h: 300, color: 0x2e3a48, shop: true, sign: 'ШАУРМА 24', signColor: '#ffd166', awning: 0xc0303a }] }),
  prepare: prepCast(['kira']),
  lamps: [{ x: 686, y: 200, r: 130, cone: true }, { x: 350, y: 280, r: 110, color: 0xffd166, alpha: 0.4 }],
  onEnter: G.kiraSteps,
  npcs: () => [{ id: 'kira', name: 'Кира', sprite: cast('kira'), x: 500, flip: true, talk: async ({ d }) => d.say('Кира', 'Иди спать, призрак.') }],
  items: [exit(60, 'Домой', 'yard', 2515, { cost: 10 })],
};

const barber = {
  title: '«ОПАСНАЯ БРИТВА»',
  width: 1000,
  spawnX: 900,
  ambience: 'cafe',
  steps: 'stepWood',
  draw: (s) => drawInterior(s, 1000, { wall: 'wood', wallColor: 0x3a2a20, floor: 0x1a1a1a, floorTiles: 0xe8e8e8, props: [{ type: 'mirror', x: 300 }, { type: 'barberChair', x: 300 }, { type: 'mirror', x: 600 }, { type: 'barberChair', x: 600 }, { type: 'poster', x: 800, y: 140, color: 0xff3d8a, text: 'ОТКРЫТИЕ' }] }),
  prepare: prepCast(['barber']),
  lamps: [{ x: 300, y: 110, r: 120, color: 0xfff0c8, alpha: 0.35 }, { x: 600, y: 110, r: 120, color: 0xfff0c8, alpha: 0.35 }],
  npcs: () => [{ id: 'barber', name: 'Хачик', sprite: cast('barber'), x: 450, flip: true, talk: C.barberTalk, cost: 0 }],
  items: [exit(940, 'Выйти', 'crossroads', 380, { cost: 2, facing: 'left' })],
};

const tattoo = {
  title: 'ТАТУ «ЧЕРНИЛА»',
  width: 1000,
  spawnX: 900,
  ambience: 'cafe',
  steps: 'stepWood',
  draw: (s) => drawInterior(s, 1000, { wall: 'paint', wallColor: 0x1a1420, floor: 0x15121f, props: [{ type: 'flash', x: 120, n: 6 }, { type: 'tattooChair', x: 600 }, { type: 'text', x: 800, y: 80, text: 'ЧЕРНИЛА', color: '#ff3d8a', size: 14 }] }),
  prepare: prepCast(['tattoo']),
  lamps: [{ x: 513, y: 150, r: 120, color: 0xfff0c8, alpha: 0.4 }],
  npcs: () => [
    { id: 'tattoo', name: 'Ника', sprite: cast('tattoo'), x: 720, flip: true, talk: C.tattooTalk, cost: 0 },
    { id: 'roma', name: 'Рома', sprite: 'roma', x: 380, dynamic: true, when: () => isAt('roma', 'tattoo'), talk: romaTattoo },
    { id: 'arkasha', name: 'Аркаша', sprite: 'arkasha', x: 200, dynamic: true, when: () => isAt('arkasha', 'tattoo'), talk: S.arkashaTalk },
  ],
  items: [exit(940, 'Выйти', 'shops', 980, { cost: 2, facing: 'left' })],
};

async function romaTattoo(ctx) {
  const { d, sfx } = ctx;
  sfx('vape');
  if (once('roma_tattoo')) {
    await d.think('Рома в кресле. Ника бьёт ему на шее «2002». Он не морщится. Аркаша снимает так, будто это рождение звезды.');
    await d.say('Рома', 'Больно — значит, правда. Правда.');
    return d.say('Рома', 'Приходи вечером в «Подвал». Я первый. Зал холодный будет. Потом согреется.');
  }
  await d.say('Рома', day() === 'fri' ? 'Вечером. Не опаздывай. Хотя мне всё равно. Нет, не всё равно.' : '2002 — это не год. Это состояние.');
}

const clothes = {
  title: '«ВТОРАЯ КОЖА»',
  width: 1200,
  spawnX: 1100,
  ambience: 'cafe',
  steps: 'stepWood',
  draw: (s) => drawInterior(s, 1200, { wall: 'paint', wallColor: 0xe8e0d8, floor: 0x8a7a6a, props: [{ type: 'rack', x: 120, w: 220 }, { type: 'rack', x: 420, w: 220, colors: [0x1a1a1e, 0x6a6a7a, 0xa02a34] }, { type: 'mirror', x: 760 }, { type: 'counter', x: 880, w: 200, register: true }] }),
  prepare: (scene) => prepareWorkers(scene, WORKERS.shop),
  lamps: [{ x: 600, y: 90, r: 200, color: 0xffffff, alpha: 0.25 }],
  npcs: () => WORKERS.shop.map((w, i) => ({ id: w.id, name: w.name, sprite: w.sprite, x: 300 + i * 60, dynamic: true, when: () => onShift(w), talk: (ctx) => C.clothesTalk(ctx, w), cost: 0 })),
  items: [
    { x: 760, label: 'Зеркало', sfx: 'mirror', async use({ d }) {
      await d.think(F.lookOutfit ? 'Новый я. Ещё непривычно, как чужой голос на записи.' : 'Чёрное худи. Как всегда. Может, пора что-то поменять?');
    } },
    exit(1140, 'Выйти', 'shops', 420, { cost: 2, facing: 'left' }),
  ],
};

const photolab = {
  title: '«ПРОЯВКА»',
  width: 960,
  spawnX: 800,
  ambience: 'flat',
  steps: 'stepWood',
  draw: (s) => drawInterior(s, 960, { wall: 'paint', wallColor: 0x3a1a1a, floor: 0x2a1a1a, props: [{ type: 'counter', x: 200, w: 360 }, { type: 'poster', x: 620, y: 130, color: 0xffd166, text: 'ПЛЁНКА' }, { type: 'poster', x: 720, y: 150, color: 0x8aa0b8 }] }),
  prepare: prepCast(['photolab']),
  lamps: [{ x: 400, y: 100, r: 160, color: 0xff3d3d, alpha: 0.35 }],
  npcs: () => [{ id: 'photo', name: 'Фотограф', sprite: cast('photolab'), x: 380, flip: true, talk: S.photolabTalk, cost: 5 }],
  items: [exit(840, 'Выйти', 'shops', 1520, { cost: 2, facing: 'left' })],
};

const plumbing = {
  title: '«КРАН-СЕРВИС»',
  width: 960,
  spawnX: 800,
  ambience: 'flat',
  steps: 'stepWood',
  draw: (s) => drawInterior(s, 960, { wall: 'tile', wallColor: 0xa8c0c8, floor: 0x4a4a4a, props: [{ type: 'shelf', x: 150, w: 300, y: 130 }, { type: 'counter', x: 480, w: 260 }, { type: 'sink', x: 820 }] }),
  prepare: prepCast(['plumber']),
  npcs: () => [{ id: 'plumber', name: 'Виталик', sprite: cast('plumber'), x: 600, flip: true, talk: S.plumberTalk, cost: 5 }],
  items: [exit(840, 'Выйти', 'shops', 2000, { cost: 2, facing: 'left' })],
};

const pawnshop = {
  title: 'ЛОМБАРД «24»',
  width: 1000,
  spawnX: 940,
  ambience: 'flat',
  steps: 'stepWood',
  draw: (s) => drawPawnshop(s, 1000),
  npcs: () => [{ id: 'leva', name: 'Лёва', sprite: 'leva', x: 680, flip: true, talk: levaTalk }],
  items: [exit(950, 'Выйти', 'shops', 2430, { cost: 2, facing: 'left' })],
};

async function levaTalk(ctx) {
  const { d } = ctx;
  if (F.soldWatch && once('leva_watch')) {
    await d.say('Лёва', 'А, сентиментальный! Часики твои ещё тут. «Полёт». Выкупишь? Пятнадцать. Проценты — это тоже воспоминания.');
    if (state.cash >= 15000) {
      const c = await d.choose(['Выкупить отцовские часы (15 000 ₽)', '«Не сейчас.»']);
      if (c === 0) {
        ctx.cash(-15000, 'выкуп часов');
        ctx.item('watch');
        F.e2WatchBack = true;
        return d.think('Часы снова в руке. Стоят. Но они мои.');
      }
    }
    return;
  }
  await d.say('Лёва', 'Сдавать? Покупать? Или просто погреться? Свет, молодой человек, тоже денег стоит.');
}

// ---------- Метро ----------

const metro = {
  title: () => `СТ. «${station().name.toUpperCase()}»`,
  width: 1900,
  spawnX: 300,
  ambience: 'metro',
  steps: 'stepTile',
  draw: (s) => drawMetro(s, 1900, station().line, station().name),
  prepare: (scene) => {
    scene.__people = F.e2Station === 'serpukhovskaya' ? R.platformPeople(scene) : C.streetPeople(scene, `metro_${F.e2Station}`, [600, 1250]);
  },
  lamps: () => [160, 500, 840, 1180, 1520, 1860].map((x) => ({ x, y: 34, r: 90, color: 0xfff0c8, alpha: 0.3 })),
  photoSpots: [{ id: 'e2_cover_metro', x: 900, range: 900, text: 'Платформа метро — кадр для обложки' }],
  zones: () => (R.buyerChance() ? [{ id: `buyer_m_${Math.floor(now() / 30)}`, x1: 700, x2: 1200, when: () => Math.random() < 0.6, run: R.buyerApproach }] : []),
  npcs: (scene) => [
    ...(scene?.__people || []),
    { id: 'adam', name: 'Адам', sprite: 'adam', x: 1500, flip: true, dynamic: true, when: () => F.e2Station === 'zavodskaya' && isAt('adam', 'metro'), talk: adamMetro },
  ],
  items: [
    { x: 160, label: () => (station().exit ? 'Наверх, в город' : 'Наверх'), sfx: 'click', async use(ctx) {
      const st = station();
      if (!st.exit) return ctx.d.think('Наверху — ветер, ларёк и бесконечная парковка. Ничего моего. Обратно вниз.');
      ctx.time(3);
      ctx.go(st.exit[0], st.exit[1]);
    } },
    { x: 900, label: 'Схема метро — поехать', sfx: 'page', async use(ctx) {
      if (!metroOpen()) return ctx.d.think('Последний поезд ушёл. Табло пустое.');
      const id = await chooseStation(ctx);
      if (!id) return;
      ctx.sfx('subway');
      ctx.d.close();
      await trainArrive(ctx.scene, 1900, station().line, { leave: false });
      await ctx.ride();
      ctx.time(20);
      F.e2Station = id;
      await ctx.card(`СТ. «${STATIONS[id].name.toUpperCase()}»`, '20 минут в вагоне');
      ctx.go('metro', 300);
    } },
  ],
};

async function adamMetro(ctx) {
  const { d, line } = ctx;
  if (once('adam_metro')) {
    await d.think('У колонны — парень в сером свитшоте, дреды, наушники. Читает что-то себе под нос, повторяя каждое последнее слово.');
    await d.say('Адам', 'Ты Тень. Тень. Я слышал твой гараж через стенку. Через стенку.');
    await d.say('Адам', 'Послушай. Послушай.');
    await d.think('Он протягивает мне один наушник. Там — тишина, а потом шёпот в два голоса. Мурашки.');
    await d.say('Адам', 'Если позовут к Графу — не ходи. Не к Графу. Не к Графу.');
    return line({ id: 'e2_adam_silence', text: 'Тишина тоже бит, если правильно её поставить', tag: 'dream' });
  }
  await d.say('Адам', 'Вечером — «Подвал». «Подвал».');
}

// ---------- «Подвал» ----------

const podval_entrance = {
  title: '«ПОДВАЛ» · ВХОД',
  width: 1400,
  spawnX: 200,
  ambience: 'night',
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.35 : 0.15),
  draw: (s) => drawStreet(s, 1400, {
    seed: 61,
    lamps: [500],
    buildings: [{ x: 0, w: 1400, h: 360, color: 0x2a2236 }],
    features: [{ type: 'podval', x: 1010 }, ...(day() === 'fri' ? [{ type: 'posterImg', key: 'poster_openmic', x: 760, y: 330, w: 52, h: 68, angle: 2 }] : [])],
  }),
  prepare: (scene) => {
    ['bulldog', 'mira'].forEach((id) => castKey(scene, id));
    scene.__queue = Array.from({ length: 6 }, (_, i) => ({
      id: `q_${i}`, name: 'Человек в очереди', sprite: personTexture(scene, randomSpec(`queue_${i}`)), x: 300 + i * 100, flip: true, label: hasItem('flyers') && !F.e2FlyersDone ? 'Дать флаер' : 'Поговорить',
      dynamic: true, when: () => day() === 'fri' && now() >= at(18, 30) && !F.e2PodvalDone,
      talk: (ctx) => (hasItem('flyers') && !F.e2FlyersDone ? P.giveFlyer(ctx, i) : ctx.d.say('Человек в очереди', pickOne(['Говорят, сегодня новенький читает. Вопросительный знак.', 'Я за RAY пришла. Он смешной.', '3g0th2002 опять будет плакать. Обожаю.']))),
    }));
  },
  setup: (scene) => {
    // Бульдог ходит вдоль очереди
    const dog = scene.npcs.bulldog;
    if (dog && day() === 'fri' && !F.e2PodvalDone) {
      scene.tweens.add({ targets: dog, x: 420, duration: 4200, yoyo: true, repeat: -1, hold: 1500, repeatDelay: 1500, onYoyo: () => dog.setFlipX(false), onRepeat: () => dog.setFlipX(true) });
    }
  },
  lamps: [{ x: 1010, y: FLOOR - 200, r: 130, color: 0x3df0ff, alpha: 0.5 }, { x: 486, y: 200, r: 120, cone: true }],
  photoSpots: [{ id: 'e2_cover_neon', x: 1010, text: 'Неон «Подвала» — кадр для обложки' }],
  onEnter: P.entranceEnter,
  npcs: (scene) => [
    ...(scene?.__queue || []),
    { id: 'bulldog', name: 'Бульдог', sprite: cast('bulldog'), x: 1100, flip: true, talk: P.bulldogTalk, cost: 0 },
    { id: 'mira', name: 'Мира', sprite: cast('mira'), x: 160, dynamic: true, when: () => day() === 'fri' && now() >= at(18, 30) && !F.e2PodvalDone, talk: P.miraMeet },
  ],
  items: [
    exit(40, 'На улицу', 'crossroads', 1120, { cost: 2, facing: 'left' }),
    { x: 1010, label: 'Вниз по лестнице', sfx: 'click', use: P.bulldogTalk },
  ],
};

const podvalProps = [
  { type: 'stage', x: 700, w: 420 },
  { type: 'counter', x: 120, w: 300, color: 0x2a1a20, top: 0x4a2a30 },
  { type: 'door', x: 1500, sign: 'ГРИМЁРКА', color: 0x2a2a30 },
  { type: 'text', x: 910, y: 90, text: 'ПОДВАЛ', color: '#ff3d8a', size: 22 },
];

const podval = {
  title: '«ПОДВАЛ»',
  width: 1600,
  spawnX: 120,
  ambience: 'club',
  steps: 'stepConcrete',
  night: 0.25,
  draw: (s) => {
    drawInterior(s, 1600, { wall: 'brick', wallColor: 0x3a1a20, floor: 0x15121f, props: podvalProps });
    // Толпа у сцены: живые люди в полумраке, качаются под бит
    for (let x = 560, i = 0; x < 1300; x += 46 + (i % 3) * 8, i++) {
      const key = personTexture(s, randomSpec(`crowd_${i}`), null, 'crowd');
      const c = addActor(s, x + Math.random() * 10, 478 + (i % 2) * 6, key, { depth: 15 + (i % 2), flip: Math.random() < 0.3, scale: 1.02 }).setTint(0x4a3a5a);
      c.__noLight = true;
      s.tweens.add({ targets: c, y: c.y - 5, duration: 366, yoyo: true, repeat: -1, delay: Math.random() * 360 });
    }
  },
  lamps: [{ x: 910, y: 120, r: 200, color: 0xff3d8a, alpha: 0.4 }, { x: 760, y: 60, r: 120, color: 0x3df0ff, alpha: 0.4 }, { x: 1060, y: 60, r: 120, color: 0xffd166, alpha: 0.4 }],
  onEnter: P.hallEnter,
  npcs: () => [
    { id: 'dan', name: 'Дэн', sprite: 'dan', x: 600, flip: false, talk: P.danPodval, cost: 0 },
    { id: 'stas', name: 'Стас', sprite: 'stas', x: 1360, flip: true, talk: P.stasConsole, cost: 0 },
  ],
  items: [
    exit(60, 'Наверх', 'podval_entrance', 1010, { cost: 2, facing: 'left' }),
    { x: 1500, label: 'Гримёрка', sfx: 'doorSoft', when: () => !F.e2PodvalDone, async use({ go }) {
      go('backstage', 100);
    } },
    { x: 250, label: 'Бар', sfx: 'pour', cost: 10, async use({ d, cash }) {
      if (state.cash < 200) return d.think('На бар денег нет. Вода из-под крана в туалете — тоже напиток.');
      cash(-200, 'бар «Подвала»');
      state.energy = Math.min(100, state.energy + 10);
      await d.think('Лимонад в пластике. Руки всё равно дрожат.');
    } },
  ],
};

const backstage = {
  title: 'ГРИМЁРКА',
  width: 1000,
  spawnX: 100,
  ambience: 'garage',
  steps: 'stepConcrete',
  draw: (s) => drawInterior(s, 1000, { wall: 'concrete', wallColor: 0x3a3440, floor: 0x2a2430, props: [{ type: 'mirror', x: 300 }, { type: 'mirror', x: 520 }, { type: 'sofa', x: 620, w: 240, color: 0x5a2a2a }, { type: 'door', x: 940, sign: 'ЧЁРНЫЙ ХОД', color: 0x3a3a40 }, { type: 'bulb', x: 420, y: 60 }] }),
  lamps: [{ x: 300, y: 120, r: 110, color: 0xfff0c8, alpha: 0.4 }, { x: 520, y: 120, r: 110, color: 0xfff0c8, alpha: 0.4 }],
  npcs: () => [
    { id: 'ray', name: 'Рей', sprite: 'ray', x: 300, talk: P.rayBackstage, cost: 0 },
    { id: 'arkasha', name: 'Аркаша', sprite: 'arkasha', x: 520, flip: true, talk: P.arkashaBackstage, cost: 0 },
    { id: 'adam', name: 'Адам', sprite: 'adam', x: 760, flip: true, dy: 20, talk: P.adamBackstage, cost: 0 },
  ],
  items: [
    exit(60, 'В зал', 'podval', 1500, { cost: 0, facing: 'left' }),
    exit(940, 'Чёрный ход — во дворик', 'podval_yard', 120, { cost: 0 }),
  ],
};

const podval_yard = {
  title: 'ДВОРИК У ЧЁРНОГО ХОДА',
  width: 960,
  spawnX: 120,
  ambience: 'night',
  steps: 'stepWet',
  night: 0.4,
  draw: (s) => drawInterior(s, 960, { wall: 'brick', wallColor: 0x2a2228, floor: 0x1e1e24, props: [{ type: 'bulb', x: 160, y: 120 }, { type: 'scribbles', x: 420, y: 150, lines: ['2002', 'это работает'] }] }),
  lamps: [{ x: 160, y: 124, r: 100, color: 0xffd27a, alpha: 0.5 }],
  npcs: () => [{ id: 'roma', name: 'Рома', sprite: 'roma', x: 560, flip: true, talk: P.romaYard, cost: 0 }],
  items: [exit(60, 'Обратно в гримёрку', 'backstage', 900, { cost: 0, facing: 'left' })],
};

// ---------- Ночные места ----------

const ray_party = {
  title: 'АФТЕПАТИ У РЕЯ',
  width: 1400,
  spawnX: 200,
  ambience: 'club',
  steps: 'stepWood',
  night: 0.3,
  draw: (s) => drawInterior(s, 1400, { wall: 'paint', wallColor: 0x2a1a3a, floor: 0x1a1020, props: [{ type: 'window', x: 300, y: 80, w: 400, h: 200 }, { type: 'sofa', x: 200, w: 260 }, { type: 'sofa', x: 900, w: 260, color: 0x8a2a5a }, { type: 'discoBall', x: 700 }, { type: 'text', x: 1150, y: 120, text: 'ЛИДОГЕН', color: '#e8c27a', size: 14 }] }),
  prepare: (scene) => {
    castKey(scene, 'lola');
    scene.__crowd = Array.from({ length: 4 }, (_, i) => ({ id: `guest_${i}`, name: 'Гость', sprite: personTexture(scene, randomSpec(`party_${i}`)), x: 420 + i * 200, flip: i % 2 === 0, label: 'Поговорить', talk: C.visitorTalk, cost: 5 }));
  },
  async onEnter(ctx) {
    if (F.e2SleptAt === 'party' && !F[`e2Morning_${day()}`]) return M.morning(ctx);
    if (day() === 'fri' && F.e2Night === 'ray') return G.rayParty(ctx);
  },
  npcs: (scene) => [
    ...(scene?.__crowd || []),
    { id: 'ray', name: 'Рей', sprite: 'ray', x: 1100, flip: true, dynamic: true, when: () => day() === 'fri' || now() < at(12), talk: async ({ d }) => d.say('Рей', isNight() ? 'Братик! Воронка не спит!' : '…Братик. Рей отходит. Не дыши.') },
    { id: 'lola', name: 'Лола', sprite: cast('lola'), x: 600, dynamic: true, when: () => day() === 'fri', talk: G.lolaClub },
  ],
  items: [
    { x: 330, label: 'Диван (поспать тут)', sfx: 'bed', use: (ctx) => M.sleepHere(ctx, 'party') },
    exit(80, 'Уйти', 'crossroads', 760, { cost: 20, card: ['УЛИЦА', 'такси до арки'] }),
  ],
};

const rooftop = {
  title: 'КРЫША',
  width: 1400,
  spawnX: 200,
  ambience: 'night',
  steps: 'stepConcrete',
  draw: (s) => drawRooftop(s, 1400),
  prepare: prepCast(['mira']),
  onEnter: G.miraRooftop,
  npcs: () => [{ id: 'mira', name: 'Мира', sprite: cast('mira'), x: 700, flip: true, dynamic: true, when: () => F.e2Night === 'mira' || F.dateWith === 'mira', talk: async ({ d }) => d.say('Мира', 'Ещё кадр. Последний. Ну, предпоследний.') }],
  photoSpots: [{ id: 'e2_roof', x: 700, range: 700, line: { id: 'e2_photo_roof', text: 'Сфоткал город с крыши — он поместился в ладонь', tag: 'dream' } }],
  items: [exit(80, 'Вниз — домой', 'yard', 155, { cost: 20 })],
};

const club = {
  title: 'КЛУБ «НЕОН»',
  width: 1300,
  spawnX: 120,
  ambience: 'club',
  steps: 'stepConcrete',
  night: 0.25,
  draw: (s) => drawInterior(s, 1300, { wall: 'paint', wallColor: 0x15102a, floor: 0x0c0a16, props: [{ type: 'discoBall', x: 650 }, { type: 'counter', x: 900, w: 300, color: 0x2a1a3a, top: 0x8a3ad8 }, { type: 'text', x: 400, y: 90, text: 'НЕОН', color: '#3df0ff', size: 22 }] }),
  prepare: prepCast(['lola']),
  async onEnter(ctx) {
    if (!(now() >= at(21) || now() < at(5))) {
      await ctx.d.think('Днём «Неон» закрыт. Охранник курит у двери и смотрит, как будто я — неправильный ответ.');
      ctx.go('metro', 300);
    }
  },
  npcs: () => [{ id: 'lola', name: 'Лола', sprite: cast('lola'), x: 950, flip: true, dynamic: true, when: () => day() !== 'fri' && now() >= at(22) || now() < at(4), talk: G.lolaClub }],
  items: [exit(60, 'Выйти к метро', 'metro', 300, { cost: 5, facing: 'left' })],
};

const night_port = {
  title: 'ПОРТОВАЯ',
  width: 2600,
  spawnX: 200,
  ambience: 'night',
  steps: 'stepWet',
  night: () => (isNight() ? 0.3 : 0),
  draw: (s) => drawPort(s, 2600),
  prepare: (scene) => {
    castKey(scene, 'vika');
    scene.__girls = isNight() ? [0, 1, 2].map((i) => ({ id: `girl_${i}`, name: 'Девушка у дороги', sprite: personTexture(scene, randomSpec(`portgirl_${i}`, { female: true, dress: true, lipstick: '#c03a5a' })), x: 900 + i * 520, flip: i % 2 === 0, label: 'Подойти', talk: (ctx) => G.streetGirl(ctx, i), cost: 5 })) : [];
  },
  lamps: [{ x: 520, y: 200, r: 140, color: 0xff3d8a, alpha: 0.4 }, { x: 1480, y: 180, r: 140, color: 0x3df0ff, alpha: 0.4 }, { x: 2380, y: 210, r: 140, color: 0xffd166, alpha: 0.4 }],
  async onEnter(ctx) {
    if (!isNight() && once(`port_day_${day()}`)) return ctx.d.think('Днём Портовая — просто краны, контейнеры и чайки. Всё интересное здесь начинается ночью.');
    if (isNight() && once('port_night')) return ctx.d.think('Ночью Портовая другая. Неон, мокрый асфальт, машины медленно едут вдоль тротуара. Девушки у дороги. Это — мир Рея. Его «лидогенерация».');
  },
  npcs: (scene) => [
    ...(scene?.__girls || []),
    { id: 'vika', name: 'Вика', sprite: cast('vika'), x: 1900, flip: true, dynamic: true, when: () => isNight(), talk: G.vikaTalk },
  ],
  items: [exit(80, 'В метро «Портовая»', 'metro', 300, { cost: 3, facing: 'left' })],
};

const promzona = {
  title: 'ПРОМЗОНА',
  width: 2200,
  spawnX: 200,
  ambience: 'night',
  steps: 'stepWet',
  night: () => (isDarkNow() ? 0.4 : 0),
  draw: (s) => drawPromzona(s, 2200),
  prepare: prepCast(['kira']),
  critters: [{ type: 'cat', x: 1000, y: 470 }, { type: 'cat', x: 1350, y: 470, flip: true }, { type: 'cat', x: 1700, y: 470 }],
  onEnter: G.kiraPromzona,
  npcs: () => [
    { id: 'kira', name: 'Кира', sprite: cast('kira'), x: 1200, flip: true, dynamic: true, when: () => isAt('kira', 'promzona') || F.dateWith === 'kira', talk: G.kiraTalk },
    { id: 'roma', name: 'Рома', sprite: 'roma', x: 1800, flip: true, dynamic: true, when: () => isAt('roma', 'promzona'), talk: async ({ d }) => d.say('Рома', 'Тут хорошо гулять. Никто не просит улыбаться.') },
  ],
  photoSpots: [{ id: 'e2_promzona', x: 1300, range: 500, line: { id: 'e2_photo_crosses', text: 'Кресты и трубы — одинаково смотрят в небо', tag: 'pain' } }],
  items: [exit(80, 'В метро «Промзона»', 'metro', 300, { cost: 3, facing: 'left' })],
};

const rechnaya = {
  title: 'НАБЕРЕЖНАЯ · «РЕЧНАЯ»',
  width: 2000,
  spawnX: 200,
  ambience: 'street',
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.35 : 0),
  draw: (s) => drawRechnaya(s, 2000),
  npcs: () => [{ id: 'adam', name: 'Адам', sprite: 'adam', x: 1400, flip: true, dynamic: true, when: () => isAt('adam', 'rechnaya'), talk: S.adamRechnaya }],
  photoSpots: [{ id: 'e2_river', x: 900, range: 600, text: 'Река тёмная и медленная — как бит на 70 BPM' }],
  items: [
    exit(80, 'В метро «Речная»', 'metro', 300, { cost: 3, facing: 'left' }),
    { x: 1600, label: 'Дверь «САМИЗДАТА»', sfx: 'doorSoft', async use(ctx) {
      if (!isAt('adam', 'rechnaya')) return ctx.d.think('Закрыто. На двери маркером: «Мы — когда мы есть. Есть».');
      return S.adamRechnaya(ctx);
    } },
  ],
};

const arena = {
  title: '«АРЕНА»',
  width: 1800,
  spawnX: 200,
  ambience: 'street',
  steps: 'stepConcrete',
  night: () => (isDarkNow() ? 0.3 : 0),
  draw: (s) => drawStreet(s, 1800, {
    seed: 81,
    lamps: [400, 1400],
    buildings: [{ x: 300, w: 1300, h: 420, color: 0x2a2a3a }],
    features: [{ type: 'neon', x: 950, y: 150, text: 'АРЕНА · 20 000 МЕСТ', color: '#ffd166', size: 18 }, { type: 'posterImg', key: 'poster_arena', x: 700, y: 330, w: 60, h: 86 }],
  }),
  prepare: prepCast(['olymp']),
  photoSpots: [{ id: 'e2_arena', x: 950, range: 600, line: { id: 'e2_photo_arena', text: 'Сфоткался у «Арены». Однажды — изнутри', tag: 'dream' } }],
  npcs: () => [{ id: 'karina', name: 'Карина', sprite: cast('olymp'), x: 1300, flip: true, dynamic: true, when: () => day() === 'sun' && hasItem('ticket'), talk: S.arenaTicket }],
  items: [
    exit(80, 'В метро «Арена»', 'metro', 300, { cost: 3, facing: 'left' }),
    { x: 950, label: 'Афиши «Арены»', sfx: 'paper', async use({ d }) {
      await d.think('Двадцать тысяч мест. Когда-нибудь одно из них будет моим. Нет — сцена будет моей.');
    } },
  ],
};

// Подработка у Палыча (суббота): тот же склад
const warehouse = {
  title: 'СКЛАД «ЛОГИСТЛАЙН»',
  width: 1500,
  spawnX: 900,
  ambience: 'warehouse',
  steps: 'stepConcrete',
  draw: (s) => drawWarehouse(s, 1500),
  async onEnter(ctx) {
    const r = F.shiftResult;
    if (!r) return;
    F.shiftResult = null;
    const pay = Math.max(0, r.pay);
    await ctx.d.say('Палыч', r.hits >= r.total * 0.8 ? 'Ну, звезда, не разучился. Держи.' : 'Звезда разбила полфуры. Держи, что осталось.');
    ctx.cash(pay, 'смена у Палыча');
    quest('e2_palych', { status: 'done', title: 'Подработка у Палыча' });
    await ctx.card('ДВОР', 'автобус обратно');
    ctx.go('yard', 2300, 'left');
  },
  npcs: () => [{ id: 'palych', name: 'Палыч', sprite: 'palych', x: 760, flip: true }],
};

export const LOCATIONS = {
  apartment, yard, garage, garage_wc, crossroads, cafes, shops, courtyards,
  cafe_zerno, cafe_pyshka, cafe_noch, cafe_wc, shawarma, shawarma_steps, barber, tattoo, clothes, photolab, plumbing, pawnshop,
  metro, podval_entrance, podval, backstage, podval_yard, ray_party, rooftop, club, night_port, promzona, rechnaya, arena, warehouse,
};

