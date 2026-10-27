import Phaser from 'phaser';
import { Dialogue } from '../ui/Dialogue.js';
import { Notebook } from '../ui/Notebook.js';
import { DemoPC } from '../ui/DemoPC.js';
import { Phone } from '../ui/Phone.js';
import { uiContainer } from '../ui/pin.js';
import { Panel, keyCap } from '../ui/frame.js';
import { state, addLine, TAGS, ITEMS, giveItem, saveGame, bankTx } from '../state.js';
import { getLocation, phaseLabel, advanceTime, useItem, sceneHooks, acidActive } from '../story/index.js';
import { sfx, startAmbience, stopAmbience, currentMusic, BEAT } from '../audio.js';
import { unreadTotal } from '../phone/model.js';
import { repaintMark } from '../story/episode2/look.js';
import * as phoneApi from '../phone/model.js';
import { addActor, idle, walk, talk, pose, play, gesture, startBlinks, isWalking } from '../gfx/actors.js';
import { USE_POSE, makeMirror, mirrorCloseup, fridgeOpen, lieDown, standUp, shower, rideCloseup, npcLife } from '../gfx/actions.js';
import { lightSprite } from '../gfx/world.js';
import { buildDoor, swingDoor } from '../gfx/doors.js';
import { rain, fog, snow, dust } from '../gfx/weather.js';
import { leaves, steam, distantWalkers, skyBirds } from '../gfx/life.js';
import { applyLook, aberration } from '../gfx/fx.js';
import { walkFactor, remark, food as addFood, clean as addClean, needsOn, FOOD_LOW, FOOD_WEAK, CLEAN_LOW, CLEAN_BAD } from '../needs.js';

export const FLOOR = 470;
const SPEED = 260;
const USE_RANGE = 80;
const STEP_EVERY = 300;
const SNEAK_SPEED = 110;
const val = (v) => (typeof v === 'function' ? v() : v);
const NEED_W = 46;

// Значки самочувствия 7×7: молния (силы), миска (сытость), капля (чистота)
function needIcons(scene) {
  if (scene.textures.exists('need_clean')) return;
  const draw = (key, rows, colors) => {
    const c = scene.textures.createCanvas(key, 7, 7);
    const g = c.getContext();
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = colors[ch];
      g.fillRect(x, y, 1, 1);
    }));
    c.refresh();
  };
  draw('need_energy', ['...aa..', '..aa...', '.aaaaa.', '...aa..', '..aa...', '.aa....', '.a.....'], { a: '#ffd166' });
  draw('need_food', ['.s.s.s.', '..s.s..', 'aaaaaaa', 'abbbbba', '.abbba.', '..aaa..', '.......'], { a: '#f0c060', b: '#c07a30', s: '#d8d8e8' });
  draw('need_clean', ['...a...', '..aaa..', '.aabaa.', '.abaaa.', 'aaaaaaa', '.aaaaa.', '..aaa..'], { a: '#6ad8ff', b: '#e8f8ff' });
}

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
    this.useCooldown = 0;
    this.pill = null;
    // Ссылки на объекты прошлой локации (сцена перезапускается тем же объектом)
    this.heatFill = null;
    this.phoneBadge = null;
    this.extraItems = [];
    this.critters = [];
    this.stepTimer = 0;
    this.lastPrompt = null;
    this.sneaking = false;
    this.turning = false;
    this.__texting = false;
    this.zonesFired = new Set();
    this.autoLights = undefined;
    this.lightEnv = undefined;
    this.doorSpots = {};
    // Поля, которые заводят рисовальщики конкретных локаций, — от прошлой локации ничего не остаётся
    this.mirrorRect = null;
    this.speakers = null;
    this.screen = null;
    this.bulbLight = null;
    this.toastUntil = 0;
    this.toastQueue = [];
    this.steamSpots = [];
    this.__actors = new Set();
    const cfg = this.cfg;

    this.cameras.main.setBounds(0, 0, cfg.width, 540);
    // Образ Марка (одежда, стрижка) — общий для всех сцен
    repaintMark(this);
    cfg.draw(this);

    this.doors = {};
    (val(cfg.doors) || []).forEach((d) => (this.doors[d.id] = this.makeDoor(d)));

    // Эпизод 2 готовит текстуры людей (работники, прохожие) до того, как они появятся
    cfg.prepare?.(this);
    this.npcDefs = (typeof cfg.npcs === 'function' ? cfg.npcs(this) : cfg.npcs) || [];
    this.npcs = {};
    this.npcDefs.forEach((n) => {
      // dynamic: человек может прийти или уйти, пока Марк здесь (время идёт) — спрайт создаём всегда
      const here = !n.when || n.when();
      if (!here && !n.dynamic) return;
      const s = addActor(this, n.x, FLOOR + (n.dy || 0), n.sprite, { flip: !!n.flip, scale: n.scale || 1, depth: n.depth ?? 10 });
      if (n.pose) {
        s.__pose = n.pose;
        pose(s, n.pose);
      }
      s.setVisible(here);
      this.npcs[n.id] = s;
    });

    this.player = addActor(this, spawnX ?? cfg.spawnX, FLOOR, 'mark', { depth: 20, flip: facing === 'left' });
    this.blinks = startBlinks(this, () => [this.player, ...Object.values(this.npcs)]);
    this.mirror = makeMirror(this);
    this.npcLifeEvent = npcLife(this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 40);

    if (cfg.foreground) cfg.foreground(this);
    // Погода и жизнь вокруг
    const wet = val(cfg.rain);
    if (wet) rain(this, { heavy: wet === 'heavy' });
    const wx = val(cfg.weather) || this.defaultWeather();
    if (wx === 'fog') fog(this);
    if (wx === 'snow') snow(this);
    if (wx === 'dust') dust(this, cfg.width);
    if (this.lightEnv?.outdoor) {
      if (!wet && (this.lightEnv.dark ?? 0) < 0.6) leaves(this, cfg.width);
      if ((this.lightEnv.dark ?? 0) < 0.5) skyBirds(this);
      if (cfg.width > 1200) distantWalkers(this, cfg.width, { n: 2 });
    }
    if (this.steamSpots?.length) steam(this, this.steamSpots);
    applyLook(this);
    // Ночь — синее затемнение поверх мира, свет ламп остаётся
    const night = val(cfg.night);
    this.isNight = !!night || (this.lightEnv?.dark ?? 0) > 0.5;
    // Новые фоны уже нарисованы под время суток; старым — синее затемнение
    if (night && !this.lightEnv) this.add.rectangle(0, 0, cfg.width, 540, 0x0a0824, night === true ? 0.42 : night).setOrigin(0).setDepth(30);
    this.makeLights(this.autoLights ?? (val(cfg.lamps) || []), !!night || (this.lightEnv?.dark ?? 0) > 0.3);
    this.makeShadows();
    this.makeCritters(val(cfg.critters) || []);
    this.acidFx = null;

    // Подсказка над предметом
    this.prompt = this.add.container(0, 0).setDepth(900).setVisible(false);
    const key = keyCap(this, 0, 0, 'E', { size: 24 });
    this.promptBg = this.add.rectangle(16, 0, 10, 28, 0x0c0a16, 0.78).setOrigin(0, 0.5).setStrokeStyle(2, 0x0b0912);
    this.promptLabel = this.add.text(24, 0, '', {
      fontFamily: '"PT Mono", monospace', fontSize: '17px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.prompt.add([this.promptBg, key, this.promptLabel]);

    const title = this.add.text(480, 250, val(cfg.title), {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ffffff', stroke: '#ff3d8a', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, hold: 1600, yoyo: true });

    this.dialogue = new Dialogue(this);
    // Тот, кто говорит, жестикулирует и шевелит губами; на крик — ещё и вздрагивает
    this.dialogue.onSpeak = (name, emo, text = '') => {
      const def = this.npcDefs.find((n) => n.name === name && this.npcs[n.id]?.visible);
      const spr = def ? this.npcs[def.id] : name === 'Марк' ? this.player : null;
      if (!spr || isWalking(spr)) return;
      talk(spr);
      spr.__talkUntil = this.time.now + Math.min(3200, 500 + text.length * 38);
      if (emo === 'shout') this.cameras.main.shake(140, 0.0025);
      if (emo === 'shout' && !spr.__hop) {
        spr.__hop = true;
        const y0 = spr.y;
        this.tweens.add({ targets: spr, y: y0 - 6, duration: 70, yoyo: true, repeat: 2, onComplete: () => { spr.y = y0; spr.__hop = false; } });
      }
    };
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
      // Сразу после диалога пробел/E не должен случайно запустить соседний предмет
      if (this.time.now < this.useCooldown) return;
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
    // Кислотный эффект — только пока марочка действует; сверяемся с состоянием постоянно
    if (acidActive()) this.setAcid(true);
    this.time.addEvent({ delay: 500, loop: true, callback: () => {
      if (this.leaving) return;
      const want = acidActive();
      if (want !== !!this.acidFx) this.setAcid(want);
    } });
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
      // Анимации: anim('eat', 1200) — герой; anim('smoke', 2000, 'palych') — NPC
      anim: (name, ms = 900, who) => gesture(this, who ? this.npcs[who] : this.player, name, ms),
      lieDown: (x) => lieDown(this, x ?? this.player.x),
      standUp: () => standUp(this),
      shower: (x) => shower(this, x ?? this.player.x),
      ride: () => rideCloseup(this),
      mirror: () => mirrorCloseup(this),
      // Поесть: анимация, сытость (+энергия в Эп.2). Помыться: душ или раковина
      eat: async (amount, { ms = 1400, energy: en = 0 } = {}) => {
        this.dialogue.close();
        await gesture(this, this.player, 'eat', ms);
        addFood(amount);
        if (en) state.energy = Math.min(100, state.energy + en);
        this.refreshHud();
        this.bumpNeed('food');
      },
      wash: async (amount = 100, { full = true } = {}) => {
        this.dialogue.close();
        if (full) await shower(this, this.player.x);
        else await gesture(this, this.player, 'wash', 1600);
        addClean(amount);
        this.refreshHud();
        this.bumpNeed('clean');
      },
      food: (d) => {
        addFood(d);
        this.refreshHud();
      },
      dirt: (d) => {
        addClean(-d);
        this.refreshHud();
      },
    };
  }

  async runScript(fn, { cost = 0, pose: usePose, cleanup } = {}) {
    this.phone.deferRinging();
    if (this.phone.open) this.phone.hide(true);
    this.busy = true;
    this.prompt.setVisible(false);
    idle(this.player);
    // Пока идёт сценарий у предмета — герой что-то с ним делает (смотрит, тянется, умывается)
    if (usePose) play(this.player, usePose, true);
    try {
      await fn(this.ctx);
    } catch (e) {
      console.error(e);
    } finally {
      cleanup?.();
      if (this.scene.isActive() && !this.leaving) {
        this.dialogue.close();
        this.hideCloseup();
        if (usePose && !this.player.__pose) idle(this.player);
        this.busy = false;
        this.useCooldown = this.time.now + 400;
        if (cost) advanceTime(this, cost);
        this.refreshHud();
        this.refreshNpcs();
        this.events.emit('scriptDone');
      }
    }
  }

  items() {
    const list = [];
    (val(this.cfg.items) || []).concat(this.extraItems || []).forEach((it) => {
      if (it.when && !it.when()) return;
      list.push(typeof it.label === 'function' ? { ...it, label: it.label(), key: `${it.x}:${it.label()}` } : it);
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
    this.fx.ping(it.x, it.npc ? FLOOR - 100 : (it.y ?? FLOOR - 160) + 40);
    if (it.npc) {
      // Отходим на шаг, чтобы не стоять внутри собеседника
      const side = this.player.x < it.npc.x ? -1 : 1;
      const tx = Phaser.Math.Clamp(it.npc.x + side * 84, 40, this.cfg.width - 40);
      this.tweens.add({ targets: this.player, x: tx, duration: 120 });
      this.player.setFlipX(it.npc.x < tx);
      it.npc.setFlipX(tx < it.npc.x);
    }
    // Если от Марка пахнет — собеседник сначала скажет об этом (раз в день)
    if (it.npc) {
      const npcId = it.key.slice(4);
      const r = remark(npcId);
      if (r) {
        const run = it.use;
        const name = this.npcDefs.find((n) => n.id === npcId)?.name;
        return this.runScript(async (ctx) => {
          await ctx.d.say(name || it.label.replace(/^Поговорить: /, ''), r);
          await run(ctx);
        }, { cost: state.episode === 'ep2' ? it.cost ?? 0 : 0 });
      }
    }
    let usePose = it.npc ? null : it.pose ?? USE_POSE[it.sfx];
    let cleanup = null;
    if (!it.npc) this.player.setFlipX(it.x < this.player.x - 4);
    if (it.sfx === 'fridge') cleanup = fridgeOpen(this, it.x);
    // Зеркало дома и в ванной — крупный план с отражением
    const mr = this.mirrorRect;
    if (mr && (it.sfx === 'mirror' || it.sfx === 'water') && Math.abs(it.x - (mr.x + mr.w / 2)) < 120) {
      const run = it.use;
      return this.runScript(async (ctx) => {
        ctx.mirror();
        await run(ctx);
      }, { cost: state.episode === 'ep2' ? it.cost ?? 0 : 0, pose: usePose, cleanup });
    }
    this.runScript(it.use, { cost: state.episode === 'ep2' ? it.cost ?? 0 : 0, pose: usePose, cleanup });
  }

  update(time, dt) {
    const free = !this.busy && !this.pc.open && !this.phone.open;
    // Договорил — снова просто стоит
    [this.player, ...Object.values(this.npcs)].forEach((s) => {
      if (s.__talkUntil && time > s.__talkUntil) {
        s.__talkUntil = 0;
        if ((s.anims.currentAnim?.key || '').endsWith('@talk')) idle(s);
      }
    });
    this.hud.setVisible(!this.busy && !this.pc.open);
    this.phoneBtn.setVisible(!this.busy && !this.pc.open && !this.phone.open);
    this.info.setVisible(state.episode !== 'prologue' && !this.busy && !this.pc.open);
    this.heatBar?.setVisible(free && state.flags.courierActive);
    this.updateDoors();
    this.updateActorsLight();
    // Открыл телефон — смотрит в экран
    if (this.phone.open && !this.busy && !this.__texting) {
      this.__texting = true;
      pose(this.player, 'text');
    } else if (!this.phone.open && this.__texting) {
      this.__texting = false;
      if (!this.busy) idle(this.player);
    }
    this.pulseToBeat();
    this.cfg.tick?.(this, dt);
    if (!this.busy) this.phone.flushQueue();
    this.phone.flushBanners();
    // Голодный обморок — после того, как закончится текущая сцена
    if (state.flags.nd_dead && !this.busy && !this.leaving) return this.gameOver(state.flags.nd_dead);
    if (this.busy || this.notebook.open || this.pc.open || this.phone.open) {
      this.prompt.setVisible(false);
      this.lastPrompt = null;
      return;
    }

    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || this.touch.left;
    const right = k.right.isDown || k.d.isDown || this.touch.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    // Shift зажат — Марк крадётся (и стоя тоже не привлекает внимания)
    this.setSneak(k.shift.isDown);
    // Разворот: короткий кадр «анфас», когда меняем направление
    if (dir && (dir < 0) !== this.player.flipX && !this.turning) {
      this.turning = true;
      pose(this.player, 'turn');
      this.time.delayedCall(70, () => {
        this.turning = false;
        this.player.setFlipX(dir < 0);
      });
    }
    if (dir && !this.turning) {
      const speed = (this.sneaking ? SNEAK_SPEED : SPEED) * walkFactor();
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * speed * (dt / 1000), 40, this.cfg.width - 40);
      this.player.setFlipX(dir < 0);
      walk(this.player, this.sneaking);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        // Крадучись — шагов не слышно
        if (!this.sneaking) sfx(this.cfg.steps || 'stepWood');
        this.stepTimer = this.sneaking ? STEP_EVERY * 1.8 : STEP_EVERY;
        if (val(this.cfg.rain)) this.fx.splash(this.player.x, FLOOR);
      }
    } else if (isWalking(this.player)) {
      idle(this.player);
      this.stepTimer = 0;
    }
    this.updateCritters();
    if (this.checkZones()) return;

    const it = this.nearest();
    const key = it ? it.key || `${it.label}@${it.x}` : null;
    if (it) {
      if (this.lastPrompt !== key) sfx('prompt');
      const top = it.npc ? it.npc.y - it.npc.displayHeight * 0.8 - 14 : FLOOR - 160;
      this.prompt.setVisible(true);
      this.prompt.x = it.x - 14;
      // Подсказка слегка покачивается
      this.prompt.y = (it.y ?? top) + Math.sin(time / 160) * 2;
      this.promptLabel.setText(it.label);
      this.promptBg.setSize(this.promptLabel.width + 18, 28);
      const cam = this.cameras.main;
      const right = cam.scrollX + 960 - 40 - this.promptLabel.width;
      if (this.prompt.x > right) this.prompt.x = right;
    } else {
      this.prompt.setVisible(false);
    }
    this.lastPrompt = key;
  }

  // Кто-то пришёл или ушёл по расписанию, пока Марк был здесь
  refreshNpcs() {
    this.npcDefs.forEach((n) => {
      const s = this.npcs[n.id];
      if (!s || !n.dynamic) return;
      const here = !n.when || n.when();
      if (here === s.visible) return;
      if (here) {
        s.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: s, alpha: 1, duration: 500 });
      } else {
        this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.setVisible(false).setAlpha(1) });
      }
    });
  }

  // ---------- Крадучись и зоны ----------

  setSneak(on) {
    if (on === this.sneaking) return;
    this.sneaking = on;
    if (this.player.anims.isPlaying) walk(this.player, on);
    if (on && !this.sneakHint) {
      this.sneakHint = true;
      const t = this.add.text(this.player.x, this.player.y - 150, 'тсс…', {
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
      idle(this.player);
      this.setSneak(false);
      this.runScript(z.run, { cost: z.cost || 0 });
      return true;
    }
    return false;
  }

  // ---------- Двери ----------

  makeDoor(d) {
    // Геометрию двери (низ проёма, вид, что за ней) задаёт фон локации
    const spot = this.doorSpots?.[d.id] || {};
    return buildDoor(this, { ...d, ...spot }, { bottom: spot.bottom ?? FLOOR - 6, dark: this.lightEnv?.dark ?? 0 });
  }

  setDoor(door, open, silent = false) {
    if (!door || door.open === open) return;
    door.open = open;
    if (!silent) sfx(open ? (door.kind === 'gate' ? 'gate' : 'door') : door.kind === 'interior' || door.kind === 'bath' ? 'doorSoft' : 'doorClose');
    swingDoor(this, door, open, open ? 280 : 220);
    if (!open && !door.interior && door.kind !== 'bath') this.time.delayedCall(220, () => this.cameras.main.shake(80, 0.002));
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

  // Тени под ногами у всех персонажей
  makeShadows() {
    if (!this.textures.exists('shadow')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x07060d, 0.55).fillEllipse(24, 6, 48, 12);
      g.fillStyle(0x07060d, 0.35).fillEllipse(24, 6, 34, 8);
      g.generateTexture('shadow', 48, 12);
      g.destroy();
    }
    this.shadows = new Map();
  }

  shadowOf(s) {
    let sh = this.shadows.get(s);
    if (!sh) {
      sh = this.add.image(s.x, s.y, 'shadow').setDepth((s.depth || 10) - 0.5).setScale(1.1, 1);
      this.shadows.set(s, sh);
    }
    return sh;
  }

  // Подсветка персонажей от ламп + тени (вытягиваются от ближайшего фонаря)
  updateActorsLight() {
    const lights = this.lightEnv?.lights || [];
    this.shadows.forEach((sh, s) => {
      if (!s.active) {
        sh.destroy();
        this.shadows.delete(s);
      }
    });
    this.__actors.forEach((s) => {
      if (!s?.active) return;
      lightSprite(this, s);
      const sh = this.shadowOf(s);
      sh.setVisible(s.visible && s.alpha > 0.5);
      if (!sh.visible) return;
      const sc = s.scaleX / 2;
      sh.x = s.x;
      sh.y = s.y - 2;
      let lean = 0;
      if (this.lightEnv?.dark > 0.3) {
        let best = null;
        lights.forEach((L) => {
          const d = Math.abs(L.x - s.x);
          if (d < L.r * 1.2 && (!best || d < Math.abs(best.x - s.x))) best = L;
        });
        if (best) lean = Phaser.Math.Clamp((s.x - best.x) / 3, -40, 40);
      }
      sh.x += lean * 0.5;
      sh.setScale((1.05 + Math.abs(lean) / 40) * sc, sc);
    });
  }

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
          const p = this.add.sprite(c.x + i * 26 + Phaser.Math.Between(-6, 6), (c.y ?? FLOOR) + 2, 'pigeon_0').setOrigin(0.5, 1).setDepth(12).setScale(2);
          p.setFlipX(Math.random() > 0.5);
          // Клюёт: голова вниз-вверх, иногда переходит на шаг
          p.__peck = this.time.addEvent({ delay: 400 + Math.random() * 900, loop: true, callback: () => {
            if (!p.active || p.texture.key.startsWith('bird')) return;
            p.setTexture(p.texture.key === 'pigeon_0' ? 'pigeon_1' : 'pigeon_0');
            if (Math.random() < 0.15) this.tweens.add({ targets: p, x: p.x + (p.flipX ? -6 : 6), duration: 200 });
            if (Math.random() < 0.1) p.setFlipX(!p.flipX);
          } });
          this.critters.push({ kind: 'pigeon', s: p, home: p.x });
        }
      } else if (c.type === 'cat') {
        const cat = this.add.sprite(c.x, c.y ?? FLOOR, 'cat_0').setOrigin(0.5, 1).setDepth(c.depth ?? 6).setFlipX(!!c.flip).setScale(2);
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
        c.s.__peck?.remove();
        c.s.setAngle(0).setTexture('bird_0').play('bird_fly').setScale(2);
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
      sprite.setFlipX(x < sprite.x);
      walk(sprite);
      // Темп шага под скорость: медленно идущий не «бежит на месте»
      sprite.anims.timeScale = Math.max(0.5, Math.min(1.4, speed / 180));
      this.tweens.add({
        targets: sprite,
        x,
        duration: (Math.abs(x - sprite.x) / speed) * 1000,
        onComplete: () => {
          idle(sprite);
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
    this.infoBg = new Panel(this, 0, 0, 240, 52, { accent: 0x3df0ff, alpha: 0.88 });
    this.dayText = this.add.text(12, 9, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#3df0ff' });
    this.cashText = this.add.text(12, 28, '', { fontFamily: '"PT Mono", monospace', fontSize: '17px', color: '#ffffff' });
    this.info.add([...this.infoBg.objects, this.dayText, this.cashText]);
    // Самочувствие: силы (Эп.2), сытость, чистота — значок и полоска под деньгами
    needIcons(this);
    this.needBars = ['energy', 'food', 'clean'].map((id) => {
      const icon = this.add.image(0, 59, `need_${id}`).setOrigin(0, 0.5).setScale(2);
      const bg = this.add.rectangle(0, 59, NEED_W, 6, 0x2a2838).setOrigin(0, 0.5);
      const fill = this.add.rectangle(0, 59, NEED_W, 6, 0x8ae6a0).setOrigin(0, 0.5);
      this.info.add([icon, bg, fill]);
      return { id, icon, bg, fill };
    });
    const btn = (this.hud = uiContainer(this, 892, 34, 960));
    const bgPanel = new Panel(this, -50, -22, 100, 44, { accent: 0xffd166, alpha: 0.88 });
    const bg = this.add.rectangle(0, 0, 100, 44, 0x000000, 0.001);
    const t = this.add.text(-38, 0, '✎ [Q]', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffd166' }).setOrigin(0, 0.5);
    this.bookCount = this.add.text(36, 0, String(state.lines.length), {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#0c0a16', backgroundColor: '#ffd166', padding: { x: 4, y: 3 },
    }).setOrigin(0.5);
    btn.add([...bgPanel.objects, bg, t, this.bookCount]);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.phone.open) this.notebook.open ? this.notebook.hide() : this.openNotebook();
    });

    // Телефон [P] — рядом с тетрадью, с красным кружком непрочитанного
    const pb = (this.phoneBtn = uiContainer(this, 788, 34, 960));
    const pPanel = new Panel(this, -46, -22, 92, 44, { accent: 0x3df0ff, alpha: 0.88 });
    const pbg = this.add.rectangle(0, 0, 92, 44, 0x000000, 0.001);
    const body = this.add.rectangle(-26, 0, 16, 26, 0x3df0ff).setStrokeStyle(2, 0x0c0a16);
    const scr = this.add.rectangle(-26, -1, 10, 16, 0x0c0a16);
    const pt = this.add.text(-10, 0, '[P]', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#3df0ff' }).setOrigin(0, 0.5);
    this.phoneBadge = this.add.circle(38, -16, 10, 0xff3d3d).setVisible(false);
    this.phoneBadgeT = this.add.text(38, -16, '', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff' }).setOrigin(0.5).setVisible(false);
    pb.add([...pPanel.objects, pbg, body, scr, pt, this.phoneBadge, this.phoneBadgeT]);
    pbg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.busy && !this.notebook.open && !this.pc.open) this.phone.toggle();
    });
    this.refreshPhoneBadge();

    // Палево (курьер Рея, Эп. 2)
    const hb = (this.heatBar = uiContainer(this, 20, 100, 960));
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
    // Во время звонка — телефон у уха
    if (!name) {
      if ((this.player.anims.currentAnim?.key || '').endsWith('@phone')) idle(this.player);
      return;
    }
    play(this.player, 'phone', true);
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
    const ep2 = state.episode === 'ep2';
    // Полоски: в Эп.1 — сытость и чистота, в Эп.2 — ещё и силы
    const shown = this.needBars.filter((b) => (b.id === 'energy' ? ep2 : needsOn()));
    this.needBars.forEach((b) => [b.icon, b.bg, b.fill].forEach((o) => o.setVisible(shown.includes(b))));
    const COLORS = {
      energy: (v) => (v < 25 ? 0xff6b6b : v < 50 ? 0xffd166 : 0x8ae6a0),
      food: (v) => (v < FOOD_WEAK ? 0xff3d3d : v < FOOD_LOW ? 0xffb060 : 0xf0c060),
      clean: (v) => (v < CLEAN_BAD ? 0x8a6a3a : v < CLEAN_LOW ? 0xb8a070 : 0x6ad8ff),
    };
    shown.forEach((b, i) => {
      const v = Math.max(0, Math.min(100, Math.round(b.id === 'energy' ? state.energy : b.id === 'food' ? state.food : state.clean)));
      const x = 12 + i * (NEED_W + 26);
      b.icon.setX(x);
      b.bg.setX(x + 18);
      b.fill.setX(x + 18).setSize(Math.max(1, (NEED_W * v) / 100), 6).setFillStyle(COLORS[b.id](v));
      // Мало — значок мигает
      const low = b.id === 'energy' ? v < 25 : b.id === 'food' ? v < FOOD_LOW : v < CLEAN_LOW;
      if (low && !b.blink) b.blink = this.tweens.add({ targets: b.icon, alpha: 0.25, duration: 420, yoyo: true, repeat: -1 });
      if (!low && b.blink) {
        b.blink.remove();
        b.blink = null;
        b.icon.setAlpha(1);
      }
    });
    if (shown.length) this.infoBg.setSize(Math.max(this.infoBg.width, 12 + shown.length * (NEED_W + 26)), 70);
  }

  // Полоска чуть подпрыгивает, когда поел или помылся
  bumpNeed(id) {
    const b = this.needBars?.find((n) => n.id === id);
    if (!b || !b.icon.visible) return;
    this.tweens.add({ targets: b.icon, scale: 2.8, duration: 120, yoyo: true });
    sfx(id === 'food' ? 'select' : 'line');
  }

  // «Конец»: голодный обморок
  gameOver(reason) {
    if (this.leaving) return;
    this.leaving = true;
    this.busy = true;
    delete state.flags.nd_dead;
    this.player.setOrigin(0.5, 0.62).setAngle(this.player.flipX ? 90 : -90).setY(FLOOR - 24);
    this.cameras.main.shake(400, 0.006);
    this.cameras.main.fadeOut(1600, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      stopAmbience();
      this.scene.start('Over', { reason });
    });
  }

  addCash(delta, label) {
    if (delta) bankTx(delta, label);
    // Отдаёт деньги — протягивает руку; получает — берёт
    if (delta && !isWalking(this.player) && !this.player.__pose) gesture(this, this.player, delta < 0 ? 'give' : 'pick', 600);
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
    if (!isWalking(this.player)) gesture(this, this.player, 'pick', 700);
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
      aberration(this, 0.035);
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
        if (!isWalking(this.player)) return;
        const g = this.add.image(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name).setOrigin(0.5, 1).setDepth(19).setScale(this.player.scaleX, this.player.scaleY)
          .setFlipX(this.player.flipX).setTint(Phaser.Utils.Array.GetRandom([0xff3d8a, 0x3df0ff, 0xffd166])).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: g, alpha: 0, scaleX: g.scaleX * 1.15, duration: 520, onComplete: () => g.destroy() });
      } });
    } else if (!on && this.acidFx) {
      this.acidTween?.stop();
      this.acidTrail?.remove();
      this.acidBlobs?.destroy();
      cam.setRotation(0);
      aberration(this, 0);
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
    this.toastBg = new Panel(this, -350, -33, 700, 66, { accent: 0xffd166, alpha: 0.95 });
    this.toastTitle = this.add.text(0, -14, '', { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#ffd166' }).setOrigin(0.5);
    this.toastText = this.add.text(0, 12, '', { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
    this.toast.add([...this.toastBg.objects, this.toastTitle, this.toastText]);
  }

  showToast(title, text, color = '#ffd166') {
    // Пока висит предыдущая плашка — новая ждёт очереди (одинаковые не дублируем)
    if (this.time.now < (this.toastUntil || 0)) {
      this.toastQueue = (this.toastQueue || []).filter((q) => q[0] !== title);
      if (this.toastQueue.length < 4) this.toastQueue.push([title, text, color]);
      return;
    }
    this.toastUntil = this.time.now + 3300;
    this.toastTitle.setText(title).setColor(color);
    this.toastText.setText(text);
    const tw = Math.max(420, this.toastText.width + 60);
    this.toastBg.x = -tw / 2;
    this.toastBg.accent = Phaser.Display.Color.HexStringToColor(color).color;
    this.toastBg.setSize(tw, 66);
    this.tweens.killTweensOf(this.toast);
    this.toast.y = 620;
    this.tweens.add({
      targets: this.toast, y: 496, duration: 350, ease: 'Back.out', hold: 2600, yoyo: true,
      onComplete: () => {
        this.toastUntil = 0;
        const next = this.toastQueue?.shift();
        if (next) this.showToast(...next);
      },
    });
  }

  // Погода по умолчанию: пыль в тёмных помещениях, туман у воды и на промзоне ночью
  defaultWeather() {
    const env = this.lightEnv;
    if (!env) return null;
    if (['night_port', 'promzona', 'rechnaya'].includes(this.locKey) && env.dark > 0.5) return 'fog';
    if (!env.outdoor && env.dark > 0.3) return 'dust';
    return null;
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
