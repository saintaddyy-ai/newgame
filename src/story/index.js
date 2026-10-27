// Какие версии локаций сейчас действуют — зависит от эпизода
import { state } from '../state.js';
import { LOCATIONS as PROLOGUE } from './prologue.js';
import { LOCATIONS as EP1, PHASES, ITEM_USE as EP1_ITEMS } from './episode1.js';
import * as EP2 from './episode2/index.js';
import { REPLIES, callScript, phoneTick } from './phoneStory.js';
import { checkNeeds } from '../needs.js';

const EPISODES = { prologue: PROLOGUE, ep1: EP1, ep2: EP2.LOCATIONS };

export function getLocation(key) {
  return (EPISODES[state.episode] || PROLOGUE)[key] || PROLOGUE[key];
}

export function phaseLabel() {
  if (state.episode === 'ep2') return EP2.clockLabel();
  return state.episode === 'ep1' ? PHASES[state.flags.e1] || '' : '';
}

// Время идёт только во втором эпизоде (в первом — фазами)
export function advanceTime(scene, min) {
  if (state.episode === 'ep2') EP2.advanceTime(scene, min);
}

// Действует ли марочка прямо сейчас: экран «плывёт» только тогда (Эп.1 — по фазам, Эп.2 — по часам и до сна)
export function acidActive() {
  if (state.episode === 'ep2') return EP2.acidActive();
  if (state.episode === 'ep1') return !!state.flags.acidNow;
  return false;
}

// Использовать вещь из тетради (марочка «на потом»)
export function useItem(id) {
  if (state.episode === 'ep2') return EP2.ITEM_USE[id] || null;
  return EP1_ITEMS[id] || null;
}

// Вызывается при входе в любую локацию
export function sceneHooks(scene) {
  phoneTick();
  if (state.episode === 'ep2') EP2.sceneHooks(scene);
  checkNeeds(scene);
  // После каждой сцены телефон проверяет, не пора ли кому-то написать
  const onDone = () => {
    phoneTick();
    if (state.episode === 'ep2') EP2.afterScript(scene);
    checkNeeds(scene);
  };
  scene.events.on('scriptDone', onDone);
  scene.events.once('shutdown', () => scene.events.off('scriptDone', onDone));
}

export function phoneCallScript(id) {
  if (state.episode === 'ep2') return EP2.callScript(id);
  return callScript(id);
}

export function phoneReplyHandler(id) {
  return REPLIES[id] || EP2.REPLIES[id] || null;
}

export function phoneMapInfo() {
  return state.episode === 'ep2' ? EP2.mapInfo() : null;
}
