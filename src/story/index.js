// Какие версии локаций сейчас действуют — зависит от эпизода
import { state } from '../state.js';
import { LOCATIONS as PROLOGUE } from './prologue.js';
import { LOCATIONS as EP1, PHASES } from './episode1.js';

const EPISODES = { prologue: PROLOGUE, ep1: EP1 };

export function getLocation(key) {
  return (EPISODES[state.episode] || PROLOGUE)[key] || PROLOGUE[key];
}

export function phaseLabel() {
  return state.episode === 'ep1' ? PHASES[state.flags.e1] || '' : '';
}
