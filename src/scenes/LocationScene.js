import Phaser from 'phaser';
import { Dialogue } from '../ui/Dialogue.js';
import { Notebook } from '../ui/Notebook.js';
import { state, addLine, TAGS } from '../state.js';
import { LOCATIONS } from '../story/prologue.js';
import { blip } from '../audio.js';

export const FLOOR = 470;
const SPEED = 230;
const USE_RANGE = 70;

// Универсальная локация: фон, герой, NPC и предметы описываются в story/*.js
export class LocationScene extends Phaser.Scene {
  constructor() {
    super('Location');
  }

  create({ loc, spawnX, facing }) {
    this.cfg = LOCATIONS[loc];
    this.locKey = loc;
    this.busy = false;
    const cfg = this.cfg;

    this.cameras.main.setBounds(0, 0, cfg.width, 540);
    cfg.draw(this);

    // NPC
    this.npcs = {};
    (cfg.npcs || []).forEach((n) => {
      if (n.when && !n.when()) return;
      const s = this.add.sprite(n.x, FLOOR + (n.dy || 0), `${n.sprite}_0`).setOrigin(0.5, 1).setDepth(10);
      s.setFlipX(!!n.flip);
      this.npcs[n.id] = s;
      // Лёгкое «дыхание», чтобы персонажи не выглядели застывшими
      this.tweens.add({ targets: s, scaleY: 1.015, duration: 1400 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    this.player = this.add.sprite(spawnX ?? cfg.spawnX, FLOOR, 'mark_0').setOrigin(0.5, 1).setDepth(20);
    this.player.setFlipX(facing === 'left');
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 40);

    if (cfg.foreground) cfg.foreground(this);
    if (cfg.rain) this.makeRain();

    // Подсказка над предметом
    this.prompt = this.add.container(0, 0).setDepth(900).setVisible(false);
    const key = this.add.rectangle(0, 0, 26, 26, 0xffd166).setStrokeStyle(2, 0x0c0a16);
    const keyT = this.add.text(0, 0, 'E', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#0c0a16' }).setOrigin(0.5);
    this.promptLabel = this.add.text(20, 0, '', {
      fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffffff', stroke: '#0c0a16', strokeThickness: 5,
    }).setOrigin(0, 0.5);
    this.prompt.add([key, keyT, this.promptLabel]);
    this.tweens.add({ targets: this.prompt, y: '-=4', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Название локации
    const title = this.add.text(480, 250, cfg.title, {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, hold: 1600, yoyo: true });

    this.dialogue = new Dialogue(this);
    this.notebook = new Notebook(this);
    this.makeHud();
    this.makeToast();

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', use: 'E', space: 'SPACE', enter: 'ENTER', book: 'Q',
    });
    this.input.keyboard.on('keydown', (ev) => {
      if (this.notebook.open) {
        if (['q', 'й', 'Escape', 'e', 'у'].includes(ev.key)) this.notebook.hide();
        return;
      }
      if (this.busy) return;
      if (['e', 'у', 'E', 'У', ' ', 'Enter'].includes(ev.key)) this.tryUse();
      if (['q', 'й', 'Q', 'Й'].includes(ev.key)) this.notebook.show();
    });

    this.touch = { left: false, right: false };
    if (this.sys.game.device.input.touch) this.makeTouchControls();

    this.cameras.main.fadeIn(500, 7, 6, 13);
    if (cfg.onEnter) this.time.delayedCall(550, () => this.runScript(cfg.onEnter));
  }

  // Контекст, который получают все сценарии
  get ctx() {
    return {
      d: this.dialogue,
      scene: this,
      state,
      line: (l) => this.giveLine(l),
      go: (loc, spawnX, facing) => this.goTo(loc, spawnX, facing),
      npc: (id) => this.npcs[id],
      walk: (sprite, x, speed = 120) => this.walkTo(sprite, x, speed),
      wait: (ms) => new Promise((r) => this.time.delayedCall(ms, r)),
      face: (sprite, target) => sprite.setFlipX(target.x < sprite.x),
    };
  }

  async runScript(fn) {
    this.busy = true;
    this.prompt.setVisible(false);
    this.player.anims.stop();
    this.player.setTexture('mark_0');
    try {
      await fn(this.ctx);
    } finally {
      if (this.scene.isActive()) {
        this.dialogue.close();
        this.busy = false;
      }
    }
  }

  items() {
    const list = [];
    (this.cfg.items || []).forEach((it) => {
      if (it.when && !it.when()) return;
      list.push(it);
    });
    (this.cfg.npcs || []).forEach((n) => {
      if (!this.npcs[n.id] || !n.talk || (n.talkWhen && !n.talkWhen())) return;
      list.push({ x: this.npcs[n.id].x, label: n.label || `Поговорить: ${n.name}`, use: n.talk, npc: this.npcs[n.id] });
    });
    return list;
  }

  nearest() {
    let best = null;
    let bestD = USE_RANGE;
    for (const it of this.items()) {
      if (it.npc && !it.npc.visible) continue;
      const dist = Math.abs(it.x - this.player.x);
      if (dist < (it.range || USE_RANGE) && dist <= bestD) {
        best = it;
        bestD = dist;
      }
    }
    return best;
  }

  tryUse() {
    const it = this.nearest();
    if (!it) return;
    blip(740, 0.04);
    if (it.npc) {
      // Отходим на шаг, чтобы не стоять внутри собеседника
      const side = this.player.x < it.npc.x ? -1 : 1;
      this.player.x = Phaser.Math.Clamp(it.npc.x + side * 56, 40, this.cfg.width - 40);
      this.player.setFlipX(it.npc.x < this.player.x);
      it.npc.setFlipX(this.player.x < it.npc.x);
    }
    this.runScript(it.use);
  }

  update(_, dt) {
    this.hud.setVisible(!this.busy);
    if (this.busy || this.notebook.open) return;
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || this.touch.left;
    const right = k.right.isDown || k.d.isDown || this.touch.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) {
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * SPEED * (dt / 1000), 40, this.cfg.width - 40);
      this.player.setFlipX(dir < 0);
      if (!this.player.anims.isPlaying) this.player.play('mark_walk');
    } else if (this.player.anims.isPlaying) {
      this.player.anims.stop();
      this.player.setTexture('mark_0');
    }

    const it = this.nearest();
    if (it) {
      const top = it.npc ? it.npc.y - it.npc.height - 24 : FLOOR - 130;
      this.prompt.setVisible(true);
      this.prompt.x = it.x - 14;
      this.prompt.y = it.y ?? top;
      this.promptLabel.setText(it.label);
      // Не даём подсказке вылезти за край экрана
      const cam = this.cameras.main;
      const right = cam.scrollX + 960 - 20 - this.promptLabel.width - 20;
      if (this.prompt.x > right) this.prompt.x = right;
    } else {
      this.prompt.setVisible(false);
    }
  }

  walkTo(sprite, x, speed) {
    return new Promise((resolve) => {
      const key = sprite.texture.key.replace(/_\d$/, '');
      sprite.setFlipX(x < sprite.x);
      sprite.play(`${key}_walk`);
      this.tweens.add({
        targets: sprite,
        x,
        duration: (Math.abs(x - sprite.x) / speed) * 1000,
        onComplete: () => {
          sprite.anims.stop();
          sprite.setTexture(`${key}_0`);
          resolve();
        },
      });
    });
  }

  goTo(loc, spawnX, facing) {
    this.busy = true;
    blip(330, 0.05);
    this.cameras.main.fadeOut(400, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (loc === 'Studio' || loc === 'End') this.scene.start(loc);
      else this.scene.restart({ loc, spawnX, facing });
    });
  }

  giveLine(l) {
    if (!addLine(l)) return;
    blip(988, 0.05);
    this.time.delayedCall(90, () => blip(1318, 0.05));
    this.showToast(`✎ Новая строчка [${TAGS[l.tag].name}]`, `«${l.text}»`, TAGS[l.tag].color);
    this.bookCount.setText(String(state.lines.length));
  }

  makeHud() {
    const btn = (this.hud = this.add.container(892, 34)).setScrollFactor(0).setDepth(960);
    const bg = this.add.rectangle(0, 0, 100, 44, 0x0c0a16, 0.85).setStrokeStyle(2, 0xffd166);
    const t = this.add.text(-38, 0, '✎ [Q]', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffd166' }).setOrigin(0, 0.5);
    this.bookCount = this.add.text(36, 0, String(state.lines.length), {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#0c0a16', backgroundColor: '#ffd166', padding: { x: 4, y: 3 },
    }).setOrigin(0.5);
    btn.add([bg, t, this.bookCount]);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy) this.notebook.open ? this.notebook.hide() : this.notebook.show();
    });
  }

  makeToast() {
    this.toast = this.add.container(480, 620).setScrollFactor(0).setDepth(970);
    this.toastBg = this.add.rectangle(0, 0, 700, 66, 0x0c0a16, 0.95).setStrokeStyle(2, 0xffd166);
    this.toastTitle = this.add.text(0, -14, '', { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffd166' }).setOrigin(0.5);
    this.toastText = this.add.text(0, 12, '', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
    this.toast.add([this.toastBg, this.toastTitle, this.toastText]);
  }

  showToast(title, text, color = '#ffd166') {
    this.toastTitle.setText(title).setColor(color);
    this.toastText.setText(text);
    this.toastBg.width = Math.max(420, this.toastText.width + 60);
    this.toastBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
    this.tweens.killTweensOf(this.toast);
    this.toast.y = 620;
    this.tweens.add({ targets: this.toast, y: 496, duration: 350, ease: 'Back.out', hold: 2600, yoyo: true });
  }

  makeRain() {
    this.add.particles(0, -20, 'drop', {
      x: { min: -100, max: 1060 },
      lifespan: 900,
      speedY: { min: 700, max: 900 },
      speedX: -120,
      alpha: { start: 0.35, end: 0.1 },
      quantity: 3,
      frequency: 16,
    }).setScrollFactor(0).setDepth(800);
  }

  makeTouchControls() {
    const mk = (x, y, label, onDown, onUp) => {
      const b = this.add.circle(x, y, 40, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.4).setScrollFactor(0).setDepth(990);
      this.add.text(x, y, label, { fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(991).setAlpha(0.7);
      b.setInteractive();
      b.on('pointerdown', onDown);
      b.on('pointerup', onUp || (() => {}));
      b.on('pointerout', onUp || (() => {}));
    };
    mk(70, 470, '◀', () => (this.touch.left = true), () => (this.touch.left = false));
    mk(170, 470, '▶', () => (this.touch.right = true), () => (this.touch.right = false));
    mk(890, 470, 'E', () => !this.busy && !this.notebook.open && this.tryUse());
  }
}
