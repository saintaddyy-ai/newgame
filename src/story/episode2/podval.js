// «Подвал»: вход и флаеры Рея, Мира, гримёрка, номера, выход Марка, после шоу и выбор ночи.
import Phaser from 'phaser';
import { voiced } from '../../voice.js';
import { BEAT, playMusic, stopMusic } from '../../audio.js';
import { addContact } from '../../phone/model.js';
import { F, state, hasItem, takeItem, pulse, now, at, day, addFollowers, feed, quest, rel, relOf, once, post } from './common.js';

const FLOOR = 470;

export const podvalOpen = () => day() === 'fri' && now() >= at(19) && !F.e2PodvalDone && !F.e2MissedPodval;

// ---------- Вход ----------

export async function entranceEnter(ctx) {
  const { d } = ctx;
  if (day() !== 'fri') {
    if (once(`podval_closed_${day()}`)) await d.think('«Подвал» закрыт. На двери — свежий плакат: «Открытый микрофон — через месяц». И чьи-то следы от кед.');
    return;
  }
  if (F.e2PodvalDone) return;
  if (now() < at(18, 30)) {
    if (once('podval_early')) await d.think('Рано. Дверь закрыта, у входа никого. Только Бульдог курит и смотрит сквозь меня.');
    return;
  }
  if (once('podval_queue')) {
    F.e2PodvalArrived = true;
    if (F.e2MomAtShow === undefined) F.e2MomAtShow = relOf('mom') >= 2 || (relOf('mom') === 1 && Math.random() < 0.5);
    await d.think('Очередь до угла. Кто-то читает вслух с телефона, кто-то пьёт из бумажного пакета. Неон «ПОДВАЛ» гудит над лестницей.');
    if (hasItem('flyers') && !F.e2FlyersDone) {
      await d.think('В кармане — пачка флаеров Рея. «Сто лидов, братик». Бульдог на входе не любит, когда в очереди что-то раздают.');
      await d.say('', 'Флаеры: подходи к людям в очереди (E). Не попадайся Бульдогу на глаза — он ходит туда-сюда.', '#ffd166');
    }
  }
}

// Раздать флаер человеку в очереди
export async function giveFlyer(ctx, idx) {
  const { d, scene, sfx } = ctx;
  if (F.e2FlyersDone || !hasItem('flyers')) return d.think('Флаеров больше нет.');
  const given = F.e2Flyers || [];
  if (given.includes(idx)) return d.think('Этому уже дал.');
  // Бульдог видит, если стоит рядом и смотрит в нашу сторону
  const dog = scene.npcs.bulldog;
  const near = dog && Math.abs(dog.x - scene.player.x) < 220;
  if (near) {
    F.e2FlyersDone = true;
    F.e2FlyersCaught = true;
    takeItem('flyers');
    sfx('deny');
    await d.say('Бульдог', 'Э. Ты. Что раздаём? Дай сюда. Всё. В урну. И скажи спасибо, что не вместе с тобой.');
    pulse(-2);
    return;
  }
  F.e2Flyers = [...given, idx];
  sfx('paper');
  if (idx === 3 && !F.e2AskedChe) {
    F.e2AskedChe = true;
    await d.say('Девушка в очереди', 'О, «ЛИДОГЕН»… А есть чё? Ну, ты понял. Рей говорил, у его людей всегда есть.');
    const c = await d.choose(['Дать «толстый» флаер (+2000 ₽)', '«Только флаер. Ничего больше.»', '[Отойти]']);
    if (c === 0) {
      if (F.reyLeadgen) {
        F.soldForRey = true;
        ctx.cash(2000, '«толстый» флаер');
        pulse(-5);
        state.stats.addiction += 1;
        if (F.e2MiraHere) F.e2MiraSawFlyer = true;
        await d.think('Она забирает флаер, не глядя. Сует мне в карман купюры. Всё быстро, как в плохом сне.');
      } else {
        await d.think('У меня только обычные флаеры. Рей дал «половину воронки». Она закатывает глаза.');
      }
    } else if (c === 1) {
      state.stats.honesty += 1;
      pulse(1);
      await d.say('Девушка в очереди', 'Скучный. Ладно. Ты сегодня выступаешь? Тогда — ни пуха.');
    }
  } else {
    await d.say('Человек в очереди', ['О, Рей. Знаю его. Все знают Рея.', 'Флаер? Норм. Положу к остальным пятидесяти.', 'Это тот, который «лидогенерация»? Ха.', 'А ты сам что, тоже в воронке?'][idx % 4]);
  }
  if ((F.e2Flyers || []).length >= 6) {
    F.e2FlyersDone = true;
    takeItem('flyers');
    rel('ray', 1);
    quest('e2_flyers', { status: 'done', title: 'Сто лидов: флаеры розданы' });
    await d.think('Пачка кончилась. Сто лидов — не сто, но Рей всё равно скажет, что «конверсия есть».');
  }
}

export async function bulldogTalk(ctx) {
  const { d, go } = ctx;
  if (!podvalOpen()) {
    if (day() !== 'fri') return d.say('Бульдог', 'Закрыто. Приходи через месяц. Или никогда.');
    if (F.e2PodvalDone) return d.say('Бульдог', 'Всё, отыграли. Иди домой, звезда.');
    return d.say('Бульдог', 'Рано. В семь. Ты кто вообще? …А, вопросительный знак. Ну, жди, вопросительный.');
  }
  await d.say('Бульдог', F.e2BulldogMet ? 'Проходи, вопросительный.' : 'Имя? …Тень. Ты в списке. Вопросительным знаком. Проходи. И без глупостей.');
  F.e2BulldogMet = true;
  F.e2InPodval = true;
  go('podval', 120);
}

// Мира с камерой у входа (и потом у сцены)
export async function miraMeet(ctx) {
  const { d, line } = ctx;
  if (F.e2MiraMet) {
    if (F.e2MiraSawFlyer && once('mira_flyer')) {
      rel('mira', -2);
      return d.say('Мира', 'И давно ты Рею помогаешь? Я видела «толстый» флаер. Я всё вижу, Марк. Я фотограф.');
    }
    return d.say('Мира', relOf('mira') >= 1 ? 'Удачи. Я буду снимать. Не смотри в объектив — смотри сквозь.' : 'Ну, давай, вопросительный знак.');
  }
  F.e2MiraMet = true;
  addContact('mira', { silent: true });
  await d.think('У входа девушка с плёночным фотоаппаратом. Каре, полосатая кофта. Я её знаю. Откуда-то из прошлой жизни.');
  await d.say('Мира', 'Марк? Серьёзно? Марк Тенин? Ты же в школе стихи в тетрадке прятал. Под партой.');
  if (F.e2MiraSawFlyer) await d.say('Мира', 'А теперь, я смотрю, флаеры Рея раздаёшь. «Толстые».');
  const c = await d.choose(['«Мира? Ты на линейке фотографировала…»', '«Теперь не прячу. Придёшь послушать?»', '«Не помню тебя.»']);
  if (c === 0) {
    rel('mira', 2);
    await d.say('Мира', 'Помнишь! На линейке ты читал стих, а все смеялись. А я сфоткала. Фото до сих пор у меня.');
    line({ id: 'e2_mira_school', text: 'Мой первый зритель смеялся, а одна — снимала', tag: 'dream' });
  } else if (c === 1) {
    rel('mira', 1);
    await d.say('Мира', 'Флиртуешь? В очереди в «Подвал»? Смело. Ладно, приду. Я всё равно тут работаю — снимаю для паблика.');
    F.e2DanTeaseMira = true;
  } else {
    rel('mira', -1);
    await d.say('Мира', 'Ну и ладно. Я тебя помню — этого хватит на двоих.');
  }
  quest('e2_mira', { title: 'Мира', note: 'Фотограф «Подвала». Одноклассница', giver: 'mira', status: 'active', silent: true });
}

// ---------- Зал и гримёрка ----------

export async function hallEnter(ctx) {
  const { d } = ctx;
  // Вернулись со сцены — дальше программа вечера
  if (F.e2Show === 'mark' && F.podvalResult) return afterMark(ctx);
  if (F.e2PodvalDone) return;
  if (once('podval_hall')) {
    await d.think('Низкий потолок, трубы, красный свет. Сто человек — и каждый дышит в затылок соседу. Пахнет потом, пивом и чем-то сладким.');
    await d.say('Дэн', 'Пришёл! Брат! Я думал, всё. Иди в гримёрку, там все. Я буду у сцены. Как будешь готов — скажи мне.');
    if (F.e2DanTeaseMira) await d.say('Дэн', 'И это… Я видел, как ты с фотографшей. «Придёшь послушать?» Ромео, блин.');
  }
}

export async function danPodval(ctx) {
  const { d } = ctx;
  if (F.e2PodvalDone || F.e2Show) return d.say('Дэн', 'Брат, это было… я до сих пор трясусь.');
  await d.say('Дэн', 'Ну? Готов? Сначала 3g0th2002, потом Рей, потом ты. Потом Адам — он всегда в конце.');
  const c = await d.choose(['«Готов. Начинаем.»', '«Ещё минуту.»']);
  if (c === 1) return d.say('Дэн', 'Минуту. Одну. Я засекаю. Шучу. Но засекаю.');
  return runShow(ctx);
}

const RAY_BACKSTAGE = voiced('Рей', {
  ghost: 'Братик! Сегодня мои новые строчки. Ну, твои. Ну, теперь мои. Не перебивай меня из зала, ладно? Это моя воронка.',
  debt: 'Братик, после шоу — разговор про двадцатку. CRM помнит всё. Рей помнит всё. Иногда.',
  leadgen: 'Флаеры раздал? Сто лидов? Я видел, как ты по очереди ходил. Конверсия, братик!',
  plain: 'Тень! Ни пуха. Если облажаешься — ничего, у меня тоже первый раз был пайка.',
});

export async function rayBackstage(ctx) {
  const { d, sfx, fx } = ctx;
  if (once('ray_backstage')) {
    await d.think('Рей разминается: прыгает на месте, пускает пузыри, делает вид, что боксирует с зеркалом.');
    sfx('thump');
    fx.shake(150, 0.008);
    await d.say('Рей', 'Проверка на звонкость! На удачу, братик!');
  }
  await d.say('Рей', F.reyGhost ? RAY_BACKSTAGE.ghost : F.reyDebt ? RAY_BACKSTAGE.debt : F.reyLeadgen || F.reyLeadgenHalf ? RAY_BACKSTAGE.leadgen : RAY_BACKSTAGE.plain);
  if (!F.markaInInventory && !F.e2MarkaOffered && !F.rayOffended) {
    F.e2MarkaOffered = true;
    await d.say('Рей', 'Хочешь «для смелости»? Одна марочка — и сцена твоя. Ну, или ты — сцены. Пятьдесят на пятьдесят.');
    const c = await d.choose(['[Взять сейчас]', '«Нет. Я сам.»', '[Взять на потом]']);
    if (c === 0) {
      F.triedLSD = true;
      F.acidNow = true;
      state.stats.addiction += 1;
      pulse(-3);
      ctx.acid(true);
      await d.think('Бумажка под языком. Через десять минут трубы на потолке начинают дышать.');
    } else if (c === 1) {
      state.stats.honesty += 1;
      pulse(2);
      await d.say('Рей', 'Сам так сам. Пайка, но гордая.');
    } else {
      ctx.item('marka');
      F.markaInInventory = true;
    }
  }
}

export async function arkashaBackstage(ctx) {
  const { d, sfx } = ctx;
  sfx('switch');
  ctx.fx.screenFlash(0xffffff, 150);
  if (once('ark_backstage')) {
    await d.say('Аркаша', 'Тень! Не моргай! Это бэкстейдж! Бэкстейдж — это самый честный контент!');
    await d.say('Аркаша', 'После шоу — обложка. Я уже вижу: ты, красный свет, пот. Грусть. Это продаётся.');
    return;
  }
  await d.say('Аркаша', 'Улыбнись! Не надо, не улыбайся. Так лучше. Так — контент.');
}

export async function adamBackstage(ctx) {
  const { d, line } = ctx;
  if (once('adam_backstage')) {
    await d.think('Адам сидит на полу с закрытыми глазами. Серый свитшот, дреды. Губы шевелятся.');
    await d.say('Адам', 'Не волнуйся. Волнуйся. Это одно и то же. То же.');
    await d.say('Адам', 'Зал — это эхо. Скажешь честно — вернётся честно. Честно.');
    line({ id: 'e2_echo', text: 'Зал — это эхо: что скажешь, то и вернётся', tag: 'dream' });
    return;
  }
  await d.say('Адам', 'Дыши. Дыши.');
}

export async function stasConsole(ctx) {
  const { d } = ctx;
  if (F.stasLoud === undefined && !F.e2PodvalDone) {
    await d.say('Стас', 'Тень. Микро проверили. Уровень — минус шесть дБ. Хочешь громче — скажи сейчас. Громче — это плюс двадцать процентов к залу. Или минус.');
    const c = await d.choose(['«Сделай погромче.»', '«Не стримь меня, ладно?»', '«А ты сам читаешь?»']);
    if (c === 0) {
      F.stasLoud = true;
      await d.say('Стас', 'Плюс три дБ. Будет бить в грудь. Сто процентов.');
    } else if (c === 1) {
      F.noStream = true;
      F.stasLoud = false;
      rel('stas', -1);
      await d.say('Стас', 'Ноль процентов стрима. Как скажешь. Но запись я всё равно сделаю. Для архива.');
    } else {
      F.stasLoud = false;
      rel('stas', 2);
      await d.say('Стас', 'Читал. Пять лет назад. Девяносто процентов зала ушли. Остальные десять — это были мои родители.');
    }
    return;
  }
  await d.say('Стас', 'Уровни стоят. Всё на мне. Сто процентов.');
}

export async function romaYard(ctx) {
  const { d, sfx, line } = ctx;
  sfx('vape');
  if (once('roma_yard')) {
    await d.think('Во дворике у чёрного хода — Рома. Рыжие кудри на глазах, пирсинг, чёрное худи. Облако вейпа пахнет арбузом.');
    await d.say('Рома', 'Тень. Слышал. Ты из гаража, где ковёр на стене. Это красиво. Ковёр на стене — это красиво.');
    const c = await d.choose(['«Почему 2002?»', '«Ты с Реем знаком?»', '«Волнуешься?»']);
    if (c === 0) {
      await d.say('Рома', '2002 — это не год. Это состояние. Когда всё ещё может быть хорошо.');
      line({ id: 'e2_2002', text: 'Это не год — это состояние, когда всё ещё может быть', tag: 'dream' });
      rel('roma', 1);
    } else if (c === 1) {
      await d.say('Рома', 'Не хочу о нём. Не моя история.');
    } else {
      await d.say('Рома', 'Я всегда волнуюсь. Поэтому на сцене плачу. Зал думает — образ. А это я.');
      rel('roma', 1);
    }
    return;
  }
  await d.say('Рома', 'Иди. Я ещё постою. Мне перед сценой надо быть одному.');
}

// ---------- Шоу ----------

async function onStage(ctx, sprite, x = 900) {
  const s = ctx.scene.add.sprite(x, FLOOR - 50, `${sprite}_0`).setOrigin(0.5, 1).setDepth(9).setScale(1.1);
  s.setAlpha(0);
  ctx.scene.tweens.add({ targets: s, alpha: 1, duration: 400 });
  ctx.scene.tweens.add({ targets: s, y: s.y - 6, duration: 180, yoyo: true, repeat: -1 });
  return s;
}

export async function runShow(ctx) {
  const { d, scene, wait, sfx, fx, start } = ctx;
  F.e2Show = 'started';
  scene.player.x = 500;
  scene.player.setFlipX(false);
  await d.think('Свет гаснет. Зал гудит. Ведущий кричит что-то в свой единственный микрофон — его никому не дают.');

  // 1. 3g0th2002
  d.close();
  playMusic(BEAT.url, { offset: BEAT.drop, loop: true, loopStart: BEAT.drop, volume: 0.55, muffled: true });
  const roma = await onStage(ctx, 'roma');
  await wait(800);
  await d.say('Рома', 'Мой город — это кладбище будильников. Все звенят, никто не встаёт.');
  await d.think('Зал холодный. Стоят, скрестив руки. Потом кто-то в первом ряду начинает плакать. Потом ещё кто-то.');
  await d.say('Рома', 'Это работает. Работает. Спасибо.');
  sfx('clap');
  d.close();
  roma.destroy();
  await wait(400);

  // 2. RAY
  const ray = await onStage(ctx, 'ray');
  for (let i = 0; i < 10; i++) {
    const b = scene.add.image(900 + Phaser.Math.Between(-60, 60), FLOOR - 200, 'bubble').setDepth(25);
    scene.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(80, 220), alpha: 0, duration: 2200, delay: i * 120, onComplete: () => b.destroy() });
  }
  await d.say('Рей', 'ЛИДОГЕНЕРАЦИЯ! Подвал, вы мои лиды! Вы мои сучки! Вы моя воронка!');
  fx.shake(300, 0.006);
  if (F.reyGhost && state.soldLines.length) {
    await d.think(`Рей читает. Мои строчки. «${state.soldLines[0].text}». Зал взрывается.`);
    await d.think('Он машет рукой в мою сторону. Улыбается. Будто подарил.');
    const c = await d.choose(['[Крикнуть: «Это мои слова!»]', '[Промолчать]'], { timer: 8, timeoutIndex: 1 });
    if (c === 0) {
      F.exposedRey = true;
      state.stats.honesty += 2;
      pulse(4);
      rel('ray', -3);
      sfx('boo');
      await d.say('Рей', 'Чего?! Кто там пищит? А, гаражный! Он мне их продал, братики! За пятнашку! Продал! Ха-ха! Вот это пайка!');
      await d.think('Зал смотрит на меня. Половина смеётся. Вторая половина — нет.');
      feed('подвал_официальный', 'Скандал в «Подвале»: Тень говорит, что RAY читал его строчки. RAY говорит, что купил.', { notifyMe: true });
    } else {
      state.stats.honesty -= 1;
      pulse(-3);
      await d.think('Молчу. Хлопаю. Ладони горят, как будто сам себе даю пощёчины.');
    }
  } else {
    await d.think('Пузыри, мат, «лидогенерация» через строчку. Зал не понимает, смеяться или прыгать. Прыгает.');
  }
  sfx('cheer');
  d.close();
  ray.destroy();
  stopMusic(0.5);
  await wait(400);

  // 3. Марк
  await d.say('', 'ВЕДУЩИЙ: А теперь… вопросительный знак! Встречайте — Тень!', '#ffd166');
  if (F.e2MomAtShow) await d.think('В самом конце зала, у двери — мама. В пальто. Она отпросилась. Она пришла.');
  F.e2Show = 'mark';
  d.close();
  start('Stage', { mode: 'podval', back: { loc: 'podval', spawnX: 500 } });
}

// После выхода Марка: реакция, twinspeak, разговоры, выбор ночи
async function afterMark(ctx) {
  const { d, wait, sfx } = ctx;
  F.e2Show = 'after';
  const r = F.podvalResult;
  if (r === 'fire') {
    pulse(10);
    state.stats.fame += 3;
    addFollowers('ritm', 160, 'видео из «Подвала»');
    addFollowers('kadr', 70, 'фото из «Подвала»');
    await d.think('Зал орёт. Я не слышу собственного сердца. Только «ТЕНЬ! ТЕНЬ!» — как будто это не имя, а приказ.');
  } else if (r === 'ok') {
    pulse(4);
    state.stats.fame += 1;
    addFollowers('ritm', 50, 'видео из «Подвала»');
    await d.think('Хлопают. Нормально хлопают. Кто-то свистит. Не «вау», но и не «уходи».');
  } else {
    pulse(-6);
    addFollowers('vibe', 30, 'обсуждают провал');
    await d.think('Тишина. Потом жидкие хлопки. Кто-то в конце зала смеётся. Я ухожу со сцены и не помню, как.');
  }
  if (F.e2Heckle === 'won') {
    pulse(3);
    rel('ray', -1);
    await d.think('А как я ответил Рею… Это видели все. Это будут пересказывать.');
  }
  // 4. twinspeak
  playMusic(BEAT.url, { offset: BEAT.drop, loop: true, loopStart: BEAT.drop, volume: 0.4, muffled: true });
  const adam = await onStage(ctx, 'adam');
  await d.say('Адам', 'Город говорит дважды. Первый раз — тебе. Второй — тому, кем ты станешь. Станешь.');
  await d.think('Двойной голос, как эхо в подземном переходе. После него — тишина. Тишина.');
  stopMusic(0.8);
  d.close();
  adam.destroy();
  await wait(400);
  sfx('clap');

  // После шоу
  F.e2PodvalDone = true;
  await d.say('Адам', 'Ты слышал себя. Это редкость. Мы — «САМИЗДАТ». Мы независимые. Независимые.');
  await d.think('Адам кладёт мне в ладонь жетон метро. На нём маркером: «РЕЧНАЯ».');
  F.samizdatInvite = true;
  ctx.item('token');
  addContact('adam', { silent: true });
  quest('e2_samizdat', { title: '«САМИЗДАТ»', note: 'Отнести демку Адаму на станцию «Речная» (жетон в кармане)', giver: 'adam', status: 'active' });
  if (!F.noStream) {
    await d.say('Стас', `Стрим — ${r === 'fire' ? 412 : r === 'ok' ? 312 : 188} человек. Твой кусок вырезал. Звук — девяносто процентов. Девяносто — это много.`);
    post('ritm', { author: 'QuadroXZ', text: 'Тень в «Подвале» — live', likes: r === 'fire' ? 820 : r === 'ok' ? 240 : 60 });
    addContact('stas', { silent: true });
  }
  await d.say('Аркаша', 'Обложка! Я тебе скину завтра! Или послезавтра! Или… короче, скину!');
  if (F.e2MomAtShow) {
    await d.think('У выхода — мама. Ничего не говорит. Просто обнимает. Пахнет столовой и холодом.');
    rel('mom', 2);
    pulse(3);
    await d.say('Мама', 'Иди, гуляй с друзьями. Только напиши потом. Ладно?');
  }
  return nightChoice(ctx);
}

// ---------- Выбор ночи (⏱ 10 сек) ----------

async function nightChoice(ctx) {
  const { d, card, go } = ctx;
  scene_hint(ctx);
  const opts = [['ray', 'Афтепати у Рея']];
  if (F.e2MiraMet && relOf('mira') >= 0) opts.push(['mira', 'Гулять с Мирой по крышам']);
  opts.push(['dan', 'В гараж с Дэном — записать трек на эмоциях']);
  if (F.kiraInvited) opts.push(['kira', 'Проводить Киру после смены']);
  await d.think('Ночь только начинается. Все куда-то зовут.');
  const c = await d.choose(opts.map((o) => o[1]), { timer: 10, timeoutIndex: opts.length - 1 });
  const pick = opts[c][0];
  F.e2Night = pick;
  d.close();
  ctx.time(40);
  if (pick === 'ray') {
    state.stats.fame += 1;
    state.stats.addiction += 1;
    await card('АФТЕПАТИ', 'квартира Рея · 23:40');
    return go('ray_party', 200);
  }
  if (pick === 'mira') {
    rel('mira', 1);
    await card('КРЫШИ', 'с Мирой · полночь');
    return go('rooftop', 200);
  }
  if (pick === 'dan') {
    rel('dan', 2);
    await card('ГАРАЖ №17', 'ночь · трек на эмоциях');
    return go('garage', 600);
  }
  rel('kira', 1);
  await card('«ШАУРМА 24»', 'ступеньки у входа · 2 часа ночи');
  ctx.time(120);
  return go('shawarma_steps', 400);
}

function scene_hint(ctx) {
  ctx.goal('Выбрать, где провести ночь');
}
