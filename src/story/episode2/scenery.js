// Фоны Эпизода 2 описываются данными в locations.js, а рисует их новая графика (src/gfx/places/*).
// Здесь — тонкие обёртки с прежними именами, чтобы сценарии не менялись.
import { now, at } from './world.js';
import { paintStreet } from '../../gfx/places/street.js';
import { paintInterior } from '../../gfx/places/rooms.js';
import { LINES, trainArrive, paintMetro, paintRooftop, paintPort, paintPromzona, paintRechnaya } from '../../gfx/places/misc.js';

export { LINES, trainArrive };

export const isDarkNow = () => {
  const t = now() % 1440;
  return t >= at(20) || t < at(6);
};

// spec: { buildings: [...], lamps: [x...], features: [...], parked: [[x, color, dir]] }
export function drawStreet(scene, width, spec) {
  return paintStreet(scene, width, spec);
}

// spec: { wall, wallColor, floor, floorTiles, props: [{ type, ... }] }
export function drawInterior(scene, width, spec) {
  return paintInterior(scene, width, spec);
}

export function drawMetro(scene, width, lineId, stationName) {
  return paintMetro(scene, width, lineId, stationName);
}

export function drawRooftop(scene, width) {
  return paintRooftop(scene, width);
}

export function drawPort(scene, width) {
  return paintPort(scene, width);
}

export function drawPromzona(scene, width) {
  return paintPromzona(scene, width);
}

export function drawRechnaya(scene, width) {
  return paintRechnaya(scene, width);
}
