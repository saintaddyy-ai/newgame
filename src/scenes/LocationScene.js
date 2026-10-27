import Phaser from 'phaser';
import { Dialogue } from '../ui/Dialogue.js';
import { Notebook } from '../ui/Notebook.js';
import { DemoPC } from '../ui/DemoPC.js';
import { Phone } from '../ui/Phone.js';
import { uiContainer } from '../ui/pin.js';
import { state, addLine, TAGS, ITEMS, giveItem, saveGame, bankTx } from '../state.js';
import { getLocation, phaseLabel, advanceTime, useItem, sceneHooks } from '../story/index.js';
import { sfx, startAmbience, stopAmbience, currentMusic, BEAT } from '../audio.js';
import { unreadTotal } from '../phone/model.js';
import * as phoneApi from '../phone/model.js';

export const FLOOR = 470;
const SPEED = 260;
const USE_RANGE = 80;
const STEP_EVERY = 300;
const SNEAK_SPEED = 110;
const val = (v) => (typeof v === 'function' ? v() : v);

// Универсальная локация: фон, двери, герой, NPC и предметы описываются в story/*.js
export class LocationScene extends Phaser.Scene {
  constructor() {
    super('Location');
  }

  create({ loc, spawnX, facing }) {
    this.cfg = getLocation(loc);
    this.locKey = loc;
    saveGame({ loc, spawnX: spawnX ?? this.cfg.spawnX, facing });
    this.busy = false;
    this.leaving = false;
    this.pill = null;
    // Ссылки на объекты прошлой локации (сцена перезапускается тем же объектом)
    this.heatFill = null;
    this.phoneBadge = null;
    this.extraItems = [];
    this.critters = [];
    this.stepTimer = 0;
    this.lastPrompt = null;
    this.sneaking = false;
    this.zonesFired = new Set();
    const cfg = this.cfg;

    this.cameras.main.setBounds(0, 0, cfg.width, 540);
    cfg.draw(this);

    this.doors = {};
    (val(cfg.doors) || []).forEach((d) => (this.doors[d.id] = this.makeDoor(d)));

    this.npcDefs = val(cfg.npcs) || [];
    this.npcs = {};
    this.npcDefs.forEach((n) => {
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
    if (val(cfg.rain)) this.makeRain();
    // Ночь — синее затемнение поверх мира, свет ламп остаётся
    const night = val(cfg.night);
    this.isNight = !!night;
    if (night) this.add.rectangle(0, 0, cfg.width, 540, 0x0a0824, night === true ? 0.42 : night).setOrigin(0).setDepth(30);
    this.makeLights(val(cfg.lamps) || [], !!night);
    this.makeCritters(val(cfg.critters) || []);
    this.acidFx = null;

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
    this.notebook.onUse = (id) => {
      const fn = useItem(id);
      if (fn) this.runScript(fn);
    };
    this.pc = new DemoPC(this);
    this.phone = new Phone(this);
    this.makeHud();
    this.makeToast();
    this.closeup = null;

    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', shift: 'SHIFT' });
    this.input.keyboard.on('keydown', (ev) => {
      if (this.phone.open) return this.phone.handleKey(ev);
      if (this.pc.open) return this.pc.handleKey(ev);
      if (this.notebook.open) {
        if (['q', 'й', 'Q', 'Й', 'Escape', 'e', 'у'].includes(ev.key)) this.notebook.hide();
        else if (!this.notebook.picking) this.notebook.handleKey(ev);
        return;
      }
      if (this.busy) return;
      if (['e', 'у', 'E', 'У', ' ', 'Enter'].includes(ev.key)) this.tryUse();
      if (['q', 'й', 'Q', 'Й'].includes(ev.key)) this.openNotebook();
      if (['p', 'з', 'P', 'З'].includes(ev.key)) this.phone.show();
    });

    this.touch = { left: false, right: false };
    if (this.sys.game.device.input.touch) this.makeTouchControls();

    startAmbience(val(cfg.ambience));
    this.events.once('shutdown', () => {
      stopAmbience();
      this.pc.stop();
      this.acidTween?.stop();
      this.acidTrail?.remove();
    });
    if (state.flags.acidNow) this.setAcid(true);
    // Эпизод может добавить в локацию живых людей, события по времени и т. п.
    sceneHooks(this);
    cfg.setup?.(this);

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
      card: (title, sub) => this.showCard(title, sub),
      pickLines: (n, title) => this.notebook.pick(n, title),
      cash: (delta, label) => this.addCash(delta, label),
      item: (id) => this.giveItemFx(id),
      goal: (text) => this.setGoal(text),
      acid: (on) => this.setAcid(on),
      start: (key, data) => this.startScene(key, data),
      hud: () => this.refreshHud(),
      phone: { ...phoneApi, ring: (from, script, opts) => this.phone.ring(from, script, opts), open: (page, arg) => this.phone.show(page, arg) },
      time: (min) => advanceTime(this, min),
      toast: (title, text, color) => this.showToast(title, text, color),
    };
  }

  async runScript(fn, { cost = 0 } = {}) {
    if (this.phone.open) this.phone.hide(true);
    this.busy = true;
    this.prompt.setVisible(false);
    this.player.anims.stop();
    this.player.setTexture('mark_0');
    try {
      await fn(this.ctx);
    } catch (e) {
      console.error(e);
    } finally {
      if (this.scene.isActive() && !this.leaving) {
        this.dialogue.close();
        this.hideCloseup();
        this.busy = false;
        if (cost) advanceTime(this, cost);
        this.refreshHud();
        this.events.emit('scriptDone');
      }
    }
  }

  items() {
    const list = [];
    (val(this.cfg.items) || []).concat(this.extraItems || []).forEach((it) => {
      if (it.when && !it.when()) return;
      list.push(it);
    });
    this.npcDefs.forEach((n) => {
      if (!this.npcs[n.id] || !n.talk || (n.talkWhen && !n.talkWhen())) return;
      const label = typeof n.label === 'function' ? n.label() : n.label;
      list.push({ key: `npc:${n.id}`, x: this.npcs[n.id].x, label: label || `Поговорить: ${n.name}`, use: n.talk, npc: this.npcs[n.id], sfx: 'talk', cost: n.cost ?? 10 });
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
    this.runScript(it.use, { cost: state.episode === 'ep2' ? it.cost ?? 0 : 0 });
  }

  update(time, dt) {
    const free = !this.busy && !this.pc.open && !this.phone.open;
    this.hud.setVisible(!this.busy && !this.pc.open);
    this.phoneBtn.setVisible(!this.busy && !this.pc.open && !this.phone.open);
    this.info.setVisible(state.episode !== 'prologue' && !this.busy && !this.pc.open);
    this.heatBar?.setVisible(free && state.flags.courierActive);
    this.updateDoors();
    this.pulseToBeat();
    this.cfg.tick?.(this, dt);
    if (!this.busy) this.phone.flushQueue();
    if (this.busy || this.notebook.open || this.pc.open || this.phone.open) return;

    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || this.touch.left;
    const right = k.right.isDown || k.d.isDown || this.touch.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    this.setSneak(k.shift.isDown && !!dir);
    if (dir) {
      const speed = this.sneaking ? SNEAK_SPEED : SPEED;
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * speed * (dt / 1000), 40, this.cfg.width - 40);
      this.player.setFlipX(dir < 0);
      if (!this.player.anims.isPlaying) this.player.play('mark_walk');
      this.player.anims.timeScale = this.sneaking ? 0.5 : 1;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        // Крадучись — шагов не слышно
        if (!this.sneaking) sfx(this.cfg.steps || 'stepWood');
        this.stepTimer = this.sneaking ? STEP_EVERY * 1.8 : STEP_EVERY;
        if (val(this.cfg.rain)) this.fx.splash(this.player.x, FLOOR);
      }
    } else if (this.player.anims.isPlaying) {
      this.player.anims.stop();
      this.player.setTexture('mark_0');
      this.stepTimer = 0;
    }
    this.updateCritters();
    if (this.checkZones()) return;

    const it = this.nearest();
    const key = it ? it.key || `${it.label}@${it.x}` : null;
    if (it) {
      if (this.lastPrompt !== key) sfx('prompt');
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
    this.lastPrompt = key;
  }

  // ---------- Крадучись и зоны ----------

  setSneak(on) {
    if (on === this.sneaking) return;
    this.sneaking = on;
    this.player.setScale(1, on ? 0.94 : 1);
    this.player.setTint(on ? 0x9a96c8 : 0xffffff);
    if (on && !this.sneakHint) {
      this.sneakHint = true;
      const t = this.add.text(this.player.x, this.player.y - 180, 'тсс…', {
        fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#c9c4ee', fontStyle: 'italic', stroke: '#0c0a16', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(900);
      this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  // Зона: когда Марк заходит в неё, сценарий запускается сам (мама окликает, прохожий подходит).
  // sneak: true — если идти крадучись (Shift), зона не сработает.
  checkZones() {
    const zones = val(this.cfg.zones) || [];
    const x = this.player.x;
    for (const z of zones) {
      if (x < z.x1 || x > z.x2) continue;
      if (this.zonesFired.has(z.id)) continue;
      if (z.when && !z.when()) continue;
      if (z.sneak && this.sneaking) continue;
      this.zonesFired.add(z.id);
      this.player.anims.stop();
      this.player.setTexture('mark_0');
      this.setSneak(false);
      this.runScript(z.run, { cost: z.cost || 0 });
      return true;
    }
    return false;
  }

  // ---------- Двери ----------

  makeDoor(d) {
    const h = d.h || 200;
    const w = d.w || 76;
    const top = FLOOR - h;
    const c = this.add.container(d.x - w / 2, top).setDepth(5);
    const parts = [];
    if (d.interior) {
      // Межкомнатная дверь: светлый наличник, за створкой видна соседняя комната, на полу порожек
      parts.push(this.add.rectangle(-8, -10, w + 16, h + 10, 0x9a7650).setOrigin(0));
      parts.push(this.add.rectangle(-8, -10, w + 16, 4, 0xb89068).setOrigin(0));
      parts.push(this.add.rectangle(0, 0, w, h, d.inside ?? 0x4f4766).setOrigin(0));
      parts.push(this.add.rectangle(0, h * 0.55, w, h * 0.45, Phaser.Display.Color.ValueToColor(d.inside ?? 0x4f4766).lighten(8).color).setOrigin(0));
      parts.push(this.add.rectangle(0, h - 14, w, 14, d.insideFloor ?? 0x3a2c24).setOrigin(0));
      parts.push(this.add.rectangle(-4, h - 4, w + 8, 4, 0xb89068).setOrigin(0));
    } else {
      parts.push(this.add.rectangle(-5, -5, w + 10, h + 5, d.frame ?? 0x1e1626).setOrigin(0));
      parts.push(this.add.rectangle(0, 0, w, h, 0x0c0a12).setOrigin(0));
    }
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
    // Тень на створке — когда дверь повёрнута к нам, она темнее
    const shade = this.add.rectangle(0, 0, w, h, 0x000000, 1).setOrigin(0).setAlpha(0);
    panel.add(shade);
    c.add([...parts, panel]);
    return { ...d, c, panel, shade, w, open: false };
  }

  setDoor(door, open, silent = false) {
    if (!door || door.open === open) return;
    door.open = open;
    if (!silent) sfx(open ? (door.metal ? 'gate' : 'door') : door.interior ? 'doorSoft' : 'doorClose');
    this.tweens.killTweensOf(door.panel);
    // Створка «поворачивается» к нам — сжимаем по ширине
    this.tweens.add({ targets: door.panel, scaleX: open ? 0.14 : 1, duration: open ? 260 : 200, ease: open ? 'Cubic.out' : 'Cubic.in' });
    this.tweens.add({ targets: door.shade, alpha: open ? 0.45 : 0, duration: open ? 260 : 200 });
    if (!open && !door.interior) this.cameras.main.shake(80, 0.002);
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

  // ---------- Свет, живность, фото ----------

  // Фонари и окна светятся поверх ночного затемнения
  makeLights(lamps, night) {
    this.lamps = [];
    lamps.forEach((l) => {
      if (l.nightOnly && !night) return;
      const r = l.r || 110;
      const glow = this.add.image(l.x, l.y, 'glow').setDepth(31).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(l.color ?? 0xffd27a).setAlpha(l.alpha ?? (night ? 0.55 : 0.25)).setScale(r / 64);
      this.lamps.push(glow);
      if (l.cone) {
        const g = this.add.graphics().setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
        g.fillStyle(l.color ?? 0xffd27a, night ? 0.09 : 0.04).fillTriangle(l.x, l.y, l.x - 90, FLOOR + 10, l.x + 90, FLOOR + 10);
        g.fillStyle(l.color ?? 0xffd27a, night ? 0.12 : 0.05).fillEllipse(l.x, FLOOR + 8, 200, 26);
      }
      if (l.flicker) {
        this.time.addEvent({ delay: 2000 + Math.random() * 3000, loop: true, callback: () => {
          this.tweens.add({ targets: glow, alpha: 0.1, duration: 60, yoyo: true, repeat: Phaser.Math.Between(1, 3) });
        } });
      } else {
        this.tweens.add({ targets: glow, scale: (r / 64) * 1.05, duration: 1800 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
  }

  // Голуби клюют и разлетаются, когда подходишь; кот сидит и машет хвостом
  makeCritters(list) {
    list.forEach((c) => {
      if (c.type === 'pigeons') {
        for (let i = 0; i < (c.n || 4); i++) {
          const p = this.add.sprite(c.x + i * 26 + Phaser.Math.Between(-6, 6), (c.y ?? FLOOR) + 2, 'pigeon_0').setOrigin(0.5, 1).setDepth(12);
          p.setFlipX(Math.random() > 0.5);
          this.tweens.add({ targets: p, angle: { from: 0, to: 18 }, duration: 220, yoyo: true, repeat: -1, repeatDelay: 500 + Math.random() * 1500, delay: Math.random() * 1000 });
          this.critters.push({ kind: 'pigeon', s: p, home: p.x });
        }
      } else if (c.type === 'cat') {
        const cat = this.add.sprite(c.x, c.y ?? FLOOR, 'cat_0').setOrigin(0.5, 1).setDepth(c.depth ?? 6).setFlipX(!!c.flip);
        this.time.addEvent({ delay: 900, loop: true, callback: () => cat.setTexture(cat.texture.key === 'cat_0' ? 'cat_1' : 'cat_0') });
        this.critters.push({ kind: 'cat', s: cat });
      }
    });
  }

  updateCritters() {
    for (const c of this.critters) {
      if (c.kind !== 'pigeon' || c.gone) continue;
      if (Math.abs(this.player.x - c.s.x) < 110) {
        c.gone = true;
        sfx('flap');
        this.tweens.killTweensOf(c.s);
        c.s.setAngle(0).setTexture('bird_0').play('bird_fly').setScale(1.4);
        const dir = this.player.x < c.s.x ? 1 : -1;
        this.tweens.add({ targets: c.s, x: c.s.x + dir * Phaser.Math.Between(300, 600), y: Phaser.Math.Between(40, 160), duration: 1600, ease: 'Quad.out', onComplete: () => c.s.setVisible(false) });
      }
    }
  }

  photoSpotNear() {
    const spots = val(this.cfg.photoSpots) || [];
    return spots.find((p) => Math.abs(p.x - this.player.x) < (p.range || 260)) || null;
  }

  // Фото с камеры телефона: в хороших местах Марк что-то замечает (строчка, мысль)
  onPhoto() {
    const spot = this.photoSpotNear();
    if (!spot) return this.showToast('ГАЛЕРЕЯ', 'Фото сохранено', '#ff9a5a');
    const key = `photo_${spot.id}`;
    if (state.flags[key]) return this.showToast('ГАЛЕРЕЯ', 'Ещё один кадр отсюда', '#ff9a5a');
    state.flags[key] = true;
    if (spot.line) this.time.delayedCall(500, () => this.giveLine(spot.line));
    else this.showToast('ХОРОШИЙ КАДР', spot.text, '#ffd166');
    spot.onShot?.(this.ctx);
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
    this.leaving = true;
    this.phone.hide(true);
    this.cameras.main.fadeOut(450, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (loc === 'Studio' || loc === 'End') this.scene.start(loc, { episode: state.episode });
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
    // Слева сверху — день и деньги (с Эпизода 1)
    this.info = uiContainer(this, 20, 20, 960);
    this.infoBg = this.add.rectangle(0, 0, 240, 52, 0x0c0a16, 0.85).setOrigin(0).setStrokeStyle(2, 0x3df0ff);
    this.dayText = this.add.text(12, 9, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#3df0ff' });
    this.cashText = this.add.text(12, 28, '', { fontFamily: '"PT Mono", monospace', fontSize: '17px', color: '#ffffff' });
    this.info.add([this.infoBg, this.dayText, this.cashText]);
    const btn = (this.hud = uiContainer(this, 892, 34, 960));
    const bg = this.add.rectangle(0, 0, 100, 44, 0x0c0a16, 0.85).setStrokeStyle(2, 0xffd166);
    const t = this.add.text(-38, 0, '✎ [Q]', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffd166' }).setOrigin(0, 0.5);
    this.bookCount = this.add.text(36, 0, String(state.lines.length), {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#0c0a16', backgroundColor: '#ffd166', padding: { x: 4, y: 3 },
    }).setOrigin(0.5);
    btn.add([bg, t, this.bookCount]);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.phone.open) this.notebook.open ? this.notebook.hide() : this.openNotebook();
    });

    // Телефон [P] — рядом с тетрадью, с красным кружком непрочитанного
    const pb = (this.phoneBtn = uiContainer(this, 788, 34, 960));
    const pbg = this.add.rectangle(0, 0, 92, 44, 0x0c0a16, 0.85).setStrokeStyle(2, 0x3df0ff);
    const body = this.add.rectangle(-26, 0, 16, 26, 0x3df0ff).setStrokeStyle(2, 0x0c0a16);
    const scr = this.add.rectangle(-26, -1, 10, 16, 0x0c0a16);
    const pt = this.add.text(-10, 0, '[P]', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#3df0ff' }).setOrigin(0, 0.5);
    this.phoneBadge = this.add.circle(38, -16, 10, 0xff3d3d).setVisible(false);
    this.phoneBadgeT = this.add.text(38, -16, '', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff' }).setOrigin(0.5).setVisible(false);
    pb.add([pbg, body, scr, pt, this.phoneBadge, this.phoneBadgeT]);
    pbg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.notebook.open && !this.pc.open) this.phone.toggle();
    });
    this.refreshPhoneBadge();

    // Палево (курьер Рея, Эп. 2)
    const hb = (this.heatBar = uiContainer(this, 20, 84, 960));
    hb.add(this.add.rectangle(0, 0, 150, 26, 0x0c0a16, 0.85).setOrigin(0).setStrokeStyle(2, 0xff6b6b));
    hb.add(this.add.text(8, 7, 'ПАЛЕВО', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ff6b6b' }));
    hb.add(this.add.rectangle(66, 8, 76, 10, 0x2a1a1a).setOrigin(0));
    this.heatFill = this.add.rectangle(66, 8, 1, 10, 0xff3d3d).setOrigin(0);
    hb.add(this.heatFill);
    hb.setVisible(false);
    this.refreshHud();
  }

  refreshPhoneBadge() {
    if (!this.phoneBadge) return;
    const n = unreadTotal() + Object.values(state.quests).filter((q) => q.status === 'active' && !q.seen).length;
    this.phoneBadge.setVisible(n > 0);
    this.phoneBadgeT.setVisible(n > 0).setText(String(Math.min(9, n)));
  }

  // Плашка «идёт звонок» в углу, пока говорим по телефону
  callPill(name) {
    this.pill?.destroy();
    this.pill = null;
    if (!name) return;
    const c = (this.pill = uiContainer(this, 20, 494, 1200));
    const t = this.add.text(36, 0, `${name} · 00:00`, { fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5);
    const bg = this.add.rectangle(0, 0, t.width + 52, 32, 0x0c2a1a, 0.92).setOrigin(0, 0.5).setStrokeStyle(2, 0x3ad86a);
    const dot = this.add.circle(18, 0, 6, 0x3ad86a);
    c.add([bg, dot, t]);
    this.tweens.add({ targets: dot, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    const t0 = this.time.now;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (!t.active) return;
      const sec = Math.floor((this.time.now - t0) / 1000);
      t.setText(`${name} · ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    } });
  }

  refreshHud() {
    const on = state.episode !== 'prologue';
    this.info.setVisible(on);
    if (!on) return;
    this.dayText.setText(phaseLabel());
    this.cashText.setText(`${state.cash.toLocaleString('ru-RU')} ₽`);
    this.infoBg.setSize(Math.max(200, this.dayText.width + 24, this.cashText.width + 24), 52);
    this.heatFill?.setSize(Math.max(1, 76 * Math.min(1, state.heat / 100)), 10);
  }

  addCash(delta, label) {
    if (delta) bankTx(delta, label);
    state.cash = Math.max(0, state.cash + delta);
    this.refreshHud();
    sfx(delta >= 0 ? 'coins' : 'deny');
    const t = this.add.text(30, 80, `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ru-RU')} ₽`, {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: delta >= 0 ? '#8ae6a0' : '#ff6b8a', stroke: '#0c0a16', strokeThickness: 5,
    }).setScrollFactor(0).setDepth(970);
    this.tweens.add({ targets: t, y: 50, alpha: 0, delay: 900, duration: 700, onComplete: () => t.destroy() });
    this.tweens.add({ targets: this.info, scale: 1.08, duration: 90, yoyo: true });
  }

  giveItemFx(id) {
    giveItem(id);
    sfx('select');
    this.showToast('В КАРМАНЕ', ITEMS[id] || id, '#3df0ff');
  }

  setGoal(text) {
    state.goal = text;
    sfx('page');
    this.showToast('ЦЕЛЬ', text, '#ffd166');
  }

  // Полноэкранная перебивка: «СРЕДА. ДЕНЬ.»
  showCard(title, sub = '') {
    return new Promise((resolve) => {
      const bg = this.add.rectangle(0, 0, 960, 540, 0x07060d).setOrigin(0).setScrollFactor(0).setDepth(2000).setAlpha(0);
      const t1 = this.add.text(480, 250, title, { fontFamily: '"Press Start 2P"', fontSize: '30px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 8 })
        .setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);
      const t2 = this.add.text(480, 300, sub, { fontFamily: '"PT Mono", monospace', fontSize: '20px', color: '#c9c4ee' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);
      sfx('whoosh');
      this.tweens.add({ targets: bg, alpha: 1, duration: 400 });
      this.tweens.add({
        targets: [t1, t2], alpha: 1, delay: 300, duration: 400, hold: 1400, yoyo: true,
        onComplete: () => {
          this.refreshHud();
          this.tweens.add({ targets: bg, alpha: 0, duration: 400, onComplete: () => { bg.destroy(); t1.destroy(); t2.destroy(); resolve(); } });
        },
      });
    });
  }

  // Кислотный режим: цвета плывут по кругу, картинка «дышит», за Марком тянется след
  setAcid(on) {
    const cam = this.cameras.main;
    if (on && !this.acidFx) {
      if (cam.postFX) {
        this.acidFx = cam.postFX.addColorMatrix();
        this.acidBarrel = cam.postFX.addBarrel(1);
        this.acidBloom = cam.postFX.addBloom?.(0xffffff, 1, 1, 1.1, 1.2);
        this.acidVignette = cam.postFX.addVignette?.(0.5, 0.5, 0.9, 0.35);
      } else this.acidFx = {};
      const st = { a: 0 };
      this.acidTween = this.tweens.add({
        targets: st, a: 360, duration: 6000, repeat: -1,
        onUpdate: () => {
          this.acidFx.hue?.(st.a);
          if (this.acidBarrel) this.acidBarrel.amount = 1 + Math.sin(st.a / 18) * 0.07;
          cam.setRotation(Math.sin(st.a / 30) * 0.012);
        },
      });
      // Цветные пятна плывут по экрану
      this.acidBlobs = this.add.particles(0, 0, 'glow', {
        x: { min: 0, max: 960 }, y: { min: 0, max: 540 }, lifespan: 4000, speedX: { min: -20, max: 20 }, speedY: { min: -14, max: 14 },
        scale: { start: 0.6, end: 1.6 }, alpha: { start: 0, end: 0.18, ease: 'Sine.inOut' }, tint: [0xff3d8a, 0x3df0ff, 0xffd166, 0x8ae6a0],
        frequency: 320, blendMode: 'ADD',
      }).setScrollFactor(0).setDepth(880);
      // След-призрак за героем
      this.acidTrail = this.time.addEvent({ delay: 110, loop: true, callback: () => {
        if (!this.player.anims.isPlaying) return;
        const g = this.add.image(this.player.x, this.player.y, this.player.texture.key).setOrigin(0.5, 1).setDepth(19)
          .setFlipX(this.player.flipX).setTint(Phaser.Utils.Array.GetRandom([0xff3d8a, 0x3df0ff, 0xffd166])).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: g, alpha: 0, scaleX: 1.15, duration: 520, onComplete: () => g.destroy() });
      } });
    } else if (!on && this.acidFx) {
      this.acidTween?.stop();
      this.acidTrail?.remove();
      this.acidBlobs?.destroy();
      cam.setRotation(0);
      if (cam.postFX) [this.acidFx, this.acidBarrel, this.acidBloom, this.acidVignette].forEach((f) => f && cam.postFX.remove(f));
      this.acidFx = null;
    }
  }

  startScene(key, data) {
    this.busy = true;
    this.leaving = true;
    this.phone.hide(true);
    this.cameras.main.fadeOut(400, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  makeToast() {
    this.toast = uiContainer(this, 480, 620, 970);
    this.toastBg = this.add.rectangle(0, 0, 700, 66, 0x0c0a16, 0.95).setStrokeStyle(2, 0xffd166);
    this.toastTitle = this.add.text(0, -14, '', { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffd166' }).setOrigin(0.5);
    this.toastText = this.add.text(0, 12, '', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
    this.toast.add([this.toastBg, this.toastTitle, this.toastText]);
  }

  showToast(title, text, color = '#ffd166') {
    this.toastTitle.setText(title).setColor(color);
    this.toastText.setText(text);
    this.toastBg.setSize(Math.max(420, this.toastText.width + 60), 66);
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
    mk(890, 470, 'E', () => !this.busy && !this.notebook.open && !this.pc.open && !this.phone.open && this.tryUse());
    mk(790, 470, 'P', () => !this.busy && !this.notebook.open && !this.pc.open && this.phone.toggle());
  }
}
