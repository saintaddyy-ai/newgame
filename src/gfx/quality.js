// Качество графики (настройка в телефоне): high — эффекты, частицы, свет; medium — без
// пост-эффектов; low — минимум частиц и анимаций фона (для слабых устройств).
import { state } from '../state.js';

export function quality() {
  return state.settings?.graphics || 'high';
}

export const QUALITY_LABEL = { high: 'высокая', medium: 'средняя', low: 'низкая' };

// Множитель числа частиц (дождь, пыль, листья)
export function particles() {
  return { high: 1, medium: 0.6, low: 0.25 }[quality()] ?? 1;
}
