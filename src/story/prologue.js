// ПРОЛОГ «ГАРАЖ»: квартира → двор → гараж Дэна.
// Сценарии — async-функции. d.say / d.think / d.choose, line(...) выдаёт строчку для трека.
// У каждого предмета есть звук (sfx) и визуальный отклик (fx).
import Phaser from 'phaser';
import { state } from '../state.js';
import { drawApartment, drawYard, drawGarage } from './backdrops.js';
import { BATHROOM } from './shared.js';
import { BEAT, playMusic, currentMusic, stopMusic, sfx } from '../audio.js';

const F = state.flags;

// ---------- Крупные планы ----------

// Прямоугольная маска в экранных координатах
function clip(s, x, y, w, h) {
  const g = s.make.graphics({}, false).setScrollFactor(0);
  g.fillStyle(0xffffff).fillRect(x, y, w, h);
  return g.createGeometryMask();
}

// Вид из окна: рассвет над панельками, птицы, лучи солнца
export function windowView(s, c) {
  const x0 = 180;
  const y0 = 30;
  const w = 600;
  const h = 290;
  const g = s.add.graphics();
  const sky = [0x2a1f4a, 0x4a2a5a, 0x7a3a6a, 0xb04a6a, 0xe06a5a, 0xff9a5a];
  sky.forEach((col, i) => g.fillStyle(col, 1).fillRect(x0, y0 + i * (h / sky.length), w, h / sky.length + 1));
  const sun = s.add.circle(x0 + w * 0.62, y0 + h + 30, 40, 0xffd88a);
  const glow = s.add.circle(sun.x, sun.y, 110, 0xffb060, 0.25).setBlendMode(Phaser.BlendModes.ADD);
  const rays = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i + 0.5) * (Math.PI / 7);
    rays.fillStyle(0xffd88a, 0.07).fillTriangle(0, 0, Math.cos(a - 0.07) * 600, Math.sin(a - 0.07) * 600, Math.cos(a + 0.07) * 600, Math.sin(a + 0.07) * 600);
  }
  rays.setPosition(sun.x, y0 + h - 130).setAlpha(0);
  // Силуэты панелек с окнами
  const city = s.add.graphics();
  let bx = x0;
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (bx < x0 + w) {
    const bw = 70 + rnd() * 60;
    const bh = 40 + rnd() * 90;
    city.fillStyle(0x1e1830, 1).fillRect(bx, y0 + h - bh, bw, bh);
    for (let wy = y0 + h - bh + 12; wy < y0 + h - 10; wy += 18) {
      for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (rnd() > 0.82) city.fillStyle(0xffd27a, 1).fillRect(wx, wy, 7, 9);
    }
    bx += bw + 6;
  }
  // Рама окна поверх
  const frame = s.add.graphics();
  frame.lineStyle(18, 0xd8d4e0, 1).strokeRect(x0, y0, w, h);
  frame.fillStyle(0xd8d4e0, 1).fillRect(x0 + w / 2 - 6, y0, 12, h).fillRect(x0, y0 + h * 0.45, w, 12);
  frame.fillStyle(0xbab4c8, 1).fillRect(x0 - 30, y0 + h + 8, w + 60, 16);
  c.add([g, glow, sun, rays, city]);

  // Птицы пролетают через окно
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const b = s.add.sprite(x0 - 20 - i * 60, y0 + 40 + Math.random() * 90, 'bird_0').play('bird_fly');
    birds.push(b);
    c.add(b);
    s.tweens.add({ targets: b, x: x0 + w + 40, y: `-=${30 + Math.random() * 40}`, duration: 4200 + i * 500, delay: i * 350, repeat: -1 });
  }
  // Пылинки в луче света
  const dust = s.add.particles(0, 0, 'px', {
    x: { min: x0, max: x0 + w }, y: { min: y0, max: y0 + h }, lifespan: 3000, speedY: { min: -8, max: 8 }, speedX: { min: 4, max: 14 },
    alpha: { start: 0, end: 0.6, ease: 'Sine.inOut' }, scale: 0.5, tint: 0xffe8b0, frequency: 80, blendMode: 'ADD',
  });
  const m = clip(s, x0, y0, w, h);
  [g, glow, sun, rays, city, dust, ...birds].forEach((o) => o.setMask(m));
  c.add([dust, frame]);

  s.tweens.add({ targets: [sun, glow], y: y0 + h - 130, duration: 3500, ease: 'Sine.out' });
  s.tweens.add({ targets: rays, alpha: 1, duration: 2500, delay: 1200 });
  s.tweens.add({ targets: rays, angle: 4, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  sfx('birds');
  const chirps = s.time.addEvent({ delay: 1300, loop: true, callback: () => sfx('birds') });
  c.onHide = () => chirps.remove();
}

// Афиша «Арены» крупно, с бликом света
export function posterView(s, c) {
  const img = s.add.image(480, 180, 'poster_arena').setScale(0.95).setAngle(-2);
  // Блик света скользит по афише
  const shine = s.add.rectangle(330, 180, 40, 330, 0xffffff, 0.12).setAngle(12).setBlendMode(Phaser.BlendModes.ADD);
  shine.setMask(clip(s, 366, 18, 228, 323));
  c.add([img, shine]);
  s.tweens.add({ targets: shine, x: 620, duration: 1600, delay: 300, repeat: -1, repeatDelay: 1500 });
  sfx('paper');
}

// ---------- Локации ----------

export const LOCATIONS = {
  bathroom: BATHROOM,
  apartment: {
    title: 'ПОНЕДЕЛЬНИК. 6:40',
    width: 1900,
    spawnX: 200,
    ambience: 'flat',
    steps: 'stepWood',
    draw: (s) => drawApartment(s, 1900),
    doors: [
      { id: 'd1', x: 775, w: 58, h: 206, auto: true, interior: true, inside: 0x4a4f66, insideFloor: 0x4a3a3a },
      { id: 'd2', x: 1375, w: 58, h: 206, auto: true, interior: true, inside: 0x34463f },
      { id: 'bath', x: 1703, w: 80, h: 200, color: 0xd8d0c0, interior: true, inside: 0x8ab4c8, insideFloor: 0x5a6a78 },
      { id: 'front', x: 1840, w: 94, h: 210, color: 0x6a3a2a },
    ],

    async onEnter({ d }) {
      if (F.wokeUp) return;
      F.wokeUp = true;
      await d.think('Шесть сорок. Будильник не нужен — за стенкой мама гремит кастрюлями.');
      await d.think('Опять собирается на две смены.');
      await d.say('', '← → или A / D — ходить.   E — осмотреть / поговорить.   Q — тетрадь.   P — телефон.', '#ffd166');
    },

    npcs: [
      {
        id: 'mom', name: 'Мама', sprite: 'mom', x: 1010, flip: true,
        when: () => !F.momLeft,
        async talk({ d, line, npc, walk, wait, door, scene }) {
          const mom = npc('mom');
          await d.say('Мама', 'Проснулся? Гречка на плите, ещё тёплая.');
          await d.say('Мама', 'Я сегодня на две смены. Вернусь поздно — не жди.');
          await d.say('Марк', 'Опять две?');
          await d.say('Мама', 'За квартиру платить надо, Марк. За свет. За... ну, ты сам знаешь.');
          await d.say('Мама', 'Ты опять до ночи в гараже сидел? Тётя Люба говорит, на склад берут. Может, сходишь?');

          const c = await d.choose(
            ['Мам, я скоро всё изменю. Обещаю.', 'Отстань. У меня свои дела.', '[Промолчать]'],
            { timer: 8, timeoutIndex: 2 },
          );
          if (c === 0) {
            F.momTalk = 'promise';
            state.stats.honesty += 1;
            state.rel.mom += 1;
            await d.say('Мама', 'Весь в отца. Он тоже всё обещал...');
            await d.say('Мама', 'Ладно. Ты главное поешь.');
            await d.think('Отец обещал — и ушёл. Я не уйду.');
            line({ id: 'promise', text: 'Я не стану тем, кто обещал и ушёл', tag: 'pain' });
          } else if (c === 1) {
            F.momTalk = 'rude';
            state.rel.mom -= 1;
            scene.fx.shake(150, 0.004);
            await d.say('Мама', '...Хорошо.');
            await d.think('Зачем я так. Она же не со зла.');
            line({ id: 'glass', text: 'Слова как стекло — режут тех, кто ближе', tag: 'pain' });
          } else {
            F.momTalk = 'silent';
            await d.think('Мама вздыхает и отворачивается к плите.');
            await d.say('Мама', 'Ладно. Потом поговорим.');
            await d.think('«Потом». У нас всегда «потом».');
            line({ id: 'later', text: 'У нас всегда «потом», а потом — никогда', tag: 'pain' });
          }
          await d.say('Мама', 'И это... Дэн вчера заходил. Искал тебя. Сказал — в гараже будет.');
          d.close();
          F.momLeft = true;
          await walk(mom, 1790, 130);
          door('front', true);
          await walk(mom, 1850, 100);
          scene.tweens.add({ targets: mom, alpha: 0, duration: 250 });
          await wait(450);
          mom.setVisible(false);
          door('front', false);
        },
      },
    ],

    items: [
      {
        x: 200, label: 'Кровать', sfx: 'bed',
        async use({ d, fx }) {
          fx.dust(200, 400, 220);
          await d.think('Матрас продавлен ровно по форме меня. Двадцать два года — и всё в этой комнате.');
        },
      },
      {
        x: 240, y: 110, label: 'Плакат', range: 40, sfx: 'paper',
        async use({ d, fx }) {
          fx.flash(240, 195, 100, 130, 0xff3d8a, 0.4);
          await d.think('Плакат с концерта, на который я так и не попал. Билет стоил как мамина зарплата за неделю.');
        },
      },
      {
        x: 480, label: 'Окно', sfx: 'whoosh',
        async use({ d, line, closeup }) {
          closeup(windowView);
          await d.think('Панельки до горизонта. Солнце вылезает из-за трубы ТЭЦ, птицы орут как на концерте.');
          await d.think('А там, за всем этим, центр — стекло и огни. Отсюда он похож на другую планету.');
          line({ id: 'window', text: 'Центр отсюда — как другая планета', tag: 'dream' });
        },
      },
      {
        x: 630, label: 'Тетрадь', sfx: 'page',
        async use({ d, line, fx }) {
          fx.burst(630, 392, { color: 0xf1ead8, count: 10, speed: 120 });
          await d.think('Моя тетрадь. Всё, что цепляет, я записываю сюда. Потом из этого получаются треки.');
          await d.say('', 'Строчки — твой главный ресурс. Осматривай мир и разговаривай с людьми, чтобы их собирать. Q — открыть тетрадь.', '#ffd166');
          line({ id: 'notebook', text: 'Прячу тетрадь под матрас, будто стихи — это стыдно', tag: 'pain' });
        },
      },
      {
        x: 872, label: 'Холодильник', sfx: 'fridge',
        async use({ d, fx }) {
          fx.flash(872, 380, 84, 180, 0xbfe8ff, 0.7, 900);
          await d.think('Полбатона, кетчуп и мамин контейнер с надписью «НЕ ТРОГАТЬ». Богато живём.');
        },
      },
      {
        x: 985, label: 'Плита', sfx: 'gas', when: () => F.momLeft,
        async use({ d, fx, wait }) {
          await wait(350);
          fx.flash(985, 388, 70, 14, 0x4a8aff, 0.9, 700);
          fx.steam(985, 356);
          if (F.ate) return d.think('Кастрюля пустая. Я съел всё.');
          F.ate = true;
          await d.think('Гречка. Мама всегда оставляет мне больше, чем себе.');
        },
      },
      {
        x: 1190, label: 'Бумаги на столе', sfx: 'paper',
        async use({ d, line, fx, sfx: play }) {
          play('coins', 0.3);
          fx.burst(1226, 398, { color: 0xffd166, count: 8, speed: 140 });
          await d.think('Квитанции. «Задолженность». «Последнее предупреждение». Рядом — горстка мелочи.');
          await d.think('Она пересчитывала её перед сном. Я слышал.');
          line({ id: 'bills', text: 'Мама считает мелочь в кошельке', tag: 'pain' });
        },
      },
      {
        x: 1480, label: 'Пальто', sfx: 'thump',
        async use({ d, fx }) {
          fx.dust(1460, 300, 50);
          await d.think('Мамино пальто. Десятая зима. Карманы зашиты так аккуратно, что почти не видно.');
        },
      },
      {
        x: 1605, label: 'Зеркало', sfx: 'mirror',
        async use({ d, line, fx }) {
          fx.flash(1605, 235, 58, 118, 0xc8e0ff, 0.7, 700);
          await d.think('Парень в чёрном худи. Капюшон, синяки под глазами. Тень.');
          await d.think('Иногда я сам себя не узнаю.');
          line({ id: 'mirror', text: 'Смотрю в зеркало — а там только тень', tag: 'pain' });
        },
      },
      {
        x: 1703, label: 'Ванная', sfx: 'click',
        async use({ door, wait, go }) {
          door('bath', true);
          await wait(300);
          go('bathroom', 120);
        },
      },
      {
        x: 1840, label: 'Выйти во двор', sfx: 'click',
        async use({ d, go, door, wait, sfx: play }) {
          if (!F.momLeft) {
            play('deny');
            return d.think('Сначала надо поговорить с мамой. Она скоро уходит.');
          }
          door('front', true);
          await wait(350);
          go('yard', 155);
        },
      },
    ],
  },

  yard: {
    title: 'ДВОР. УЛ. ЗАВОДСКАЯ, 12',
    width: 2200,
    spawnX: 155,
    rain: true,
    ambience: 'rain',
    steps: 'stepWet',
    draw: (s) => drawYard(s, 2200),
    lamps: [
      { x: 155, y: 238, r: 110, color: 0xfff0b0, cone: true },
      { x: 506, y: 210, r: 120, color: 0xffe0a0, cone: true, flicker: true },
      { x: 1346, y: 210, r: 120, color: 0xffe0a0, cone: true },
      { x: 2017, y: 440, r: 110, color: 0xffd27a },
    ],
    critters: [{ type: 'pigeons', x: 560, n: 5 }, { type: 'cat', x: 1700, y: 244, depth: 4 }],
    photoSpots: [
      { id: 'p_graffiti', x: 1400, line: { id: 'photo_tag', text: 'Сфоткал своё имя на стене, чтобы не забыть, что оно моё', tag: 'street' } },
      { id: 'p_swings', x: 760, text: 'Качели под дождём. Скрипят, как старая пластинка.' },
    ],
    doors: [{ id: 'entrance', x: 155, w: 126, h: 208, color: 0x3a4658, metal: false }],

    async onEnter({ d, door, wait }) {
      if (F.yardSeen) return;
      F.yardSeen = true;
      door('entrance', true);
      await wait(400);
      door('entrance', false);
      await d.think('Моросит. Двор как всегда: качели, лужи и гаражи до самого забора.');
      await d.think('Гараж Дэна — семнадцатый, в самом конце.');
    },

    npcs: [
      {
        id: 'kid', name: 'Пацан', sprite: 'kid', x: 760,
        async talk({ d, line, sfx: play, fx }) {
          if (F.kidTalked) return d.say('Пацан', 'Тень, а запиши трек про наш двор! Чтоб все знали!');
          F.kidTalked = true;
          play('ball');
          await d.say('Пацан', 'Э! Ты же Тень? Который в гараже по ночам орёт?');
          const c = await d.choose(['Это не ор. Это рэп.', 'Иди домой, мелкий, дождь.', 'Хочешь, зачитаю?']);
          if (c === 0) {
            await d.say('Пацан', 'Ну да, я знаю. Мы с пацанами твой куплет про лифт наизусть знаем!');
          } else if (c === 1) {
            await d.say('Пацан', 'Сам иди! ...А куплет про лифт всё равно крутой.');
          } else {
            state.stats.fame += 1;
            fx.burst(760, 330, { color: 0x8ae6a0, count: 14, tex: 'spark' });
            await d.think('Зачитываю пару строк. Пацан подпевает — он знает слова лучше меня.');
            await d.say('Пацан', 'Вааа! Я пацанам расскажу, что ты мне лично читал!');
          }
          line({ id: 'kids', text: 'Пацаны во дворе знают мои куплеты наизусть', tag: 'street' });
        },
      },
      {
        id: 'granny', name: 'Баба Валя', sprite: 'granny', x: 1160, flip: true,
        async talk({ d, line }) {
          if (F.grannyTalked) return d.say('Баба Валя', 'Иди-иди, артист. Шапку надень только.');
          F.grannyTalked = true;
          await d.say('Баба Валя', 'Марик! Опять в свой гараж? Всё поёшь?');
          await d.say('Баба Валя', 'Я мамке твоей говорю: хороший мальчик, только непутёвый.');
          const c = await d.choose(['Я не пою, баб Валь. Я читаю.', 'Когда-нибудь вы меня по телевизору увидите.', 'Ага. Хорошего дня.']);
          if (c === 1) {
            await d.say('Баба Валя', 'Ой, по телевизору! Ты только не зазнавайся там. А то все, кто в телевизоре, двор свой забывают.');
          } else if (c === 0) {
            await d.say('Баба Валя', 'Читает он... Я в твои годы на заводе по две смены. Ну, может, и правильно, что не на заводе.');
          } else {
            await d.say('Баба Валя', 'И тебе, милок.');
          }
          await d.say('Баба Валя', 'Двор этот раньше живой был. Песни под гитару, свадьбы во дворе... А сейчас — одни гаражи.');
          line({ id: 'granny', text: 'Этот двор раньше пел, а теперь молчит', tag: 'street' });
        },
      },
    ],

    items: [
      {
        x: 155, label: 'Домой', sfx: 'click',
        async use({ go, door, wait }) {
          door('entrance', true);
          await wait(350);
          go('apartment', 1840, 'left');
        },
      },
      {
        x: 1035, label: 'Лавочка', range: 50, sfx: 'wood',
        async use({ d, fx }) {
          fx.burst(1035, 410, { color: 0x9ab0ff, count: 12, speed: 90 });
          await d.think('На этой лавочке я впервые читал Дэну свои тексты. Нам было по четырнадцать.');
        },
      },
      {
        x: 1400, label: 'Граффити «ТЕНЬ»', sfx: 'spray',
        async use({ d, line, fx, scene, wait }) {
          await wait(300);
          fx.flicker(scene.graffiti, 8);
          fx.burst(1400, 370, { color: 0x3df0ff, count: 20, tex: 'spark', gravity: 80 });
          fx.burst(1400, 370, { color: 0xff3d8a, count: 14, tex: 'spark', gravity: 80 });
          await d.think('Мой тег. Нарисовал в пятнадцать, баллончиком, который стащил из строймага.');
          await d.think('Его до сих пор никто не закрасил.');
          line({ id: 'tag', text: 'Моё имя на стене — единственное, что здесь моё', tag: 'street' });
        },
      },
      {
        x: 2017, label: 'Гараж №17', sfx: 'gate',
        async use({ go, fx, wait }) {
          fx.shake(300, 0.004);
          fx.flash(2017, 380, 134, 180, 0xffd27a, 0.4, 500);
          await wait(300);
          go('garage', 200);
        },
      },
    ],
  },

  garage: {
    title: 'ГАРАЖ №17',
    width: 1100,
    spawnX: 200,
    ambience: 'garage',
    steps: 'stepConcrete',
    draw: (s) => drawGarage(s, 1100),
    lamps: [{ x: 720, y: 72, r: 150, color: 0xffe8a8, alpha: 0.4 }, { x: 730, y: 371, r: 50, color: 0x3df0ff, alpha: 0.35 }],
    doors: [{ id: 'gate', x: 69, w: 122, h: 228, metal: true, color: 0x4a505c }],

    async onEnter(ctx) {
      if (F.trackDone && !F.prologueDone) await afterRecording(ctx);
    },

    npcs: [
      {
        id: 'dan', name: 'Дэн', sprite: 'dan', x: 880, flip: true,
        async talk(ctx) {
          const { d } = ctx;
          if (F.prologueDone) return d.say('Дэн', 'Иди отдыхай, брат. В пятницу порвём «Подвал».');
          await danIntro(ctx);
        },
      },
    ],

    items: [
      {
        x: 69, label: 'Выйти', sfx: 'click',
        async use({ go, door, wait }) {
          door('gate', true);
          await wait(450);
          stopMusic(0.6);
          if (F.prologueDone) go('End');
          else go('yard', 2017, 'left');
        },
      },
      {
        x: 300, label: 'Ковёр', sfx: 'thump',
        async use({ d, fx }) {
          fx.dust(300, 210, 260);
          fx.shake(120, 0.003);
          await d.think('Ковёр от Дэновой бабушки. Лучшая звукоизоляция в городе. И самая красивая.');
        },
      },
      {
        x: 520, label: 'Афиша «Арены»', sfx: 'paper',
        async use({ d, line, closeup }) {
          closeup(posterView);
          await d.think('Афиша «Арены». Двадцать тысяч мест. Дэн повесил её в первый день, как мы сюда въехали.');
          await d.think('«Чтобы видеть цель», — сказал он.');
          line({ id: 'arena', text: 'Однажды я соберу Арену', tag: 'dream' });
        },
      },
      {
        x: 730, label: 'Комп Дэна', sfx: 'keys',
        async use({ d, pc, fx, sfx: play }) {
          fx.flash(730, 371, 70, 36, 0x3df0ff, 0.9, 500);
          if (!F.danMet) {
            play('deny');
            return d.say('Дэн', 'Э-э, руки от компа! Там проекты. Сначала поздоровайся хоть.');
          }
          await pc();
        },
      },
      {
        x: 1029, label: 'Микрофон', sfx: 'feedback',
        async use({ d, fx, wait }) {
          await wait(500);
          fx.burst(1029, 316, { color: 0x3df0ff, count: 10, tex: 'spark', speed: 220 });
          fx.shake(120, 0.003);
          await d.think('Микрофон за полторы тысячи с рук. Держится на изоленте и честном слове.');
          await d.think('Если он сдохнет — нам конец. На новый денег нет.');
          F.micNoticed = true;
        },
      },
    ],
  },
};

// ---------- Дэн и бит ----------

async function danIntro({ d, line, go, fx, wait, scene, sfx: play }) {
  if (!F.danMet) {
    F.danMet = true;
    await d.say('Дэн', 'О, живой! Я уж думал, тебя мама на склад сдала.');
    const c = await d.choose(['Почти сдала.', 'Не начинай, а.', 'Ты вообще спал?']);
    if (c === 0) await d.say('Дэн', 'Ха. Моя тоже каждый день: «Даня, иди в такси». Будто такси — это мечта.');
    else if (c === 1) await d.say('Дэн', 'Всё-всё, молчу. Я ж по-братски.');
    else {
      state.rel.dan += 1;
      await d.say('Дэн', 'Не-а. И не зря. Щас поймёшь.');
    }
    await d.say('Дэн', 'Короче. Я всю ночь сидел — собрал бит. Сто шестьдесят четыре удара, ми минор. Слушай.');
    d.close();
    play('click');
    await playMusic(BEAT.url, { offset: 0, loop: true, loopStart: BEAT.drop, volume: 0.9 });
    fx.flash(730, 371, 70, 36, 0x3df0ff, 1, 600);
    await d.think('Дэн жмёт пробел. Из колонок ползёт тягучее интро, будто город просыпается.');
    await d.say('Дэн', 'Подожди... Сейчас зайдёт.');
    d.close();
    const m = currentMusic();
    const left = m ? BEAT.drop - m.position() : 0;
    if (left > 0) await wait(left * 1000);
    // Заходит бочка
    fx.screenFlash(0xff3d8a, 350);
    fx.shake(500, 0.012);
    fx.dust(scene.player.x, 10, 900);
    await wait(900);
    await d.think('И тут падает бочка. Гараж вздрагивает, с потолка сыплется пыль.');
    await d.say('Дэн', 'Ну? Качает?');
    const c2 = await d.choose(['Брат... это лучшее, что ты делал.', 'Нормально. Можно жёстче.', '[Молча качать головой в такт]'], { timer: 7, timeoutIndex: 2 });
    if (c2 === 0) {
      state.rel.dan += 1;
      await d.say('Дэн', 'Я знал! Я ЗНАЛ, что зайдёт!');
    } else if (c2 === 1) {
      F.danCritic = true;
      await d.say('Дэн', 'Жёстче... Ладно, подкручу потом. Но основа-то огонь, признай.');
    } else {
      state.rel.dan += 1;
      await d.say('Дэн', 'Вот! Вот эта голова — лучший ответ. Значит, качает.');
    }
    line({ id: 'garage', text: 'Гараж вместо студии, мечты вместо денег', tag: 'dream' });
  }

  await d.say('Дэн', 'Теперь нужен текст. Открывай тетрадь — у тебя ж там вся жизнь.');
  if (state.lines.length < 4) {
    await d.say('Дэн', 'Чего так мало? Ты по сторонам вообще смотришь? Ну ладно, вот, держи — сам вчера придумал.');
    line({ id: 'dan_line', text: 'Из подвала в небо — это не мечта, а план', tag: 'dream' });
  }
  await d.say('Дэн', 'Выбираешь три строчки — и к микрофону. Зачитаешь вживую, я запишу. Как в караоке, только по-взрослому.');
  stopMusic(0.6);
  go('Studio');
}

const TRACK_REACTIONS = {
  street: 'Это про нас, брат. Про двор, про всех наших. Такое пацаны будут из каждой тачки крутить.',
  pain: '...Слышь. У меня мурашки. Ты это про маму, да? Такое честно, что аж больно.',
  dream: 'Вот это заряд! Слушаешь — и хочется встать и пойти всё ломать. В хорошем смысле.',
  mixed: 'Там всё сразу — и двор, и боль, и мечта. Это как наш с тобой гараж. Это мы.',
};

async function afterRecording({ d, npc, scene, wait }) {
  const track = state.tracks[state.tracks.length - 1];
  const dan = npc('dan');
  dan.setFlipX(true);
  scene.player.setFlipX(false);
  await wait(300);
  await d.think('Последний звук бита растворяется в бетоне. Тишина. Слышно, как гудит лампочка.');
  if (track.voice) {
    if (track.score >= 70) await d.say('Дэн', 'БРАТ. Ты слышал себя? Ты прям в бит залетел. Это уже не демка — это трек!');
    else if (track.score >= 40) await d.say('Дэн', 'Неплохо! Местами плаваешь, но подача есть. К пятнице разогреешься.');
    else await d.say('Дэн', 'Ты чего шепчешь, как в библиотеке? В «Подвале» так не прокатит. Громче надо!');
  } else {
    await d.say('Дэн', 'Без голоса, конечно, пока набросок. Но слова — во!');
  }
  await d.say('Дэн', TRACK_REACTIONS[track.theme]);
  await d.say('Дэн', `«${track.title}». Так и назовём. Скинул в папку «ДЕМКИ» — захочешь переслушать, комп всегда тут.`);
  if (F.micNoticed) await d.say('Дэн', 'Микрофон, конечно, хрипит как дед. Но это даже стиль.');
  await d.say('Дэн', 'Слушай. В пятницу открытый микрофон в «Подвале». Любой может выйти и читать.');
  await d.say('Дэн', 'Пора выходить из гаража, брат. Хватит прятаться.');
  const c = await d.choose(['Я готов.', 'Рано ещё. Нас там засмеют.', '[Молча кивнуть]'], { timer: 8, timeoutIndex: 2 });
  if (c === 0) {
    F.fridayAnswer = 'ready';
    state.stats.fame += 1;
    await d.say('Дэн', 'Вот это я понимаю! Тень выходит из тени, ха!');
  } else if (c === 1) {
    F.fridayAnswer = 'afraid';
    await d.say('Дэн', 'Рано не бывает. Бывает поздно.');
    await d.say('Дэн', 'Я тебя запишу. Не придёшь — сам выйду читать твои тексты. Позорно получится.');
  } else {
    F.fridayAnswer = 'nod';
    state.rel.dan += 1;
    await d.say('Дэн', 'Без слов. Как настоящий.');
  }
  await d.think('Пятница. «Подвал». Первый настоящий выход.');
  await d.think('Если, конечно, этот микрофон доживёт до пятницы...');
  F.prologueDone = true;
  await d.say('', 'Подойди к компу Дэна, чтобы переслушать демку. Когда будешь готов — выходи из гаража.', '#ffd166');
}
