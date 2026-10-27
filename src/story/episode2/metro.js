// Метро: десять веток, у каждой своё оформление станций. Схема — крупным планом, выбор цифрами или кликом.
import { F, hasItem, now, at } from './common.js';
import { LINES } from './scenery.js';
import { whereIs, PLACE_NAMES } from './world.js';

// exit: куда ведёт выход в город (null — наверху ничего интересного)
export const STATIONS = {
  zavodskaya: { line: 'red', name: 'Заводская', exit: ['crossroads', 1500], pos: [0.5, 0.78] },
  arena: { line: 'ring', name: 'Арена', exit: ['arena', 200], pos: [0.5, 0.5] },
  rechnaya: { line: 'green', name: 'Речная', exit: ['rechnaya', 200], pos: [0.18, 0.3], need: () => F.samizdatInvite || hasItem('token'), lock: 'нужен жетон Адама' },
  portovaya: { line: 'blue', name: 'Портовая', exit: ['night_port', 200], pos: [0.85, 0.62] },
  promzona: { line: 'orange', name: 'Промзона', exit: ['promzona', 200], pos: [0.2, 0.78] },
  nochnaya: { line: 'violet', name: 'Ночная', exit: ['club', 200], pos: [0.82, 0.25] },
  serpukhovskaya: { line: 'grey', name: 'Серпуховская', exit: null, pos: [0.62, 0.9] },
  solnechnaya: { line: 'yellow', name: 'Солнечная', exit: null, pos: [0.5, 0.12] },
  fili: { line: 'cyan', name: 'Филёвская', exit: null, pos: [0.1, 0.52] },
  lublino: { line: 'lime', name: 'Люблино', exit: null, pos: [0.9, 0.88] },
};

export const metroOpen = () => now() >= at(6) && now() < at(25);

export const station = () => STATIONS[F.e2Station] || STATIONS.zavodskaya;

// Схема на экране: ветки лучами от кольца, станции — кружки с номерами
export function drawScheme(s, layer, x0, y0, w, h, { labels = true, onPick, current } = {}) {
  const g = s.add.graphics();
  const add = (o) => (layer.add ? layer.add(o) : layer.push(o), o);
  add(g);
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  g.lineStyle(labels ? 10 : 5, LINES.ring.color, 1).strokeCircle(cx, cy, Math.min(w, h) * (labels ? 0.16 : 0.14));
  const ids = Object.keys(STATIONS);
  const items = [];
  ids.forEach((id, i) => {
    const st = STATIONS[id];
    const L = LINES[st.line];
    const x = x0 + st.pos[0] * w;
    const y = y0 + st.pos[1] * h;
    if (st.line !== 'ring') g.lineStyle(labels ? 8 : 4, L.color, 1).lineBetween(cx, cy, x, y);
    const locked = st.need && !st.need();
    const dot = s.add.circle(x, y, labels ? 13 : 6, id === current ? 0xffffff : locked ? 0x3a3a44 : L.color).setStrokeStyle(labels ? 3 : 2, 0x0c0a16);
    add(dot);
    if (labels) {
      const n = i < 9 ? String(i + 1) : '0';
      add(s.add.text(x, y, n, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#0c0a16' }).setOrigin(0.5));
      add(s.add.text(x, y + 20, `${st.name}${locked ? ' (закрыто)' : ''}${id === current ? ' (ты здесь)' : ''}`, {
        fontFamily: '"PT Mono", monospace', fontSize: '15px', color: locked ? '#77729a' : '#ffffff', stroke: '#0c0a16', strokeThickness: 4,
      }).setOrigin(0.5, 0));
      if (onPick && id !== current) {
        dot.setInteractive({ useHandCursor: true }).on('pointerdown', () => onPick(id));
      }
    }
    items.push(id);
  });
  return items;
}

// Выбор станции: возвращает id или null (Esc)
export function chooseStation(ctx) {
  const { scene, closeup, closeupHide } = ctx;
  return new Promise((resolve) => {
    let done = false;
    const finish = (id) => {
      if (done) return;
      done = true;
      scene.input.keyboard.off('keydown', onKey);
      closeupHide();
      resolve(id);
    };
    const ids = Object.keys(STATIONS);
    const pick = (id) => {
      const st = STATIONS[id];
      if (id === F.e2Station) return;
      if (st.need && !st.need()) {
        ctx.sfx('deny');
        return;
      }
      ctx.sfx('select');
      finish(id);
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape' || ev.key === 'q' || ev.key === 'й') return finish(null);
      const n = ev.key === '0' ? 10 : parseInt(ev.key, 10);
      if (n >= 1 && n <= ids.length) pick(ids[n - 1]);
    };
    closeup((s, layer) => {
      layer.add(s.add.rectangle(60, 20, 840, 500, 0xf1ead8).setOrigin(0).setStrokeStyle(4, 0x2a2238));
      layer.add(s.add.text(480, 44, 'СХЕМА МЕТРО', { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#2a2238' }).setOrigin(0.5));
      const tmp = [];
      drawScheme(s, tmp, 90, 70, 780, 400, { onPick: pick, current: F.e2Station });
      layer.add(tmp);
      layer.add(s.add.text(480, 500, 'Цифра или клик — поехать (20 мин)   ·   Esc — остаться', { fontFamily: '"PT Mono", monospace', fontSize: '15px', color: '#2a2238' }).setOrigin(0.5));
    });
    scene.input.keyboard.on('keydown', onKey);
  });
}

// Карта в телефоне: схема и где сейчас знакомые
export function mapInfo() {
  const people = [
    ['Дэн', 'dan'], ['Рей', 'ray'], ['Мира', 'mira'], ['Кира', 'kira'], ['Лола', 'lola'], ['Стас', 'stas'], ['Адам', 'adam'], ['Аркаша', 'arkasha'], ['Мама', 'mom'],
  ].map(([name, id]) => ({ name, where: PLACE_NAMES[whereIs(id)] || '—' })).filter((p) => p.where !== '—');
  return {
    draw(phone, x, y, w, h) {
      const objs = [];
      drawScheme(phone.scene, objs, x + 6, y + 4, w - 12, h - 8, { labels: false, current: F.e2Station });
      objs.forEach((o) => phone.add(o));
    },
    people,
  };
}

