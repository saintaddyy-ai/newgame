// Актёры на сцене: спрайт персонажа в масштабе мира, анимации и моргание.
// Текстура — лист кадров (chars.js), кадры «idle_0», анимации «key@walk».
import { buildSheet, animSet } from './chars.js';
import { CAST_SPECS } from './cast.js';
import { ART } from './pix.js';

// Подготовить лист кадров (если его ещё нет или внешность поменялась)
export function ensureActor(scene, key, spec, kind = 'npc') {
  const tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
  // Без явного описания — то, по которому лист уже нарисован: иначе образ Марка (стрижка, одежда)
  // сбрасывался к базовому при каждом входе в локацию
  const sp = spec || tex?.__spec || CAST_SPECS[key];
  if (!sp) return key;
  const sig = JSON.stringify(sp);
  if (tex && tex.__sig === sig && animSet(kind).every((n) => tex.__anims?.includes(n))) return key;
  buildSheet(scene, key, sp, kind);
  scene.textures.get(key).__sig = sig;
  return key;
}

export function addActor(scene, x, y, key, { spec, kind, flip = false, scale = 1, depth } = {}) {
  ensureActor(scene, key, spec, kind);
  const s = scene.add.sprite(x, y, key, 'idle_0').setOrigin(0.5, 1).setScale(ART * scale);
  s.__actor = key;
  s.setFlipX(flip);
  // Сцена знает всех актёров: им нужны тени и свет
  if (!scene.__actors) scene.__actors = new Set();
  scene.__actors.add(s);
  s.once('destroy', () => scene.__actors?.delete(s));
  if (depth != null) s.setDepth(depth);
  idle(s);
  return s;
}

const has = (s, frame) => s.texture && s.texture.has(frame);

export function play(s, anim, restart = false) {
  if (!s || !s.__actor) return;
  const k = `${s.__actor}@${anim}`;
  if (s.scene.anims.exists(k)) s.play(k, !restart);
  else if (has(s, `${anim}_0`)) {
    s.anims.stop();
    s.setFrame(`${anim}_0`);
  }
}

// Стоит и дышит; у каждого свой ритм. Сидящий (s.__pose) остаётся в своей позе.
export function idle(s) {
  if (!s || !s.__actor) return;
  if (s.__pose && pose(s, s.__pose)) return;
  const k = `${s.__actor}@idle`;
  if (s.anims.currentAnim?.key === k && s.anims.isPlaying) return;
  if (s.scene.anims.exists(k)) {
    s.play({ key: k, startFrame: Math.floor(Math.random() * 4) });
    s.anims.timeScale = 0.85 + Math.random() * 0.3;
  } else s.setFrame('idle_0');
}

export function walk(s, sneak = false) {
  if (!s || !s.__actor) return;
  s.__pose = null;
  const anim = sneak && has(s, 'sneak_0') ? 'sneak' : 'walk';
  const k = `${s.__actor}@${anim}`;
  if (s.anims.currentAnim?.key !== k || !s.anims.isPlaying) s.play(k);
  s.anims.timeScale = 1;
}

export function talk(s) {
  if (s?.__pose) return;
  play(s, 'talk');
}

// Застывшая поза: pose(s, 'sit'), pose(s, 'pick', 1)
export function pose(s, name, i = 0) {
  if (!s || !has(s, `${name}_${i}`)) return false;
  s.anims.stop();
  s.setFrame(`${name}_${i}`);
  return true;
}

export const isWalking = (s) => !!s?.anims?.isPlaying && /@(walk|sneak)$/.test(s.anims.currentAnim?.key || '');

// Моргание: время от времени у стоящих персонажей закрываются глаза
export function startBlinks(scene, list) {
  return scene.time.addEvent({
    delay: 350,
    loop: true,
    callback: () => {
      list().forEach((s) => {
        if (!s?.visible || !s.__actor || s.__blink || Math.random() > 0.07) return;
        const cur = s.anims.currentAnim?.key || '';
        if (!cur.endsWith('@idle') || !has(s, 'blink_0')) return;
        s.__blink = true;
        s.anims.pause();
        const back = s.frame.name;
        s.setFrame('blink_0');
        scene.time.delayedCall(120, () => {
          s.__blink = false;
          if (!s.active) return;
          if ((s.anims.currentAnim?.key || '').endsWith('@idle')) {
            s.setFrame(back);
            s.anims.resume();
          }
        });
      });
    },
  });
}

// Сделать «кадр» поверх анимации: жест на время
export function gesture(scene, s, name, ms = 900) {
  if (!s || !s.__actor) return Promise.resolve();
  const k = `${s.__actor}@${name}`;
  if (scene.anims.exists(k)) s.play(k);
  else if (!pose(s, name)) return Promise.resolve();
  return new Promise((r) => scene.time.delayedCall(ms, () => {
    if (s.active) idle(s);
    r();
  }));
}
