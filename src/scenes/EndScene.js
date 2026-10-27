import Phaser from 'phaser';
import { state, saveGame } from '../state.js';
import { stopMusic, blip, sfx } from '../audio.js';
import { startEpisode1 } from '../story/episode1.js';

const MOM = {
  promise: 'Ты пообещал маме всё изменить.',
  rude: 'Ты нагрубил маме.',
  silent: 'Ты промолчал, когда мама ждала ответа.',
};
const FRIDAY = {
  ready: 'Ты сказал Дэну, что готов к «Подвалу».',
  afraid: 'Ты признался Дэну, что боишься.',
  nod: 'Ты молча кивнул Дэну.',
};
const MIC = {
  new: 'новый, в коробке',
  oktava: '«Октава» с барахолки',
  shure: '«Шур» с рук',
  stolen: 'подозрительно дешёвый (возможно, краденый)',
  rey: 'бывший микрофон Рея',
  toy: 'розовый караоке-микрофон сестры Дэна',
};

function prologueRows() {
  const f = state.flags;
  const track = state.tracks[0];
  return [
    MOM[f.momTalk],
    track && `Твой первый трек — «${track.title}».`,
    track && (track.voice ? `Ты зачитал его сам. Подача: ${track.score}%.` : 'Ты записал его без голоса.'),
    track && 'Демка лежит на компе Дэна — её можно переслушать.',
    `Собрано строчек: ${state.lines.length}.`,
    f.kidTalked && 'Пацаны во дворе теперь знают тебя в лицо.',
    f.micNoticed && 'Ты заметил, что микрофон еле живой.',
    FRIDAY[f.fridayAnswer],
  ];
}

function episode1Rows() {
  const f = state.flags;
  const ways = [];
  if (f.shifts) ways.push(`склад (${f.shifts} ${f.shifts === 1 ? 'смена' : 'смены'}${f.fired ? ', выгнали' : ''})`);
  if (f.momLoan) ways.push('мамин конверт «НА ЗИМУ»');
  if (f.reyDebt) ways.push('долг Рею — 20 000 ₽ через две недели');
  if (f.reyLeadgen) ways.push('работа лидогенератором Рея (флаеры с марочками)');
  if (f.reyLeadgenHalf) ways.push('флаеры Рея без марочек');
  if (f.reyGhost) ways.push('продал Рею три строчки');
  if (f.soldWatch) ways.push('продал отцовские часы');
  const ray = f.rayOffended ? 'Ты обидел Рея — он это запомнил.' : f.rayFriend ? 'Рей считает тебя «своим в воронке».' : 'С Реем вы просто знакомы.';
  return [
    `Деньги: ${ways.length ? ways.join(', ') : 'так и не нашёл'}.`,
    `Микрофон: ${MIC[f.micType] || '—'}.`,
    ray,
    f.triedLSD ? 'Ты попробовал марочку Рея.' : f.markaInInventory ? 'Марочка Рея лежит у тебя в кармане.' : null,
    f.reyGhost ? `Строчка «${state.soldLines[0]?.text}» теперь принадлежит Рею.` : null,
    f.momLoan ? 'Мама осталась без зимних сапог.' : f.momAsked ? 'Мама предлагала помощь.' : null,
    f.danHurt ? 'Дэн обижен: ты продал ваши строчки.' : f.liedDan ? 'Ты соврал Дэну про флаеры.' : null,
    f.akhmedFriend ? 'Ахмед со склада тебе должен.' : null,
    `Строчек в тетради: ${state.lines.length}. Демок на компе Дэна: ${state.tracks.length}.`,
    `Осталось денег: ${state.cash.toLocaleString('ru-RU')} ₽.`,
    f.momKnowsAcid ? 'Мама знает про марочку.' : f.liedMom ? 'Ты соврал маме, глядя ей в глаза.' : null,
    f.sleptOut ? (f.warnedMom ? 'Ты ночевал у Дэна и предупредил маму.' : 'Ты не ночевал дома — мама не спала всю ночь.') : null,
    f.kidPromise ? 'Ты пообещал пацану трек про двор.' : null,
  ];
}

// Итоги главы — как схема выборов в Detroit
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create({ episode = 'prologue' } = {}) {
    stopMusic();
    this.cameras.main.fadeIn(800, 7, 6, 13);
    this.add.rectangle(0, 0, 960, 540, 0x07060d).setOrigin(0);
    const ep1 = episode === 'ep1';
    saveGame(ep1 ? { loc: 'apartment', spawnX: 200, done: 'ep1' } : { loc: 'garage', spawnX: 640, done: 'prologue' });

    this.add.text(480, 50, ep1 ? 'ЭПИЗОД 1 ЗАВЕРШЁН' : 'ПРОЛОГ ЗАВЕРШЁН', {
      fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(480, 90, ep1 ? '«СЛОМАННЫЙ МИКРОФОН»' : '«ГАРАЖ»', { fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#ff3d8a' }).setOrigin(0.5);

    const rows = (ep1 ? episode1Rows() : prologueRows()).filter(Boolean);
    // Строки бывают в два ряда — считаем высоту каждой
    let y = 124;
    const size = rows.length > 8 ? 17 : 19;
    rows.forEach((r, i) => {
      const t = this.add.text(110, y, `◆  ${r}`, {
        fontFamily: '"PT Mono", monospace', fontSize: `${size}px`, color: '#e8e4ff', wordWrap: { width: 760 },
      }).setAlpha(0);
      y += t.height + 10;
      this.tweens.add({ targets: t, alpha: 1, x: 130, delay: 500 + i * 380, duration: 400, onStart: () => blip(600 + i * 60, 0.03) });
    });

    const nextText = ep1 ? 'ДАЛЕЕ: ЭПИЗОД 2 — «ОТКРЫТЫЙ МИКРОФОН» · В РАЗРАБОТКЕ' : '▶ ПРОДОЛЖИТЬ: ЭПИЗОД 1 — «СЛОМАННЫЙ МИКРОФОН»';
    const next = this.add.text(480, 466, nextText, { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffd166' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, delay: 500 + rows.length * 380 + 400, duration: 800 });
    const again = this.add.text(480, 506, ep1 ? '[ нажми — в главное меню ]' : '[ нажми, чтобы продолжить ]', { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#77729a' }).setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    const go = () => {
      sfx('select');
      if (ep1) return this.scene.start('Title');
      const where = startEpisode1();
      saveGame(where);
      this.cameras.main.fadeOut(500, 7, 6, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Location', where));
    };
    this.time.delayedCall(2500, () => {
      this.input.once('pointerdown', go);
      this.input.keyboard.once('keydown', go);
    });
  }
}
