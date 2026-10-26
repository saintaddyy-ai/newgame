// Всё, что игра запоминает о выборах игрока
export const state = {
  // 'prologue' | 'ep1' — от него зависит, какие версии локаций загружаются
  episode: 'prologue',
  flags: {},
  // Скрытые характеристики
  stats: { fame: 0, money: 0, honesty: 0, addiction: 0 },
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
  // Текущая цель — показывается в тетради
  goal: '',
};

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

// Очищаем на месте: сценарии держат ссылки на эти объекты
export function resetState() {
  state.episode = 'prologue';
  for (const k of Object.keys(state.flags)) delete state.flags[k];
  Object.assign(state.stats, { fame: 0, money: 0, honesty: 0, addiction: 0 });
  for (const k of Object.keys(state.rel)) delete state.rel[k];
  Object.assign(state.rel, { mom: 0, dan: 0, ray: 0 });
  state.lines.length = 0;
  state.soldLines.length = 0;
  state.tracks.length = 0;
  state.inventory.length = 0;
  state.cash = 0;
  state.goal = '';
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
  resetState();
  state.episode = s.episode || 'prologue';
  Object.assign(state.flags, s.flags || {});
  Object.assign(state.stats, s.stats || {});
  Object.assign(state.rel, s.rel || {});
  state.lines.push(...(s.lines || []));
  state.soldLines.push(...(s.soldLines || []));
  state.tracks.push(...(s.tracks || []));
  state.inventory.push(...(s.inventory || []));
  state.cash = s.cash || 0;
  state.goal = s.goal || '';
  return s.where || null;
}
