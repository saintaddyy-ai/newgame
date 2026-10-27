// Сытость и чистота (Эпизоды 1 и 2). Падают со временем и от «грязных» дел.
// Голод: предупреждения → слабость (медленнее ходит, быстрее устаёт) → обморок и «Конец».
// Грязь: мама, девушки и охрана морщатся, фото и стримы собирают меньше подписчиков.
import { state } from './state.js';
import { REMARKS, PICKY } from './story/remarks.js';

export const FOOD_LOW = 35;
export const FOOD_WEAK = 15;
export const CLEAN_LOW = 40;
export const CLEAN_BAD = 20;
// Эп.2: сколько минут без сна можно продержаться на нуле, прежде чем упасть
export const STARVE_LIMIT = 300;
// Эп.1 (время фазами): сколько фаз подряд на нуле
const STARVE_PHASES = 2;

const F = () => state.flags;
const clamp = (v) => Math.max(0, Math.min(100, v));

export function needsOn() {
  return state.episode === 'ep1' || state.episode === 'ep2';
}

export function food(delta) {
  state.food = clamp((state.food ?? 80) + delta);
  if (state.food > 0) state.starve = 0;
  return state.food;
}

export function clean(delta) {
  state.clean = clamp((state.clean ?? 80) + delta);
  return state.clean;
}

export const hungry = () => needsOn() && state.food < FOOD_LOW;
export const weak = () => needsOn() && state.food < FOOD_WEAK;
export const dirty = () => needsOn() && state.clean < CLEAN_LOW;
export const stinks = () => needsOn() && state.clean < CLEAN_BAD;

// Эп.2: минуты бодрствования. Сытость −1 за 14 минут (≈ −4 в час), чистота −1 за 45 минут
export function drainMinutes(min) {
  if (!needsOn() || min <= 0) return;
  // Дневной сон: голод идёт медленнее и голодовкой не считается
  const asleep = !!state.flags.nd_asleep;
  const wasZero = state.food <= 0;
  food(-min / (asleep ? 30 : 14));
  clean(-min / 45);
  if (state.food <= 0 && !asleep) state.starve = (state.starve || 0) + (wasZero ? min : 0);
  // Без «последнего предупреждения» умереть нельзя: даже длинный скачок времени останавливается перед чертой
  if (!state.flags.nd_last) state.starve = Math.min(state.starve || 0, STARVE_LIMIT - 60);
}

// Эп.2: ночь сна. Просыпаешься голоднее и чуть помятым; голодовка во сне не считается
export function drainNight() {
  if (!needsOn()) return;
  food(-15);
  clean(-6);
  state.starve = 0;
  // Новый день — предупреждения покажутся заново
  ['nd_hungry', 'nd_weak', 'nd_zero', 'nd_last', 'nd_dirty', 'nd_stinks'].forEach((k) => (state.flags[k] = false));
}

// Эп.1: смена фазы (вечер → ночь → день…)
export function drainPhase() {
  if (!needsOn()) return;
  const wasZero = state.food <= 0;
  food(-14);
  clean(-8);
  if (state.food <= 0 && wasZero) state.starve = (state.starve || 0) + 1;
  if (!state.flags.nd_last) state.starve = Math.min(state.starve || 0, STARVE_PHASES - 1);
}

// После загрузки сохранения: если Марк был на грани голодной смерти — он «еле живой», но успевает поесть
export function reviveAfterLoad() {
  const f = state.flags;
  const nearDeath = f.nd_dead || (needsOn() && (state.food ?? 80) <= 0);
  if (nearDeath) state.food = Math.max(state.food ?? 0, 30);
  state.starve = 0;
  ['nd_dead', 'nd_zero', 'nd_last', 'nd_weak'].forEach((k) => delete f[k]);
}

// Множитель скорости ходьбы: голодный — еле идёт
export function walkFactor() {
  if (!needsOn()) return 1;
  if (state.food <= 0) return 0.7;
  if (state.food < FOOD_WEAK) return 0.82;
  return 1;
}

// Множитель усталости (Эп.2): на голодный желудок энергия тает быстрее
export function tireFactor() {
  return weak() ? 1.5 : 1;
}

// Насколько хорошо Марк выглядит на фото и в стриме
export function lookFactor() {
  if (!needsOn()) return 1;
  return state.clean < CLEAN_BAD ? 0.5 : state.clean < CLEAN_LOW ? 0.75 : 1;
}

// Подсказка «где поесть / помыться» — для «Дел» и предупреждений
export function whereToEat() {
  return state.episode === 'ep2'
    ? 'Дома — холодильник и мама, «Шаурма 24», кафе «Зерно» / «Пышка» / «Ночь», «Продукты» на улице за аркой'
    : 'Дома — холодильник (мама оставляет еду)';
}

export function whereToWash() {
  return state.episode === 'ep2' ? 'Дома в ванной или у Дэна — в каморке за ковром' : 'Дома в ванной';
}

// Дела «Поесть» / «Помыться» — появляются, когда пора
export function needsTodo() {
  if (!needsOn()) return [];
  const out = [];
  if (state.food < 50) out.push({ title: state.food <= 0 ? 'Поесть. СРОЧНО' : 'Поесть', note: whereToEat(), urgent: state.food < FOOD_WEAK });
  if (state.clean < 50) out.push({ title: 'Помыться', note: whereToWash(), urgent: state.clean < CLEAN_BAD });
  return out;
}

// Порог с «защёлкой»: предупреждение один раз, пока показатель не поднимется обратно
function latch(key, on, off) {
  const f = F();
  if (on && !f[key]) {
    f[key] = true;
    return true;
  }
  if (off) f[key] = false;
  return false;
}

// Проверка после хода времени и при входе в локацию: тосты, мысли, смерть от голода
export function checkNeeds(scene) {
  if (!needsOn() || !scene?.showToast) return;
  const fd = state.food;
  const cl = state.clean;
  const toast = (t, s, c) => scene.time.delayedCall(400, () => scene.showToast(t, s, c));
  if (latch('nd_hungry', fd < FOOD_LOW, fd >= 50)) toast('ГОЛОД', 'Живот урчит. Пора поесть — см. «Дела» в телефоне', '#ffb060');
  if (latch('nd_weak', fd < FOOD_WEAK, fd >= 30)) {
    toast('СЛАБОСТЬ', 'Руки трясутся, иду медленнее. Поесть — срочно', '#ff6b8a');
    scene.cameras.main.flash(300, 40, 0, 10);
  }
  if (latch('nd_zero', fd <= 0, fd >= 20)) {
    toast('В ГЛАЗАХ ТЕМНЕЕТ', 'Если не поесть в ближайшие часы — упаду', '#ff3d3d');
    scene.cameras.main.shake(300, 0.004);
  }
  const lateWarn = state.episode === 'ep2' ? (state.starve || 0) >= STARVE_LIMIT - 120 : (state.starve || 0) >= STARVE_PHASES - 1;
  if (latch('nd_last', fd <= 0 && lateWarn, fd > 0)) {
    toast('ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ', 'Ноги ватные. Ещё немного — и всё', '#ff3d3d');
    scene.cameras.main.flash(500, 60, 0, 0);
  }
  if (latch('nd_dirty', cl < CLEAN_LOW, cl >= 60)) toast('ЧИСТОТА', `От меня пахнет. ${whereToWash()}`, '#6ad8ff');
  if (latch('nd_stinks', cl < CLEAN_BAD, cl >= 40)) toast('ВОНЯЕТ', 'Люди отходят, девушки морщатся, фото — так себе', '#c8a060');
  // Умер от голода — экран «Конец», но не посреди сцены (LocationScene ждёт конца сценария)
  const dead = state.episode === 'ep2' ? (state.starve || 0) >= STARVE_LIMIT : (state.starve || 0) >= STARVE_PHASES;
  if (fd <= 0 && dead) F().nd_dead = 'hunger';
}

// Что скажет человек, если от Марка пахнет (раз в день на человека). Девушки — ещё и обижаются
export function remark(id) {
  if (!needsOn()) return null;
  const r = REMARKS[id];
  if (!r) return null;
  const level = stinks() ? 'bad' : dirty() ? 'dirty' : null;
  const text = level && (r[level] || (level === 'bad' ? r.dirty : null));
  if (!text) return null;
  const key = `nd_rm_${id}_${state.episode === 'ep2' ? state.time.day : state.flags.e1}`;
  if (state.flags[key]) return null;
  state.flags[key] = true;
  if (PICKY.includes(id) && level === 'bad') state.rel[id] = (state.rel[id] || 0) - 1;
  return text;
}
