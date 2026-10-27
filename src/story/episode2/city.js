// Город: кафе и их работники, туалеты, драки посетителей, барбершоп, тату, одежда, прохожие и фанаты.
import { voiced } from '../../voice.js';
import { F, state, pulse, energy, now, day, addFollowers, feed, once, pickOne, weighted, markLook } from './common.js';
import { workerHello, workerMood } from './workers.js';
import { randomSpec, personTexture } from './people.js';
import { repaintMark, OUTFITS } from './look.js';

// ---------- Работники кафе ----------

const MENUS = {
  zerno: [['Американо', 150, 15], ['Капучино с котиком', 220, 18], ['Круассан', 180, 22]],
  pyshka: [['Пышки, три штуки', 120, 22], ['Чай из бака', 50, 8], ['Пышки, десять штук', 350, 40]],
  noch: [['Безалкогольный с зонтиком', 300, 10], ['Коктейль «Подвал»', 450, 5], ['Бургер', 400, 30]],
};

export async function workerTalk(ctx, w) {
  const { d, line } = ctx;
  const m = workerMood(w);
  await d.say(w.name, workerHello(w, m));
  const menu = MENUS[w.place];
  const opts = [];
  if (menu) menu.forEach(([name, price]) => opts.push([`buy:${name}`, `${name} — ${price} ₽`]));
  opts.push(['chat', 'Поболтать']);
  opts.push(['bye', 'Ничего, спасибо']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick.startsWith('buy:')) {
    const item = menu.find((x) => x[0] === pick.slice(4));
    if (state.cash < item[1]) return d.say(w.name, m <= -1 ? 'Денег нет? До свидания.' : 'Не хватает… Ну, в другой раз.');
    ctx.cash(-item[1], item[0]);
    energy(item[2]);
    ctx.time(15);
    if (item[0] === 'Коктейль «Подвал»') pulse(-1);
    return d.think(pickOne(['Горячее, сладкое — то, что надо.', 'Вкусно. Даже слишком для этого района.', 'Сижу у окна. Город за стеклом идёт мимо, как клип без звука.']));
  }
  if (pick === 'chat') {
    ctx.time(10);
    await d.say(w.name, w.quirk);
    // Иногда из болтовни получается строчка
    if (once(`worker_line_${w.id}`) && Math.random() < 0.35) {
      line({ id: `e2_w_${w.id}`, text: pickOne(['Каждая чашка — маленькая вечность, пока не остынет', 'Пудра на пышках — как снег на кладбище', 'Бар — это исповедь, где платишь после', 'Ночью в кафе слышно, как остывают чашки']), tag: 'street' });
    }
  }
}

// ---------- Посетители: случайные реплики и драки ----------

export function visitorSpecs(place) {
  const n = 3 + (day().length + place.length) % 2;
  return Array.from({ length: n }, (_, i) => ({ seed: `${place}_v${i}_${day()}_${Math.floor(now() / 180)}`, i }));
}

export async function visitorTalk(ctx) {
  const { d } = ctx;
  const fans = state.social.followers.ritm + state.social.followers.kadr;
  const kind = weighted([['normal', 6], ['fan', fans > 300 ? 3 : fans > 120 ? 1 : 0], ['hater', state.pulse < 40 ? 3 : 1]]);
  if (kind === 'fan') {
    await d.say('Посетитель', 'Подожди… Ты же Тень? Из «Подвала»? Можно сторис с тобой? Пожалуйста!');
    const c = await d.choose(['[Сфоткаться]', '«Не сейчас.»']);
    if (c === 0) {
      ctx.sfx('shutter');
      addFollowers('kadr', 12, 'сторис с фанатом');
      pulse(1);
      return d.say('Посетитель', 'Аааа! Спасибо! Я всем покажу!');
    }
    return d.say('Посетитель', 'Ой… ну ладно. Звёзды, понятно.');
  }
  if (kind === 'hater') {
    await d.say('Посетитель', pickOne(['О, подвальный клоун. Кид Платина про тебя писал.', 'Это ты тот «вопросительный знак»? Ну-ну. Знак вопроса и есть.', 'Рэп умер. Ты — подтверждение.']));
    const c = await d.choose(['[Промолчать]', '«Приходи на следующий «Подвал». Скажешь в лицо.»']);
    if (c === 1) {
      pulse(1);
      return d.say('Посетитель', '…Может, и приду. Чего уставился.');
    }
    return;
  }
  await d.say('Посетитель', pickOne([
    'Тут вай-фай есть? Пароль «пышка»? Серьёзно?',
    'Я тут каждый день. Это мой офис. И мой дом. И моя исповедальня.',
    'Слышал, в «Подвале» вчера кто-то отжёг? Не знаешь кто?',
    'Не садись туда — там Стас сидит. Он ругается в децибелах.',
    'Дочка у меня рэп слушает. Я не понимаю. Но слушаю с ней.',
  ]));
}

// Драка посетителей: вмешаться / снять / не лезть
export async function cafeFight(ctx) {
  const { d, fx, sfx } = ctx;
  await d.think('За соседним столиком двое вскакивают. Стул падает. «Ты чё сказал?!» — «Что слышал!»');
  sfx('crash');
  fx.shake(200, 0.006);
  const c = await d.choose(['[Вмешаться: «Мужики, тихо!»]', '[Снять на телефон]', '[Не лезть]'], { timer: 7, timeoutIndex: 2 });
  if (c === 0) {
    if (Math.random() < 0.4) {
      sfx('punch');
      energy(-15);
      fx.shake(250, 0.012);
      await d.think('Прилетает в плечо. Не мне предназначалось, но досталось мне. Зато они остыли.');
    } else {
      await d.think('Оба смотрят на меня. Потом друг на друга. Потом садятся. Работник за стойкой показывает мне большой палец.');
    }
    pulse(3);
    return;
  }
  if (c === 1) {
    sfx('shutter');
    addFollowers('ritm', 45, 'видео драки в кафе');
    pulse(-2);
    feed('random_user17', 'видос с дракой в кафе — жесть. снял какой-то Тень');
    return d.think('Сорок секунд позора в 4К. Ритм любит такое. Я — не очень.');
  }
  await d.think('Смотрю в чашку. Через минуту всё затихает. Город сам разбирается.');
}

// Туалет в кафе: надписи и подслушанные разговоры
const WC_TALKS = [
  ['Голос за стенкой', 'Он сказал, что перезвонит. Это было в мае.'],
  ['Голос за стенкой', 'Я ей говорю — давай уедем. А она — куда? И правда, куда.'],
  ['Голос за стенкой', 'Если Граф узнает про Портовую — нам всем конец.'],
  ['Голос за стенкой', 'Мама думает, я на работе. А я в туалете кафе плачу. Работа такая.'],
];

export async function cafeWc(ctx) {
  const { d, line } = ctx;
  const key = `wc_${F.e2WcFrom}_${day()}`;
  if (!once(key)) return d.think('Зеркало, кафель, надписи. Всё как было.');
  const t = WC_TALKS[(F.e2WcCount = ((F.e2WcCount || 0) + 1)) % WC_TALKS.length];
  await d.think('Кафель, мигающая лампа, зеркало в отпечатках. На стене маркером: «ЗДЕСЬ БЫЛА ЖИЗНЬ».');
  await d.say(t[0], t[1]);
  if (t[1].includes('Граф')) F.e2HeardGraf = true;
  line({ id: `e2_wc_${F.e2WcFrom}`, text: pickOne(['Здесь была жизнь — написано в туалете кафе', 'Чужие слёзы за кафельной стенкой', 'Зеркало в отпечатках помнит всех, кто врал себе']), tag: 'pain' });
}

// ---------- Барбершоп «Опасная бритва» ----------

const HAIRCUTS = [
  ['buzz', 'Под ноль', 800],
  ['undercut', 'Андеркат', 1200],
  ['curls', 'Кудри как у Ромы', 1500],
  ['bleach', 'Осветлить кончики', 2000],
];

const BARBER = voiced('Хачик', {
  hello: 'Заходи, дорогой! «Опасная бритва» — открытие недели. Первая стрижка со скидкой. Вторая — тоже, если расскажешь сплетню.',
  gossip: 'Тут вчера парень в сером свитшоте сидел. Дреды. Всё повторял последнее слово. Последнее. Я чуть не порезал его от смеха.',
  gossip2: 'Рей твой приходил. Просил «как у Эминема». Я сделал как у Рея. Он не заметил.',
});

export async function barberTalk(ctx) {
  const { d, fx, sfx } = ctx;
  if (once('barber_hello')) await d.say('Хачик', BARBER.hello);
  const opts = HAIRCUTS.map(([id, name, price]) => [id, `${name} — ${price} ₽ (1 час)`]);
  opts.push(['gossip', '«Что нового в районе?»']);
  opts.push(['bye', '«Я так. Посмотреть.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'bye') return;
  if (pick === 'gossip') return d.say('Хачик', F.e2BarberGossip ? BARBER.gossip2 : ((F.e2BarberGossip = true), BARBER.gossip));
  const cut = HAIRCUTS.find((h) => h[0] === pick);
  if (state.cash < cut[2]) return d.say('Хачик', 'Дорогой, денег нет — красоты нет. Приходи богатым. Или хотя бы с чаевыми.');
  ctx.cash(-cut[2], `стрижка: ${cut[1]}`);
  sfx('scissors');
  ctx.time(60);
  fx.dust(ctx.scene.player.x, 300, 80);
  state.look ||= {};
  F.lookHair = pick;
  markLook(1);
  repaintMark(ctx.scene);
  await d.think('Зеркало. Хачик крутит кресло. «Ну?» Я… другой. Тот же — но другой.');
  if (pick === 'bleach') F.e2Bleach = true;
}

// ---------- Тату «Чернила» ----------

export async function tattooTalk(ctx) {
  const { d, sfx, fx } = ctx;
  if (once('tattoo_hello')) await d.say('Ника', 'Открытие! Сегодня всё со скидкой, кроме лица. Лицо — по полной. Что бьём?');
  const opts = [];
  if (!F.lookPiercing) opts.push(['pierce', 'Пирсинг носа — 2 500 ₽ (30 мин)']);
  if (!F.lookTattoo) opts.push(['tattoo', 'Маленькое тату «ТЕНЬ» на кисти — 5 000 ₽ (2 часа)']);
  opts.push(['bye', '«Я подумаю.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'bye') return d.say('Ника', 'Думай. Только кожа — она одна. Шучу. Их две. Первая и вторая.');
  const price = pick === 'pierce' ? 2500 : 5000;
  if (state.cash < price) return d.say('Ника', 'Без денег — только переводилки. Хочешь переводилку с котиком?');
  ctx.cash(-price, pick === 'pierce' ? 'пирсинг' : 'тату');
  sfx('needle');
  fx.shake(100, 0.003);
  ctx.time(pick === 'pierce' ? 30 : 120);
  markLook(pick === 'pierce' ? 1 : 2);
  if (pick === 'pierce') F.lookPiercing = true;
  else F.lookTattoo = true;
  repaintMark(ctx.scene);
  await d.think(pick === 'pierce' ? 'Щелчок — и в носу маленькое кольцо. Мама это заметит. Мама это заметит ещё с лестницы.' : 'Два часа жужжания. На кисти — «ТЕНЬ». Теперь не сотрёшь, даже если захочешь.');
  ctx.line({ id: `e2_${pick}`, text: pick === 'pierce' ? 'Кольцо в носу — как точка в конце старой жизни' : 'Своё имя под кожей — уже не стереть', tag: 'dream' });
}

// ---------- «Вторая кожа» — одежда ----------


export async function clothesTalk(ctx, w) {
  const { d, sfx } = ctx;
  await d.say(w.name, workerHello(w, workerMood(w)));
  await d.say(w.name, w.quirk);
  const opts = OUTFITS.filter((o) => F.lookOutfit !== o[0]).map((o) => [o[0], `${o[1]} — ${o[2].toLocaleString('ru-RU')} ₽`]);
  if (F.lookOutfit) opts.push(['default', 'Вернуть чёрное худи (бесплатно)']);
  opts.push(['bye', '«Просто смотрю.»']);
  const c = await d.choose(opts.map((o) => o[1]));
  const pick = opts[c][0];
  if (pick === 'bye') return;
  if (pick === 'default') {
    F.lookOutfit = null;
    repaintMark(ctx.scene);
    return d.think('Моё худи. Как домой вернулся.');
  }
  const o = OUTFITS.find((x) => x[0] === pick);
  if (state.cash < o[2]) return d.say(w.name, 'Не хватает. Могу отложить. Навсегда.');
  ctx.cash(-o[2], o[1]);
  sfx('paper');
  ctx.time(20);
  F.lookOutfit = pick;
  if (!F[`look_${pick}`]) {
    F[`look_${pick}`] = true;
    markLook(pick === 'leather' ? 2 : 1);
  }
  repaintMark(ctx.scene);
  if (pick === 'leopard') {
    pulse(-2);
    await d.think('В зеркале — почти Рей. Только без очков. И без воронки. Пока.');
  } else {
    await d.think('Примерочная, зеркало, свет как в морге. Но мне нравится. Новый я.');
  }
}

// ---------- Прохожие на улицах ----------

// slots — свободные места между дверями, чтобы прохожий не загораживал вход
export function streetPeople(scene, place, slots) {
  return slots.map((x, i) => {
    const seed = `${place}_${day()}_${Math.floor(now() / 120)}_${i}`;
    const key = personTexture(scene, randomSpec(seed));
    return { id: `pass_${i}`, name: 'Прохожий', sprite: key, x, flip: i % 2 === 0, label: 'Заговорить', talk: visitorTalk, cost: 5 };
  });
}

// Пролетают мимо, не останавливаются (атмосфера)
export function ambientWalkers(scene, width, n = 3) {
  for (let i = 0; i < n; i++) {
    scene.time.delayedCall(800 + i * 2600, function walk() {
      if (!scene.scene.isActive()) return;
      const key = personTexture(scene, randomSpec(`amb_${Math.random()}`));
      const dir = Math.random() < 0.5 ? 1 : -1;
      const s = scene.add.sprite(dir > 0 ? -60 : width + 60, 470, `${key}_0`).setOrigin(0.5, 1).setDepth(9).setAlpha(0.9).setScale(0.92);
      s.setFlipX(dir < 0).play(`${key}_walk`);
      scene.tweens.add({
        targets: s, x: dir > 0 ? width + 60 : -60, duration: (width + 120) * (8 + Math.random() * 4),
        onComplete: () => {
          s.destroy();
          scene.time.delayedCall(2000 + Math.random() * 5000, walk);
        },
      });
    });
  }
}

