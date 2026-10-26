import Phaser from 'phaser';
import { Dialogue } from '../ui/Dialogue.js';
import { Notebook } from '../ui/Notebook.js';
import { DemoPC } from '../ui/DemoPC.js';
import { state, addLine, TAGS } from '../state.js';
import { LOCATIONS } from '../story/prologue.js';
import { sfx, startAmbience, stopAmbience, currentMusic, BEAT } from '../audio.js';

export const FLOOR = 470;
const SPEED = 260;
const USE_RANGE = 80;
const STEP_EVERY = 300;

// Универсальная локация: фон, двери, герой, NPC и предметы описываются в story/*.js
export class LocationScene extends Phaser.Scene {
  constructor() {
    super('Location');
  }

  create({ loc, spawnX, facing }) {
    this.cfg = LOCATIONS[loc];
    this.locKey = loc;
    this.busy = false;
    this.stepTimer = 0;
    this.lastPrompt = null;
    const cfg = this.cfg;

    this.cameras.main.setBounds(0, 0, cfg.width, 540);
    cfg.draw(this);

    this.doors = {};
    (cfg.doors || []).forEach((d) => (this.doors[d.id] = this.makeDoor(d)));

    this.npcs = {};
    (cfg.npcs || []).forEach((n) => {
      if (n.when && !n.when()) return;
      const s = this.add.sprite(n.x, FLOOR + (n.dy || 0), `${n.sprite}_0`).setOrigin(0.5, 1).setDepth(10);
      s.setFlipX(!!n.flip);
      this.npcs[n.id] = s;
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

    const title = this.add.text(480, 250, cfg.title, {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, hold: 1600, yoyo: true });

    this.dialogue = new Dialogue(this);
    this.notebook = new Notebook(this);
    this.pc = new DemoPC(this);
    this.makeHud();
    this.makeToast();
    this.closeup = null;

    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D' });
    this.input.keyboard.on('keydown', (ev) => {
      if (this.pc.open) return this.pc.handleKey(ev);
      if (this.notebook.open) {
        if (['q', 'й', 'Q', 'Й', 'Escape', 'e', 'у'].includes(ev.key)) this.notebook.hide();
        return;
      }
      if (this.busy) return;
      if (['e', 'у', 'E', 'У', ' ', 'Enter'].includes(ev.key)) this.tryUse();
      if (['q', 'й', 'Q', 'Й'].includes(ev.key)) this.openNotebook();
    });

    this.touch = { left: false, right: false };
    if (this.sys.game.device.input.touch) this.makeTouchControls();

    startAmbience(cfg.ambience);
    this.events.once('shutdown', () => {
      stopAmbience();
      this.pc.stop();
    });

    this.cameras.main.fadeIn(500, 7, 6, 13);
    if (cfg.onEnter) this.time.delayedCall(550, () => this.runScript(cfg.onEnter));
  }

  // Контекст, который получают все сценарии
  get ctx() {
    return {
      d: this.dialogue,
      scene: this,
      state,
      sfx,
      fx: this.fx,
      line: (l) => this.giveLine(l),
      go: (loc, spawnX, facing) => this.goTo(loc, spawnX, facing),
      door: (id, open = true) => this.setDoor(this.doors[id], open),
      npc: (id) => this.npcs[id],
      walk: (sprite, x, speed = 120) => this.walkTo(sprite, x, speed),
      wait: (ms) => new Promise((r) => this.time.delayedCall(ms, r)),
      closeup: (build) => this.showCloseup(build),
      closeupHide: () => this.hideCloseup(),
      pc: () => this.pc.show(),
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
        this.hideCloseup();
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
      list.push({ x: this.npcs[n.id].x, label: n.label || `Поговорить: ${n.name}`, use: n.talk, npc: this.npcs[n.id], sfx: 'talk' });
    });
    return list;
  }

  nearest() {
    let best = null;
    let bestD = Infinity;
    for (const it of this.items()) {
      if (it.npc && !it.npc.visible) continue;
      const dist = Math.abs(it.x - this.player.x);
      if (dist < (it.range || USE_RANGE) && dist < bestD) {
        best = it;
        bestD = dist;
      }
    }
    return best;
  }

  tryUse() {
    const it = this.nearest();
    if (!it) return;
    sfx(it.sfx || 'click');
    // Маленькая вспышка на месте предмета — отклик на каждое действие
    this.fx.ping(it.x, it.npc ? FLOOR - 120 : (it.y ?? FLOOR - 190) + 40);
    if (it.npc) {
      // Отходим на шаг, чтобы не стоять внутри собеседника
      const side = this.player.x < it.npc.x ? -1 : 1;
      const tx = Phaser.Math.Clamp(it.npc.x + side * 84, 40, this.cfg.width - 40);
      this.tweens.add({ targets: this.player, x: tx, duration: 120 });
      this.player.setFlipX(it.npc.x < tx);
      it.npc.setFlipX(tx < it.npc.x);
    }
    this.runScript(it.use);
  }

  update(time, dt) {
    this.hud.setVisible(!this.busy && !this.pc.open);
    this.updateDoors();
    this.pulseToBeat();
    if (this.busy || this.notebook.open || this.pc.open) return;

    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || this.touch.left;
    const right = k.right.isDown || k.d.isDown || this.touch.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) {
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * SPEED * (dt / 1000), 40, this.cfg.width - 40);
      this.player.setFlipX(dir < 0);
      if (!this.player.anims.isPlaying) this.player.play('mark_walk');
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfx(this.cfg.steps || 'stepWood');
        this.stepTimer = STEP_EVERY;
        if (this.cfg.rain) this.fx.splash(this.player.x, FLOOR);
      }
    } else if (this.player.anims.isPlaying) {
      this.player.anims.stop();
      this.player.setTexture('mark_0');
      this.stepTimer = 0;
    }

    const it = this.nearest();
    if (it) {
      if (this.lastPrompt !== it) sfx('prompt');
      const top = it.npc ? it.npc.y - it.npc.height - 24 : FLOOR - 190;
      this.prompt.setVisible(true);
      this.prompt.x = it.x - 14;
      this.prompt.y = it.y ?? top;
      this.promptLabel.setText(it.label);
      const cam = this.cameras.main;
      const right = cam.scrollX + 960 - 40 - this.promptLabel.width;
      if (this.prompt.x > right) this.prompt.x = right;
    } else {
      this.prompt.setVisible(false);
    }
    this.lastPrompt = it;
  }

  // ---------- Двери ----------

  makeDoor(d) {
    const h = d.h || 200;
    const w = d.w || 76;
    const top = FLOOR - h;
    const c = this.add.container(d.x - w / 2, top).setDepth(5);
    const frame = this.add.rectangle(-5, -5, w + 10, h + 5, d.frame ?? 0x1e1626).setOrigin(0);
    const hole = this.add.rectangle(0, 0, w, h, 0x0c0a12).setOrigin(0);
    const panel = this.add.container(0, 0);
    const color = d.color ?? 0x5a3a2a;
    const dark = Phaser.Display.Color.ValueToColor(color).darken(15).color;
    panel.add(this.add.rectangle(0, 0, w, h, color).setOrigin(0));
    if (d.metal) {
      for (let y = 8; y < h; y += 14) panel.add(this.add.rectangle(4, y, w - 8, 2, dark).setOrigin(0));
    } else {
      panel.add(this.add.rectangle(8, 12, w - 16, h * 0.36, dark).setOrigin(0));
      panel.add(this.add.rectangle(8, h * 0.5, w - 16, h * 0.42, dark).setOrigin(0));
      panel.add(this.add.rectangle(w - 14, h * 0.5, 8, 8, 0xd8b040).setOrigin(0));
    }
    c.add([frame, hole, panel]);
    return { ...d, c, panel, w, open: false };
  }

  setDoor(door, open, silent = false) {
    if (!door || door.open === open) return;
    door.open = open;
    if (!silent) sfx(open ? (door.metal ? 'gate' : 'door') : 'doorClose');
    this.tweens.killTweensOf(door.panel);
    // Створка «поворачивается» к нам — сжимаем по ширине
    this.tweens.add({ targets: door.panel, scaleX: open ? 0.14 : 1, duration: open ? 260 : 200, ease: open ? 'Cubic.out' : 'Cubic.in' });
    if (!open) this.cameras.main.shake(80, 0.002);
  }

  // Межкомнатные двери открываются сами, когда к ним подходит кто угодно
  updateDoors() {
    const movers = [this.player, ...Object.values(this.npcs).filter((n) => n.visible)];
    Object.values(this.doors).forEach((door) => {
      if (!door.auto) return;
      const dist = Math.min(...movers.map((m) => Math.abs(m.x - door.x)));
      if (!door.open && dist < 90) this.setDoor(door, true);
      else if (door.open && dist > 130) this.setDoor(door, false);
    });
  }

  // ---------- Эффекты ----------

  get fx() {
    const s = this;
    return {
      ping(x, y, color = 0xffd166) {
        const ring = s.add.circle(x, y, 6).setStrokeStyle(3, color).setDepth(30);
        s.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      },
      burst(x, y, { color = 0xffd166, count = 16, tex = 'px', speed = 160, gravity = 300, life = 700 } = {}) {
        const p = s.add.particles(x, y, tex, {
          speed: { min: speed * 0.4, max: speed }, angle: { min: 200, max: 340 }, gravityY: gravity,
          lifespan: life, scale: { start: 1, end: 0 }, tint: color, emitting: false,
        }).setDepth(40);
        p.explode(count);
        s.time.delayedCall(life + 100, () => p.destroy());
      },
      dust(x, y, w = 120) {
        const p = s.add.particles(x, y, 'px', {
          x: { min: -w / 2, max: w / 2 }, speedY: { min: -30, max: -10 }, speedX: { min: -15, max: 15 },
          lifespan: 1400, alpha: { start: 0.5, end: 0 }, scale: { start: 0.8, end: 0.2 }, tint: 0xd8d0c0, emitting: false,
        }).setDepth(40);
        p.explode(24);
        s.time.delayedCall(1500, () => p.destroy());
      },
      steam(x, y) {
        const p = s.add.particles(x, y, 'dot', {
          x: { min: -14, max: 14 }, speedY: { min: -60, max: -30 }, lifespan: 1500, alpha: { start: 0.25, end: 0 },
          scale: { start: 0.6, end: 2 }, tint: 0xeeeeff, frequency: 90, duration: 1800,
        }).setDepth(40);
        s.time.delayedCall(3500, () => p.destroy());
      },
      splash(x, y) {
        const p = s.add.particles(x, y - 2, 'px', {
          speed: { min: 40, max: 90 }, angle: { min: 220, max: 320 }, gravityY: 400, lifespan: 300,
          scale: 0.6, tint: 0x9ab0ff, alpha: 0.6, emitting: false,
        }).setDepth(25);
        p.explode(4);
        s.time.delayedCall(400, () => p.destroy());
      },
      flash(x, y, w, h, color = 0xffffff, alpha = 0.6, dur = 400) {
        const r = s.add.rectangle(x, y, w, h, color, alpha).setDepth(35).setBlendMode(Phaser.BlendModes.ADD);
        s.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
      },
      screenFlash(color = 0xffffff, dur = 300) {
        const c = Phaser.Display.Color.IntegerToColor(color);
        s.cameras.main.flash(dur, c.red, c.green, c.blue);
      },
      shake(ms = 200, k = 0.006) {
        s.cameras.main.shake(ms, k);
      },
      flicker(target, times = 6) {
        s.tweens.add({ targets: target, alpha: 0.2, duration: 50, yoyo: true, repeat: times });
      },
    };
  }

  // Колонки и лампочка в гараже «дышат» в такт, пока играет бит
  pulseToBeat() {
    const m = currentMusic();
    if (!this.speakers) return;
    if (!m) {
      this.speakers.forEach((sp) => sp.setScale(1));
      return;
    }
    const pos = m.position();
    const beat = (pos / (60 / BEAT.bpm)) % 1;
    const hit = pos > BEAT.drop ? Math.max(0, 1 - beat * 3) : 0.2 * Math.max(0, 1 - beat * 3);
    this.speakers.forEach((sp) => sp.setScale(1 + hit * 0.25));
    this.bulbLight?.setAlpha(0.06 + hit * 0.08);
    this.screen?.setFillStyle(hit > 0.5 ? 0xff3d8a : 0x3df0ff);
  }

  // ---------- Крупный план (окно, афиша) ----------

  // Слой крупного плана: обычные объекты поверх игры (не контейнер — чтобы работали маски)
  showCloseup(build) {
    this.hideCloseup(true);
    const layer = (this.closeup = { list: [], onHide: null });
    let depth = 990;
    layer.add = (objs) => [].concat(objs).forEach((o) => {
      o.setScrollFactor(0).setDepth((depth += 0.001));
      layer.list.push(o);
    });
    // Затемнение под крупным планом
    layer.add(this.add.rectangle(0, 0, 960, 540, 0x000000, 0.8).setOrigin(0));
    build(this, layer);
    // На крупном плане диалог уезжает вниз, чтобы не закрывать картинку
    this.dialogue.root.y = 326;
    const veil = this.add.rectangle(0, 0, 960, 540, 0x07060d).setOrigin(0).setScrollFactor(0).setDepth(999);
    this.tweens.add({ targets: veil, alpha: 0, duration: 400, onComplete: () => veil.destroy() });
    sfx('whoosh');
  }

  hideCloseup(instant = false) {
    const layer = this.closeup;
    if (!layer) return;
    this.closeup = null;
    layer.onHide?.();
    this.dialogue.root.y = 0;
    const kill = () => layer.list.forEach((o) => {
      o.clearMask?.(true);
      o.destroy();
    });
    if (instant) return kill();
    const veil = this.add.rectangle(0, 0, 960, 540, 0x07060d, 0).setOrigin(0).setScrollFactor(0).setDepth(999);
    this.tweens.add({
      targets: veil, fillAlpha: 1, duration: 200,
      onComplete: () => {
        kill();
        this.tweens.add({ targets: veil, alpha: 0, duration: 250, onComplete: () => veil.destroy() });
      },
    });
  }

  // ---------- Переходы, строчки, интерфейс ----------

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
    this.cameras.main.fadeOut(450, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (loc === 'Studio' || loc === 'End') this.scene.start(loc);
      else this.scene.restart({ loc, spawnX, facing });
    });
  }

  giveLine(l) {
    if (!addLine(l)) return;
    sfx('line');
    this.showToast(`✎ Новая строчка [${TAGS[l.tag].name}]`, `«${l.text}»`, TAGS[l.tag].color);
    // Искры летят от героя в тетрадь
    const cam = this.cameras.main;
    const sx = this.player.x - cam.scrollX;
    const color = Phaser.Display.Color.HexStringToColor(TAGS[l.tag].color).color;
    for (let i = 0; i < 10; i++) {
      const sp = this.add.image(sx + Phaser.Math.Between(-30, 30), 360 + Phaser.Math.Between(-30, 30), 'spark')
        .setScrollFactor(0).setDepth(980).setTint(color).setScale(2);
      this.tweens.add({
        targets: sp, x: 870, y: 34, scale: 0.6, delay: i * 40, duration: 650, ease: 'Cubic.in',
        onComplete: () => {
          sp.destroy();
          if (i === 9) {
            this.bookCount.setText(String(state.lines.length));
            this.tweens.add({ targets: this.hud, scale: 1.2, duration: 100, yoyo: true });
          }
        },
      });
    }
  }

  openNotebook() {
    sfx('page');
    this.notebook.show();
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
      if (!this.busy) this.notebook.open ? this.notebook.hide() : this.openNotebook();
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
      x: { min: -100, max: 1060 }, lifespan: 900, speedY: { min: 700, max: 900 }, speedX: -120,
      alpha: { start: 0.35, end: 0.1 }, quantity: 3, frequency: 16,
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
    mk(890, 470, 'E', () => !this.busy && !this.notebook.open && !this.pc.open && this.tryUse());
  }
}
