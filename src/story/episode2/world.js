// Живой мир Эпизода 2: часы, расписания, настроение людей, «Пульс», энергия.
import { state, hhmm, DAYS } from '../../state.js';
import { drainNight } from '../../needs.js';

const F = state.flags;
export const DAY_ORDER = ['fri', 'sat', 'sun'];
export const DAY_SHORT = { fri: 'ПТ', sat: 'СБ', sun: 'ВС' };

// ---------- Время ----------

export const now = () => state.time.min;
export const day = () => state.time.day;
export const at = (h, m = 0) => h * 60 + m;
// «Ночь» — после 22:00 и до 6 утра (минуты могут уходить за 24:00, пока не лёг спать)
export const isNight = () => now() >= at(22) || now() < at(6);
export const isEvening = () => now() >= at(18) && now() < at(22);
export const between = (a, b) => now() >= a && now() < b;
export const clockLabel = () => `${DAY_SHORT[day()]} · ${hhmm(now())}`;
export const dayName = () => DAYS[day()];

// Сутки кончаются, когда Марк ложится спать (или падает с ног в 4 утра)
export function nextDay() {
  const i = DAY_ORDER.indexOf(day());
  if (i >= DAY_ORDER.length - 1) return false;
  state.time.day = DAY_ORDER[i + 1];
  state.time.min = at(10);
  drainNight();
  // Сон обрывает любой «трип»; вчерашние свидания закончились
  F.acidNow = false;
  F.acidUntil = null;
  F.dateWith = null;
  // Новый день: подписчики «за сегодня» считаются заново, у всех новое настроение
  Object.assign(state.social.dayStart, state.social.followers);
  F.e2Dates = 0;
  return true;
}

// Минуты от начала эпизода (пятница 00:00) — для сроков, которые переходят через полночь
export const absMin = () => DAY_ORDER.indexOf(day()) * 1440 + now();

// Марочка действует часов пять (или до сна). Эффект на экране сверяется с этим каждый кадр-полсекунды
export const ACID_MIN = 300;
export function acidActive() {
  if (!F.acidNow) return false;
  if (!F.acidUntil) F.acidUntil = absMin() + ACID_MIN;
  if (absMin() >= F.acidUntil) {
    F.acidNow = false;
    F.acidUntil = null;
    return false;
  }
  return true;
}

// ---------- Пульс ----------

export function pulse(delta) {
  state.pulse = Math.max(0, Math.min(100, state.pulse + delta));
  return state.pulse;
}

export function pulseLevel(p = state.pulse) {
  if (p < 25) return { id: 'bottom', name: 'НА ДНЕ' };
  if (p < 50) return { id: 'slide', name: 'КАТИШЬСЯ' };
  if (p < 75) return { id: 'hold', name: 'ДЕРЖИШЬСЯ' };
  return { id: 'rise', name: 'ВЗЛЁТ' };
}

// Стартовый «Пульс» — из того, как прошёл Эпизод 1
export function initialPulse() {
  let p = 45;
  p += (state.stats.fame || 0) * 3 + (state.stats.honesty || 0) * 2 - (state.stats.addiction || 0) * 4;
  if (F.reyGhost) p -= 6;
  if (F.shifts) p += 3;
  if (F.momLoan) p -= 2;
  if (F.e1Rehearsal) p += 4;
  return Math.max(15, Math.min(80, p));
}

// ---------- Энергия ----------

export function energy(delta) {
  state.energy = Math.max(0, Math.min(100, state.energy + delta));
  return state.energy;
}

// ---------- Настроение людей ----------

// Характер: кто какой «по жизни»
const TRAIT = { mom: -1, dan: 0, ray: 0, arkasha: 1, stas: 0, adam: 0, roma: -1, mira: 0, lola: 1, kira: 0, granny: 0, kid: 1 };

// Бросок «бывают дни»: одинаковый на весь день у одного человека
function dailyRoll(id) {
  let h = 2166136261;
  const s = `${id}|${day()}|${F.e2Seed || 7}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  const r = (h % 1000) / 1000;
  return r < 0.2 ? -1 : r > 0.8 ? 1 : 0;
}

// Настроение от −2 до +2: характер + время + день + события + отношение + «Пульс» + бросок дня
export function mood(id) {
  let m = TRAIT[id] ?? 0;
  const t = now();
  if (id === 'mom') {
    if (day() === 'sun') m += 1;
    if (t < at(12) && day() !== 'sun') m -= 1;
    if (F.momKnowsAcid || F.e2MomFoundMarka) m -= 1;
  }
  if (id === 'ray') m += isNight() ? 1 : t < at(16) ? -1 : 0;
  if (id === 'dan' && isNight()) m += 1;
  if (id === 'kira' && t >= at(10) && t < at(16)) m -= 1;
  if (F.e2StudioFight === id) m -= 2;
  if (F.e2StudioFight && id === 'dan' && F.e2DanSide !== 'mark') m -= 1;
  if (F.podvalResult === 'fire' && ['dan', 'stas', 'arkasha', 'adam', 'mira', 'kira'].includes(id)) m += 1;
  if (F.podvalResult === 'fail' && id === 'ray') m += 1;
  const rel = state.rel[id] || 0;
  m += rel >= 3 ? 1 : rel <= -2 ? -1 : 0;
  if (state.pulse < 25 && ['dan', 'mira', 'mom'].includes(id)) m -= 1;
  m += dailyRoll(id);
  return Math.max(-2, Math.min(2, m));
}

// Реплика по настроению: pools = { good, ok, bad } (или +2..−2)
export function byMood(id, pools) {
  const m = mood(id);
  if (pools[m] !== undefined) return pools[m];
  if (m >= 1 && pools.good !== undefined) return pools.good;
  if (m <= -1 && pools.bad !== undefined) return pools.bad;
  return pools.ok;
}

// ---------- Расписания: кто где сейчас ----------

// Каждая запись: [день или '*', с, до, где]. Минуты могут быть больше 24:00 (ночь того же дня).
const SCHEDULE = {
  mom: [['fri', 0, at(22), 'work'], ['fri', at(22), at(30), 'apartment'], ['sat', at(8), at(20), 'work'], ['sat', at(20), at(30), 'apartment'], ['sun', 0, at(30), 'apartment']],
  dan: [['*', 0, at(30), 'garage'], ['fri', at(19), at(23, 30), 'podval'], ['sat', at(12), at(14), 'sleep']],
  ray: [['fri', at(16), at(19), 'shawarma'], ['fri', at(19), at(23, 30), 'podval'], ['fri', at(23, 30), at(30), 'party'],
    ['sat', at(14), at(16, 30), 'garage'], ['sat', at(16, 30), at(21), 'shawarma'], ['sat', at(21), at(30), 'arch'], ['sun', at(16), at(22), 'arch']],
  stas: [['*', at(10), at(16), 'cafe_zerno'], ['fri', at(18), at(23, 30), 'podval']],
  arkasha: [['fri', at(12), at(17), 'tattoo'], ['fri', at(19), at(23, 30), 'podval'], ['sat', at(16, 30), at(19), 'garage'], ['sat', at(11), at(16, 30), 'shops'], ['sun', at(12), at(18), 'cafes']],
  adam: [['fri', at(15), at(18), 'metro'], ['fri', at(19), at(23, 30), 'podval'], ['sat', at(19), at(21), 'garage'], ['sat', at(12), at(18), 'rechnaya'], ['sun', at(12), at(20), 'rechnaya']],
  roma: [['*', at(12), at(17), 'tattoo'], ['fri', at(19), at(23, 30), 'podval_yard'], ['sun', at(18), at(23), 'promzona']],
  mira: [['fri', at(19), at(23, 30), 'podval'], ['sat', at(17), at(23), 'cafe_zerno'], ['sun', at(11), at(17), 'cafes']],
  lola: [['fri', at(23, 30), at(30), 'party'], ['sat', at(22), at(30), 'club']],
  kira: [['fri', at(16), at(26), 'shawarma'], ['sat', at(16), at(21), 'promzona'], ['sat', at(22), at(30), 'shawarma'], ['sun', at(11), at(18), 'promzona']],
  granny: [['*', at(10), at(19), 'yard']],
  kid: [['*', at(11), at(20), 'yard']],
};

export const PLACE_NAMES = {
  work: 'на смене', apartment: 'дома', garage: 'гараж Дэна', sleep: 'спит', podval: '«Подвал»', shawarma: '«Шаурма 24»', party: 'афтепати',
  arch: 'у арки', cafe_zerno: 'кофейня «Зерно»', tattoo: 'тату «Чернила»', shops: 'торговая улица', cafes: 'кафе-квартал', metro: 'метро «Заводская»',
  rechnaya: 'ст. «Речная»', podval_yard: 'дворик «Подвала»', promzona: 'промзона', club: 'клуб «Неон»', yard: 'двор',
};

export function whereIs(id) {
  const list = SCHEDULE[id] || [];
  const t = now();
  let found = null;
  for (const [d, a, b, place] of list) {
    if (d !== '*' && d !== day()) continue;
    if (t >= a && t < b) found = place;
  }
  // Сюжет может переопределить (поссорились, уехал и т. п.)
  const override = F[`e2Where_${id}`];
  if (override && override.day === day() && t < override.until) return override.place;
  return found;
}

export const isAt = (id, place) => whereIs(id) === place;

// Кто занимает гараж-студию прямо сейчас (Рей, Аркаша, Адам — по расписанию)
export function studioOccupant() {
  if (F.e2StudioFree === `${day()}_${Math.floor(now() / 60)}`) return null;
  for (const id of ['ray', 'arkasha', 'adam']) if (isAt(id, 'garage')) return id;
  return null;
}
