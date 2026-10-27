// Общие помощники сценариев Эпизода 2
import { state, hasItem, giveItem, takeItem } from '../../state.js';
import { pulse, energy, now, at, day } from './world.js';
import { addFollowers, feed, quest, questStatus, receive, post, notify } from '../../phone/model.js';
import { food, clean, remark, lookFactor } from '../../needs.js';

export const F = state.flags;
export { state, hasItem, giveItem, takeItem, pulse, energy, now, at, day, addFollowers, feed, quest, questStatus, receive, post, notify, food, clean, remark };

// Подписчики за то, где видно самого Марка (стрим, фото с ним): помятый вид — меньше
export function faceFollowers(app, n, reason) {
  const k = lookFactor();
  const got = addFollowers(app, Math.round(n * k), k < 1 ? `${reason} · вид помятый` : reason);
  if (k < 1 && once(`dirty_comment_${day()}`)) {
    feed(pickOne(['kot_v_sapogah', 'random_user17', 'rap_kritik_95']), pickOne(['он что, неделю не мылся? даже через экран чувствуется', 'тень, ты норм? выглядишь как после трёх смен на складе', 'талант есть, шампуня нет']));
  }
  return got;
}

export const rel = (id, d) => (state.rel[id] = (state.rel[id] || 0) + d);
export const relOf = (id) => state.rel[id] || 0;

// Один раз за игру
export function once(key) {
  if (F[`o_${key}`]) return false;
  F[`o_${key}`] = true;
  return true;
}

export const later = (sec, fn) => setTimeout(fn, sec * 1000);

// Случайный выбор с весами: [[значение, вес], ...]
export function weighted(list) {
  const total = list.reduce((n, [, w]) => n + Math.max(0, w), 0);
  let r = Math.random() * total;
  for (const [v, w] of list) {
    r -= Math.max(0, w);
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Выход в другую локацию с затратой времени. open — часы работы (закрыто — подсказка остаётся)
export function exit(x, label, to, spawnX, { cost = 5, when, open, facing, sfxName = 'click', card } = {}) {
  return {
    x, sfx: sfxName, when,
    label: () => (open && !open() ? `${label} · закрыто` : label),
    async use(ctx) {
      if (open && !open()) {
        ctx.sfx('deny');
        return ctx.d.think(pickOne(['Закрыто. На двери — часы работы и чья-то наклейка «ЛИДОГЕН».', 'Заперто. Приду позже.', 'Закрыто. В витрине моё отражение пожимает плечами.']));
      }
      if (card) await ctx.card(card[0], card[1]);
      ctx.time(cost);
      ctx.go(to, spawnX, facing);
    },
  };
}

// Деньги не уходят в минус
export function canPay(n) {
  return state.cash >= n;
}

// Последний трек/демка — для заданий «отнести демку»
export const hasDemo = () => state.tracks.length > 0;

export function markLook(delta) {
  state.stats.look = (state.stats.look || 0) + delta;
}

export function mainGoal(ctx, text) {
  ctx.goal(text);
}
