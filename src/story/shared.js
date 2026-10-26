// Локации, общие для всех эпизодов
import { drawBathroom } from './backdrops.js';

// Ванная — отдельная комната, вход из прихожей
export const BATHROOM = {
  title: 'ВАННАЯ',
  width: 1000,
  spawnX: 120,
  ambience: 'bath',
  steps: 'stepTile',
  draw: (s) => drawBathroom(s, 1000),
  doors: [{ id: 'out', x: 70, w: 80, h: 200, color: 0xd8d0c0, interior: true, inside: 0x34463f }],
  items: [
    {
      x: 70, label: 'В прихожую', sfx: 'click',
      async use({ door, wait, go }) {
        door('out', true);
        await wait(300);
        go('apartment', 1703, 'left');
      },
    },
    {
      x: 205, label: 'Стиральная машина', sfx: 'washer',
      async use({ d, fx, scene }) {
        fx.shake(500, 0.004);
        fx.burst(205, 380, { color: 0xbfe8ff, count: 12, tex: 'dot', speed: 80, gravity: 100 });
        scene.tweens.add({ targets: scene.cameras.main, scrollX: '+=3', duration: 50, yoyo: true, repeat: 5 });
        await d.think('«Малютка» прыгает по полу, как живая. Мама стирает руками, а машинка — для вида. Она её боится.');
      },
    },
    {
      x: 345, label: 'Зеркало', sfx: 'water',
      async use({ d, line, fx }) {
        fx.flash(345, 270, 82, 104, 0xffffff, 0.8, 900);
        await d.think('Зеркало запотело. Провожу ладонью — полоса, и в ней мои глаза.');
        await d.think('Стираю пар, а там всё тот же я.');
        line({ id: 'bath_mirror', text: 'Стираю пар — а там всё тот же я', tag: 'pain' });
      },
    },
    {
      x: 505, label: 'Унитаз', sfx: 'flush',
      async use({ d, fx, wait }) {
        await wait(500);
        fx.shake(600, 0.003);
        fx.burst(505, 340, { color: 0x9ad1ff, count: 10, tex: 'dot', speed: 60, gravity: 150 });
        await d.think('Бачок думает секунд пять. Как я перед ответом маме.');
      },
    },
    {
      x: 635, label: 'Полка с кремами', sfx: 'paper',
      async use({ d, fx }) {
        fx.burst(630, 230, { color: 0xff9ab8, count: 8, tex: 'spark', speed: 60, gravity: 50 });
        await d.think('Один крем на всё. Для лица, для рук, для жизни. «Детский», за девяносто рублей.');
      },
    },
    {
      x: 790, label: 'Кран', sfx: 'drip',
      async use({ d, fx }) {
        fx.burst(774, 380, { color: 0x9ad1ff, count: 6, tex: 'dot', speed: 40, gravity: 400 });
        await d.think('Кран капает третий месяц. Сантехник обещал прийти «на днях».');
        await d.think('Кап. Кап. Кап. Сто шестьдесят четыре удара в минуту, если прислушаться. Почти бит.');
      },
    },
  ],
};
