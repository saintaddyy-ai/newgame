import Phaser from 'phaser';
import { unlockAudio, sfx } from '../audio.js';
import { state, resetState, readSave, loadGame, addLine, saveGame } from '../state.js';
import { drawSkyline } from '../story/backdrops.js';
import { startEpisode1 } from '../story/episode1.js';

// Выборы пролога «по умолчанию» — для старта сразу с Эпизода 1
function prologueDefaults() {
  resetState();
  Object.assign(state.flags, { momTalk: 'promise', kidTalked: true, micNoticed: true, danMet: true, trackDone: true, prologueDone: true, fridayAnswer: 'ready' });
  state.rel.mom = 1;
  state.rel.dan = 1;
  [
    { id: 'promise', text: 'Я не стану тем, кто обещал и ушёл', tag: 'pain' },
    { id: 'window', text: 'Центр отсюда — как другая планета', tag: 'dream' },
    { id: 'bills', text: 'Мама считает мелочь в кошельке', tag: 'pain' },
    { id: 'kids', text: 'Пацаны во дворе знают мои куплеты наизусть', tag: 'street' },
    { id: 'tag', text: 'Моё имя на стене — единственное, что здесь моё', tag: 'street' },
    { id: 'garage', text: 'Гараж вместо студии, мечты вместо денег', tag: 'dream' },
    { id: 'arena', text: 'Однажды я соберу Арену', tag: 'dream' },
  ].forEach(addLine);
  state.tracks.push({ title: 'Мама, прости', theme: 'pain', lines: [], voice: false, score: null });
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    drawSkyline(this, 960, { seed: 7 });
    this.add.particles(0, -20, 'drop', {
      x: { min: -100, max: 1060 }, lifespan: 900, speedY: { min: 700, max: 900 }, speedX: -120,
      alpha: { start: 0.35, end: 0.1 }, quantity: 3, frequency: 16,
    }).setDepth(5);

    const title = this.add.text(480, 170, 'ПЛАТИНА', {
      fontFamily: '"Press Start 2P"', fontSize: '64px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(10);
    title.setShadow(0, 0, '#ff3d8a', 24, true, true);
    this.time.addEvent({
      delay: 2200, loop: true,
      callback: () => this.tweens.add({ targets: title, alpha: 0.35, duration: 60, yoyo: true, repeat: 2 }),
    });
    this.add.text(480, 248, 'ИЗ ПОДВАЛА — НА ВЕРШИНУ. ИЛИ НА ДНО.', { fontFamily: '"PT Mono", monospace', fontSize: '20px', color: '#c9c4ee' }).setOrigin(0.5).setDepth(10);

    const save = readSave();
    const items = [];
    if (save) items.push({ label: '▶ ПРОДОЛЖИТЬ', run: () => this.continueGame() });
    items.push({ label: save ? 'НОВАЯ ИГРА' : '▶ НОВАЯ ИГРА', run: () => this.newGame() });
    items.push({ label: 'СРАЗУ ЭПИЗОД 1', run: () => this.episode1() });

    this.sel = 0;
    this.menu = items.map((it, i) => {
      const t = this.add.text(480, 330 + i * 44, it.label, { fontFamily: '"Press Start 2P"', fontSize: '15px', color: '#c9c4ee' }).setOrigin(0.5).setDepth(10);
      t.setInteractive({ useHandCursor: true }).on('pointerover', () => this.select(i)).on('pointerdown', () => this.pick(i));
      return { t, ...it };
    });
    this.select(0);

    this.add.text(480, 506, 'ДЕМО · ПРОЛОГ + ЭПИЗОД 1  |  18+  |  ← → / A D — ходить   E — действие   Q — тетрадь', {
      fontFamily: '"PT Mono", monospace', fontSize: '14px', color: '#77729a',
    }).setOrigin(0.5).setDepth(10);

    this.input.keyboard.on('keydown', (ev) => {
      unlockAudio();
      if (ev.key === 'ArrowUp' || ev.key === 'w') this.select((this.sel - 1 + this.menu.length) % this.menu.length);
      if (ev.key === 'ArrowDown' || ev.key === 's') this.select((this.sel + 1) % this.menu.length);
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= this.menu.length) this.pick(n - 1);
      if (['Enter', ' ', 'e'].includes(ev.key)) this.pick(this.sel);
    });
  }

  select(i) {
    this.sel = i;
    this.menu.forEach((m, j) => {
      m.t.setColor(j === i ? '#ffd166' : '#c9c4ee').setScale(j === i ? 1.08 : 1);
    });
  }

  pick(i) {
    if (this.leaving) return;
    this.leaving = true;
    unlockAudio();
    sfx('select');
    this.menu[i].run();
  }

  go(key, data) {
    this.cameras.main.fadeOut(600, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  newGame() {
    resetState();
    this.go('Location', { loc: 'apartment' });
  }

  episode1() {
    prologueDefaults();
    const where = startEpisode1();
    saveGame(where);
    this.go('Location', where);
  }

  continueGame() {
    const where = loadGame();
    if (!where) return this.newGame();
    if (where.done === 'prologue') {
      const w = startEpisode1();
      saveGame(w);
      return this.go('Location', w);
    }
    if (where.done === 'ep1') return this.go('End', { episode: 'ep1' });
    this.go('Location', { loc: where.loc, spawnX: where.spawnX, facing: where.facing });
  }
}
