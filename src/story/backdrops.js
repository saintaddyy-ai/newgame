// Фоны Пролога и Эпизода 1: тонкие обёртки над новой графикой (src/gfx/places/*).
// Двери — отдельные объекты (gfx/doors.js), фон только сообщает, где они и что за ними.

import Phaser from 'phaser';
import { state } from '../state.js';
import { paintYard } from '../gfx/places/yard.js';
import { paintApartment, paintBathroom } from '../gfx/places/apartment.js';
import { paintGarage } from '../gfx/places/garage.js';
import { paintWarehouse, paintPawnshop, paintFlea } from '../gfx/places/misc.js';

export function drawApartment(scene, width) {
  paintApartment(scene, width, { min: state.episode === 'prologue' ? (state.flags.danMet ? 9 * 60 + 10 : state.flags.momLeft ? 7 * 60 + 20 : 6 * 60 + 40) : undefined });
}

export function drawYard(scene, width, opts = {}) {
  const rain = scene.cfg?.rain;
  const wet = typeof rain === 'function' ? rain() : !!rain;
  // Пролог — утро понедельника; в эпизодах время берётся из сюжета/часов
  const min = state.episode === 'prologue' ? 7 * 60 + 25 : undefined;
  paintYard(scene, width, { ...opts, wet, min });
  // Неоновое свечение граффити — им «мигают» сценарии
  scene.graffiti = scene.add.image(1400, 470 - 14 - 112, 'glow').setTint(0x3df0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 0.9).setAlpha(0.22).setDepth(5);
}

// Ванная: плитка, ванна, раковина с зеркалом, унитаз, «Малютка»
export function drawBathroom(scene, width) {
  paintBathroom(scene, width);
}

// Склад, ломбард, барахолка — gfx/places/misc.js
export function drawWarehouse(scene, width) {
  paintWarehouse(scene, width);
}

export function drawPawnshop(scene, width) {
  paintPawnshop(scene, width);
}

export function drawFlea(scene, width) {
  paintFlea(scene, width);
}

export function drawGarage(scene, width) {
  paintGarage(scene, width);
}
