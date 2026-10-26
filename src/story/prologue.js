// ПРОЛОГ «ГАРАЖ»: квартира → двор → гараж Дэна.
// Сценарии — async-функции. d.say / d.think / d.choose, line(...) выдаёт строчку для трека.
import { state } from '../state.js';
import { drawApartment, drawYard, drawGarage } from './backdrops.js';
import { startBeat } from '../audio.js';

const F = state.flags;

export const LOCATIONS = {
  apartment: {
    title: 'ПОНЕДЕЛЬНИК. 6:40',
    width: 1500,
    spawnX: 210,
    draw: (s) => drawApartment(s, 1500),

    async onEnter({ d }) {
      if (F.wokeUp) return;
      F.wokeUp = true;
      await d.think('Шесть сорок. Будильник не нужен — за стенкой мама гремит кастрюлями.');
      await d.think('Опять собирается на две смены.');
      await d.say('', '← → или A / D — ходить.   E — осмотреть / поговорить.   Q — тетрадь со строчками.', '#ffd166');
    },

    npcs: [
      {
        id: 'mom', name: 'Мама', sprite: 'mom', x: 1000, flip: true,
        when: () => !F.momLeft,
        async talk({ d, line, npc, walk, wait, scene }) {
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
          await walk(mom, 1440, 110);
          scene.tweens.add({ targets: mom, alpha: 0, duration: 300 });
          await wait(400);
          mom.setVisible(false);
        },
      },
    ],

    items: [
      {
        x: 200, label: 'Кровать',
        async use({ d }) {
          await d.think('Матрас продавлен ровно по форме меня. Двадцать два года — и всё в этой комнате.');
        },
      },
      {
        x: 240, y: 120, label: 'Плакат', range: 40,
        async use({ d }) {
          await d.think('Плакат с концерта, на который я так и не попал. Билет стоил как мамина зарплата за неделю.');
        },
      },
      {
        x: 480, label: 'Окно',
        async use({ d, line }) {
          await d.think('Панельки до горизонта. А там, за ними, центр — стекло и огни.');
          await d.think('Отсюда он похож на другую планету.');
          line({ id: 'window', text: 'Центр отсюда — как другая планета', tag: 'dream' });
        },
      },
      {
        x: 635, label: 'Тетрадь',
        async use({ d, line }) {
          await d.think('Моя тетрадь. Всё, что цепляет, я записываю сюда. Потом из этого получаются треки.');
          await d.say('', 'Строчки — твой главный ресурс. Осматривай мир и разговаривай с людьми, чтобы их собирать. Q — открыть тетрадь.', '#ffd166');
          line({ id: 'notebook', text: 'Прячу тетрадь под матрас, будто стихи — это стыдно', tag: 'pain' });
        },
      },
      {
        x: 862, label: 'Холодильник',
        async use({ d }) {
          await d.think('Полбатона, кетчуп и мамин контейнер с надписью «НЕ ТРОГАТЬ». Богато живём.');
        },
      },
      {
        x: 975, label: 'Плита', when: () => F.momLeft,
        async use({ d }) {
          if (F.ate) return d.think('Кастрюля пустая. Я съел всё.');
          F.ate = true;
          await d.think('Гречка. Мама всегда оставляет мне больше, чем себе.');
        },
      },
      {
        x: 1180, label: 'Бумаги на столе',
        async use({ d, line }) {
          await d.think('Квитанции. «Задолженность». «Последнее предупреждение». Рядом — горстка мелочи.');
          await d.think('Она пересчитывала её перед сном. Я слышал.');
          line({ id: 'bills', text: 'Мама считает мелочь в кошельке', tag: 'pain' });
        },
      },
      {
        x: 1440, label: 'Выйти во двор',
        async use({ d, go }) {
          if (!F.momLeft) return d.think('Сначала надо поговорить с мамой. Она скоро уходит.');
          go('yard', 130);
        },
      },
    ],
  },

  yard: {
    title: 'ДВОР. УЛ. ЗАВОДСКАЯ, 12',
    width: 2100,
    spawnX: 130,
    rain: true,
    draw: (s) => drawYard(s, 2100),

    async onEnter({ d }) {
      if (F.yardSeen) return;
      F.yardSeen = true;
      await d.think('Моросит. Двор как всегда: качели, лужи и гаражи до самого забора.');
      await d.think('Гараж Дэна — семнадцатый, в самом конце.');
    },

    npcs: [
      {
        id: 'kid', name: 'Пацан', sprite: 'kid', x: 770,
        async talk({ d, line }) {
          if (F.kidTalked) return d.say('Пацан', 'Тень, а запиши трек про наш двор! Чтоб все знали!');
          F.kidTalked = true;
          await d.say('Пацан', 'Э! Ты же Тень? Который в гараже по ночам орёт?');
          const c = await d.choose(['Это не ор. Это рэп.', 'Иди домой, мелкий, дождь.', 'Хочешь, зачитаю?']);
          if (c === 0) {
            await d.say('Пацан', 'Ну да, я знаю. Мы с пацанами твой куплет про лифт наизусть знаем!');
          } else if (c === 1) {
            await d.say('Пацан', 'Сам иди! ...А куплет про лифт всё равно крутой.');
          } else {
            state.stats.fame += 1;
            await d.think('Зачитываю пару строк. Пацан подпевает — он знает слова лучше меня.');
            await d.say('Пацан', 'Вааа! Я пацанам расскажу, что ты мне лично читал!');
          }
          line({ id: 'kids', text: 'Пацаны во дворе знают мои куплеты наизусть', tag: 'street' });
        },
      },
      {
        id: 'granny', name: 'Баба Валя', sprite: 'granny', x: 1140, flip: true,
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
        x: 130, label: 'Домой',
        async use({ go }) {
          go('apartment', 1440, 'left');
        },
      },
      {
        x: 1030, label: 'Лавочка', range: 40,
        async use({ d }) {
          await d.think('На этой лавочке я впервые читал Дэну свои тексты. Нам было по четырнадцать.');
        },
      },
      {
        x: 1400, label: 'Граффити «ТЕНЬ»',
        async use({ d, line }) {
          await d.think('Мой тег. Нарисовал в пятнадцать, баллончиком, который стащил из строймага.');
          await d.think('Его до сих пор никто не закрасил.');
          line({ id: 'tag', text: 'Моё имя на стене — единственное, что здесь моё', tag: 'street' });
        },
      },
      {
        x: 1952, label: 'Гараж №17',
        async use({ go }) {
          go('garage', 160);
        },
      },
    ],
  },

  garage: {
    title: 'ГАРАЖ №17',
    width: 1100,
    spawnX: 160,
    draw: (s) => drawGarage(s, 1100),

    async onEnter(ctx) {
      if (F.trackDone && !F.prologueDone) await afterRecording(ctx);
    },

    npcs: [
      {
        id: 'dan', name: 'Дэн', sprite: 'dan', x: 740, flip: true,
        talkWhen: () => !F.trackDone,
        async talk({ d, line, go }) {
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
            await d.say('Дэн', 'Короче. Я всю ночь сидел — собрал бит. Слушай.');
            startBeat(84);
            await d.think('Дэн жмёт пробел. Гараж наполняет тяжёлый, тёплый бит. Бочка бьёт прямо в грудь.');
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
          await d.say('', 'Выбери 3 строчки для первого трека. От того, что ты выберешь, зависит, каким будет трек — и как на него отреагируют.', '#ffd166');
          go('Studio');
        },
      },
    ],

    items: [
      {
        x: 55, label: 'Выйти во двор',
        async use({ go }) {
          go('yard', 1952, 'left');
        },
      },
      {
        x: 290, label: 'Ковёр',
        async use({ d }) {
          await d.think('Ковёр от Дэновой бабушки. Лучшая звукоизоляция в городе. И самая красивая.');
        },
      },
      {
        x: 515, y: 90, label: 'Постеры', range: 50,
        async use({ d, line }) {
          await d.think('Афиша «Арены». Двадцать тысяч мест. Дэн повесил её в первый день, как мы сюда въехали.');
          await d.think('«Чтобы видеть цель», — сказал он.');
          line({ id: 'arena', text: 'Однажды я соберу Арену', tag: 'dream' });
        },
      },
      {
        x: 975, label: 'Микрофон',
        async use({ d }) {
          await d.think('Микрофон за полторы тысячи с рук. Держится на изоленте и честном слове.');
          await d.think('Если он сдохнет — нам конец. На новый денег нет.');
          F.micNoticed = true;
        },
      },
    ],
  },
};

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
  await d.say('Дэн', TRACK_REACTIONS[track.theme]);
  await d.say('Дэн', `«${track.title}». Так и назовём.`);
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
  d.close();
  scene.goTo('End');
}
