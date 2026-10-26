// Всё, что игра запоминает о выборах игрока
export const state = {
  flags: {},
  // Скрытые характеристики
  stats: { fame: 0, money: 0, honesty: 0, addiction: 0 },
  // Отношения с персонажами
  rel: { mom: 0, dan: 0 },
  // Собранные строчки для треков: { id, text, tag }
  lines: [],
  tracks: [],
};

export const TAGS = {
  street: { name: 'Улица', color: '#7ab8ff' },
  pain: { name: 'Боль', color: '#ff6b8a' },
  dream: { name: 'Мечта', color: '#ffd166' },
  party: { name: 'Тусовки', color: '#c77dff' },
};

export function hasLine(id) {
  return state.lines.some((l) => l.id === id);
}

// Возвращает true, если строчка новая
export function addLine(line) {
  if (hasLine(line.id)) return false;
  state.lines.push(line);
  return true;
}

// Очищаем на месте: сценарии держат ссылки на эти объекты
export function resetState() {
  for (const k of Object.keys(state.flags)) delete state.flags[k];
  Object.assign(state.stats, { fame: 0, money: 0, honesty: 0, addiction: 0 });
  Object.assign(state.rel, { mom: 0, dan: 0 });
  state.lines.length = 0;
  state.tracks.length = 0;
}
