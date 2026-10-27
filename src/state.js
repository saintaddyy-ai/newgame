// Всё, что игра запоминает о выборах игрока
function defaults() {
  return {
    // 'prologue' | 'ep1' | 'ep2' — от него зависит, какие версии локаций загружаются
    episode: 'prologue',
    flags: {},
    // Скрытые характеристики
    stats: { fame: 0, money: 0, honesty: 0, addiction: 0, look: 0 },
    // Отношения с персонажами
    rel: { mom: 0, dan: 0, ray: 0 },
    // Собранные строчки для треков: { id, text, tag }
    lines: [],
    // Строчки, проданные Рею, — больше недоступны
    soldLines: [],
    tracks: [],
    // Деньги в рублях и вещи в карманах
    cash: 0,
    inventory: [],
    // Текущая цель — показывается в тетради и в «Делах»
    goal: '',
    // Время (Эпизод 2): день и минуты от полуночи
    time: { day: 'fri', min: 600 },
    // Скрытый «Пульс» 0–100: как город сейчас чувствует Марка
    pulse: 50,
    energy: 100,
    // Сытость и чистота 0–100 (Эп.1–2, см. src/needs.js); starve — сколько уже голодает на нуле
    food: 80,
    clean: 80,
    starve: 0,
    // Палево (курьер Рея)
    heat: 0,
    // Телефон: контакты, переписки, звонки
    phone: { contacts: [], threads: {}, unread: {}, calls: [], wallpaper: 0 },
    // Соцсети: подписчики в каждой, посты, лента «Вайба»
    social: { unlocked: false, followers: { ritm: 0, kadr: 0, vibe: 0 }, dayStart: { ritm: 0, kadr: 0, vibe: 0 }, posts: [], feed: [] },
    // Банк: история операций и долги
    bank: [],
    debts: {},
    // Задания: id → { title, status: 'active'|'done'|'failed', note, giver }
    quests: {},
    // Настройки (громкость, озвучка, автотюн)
    settings: { music: 0.8, sfx: 0.7, voice: true, voiceVol: 1.4, textSpeed: 22, autotune: 'off', headphones: true, graphics: 'high', phoneX: 640 },
  };
}

export const state = defaults();

export const TAGS = {
  street: { name: 'Улица', color: '#7ab8ff' },
  pain: { name: 'Боль', color: '#ff6b8a' },
  dream: { name: 'Мечта', color: '#ffd166' },
  party: { name: 'Тусовки', color: '#c77dff' },
};

export const ITEMS = {
  watch: 'Отцовские часы «Полёт»',
  marka: 'Марочка от Рея',
  flyers: 'Флаеры «ЛИДОГЕН»',
  mic: 'Новый микрофон',
  sticker: 'Стикер jeffrY#creator',
  token: 'Жетон «Речная» от Адама',
  package: 'Пакет Рея',
  packs: 'Пакеты Рея «на реализацию»',
  ticket: 'Билет на «Арену»',
  gasket: 'Прокладка для крана',
  photo_old: 'Фото со школьной линейки',
};

export function hasLine(id) {
  return state.lines.some((l) => l.id === id);
}

// Возвращает true, если строчка новая (проданную Рею второй раз не получить)
export function addLine(line) {
  if (hasLine(line.id) || state.soldLines.some((l) => l.id === line.id)) return false;
  state.lines.push(line);
  return true;
}

export function hasItem(id) {
  return state.inventory.includes(id);
}

export function giveItem(id) {
  if (!hasItem(id)) state.inventory.push(id);
}

export function takeItem(id) {
  const i = state.inventory.indexOf(id);
  if (i >= 0) state.inventory.splice(i, 1);
}

// Очищаем на месте: сценарии держат ссылки на эти объекты (const F = state.flags)
function assignInPlace(target, src) {
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    if (Array.isArray(v)) {
      if (Array.isArray(cur)) {
        cur.length = 0;
        cur.push(...v);
      } else target[k] = [...v];
    } else if (v && typeof v === 'object') {
      if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
        for (const key of Object.keys(cur)) delete cur[key];
        Object.assign(cur, JSON.parse(JSON.stringify(v)));
      } else target[k] = JSON.parse(JSON.stringify(v));
    } else target[k] = v;
  }
}

export function resetState() {
  // Настройки игрока переживают «Новую игру»
  const settings = { ...state.settings };
  assignInPlace(state, defaults());
  Object.assign(state.settings, settings);
}

// ---------- Сохранение между сессиями ----------

const SAVE_KEY = 'platina_save_v1';

export function saveGame(where) {
  try {
    const data = JSON.parse(JSON.stringify({ ...state, where }));
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Загружает сохранение в state (на месте) и возвращает, где игрок остановился
export function loadGame() {
  const s = readSave();
  if (!s) return null;
  const base = defaults();
  const merged = {};
  for (const k of Object.keys(base)) {
    const v = s[k];
    if (v === undefined) merged[k] = base[k];
    else if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merged[k] = { ...base[k], ...v };
    else merged[k] = v;
  }
  const settings = { ...state.settings };
  assignInPlace(state, merged);
  Object.assign(state.settings, settings);
  return s.where || null;
}

// Настройки хранятся отдельно от сохранения: «Новая игра» и «Продолжить» их не трогают
const SETTINGS_KEY = 'platina_settings_v1';

export function loadSettings() {
  try {
    Object.assign(state.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch (e) {}
}

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {}
}

// ---------- Деньги ----------

// Каждая операция попадает в «Банк» телефона
export function bankTx(amount, label = '') {
  state.bank.unshift({ amount, label, when: clockShort() });
  if (state.bank.length > 40) state.bank.length = 40;
}

// ---------- Время ----------

export const DAYS = { fri: 'ПЯТНИЦА', sat: 'СУББОТА', sun: 'ВОСКРЕСЕНЬЕ' };

export function hhmm(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Примерное время в Прологе и Эпизоде 1 (там время идёт фазами)
export const PHASE_CLOCK = { tue: 1170, tue_night: 1430, wed: 620, wed_night: 1420, thu: 660, thu_eve: 1150, final: 1350, outro: 40 };

export function clockShort() {
  if (state.episode === 'ep2') return hhmm(state.time.min);
  if (state.episode === 'ep1') return hhmm(PHASE_CLOCK[state.flags.e1] ?? 720);
  return state.flags.danMet ? '09:10' : state.flags.momLeft ? '07:20' : '06:40';
}
