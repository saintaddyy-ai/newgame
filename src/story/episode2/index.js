// ЭПИЗОД 2 «ОТКРЫТЫЙ МИКРОФОН» (пятница → воскресенье): точка входа для движка.
import { state } from '../../state.js';
import { LOCATIONS } from './locations.js';
import { clockLabel as clock, energy, at, day } from './world.js';
import { EVENTS, checkEvents, passOut, startEpisode2 } from './main.js';
import { REPLIES as SIDE_REPLIES, callScript as sideCall } from './side.js';
import { coolHeat } from './courier.js';
import { mapInfo as metroMap } from './metro.js';
import { drainMinutes, tireFactor, checkNeeds, clean } from '../../needs.js';

export { LOCATIONS, startEpisode2, EVENTS };

export const REPLIES = { ...SIDE_REPLIES };

export function clockLabel() {
  return clock();
}

// Ход времени: события по часам, энергия, палево остывает, после 4 утра — Марк вырубается
export function advanceTime(scene, min) {
  if (!min) return;
  state.time.min += min;
  energy((-min / 14) * tireFactor());
  drainMinutes(min);
  checkNeeds(scene);
  coolHeat(min);
  checkEvents(scene);
  scene.refreshHud?.();
  scene.refreshNpcs?.();
  if (state.time.min >= at(28) && !state.flags.e2PassingOut) {
    state.flags.e2PassingOut = true;
    scene.time.delayedCall(300, () => scene.runScript(async () => {
      state.flags.e2PassingOut = false;
      await passOut(scene);
    }));
  }
}

// Марочка «на потом» в Эпизоде 2
export const ITEM_USE = {
  async marka(ctx) {
    const { d, acid, fx } = ctx;
    if (state.flags.acidNow) return d.think('Хватит. Меня и так несёт.');
    await d.think('Марочка Рея. Улыбающееся солнце на бумажке.');
    const c = await d.choose(['[Положить под язык]', 'Нет. Не сейчас.']);
    if (c === 1) return;
    state.inventory.splice(state.inventory.indexOf('marka'), 1);
    state.flags.markaInInventory = false;
    state.flags.triedLSD = true;
    state.flags.acidNow = true;
    state.stats.addiction += 1;
    state.pulse = Math.max(0, state.pulse - 3);
    fx.screenFlash(0xff7ab8, 500);
    acid(true);
    await d.think('Минут через двадцать город начинает дышать. Фонари — моргать в такт. Красиво. Страшно. Красиво.');
  },
};

export function sceneHooks(scene) {
  // Палево видно, пока работаешь на Рея; при смене места оно чуть остывает
  if (state.flags.courierActive) coolHeat(30);
  // Дождь на улице — чуть грязнее (мокрые кроссы, брызги от машин)
  const rainy = typeof scene.cfg.rain === 'function' ? scene.cfg.rain() : scene.cfg.rain;
  if (rainy) clean(-3);
  // Энергия на нуле — Марк еле идёт
  if (state.energy < 15 && !state.flags[`e2Tired_${day()}`]) {
    state.flags[`e2Tired_${day()}`] = true;
    scene.time.delayedCall(900, () => scene.showToast('УСТАЛОСТЬ', 'Энергия на нуле: поешь или поспи', '#ff6b8a'));
  }
  checkEvents(scene);
}

export function afterScript(scene) {
  checkEvents(scene);
}

export function callScript(id) {
  return sideCall(id);
}

export function mapInfo() {
  return metroMap();
}

