// Персонажи: процедурный пиксель-арт по описанию внешности (spec).
// Скелет из суставов → конечности-«цилиндры» с освещением сверху-слева (3–5 тонов),
// голова вида 3/4 с двумя глазами, причёски-шаблоны, одежда со складками, контур.
// Один spec → лист кадров: дыхание, ходьба (8), крадущийся шаг (8), разговор, поворот, сидя,
// подобрать, телефон у уха и действия (еда, умывание, зеркало и т. д.).
import { Pix } from './pix.js';
import { ramp, hex, mix, shift } from './color.js';

export const FW = 48;
export const FH = 84;
const GY = FH - 1; // ступни
const INK = 0x0b0912;
const L3 = (() => {
  const v = [-0.55, -0.5, 0.67];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

// Глубина частей (чем больше, тем ближе к зрителю)
const Z = { armF: 1, handF: 2, legF: 3, hairBack: 4, legN: 5, skirt: 6, torso: 7, neck: 8, head: 9, hair: 10, hat: 11, armN: 12, handN: 13, item: 14 };

// ---------- Позы ----------
// Углы в радианах: 0 — конечность вниз, плюс — вперёд (вправо, куда смотрит герой).
const D = Math.PI / 180;
const base = () => ({
  x: 0, y: 0, lean: 0, headDx: 0, headDy: 0, breath: 0,
  legN: [2 * D, 2 * D, 0], legF: [-3 * D, 2 * D, 0],
  armN: [-4 * D, 10 * D], armF: [6 * D, 12 * D],
  eyes: 'open', mouth: 'closed', brows: 'neutral', view: '34', hand: null, item: null,
});

const WALK = [
  // [бедро N, колено N, бедро F, колено F, подпрыгивание]
  [24, 4, -20, 16, 0],
  [14, 22, -10, 36, 1],
  [2, 6, 12, 62, 0],
  [-12, 4, 24, 30, -1],
  [-20, 16, 24, 4, 0],
  [-10, 36, 14, 22, 1],
  [12, 62, 2, 6, 0],
  [24, 30, -12, 4, -1],
];

export const POSES = {
  idle: [0, 1, 2, 1].map((b) => () => ({ ...base(), breath: b })),
  blink: [() => ({ ...base(), eyes: 'blink' })],
  walk: WALK.map(([a, b, c, d, bob]) => () => ({
    ...base(), y: bob, legN: [a * D, b * D, 0], legF: [c * D, d * D, 0],
    armN: [-a * 0.8 * D, (14 + Math.max(0, -a) * 0.6) * D], armF: [-c * 0.8 * D, (14 + Math.max(0, -c) * 0.6) * D],
    lean: 3 * D,
  })),
  sneak: WALK.map(([a, b, c, d, bob]) => () => ({
    ...base(), y: 6 + bob, lean: 22 * D, headDx: 1, headDy: 1,
    legN: [(a * 0.8 + 24) * D, (b * 0.8 + 44) * D, 0], legF: [(c * 0.8 + 24) * D, (d * 0.8 + 44) * D, 0],
    armN: [(8 - a * 0.3) * D, 48 * D], armF: [(14 - c * 0.3) * D, 44 * D],
  })),
  talk: [
    () => ({ ...base(), mouth: 'open', armN: [10 * D, 70 * D] }),
    () => ({ ...base(), mouth: 'closed', armN: [18 * D, 84 * D], breath: 1 }),
    () => ({ ...base(), mouth: 'open', armN: [24 * D, 96 * D], breath: 1 }),
    () => ({ ...base(), mouth: 'closed', armN: [12 * D, 76 * D] }),
  ],
  turn: [() => ({ ...base(), view: 'front', legN: [-4 * D, 2 * D, 0], legF: [4 * D, 2 * D, 0], armN: [-6 * D, 6 * D], armF: [6 * D, 6 * D] })],
  sit: [() => ({ ...base(), y: 15, legN: [80 * D, 82 * D, 0], legF: [74 * D, 76 * D, 0], armN: [10 * D, 50 * D], armF: [14 * D, 48 * D], sit: true })],
  pick: [
    () => ({ ...base(), y: 4, lean: 25 * D, legN: [30 * D, 40 * D, 0], legF: [6 * D, 20 * D, 0], armN: [20 * D, 20 * D] }),
    () => ({ ...base(), y: 12, lean: 50 * D, headDx: 1, legN: [56 * D, 92 * D, 0], legF: [26 * D, 70 * D, 0], armN: [38 * D, 4 * D], hand: 'grab' }),
    () => ({ ...base(), y: 2, lean: 10 * D, armN: [16 * D, 60 * D], hand: 'grab' }),
  ],
  phone: [
    () => ({ ...base(), armN: [-14 * D, 160 * D], hand: 'phone', mouth: 'closed' }),
    () => ({ ...base(), armN: [-14 * D, 160 * D], hand: 'phone', mouth: 'open', breath: 1 }),
  ],
  // Смотрит в экран телефона (фото, переписка)
  text: [() => ({ ...base(), armN: [20 * D, 120 * D], armF: [26 * D, 116 * D], hand: 'phoneScreen', headDy: 1, headDx: 1 })],
  // Протянуть руку: отдать/взять
  give: [() => ({ ...base(), lean: 4 * D, armN: [70 * D, 10 * D], hand: 'grab' })],
  // Еда / питьё: рука ко рту
  eat: [
    () => ({ ...base(), armN: [10 * D, 130 * D], hand: 'grab', mouth: 'open' }),
    () => ({ ...base(), armN: [16 * D, 100 * D], hand: 'grab', mouth: 'closed' }),
  ],
  // Умыться: наклон, ладони к лицу
  wash: [
    () => ({ ...base(), lean: 30 * D, y: 3, armN: [30 * D, 110 * D], armF: [36 * D, 104 * D], eyes: 'closed' }),
    () => ({ ...base(), lean: 26 * D, y: 2, armN: [44 * D, 70 * D], armF: [48 * D, 64 * D], eyes: 'closed' }),
  ],
  // Поправить капюшон / волосы (у зеркала)
  hood: [
    () => ({ ...base(), armN: [-30 * D, 170 * D], armF: [10 * D, 150 * D] }),
    () => ({ ...base(), armN: [-24 * D, 160 * D], armF: [16 * D, 140 * D], breath: 1 }),
  ],
  // Переодеться: руки вверх
  dress: [
    () => ({ ...base(), armN: [-150 * D, 0], armF: [-160 * D, 0], eyes: 'closed' }),
    () => ({ ...base(), armN: [170 * D, 10 * D], armF: [160 * D, 10 * D], eyes: 'closed', breath: 1 }),
  ],
  // У микрофона: рука у наушника, рот открыт
  mic: [
    () => ({ ...base(), armF: [-10 * D, 150 * D], armN: [10 * D, 80 * D], mouth: 'open' }),
    () => ({ ...base(), armF: [-10 * D, 150 * D], armN: [20 * D, 100 * D], mouth: 'closed', breath: 1 }),
  ],
  // На сцене: рука вверх
  hype: [
    () => ({ ...base(), armN: [10 * D, 150 * D], hand: 'mic', armF: [150 * D, 10 * D], mouth: 'open' }),
    () => ({ ...base(), y: 1, armN: [10 * D, 150 * D], hand: 'mic', armF: [120 * D, 30 * D], mouth: 'closed', breath: 1 }),
  ],
  // В вагоне: держится за поручень
  rail: [() => ({ ...base(), armN: [-172 * D, 0], armF: [8 * D, 14 * D] })],
  // Лежит (спит) — рисуется стоя, сцена поворачивает спрайт
  sleep: [() => ({ ...base(), eyes: 'closed', armN: [6 * D, 20 * D], armF: [8 * D, 20 * D] })],
  // Курит / пьёт из бутылки
  smoke: [
    () => ({ ...base(), armN: [6 * D, 140 * D], hand: 'cig' }),
    () => ({ ...base(), armN: [16 * D, 70 * D], hand: 'cig', breath: 1 }),
  ],
  // Сидит на корточках / в отчаянии
  crouch: [() => ({ ...base(), y: 20, lean: 20 * D, legN: [100 * D, 150 * D, 0], legF: [90 * D, 150 * D, 0], armN: [60 * D, 40 * D], armF: [60 * D, 40 * D] })],
};

// Какие анимации нужны: героям — всё, массовке — базовые
const SET_FULL = Object.keys(POSES);
const SET_NPC = ['idle', 'blink', 'walk', 'talk', 'turn', 'sit', 'phone', 'give', 'pick', 'eat', 'smoke', 'text'];
const SET_CROWD = ['idle', 'blink', 'walk', 'talk', 'turn'];
export const ANIM_RATE = { idle: 3, walk: 11, sneak: 7, talk: 6, phone: 2, eat: 3, wash: 3, hood: 3, dress: 3, mic: 5, hype: 4, smoke: 1.5, pick: 8 };

// ---------- Внешность ----------

const SKINS = ['#f2d3b6', '#e8bc98', '#e0b08a', '#c89070', '#a06c4a', '#7a5038'];

// Приводим и старые описания людей (people.js), и новые к одному виду
export function normSpec(sp) {
  const s = { ...sp };
  s.h = s.h || (s.kid ? 46 : s.female ? 58 : 63);
  s.build = s.build || (s.kid ? 'kid' : 'normal');
  s.skin = s.skin || SKINS[1];
  s.hairColor = s.hairColor || '#2a1e18';
  // В старых описаниях top — цвет; тип одежды — garment
  if (typeof s.top === 'string' && s.top.startsWith('#')) s.topColor = s.topColor || s.top;
  if (s.dress) s.garment = 'dress';
  else if (s.hair === 'hood') s.garment = 'hoodie';
  if (!s.garment) {
    const k = (hex(s.topColor || '#555555') + (s.hairColor ? hex(s.hairColor) : 0)) % 5;
    s.garment = ['hoodie', 'tee', 'jacket', 'sweater', 'tee'][k];
  }
  if (s.hair === 'hood') {
    s.hair = 'short';
    s.hood = true;
  }
  s.topColor = s.topColor || '#3a3a48';
  s.accent = s.accent || '#e8e8e8';
  s.pants = s.pants || '#2d3550';
  s.shoes = s.shoes || '#e8e8e8';
  s.capColor = s.capColor || s.accent;
  return s;
}

// ---------- Геометрия ----------

function rot(a, len) {
  return [Math.sin(a) * len, Math.cos(a) * len];
}

class Body {
  constructor(spec) {
    this.sp = spec;
    this.p = new Pix(FW, FH);
    this.ids = new Uint8Array(FW * FH);
    this.tone = new Int8Array(FW * FH).fill(-1);
    this.rps = new Array(FW * FH); // рампа каждого пикселя
  }

  put(x, y, id, rp, t) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= FW || y >= FH) return;
    const i = y * FW + x;
    if (this.ids[i] > id) return; // за более близкой частью
    this.ids[i] = id;
    this.tone[i] = t;
    this.rps[i] = rp;
    this.p.set(x, y, rp[Math.max(0, Math.min(4, t))]);
  }

  // Пиксель, который рисуем поверх без проверки глубины (детали одежды, глаза)
  over(x, y, c) {
    this.p.set(Math.round(x), Math.round(y), c);
  }

  // «Цилиндр» от a до b с радиусами r0..r1 и освещением
  seg(a, b, r0, r1, rp, id, { flat = false, hi = true } = {}) {
    const [ax, ay] = a;
    const [bx, by] = b;
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy || 1;
    const len = Math.sqrt(L2);
    const nx = -dy / len;
    const ny = dx / len;
    const R = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(ay, by) - R); y <= Math.ceil(Math.max(ay, by) + R); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - R); x <= Math.ceil(Math.max(ax, bx) + R); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let t = ((px - ax) * dx + (py - ay) * dy) / L2;
        t = Math.max(0, Math.min(1, t));
        const qx = ax + dx * t;
        const qy = ay + dy * t;
        const r = r0 + (r1 - r0) * t;
        const dd = Math.hypot(px - qx, py - qy);
        if (dd > r + 0.15) continue;
        let u = ((px - qx) * nx + (py - qy) * ny) / Math.max(0.5, r);
        u = Math.max(-1, Math.min(1, u));
        // Нормаль цилиндра → освещённость
        const nz = Math.sqrt(Math.max(0, 1 - u * u));
        const I = flat ? 0.6 : u * nx * L3[0] + u * ny * L3[1] + nz * L3[2];
        this.put(x, y, id, rp, toneOf(I, hi));
      }
    }
  }

  // Многоугольник с освещением «как у бочки» по горизонтали
  blob(pts, rp, id, { cx, hw, flat = false, hi = true, topLight = 0 } = {}) {
    let minY = Infinity;
    let maxY = -Infinity;
    pts.forEach(([, y]) => {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    this.p.poly(pts, null, (x, y) => {
      const c = typeof cx === 'function' ? cx(y) : cx;
      const w = typeof hw === 'function' ? hw(y) : hw;
      const u = Math.max(-1, Math.min(1, (x + 0.5 - c) / Math.max(1, w)));
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      const v = (y - minY) / Math.max(1, maxY - minY);
      const I = flat ? 0.6 : u * L3[0] + nz * L3[2] + (0.5 - v) * topLight;
      this.put(x, y, id, rp, toneOf(I, hi));
      return null;
    });
  }

  // Тень от ближней части на дальнюю: пиксели дальней части у границы темнеют
  contact() {
    const { ids, tone } = this;
    const darken = [];
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const i = y * FW + x;
        const id = ids[i];
        if (!id) continue;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1]]) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue;
          const j = ny * FW + nx;
          const nid = ids[j];
          if (nid > id && sep(nid, id)) {
            darken.push(i);
            break;
          }
        }
      }
    }
    darken.forEach((i) => {
      const rp = this.rps[i];
      if (!rp) return;
      const t = Math.max(0, Math.min(tone[i], 1) - 1);
      tone[i] = t;
      this.p.d[i] = this.p.col(rp[t]);
    });
  }

  finish() {
    this.contact();
    // Контур: тёмный, с оттенком соседнего цвета
    const p = this.p;
    p.outline(INK, (x, y) => {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const c = p.getHex(x + ox, y + oy);
        if (c >= 0) return mix(c, INK, 0.78);
      }
      return INK;
    });
    return p;
  }
}

// Части, между которыми рисуем разделяющую тень
function sep(front, back) {
  if (front === back) return false;
  if (front === Z.hair || front === Z.hat) return back !== Z.head || true;
  return true;
}

function toneOf(I, hi) {
  if (I > 0.93 && hi) return 4;
  if (I > 0.74) return 3;
  if (I > 0.42) return 2;
  if (I > 0.16) return 1;
  return 0;
}

// ---------- Голова ----------
// Голова 9×9 вида 3/4 (лицо вправо). s — кожа, h — свет, d — тень, r — ухо
const HEAD34 = [
  '..sssss..',
  '.sshhhss.',
  'sshhhhhs.',
  'sshhhhhs.',
  'dshhhhhss',
  'drssshhs.',
  '.dssssss.',
  '..dssss..',
  '...dds...',
];
const HEADF = [
  '..sssss..',
  '.sshhhss.',
  'sshhhhhsd',
  'sshhhhhsd',
  'dshhhhhsd',
  'dsshhhssd',
  '.dsssssd.',
  '..dsssd..',
  '...ddd...',
];

// Причёски: смещение и строки. H — основа, L — свет, D — тень, K — самая тёмная
// x/y — относительно левого верхнего угла головы
const HAIR34 = {
  short: [-1, -2, [
    '..HHHHHH...',
    '.HLLLLHHH..',
    'DHHLLHHHHH.',
    'DDHHHHHH...',
    'DDHH.......',
    '.DH........',
  ]],
  buzz: [0, -1, [
    '..DHHHD..',
    '.DHHHHHD.',
    'DHD......',
    'DD.......',
  ]],
  undercut: [-1, -3, [
    '...HHHHH...',
    '..HLLLLHH..',
    '.HHLLLHHHH.',
    'DHHHHHHHHH.',
    'DD.........',
    'D..........',
  ]],
  bleach: [-1, -3, [
    '...LLLLL...',
    '..LLLLLLL..',
    '.HLLLLLLLL.',
    'DHHHHHHHH..',
    'DD.........',
    'D..........',
  ]],
  long: [-2, -2, [
    '...HHHHHH...',
    '..HLLLLHHH..',
    '.HHLLLHHHHH.',
    '.DHHHHHHHHH.',
    'DDHHH..HH...',
    'DDHH....H...',
    'DDH.........',
    'DDH.........',
    'DDH.........',
    'DDH.........',
    '.DD.........',
    '.D..........',
  ]],
  bob: [-2, -2, [
    '...HHHHHH...',
    '..HLLLLHHH..',
    '.HHLLLHHHHH.',
    '.DHHHHHHHHH.',
    'DDHHH..HH...',
    'DDHH....H...',
    'DDH.........',
    '.DD.........',
  ]],
  bun: [-1, -4, [
    '..DHH......',
    '..HLH......',
    '...HHHHH...',
    '..HLLLLHH..',
    '.HHLLLHHHH.',
    'DDHHHHHHH..',
    'DDH........',
    '.D.........',
  ]],
  ponytail: [-3, -2, [
    '....HHHHHH...',
    '...HLLLLHHH..',
    '..HHLLLHHHHH.',
    'DHHHHHHHHH...',
    'DDDHH........',
    'DD..H........',
    'DD...........',
    'D............',
  ]],
  mohawk: [0, -4, [
    '...LH....',
    '..HLHH...',
    '..HHHH...',
    '..DHHD...',
    'D........',
  ]],
  curly: [-2, -3, [
    '..H.HH.H....',
    '.HLHLLHLH...',
    'HHLLHLLHHH..',
    'DHHHHHHHHHH.',
    'DHHHH..H....',
    'DDHH........',
    '.DH.........',
  ]],
  // Рыжие кудри Ромы — падают на глаза
  curlsEyes: [-2, -3, [
    '..H.HH.H.H..',
    '.HLHLLHLHH..',
    'HHLLHLLHHHH.',
    'DHHHHHHHHHHH',
    'DHHHHHHHHHH.',
    'DDHH..HHH.H.',
    '.DH....H....',
    '.D..........',
  ]],
  // Лохматые тёмные (Аркаша)
  shaggy: [-2, -3, [
    '...H.HHH....',
    '..HHLLLHH...',
    '.HHLLLLHHHH.',
    'HDHHHHHHHHH.',
    'DDHHHHH.HHH.',
    'DDHH....H...',
    'DDH.........',
    '.D..........',
  ]],
  // Светлые, зачёсанные набок (Рей)
  swept: [-1, -3, [
    '....LLLL...',
    '..HLLLLLLL.',
    '.HHLLLLHHHH',
    'DHHHHHHH...',
    'DDHH.......',
    '.DH........',
  ]],
  // Русая чёлка (Стас)
  fringe: [-1, -3, [
    '...HHHHH...',
    '..HLLLLHH..',
    '.HHLLLLLHH.',
    'DHHHHHLLHH.',
    'DDHH...HH..',
    '.DH........',
  ]],
  dreads: [-2, -2, [
    '...HHHHHH...',
    '..HLHLHLHH..',
    '.HHLHLHHHHH.',
    'DHHHHHHHHHH.',
    'DHDHD..H.H..',
    'DHDHD.......',
    'DHDH........',
    'DHDH........',
    'D.DH........',
    'D.D.........',
  ]],
  bald: [0, 0, []],
};
const HAIRF = {
  default: [-1, -2, [
    '..HHHHHHH..',
    '.HLLLLLLHH.',
    'DHHLLLLHHHD',
    'DHH.....HHD',
    'DD.......DD',
  ]],
  long: [-2, -2, [
    '...HHHHHHH...',
    '..HLLLLLLHH..',
    '.DHHLLLLHHHD.',
    '.DHH.....HHD.',
    '.DD.......DD.',
    '.DD.......DD.',
    '.DD.......DD.',
    '.DD.......DD.',
    '.DD.......DD.',
    '..D.......D..',
  ]],
  bald: [0, 0, []],
};

// Капюшон: C — ткань, c — свет, B — тень, Q — тень внутри
const HOOD34 = [-2, -3, [
  '...CCCCCC...',
  '..CccccCCC..',
  '.CCcccCCCCC.',
  'BCCCCQQQQQC.',
  'BCCCQ.......',
  'BBCQ........',
  'BBCQ........',
  'BBCCQ.......',
  '.BCCC.......',
  '..BBC.......',
]];
const HOODF = [-2, -3, [
  '...CCCCCCC...',
  '..CccccccCC..',
  '.CCcccccCCCC.',
  '.CCQQQQQQQCC.',
  'BCQ.......QCB',
  'BCQ.......QCB',
  'BCQ.......QCB',
  'BCCQ.....QCCB',
  '.BCCQ...QCCB.',
  '..BCC...CCB..',
]];

function drawTemplate(b, rows, ox, oy, map, id, flip = false) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const m = map[ch];
    if (!m) return;
    const xx = flip ? ox + row.length - 1 - x : ox + x;
    if (typeof m === 'function') m(xx, oy + y);
    else b.put(xx, oy + y, id, m[0], m[1]);
  }));
}

function drawHead(b, hx, hy, pose) {
  const sp = b.sp;
  const skin = ramp(sp.skin, 'skin');
  const front = pose.view === 'front';
  const tpl = front ? HEADF : HEAD34;
  drawTemplate(b, tpl, hx, hy, { s: [skin, 2], h: [skin, 3], d: [skin, 1], r: [skin, 0] }, Z.head);
  const hr = ramp(sp.hairColor);
  const eyeC = 0x1a1220;
  const white = 0xe8e4f0;
  const browC = hr[0];
  // Глаза: в 3/4 ближний глаз (белок + зрачок) и дальний у переносицы
  const eyes = front ? [[hx + 2, hy + 4, true], [hx + 6, hy + 4, true]] : [[hx + 4, hy + 4, true], [hx + 7, hy + 4, false]];
  const brows = front ? [[hx + 2, hy + 3, 2], [hx + 5, hy + 3, 2]] : [[hx + 3, hy + 3, 2], [hx + 7, hy + 3, 1]];
  if (!sp.hideBrows) {
    brows.forEach(([x, y, w], i) => {
      const tilt = pose.brows === 'angry' ? (i === 0 ? [0, 1] : [1, 0]) : pose.brows === 'sad' ? (i === 0 ? [1, 0] : [0, 1]) : [0, 0];
      for (let k = 0; k < w; k++) b.over(x + k, y + (pose.brows === 'up' ? -1 : 0) + (tilt[k] || 0) * (front ? 0 : 0), browC);
    });
  }
  eyes.forEach(([x, y, big]) => {
    if (pose.eyes === 'blink' || pose.eyes === 'closed') {
      b.over(x, y, skin[0]);
      if (big) b.over(x - 1, y, skin[1]);
      return;
    }
    if (big && !front) b.over(x - 1, y, white);
    b.over(x, y, eyeC);
    if (pose.eyes === 'wide') b.over(x, y - 1, eyeC);
  });
  // Нос и рот
  if (!front) {
    b.over(hx + 8, hy + 5, skin[2]);
    b.over(hx + 8, hy + 6, skin[0]);
    b.over(hx + 7, hy + 6, skin[1]);
  } else {
    b.over(hx + 4, hy + 6, skin[1]);
  }
  const mouthC = sp.lipstick ? hex(sp.lipstick) : mix(skin[0], 0x5a1a2a, 0.5);
  const mx = front ? hx + 3 : hx + 5;
  const my = hy + 7;
  if (pose.mouth === 'open') {
    b.over(mx, my, 0x3a0a14);
    b.over(mx + 1, my, 0x3a0a14);
    b.over(mx, my + 1, mix(skin[0], 0x3a0a14, 0.5));
  } else if (pose.mouth === 'smile') {
    b.over(mx, my, mouthC);
    b.over(mx + 1, my, mouthC);
    b.over(mx + 2, my - 1, mouthC);
  } else {
    b.over(mx, my, mouthC);
    b.over(mx + 1, my, sp.lipstick ? mouthC : skin[1]);
  }
  // Растительность на лице
  if (sp.mustache) for (let k = 0; k < 3; k++) b.over(mx - 1 + k, my - 1, hr[1]);
  if (sp.beard) {
    for (let y = 5; y < 9; y++) for (let x = front ? 1 : 1; x < 8; x++) {
      const tplC = tpl[y][x];
      if (tplC === '.' || (y === 7 && x === mx - hx) || (y === 7 && x === mx - hx + 1)) continue;
      if (y >= 6 || x <= 2 || x >= 6) b.over(hx + x, hy + y, (x + y) % 3 ? hr[1] : hr[2]);
    }
    b.over(mx, my, mouthC);
  }
  if (sp.piercing) b.over(front ? hx + 6 : hx + 8, hy + 5, 0xe8e8f0);
  if (sp.earring) b.over(front ? hx : hx + 1, hy + 7, 0xffd166);
}

function drawHair(b, hx, hy, pose) {
  const sp = b.sp;
  const front = pose.view === 'front';
  const hr = ramp(sp.hairColor);
  const map = { H: [hr, 2], L: [hr, 3], D: [hr, 1], K: [hr, 0] };
  if (sp.hood && !pose.hoodDown) {
    const cr = ramp(sp.topColor);
    const [ox, oy, rows] = front ? HOODF : HOOD34;
    drawTemplate(b, rows, hx + ox, hy + oy, { C: [cr, 2], c: [cr, 3], B: [cr, 1], Q: [cr, 0] }, Z.hair);
    // Из-под капюшона торчит чёлка
    if (!front) {
      b.over(hx + 3, hy + 1, hr[2]);
      b.over(hx + 4, hy + 1, hr[2]);
      b.over(hx + 5, hy + 1, hr[1]);
      b.over(hx + 4, hy + 2, hr[1]);
    }
    return;
  }
  if (sp.hair === 'scarf') {
    // Платок бабушки: закрывает голову, узел под подбородком
    const cr = ramp(sp.capColor);
    const rows = front
      ? ['..CCCCCCC..', '.CccccccCC.', 'BCccccccCCB', 'BCC.....CCB', 'BC.......CB', 'BC.......CB', 'BB.......BB', '.BB.....BB.', '...BBCBB...']
      : ['..CCCCCC...', '.CccccCCC..', 'BCcccCCCCC.', 'BCCCC......', 'BCCC.......', 'BCC........', 'BBC........', '.BBC.......', '..BBCC.....', '....CB.....'];
    drawTemplate(b, rows, hx - 1, hy - 2, { C: [cr, 2], c: [cr, 3], B: [cr, 1] }, Z.hair);
    return;
  }
  const set = front ? HAIRF : HAIR34;
  const key = front ? (['long', 'bob', 'dreads', 'ponytail'].includes(sp.hair) ? 'long' : sp.hair === 'bald' || sp.hair === 'buzz' ? 'bald' : 'default') : sp.hair;
  const [ox, oy, rows] = set[key] || set.short || set.default;
  drawTemplate(b, rows, hx + ox, hy + oy, map, Z.hair);
  if (sp.hair === 'cap' || sp.cap) drawCap(b, hx, hy, front);
  if (sp.hair === 'beanie' || sp.beanie) drawBeanie(b, hx, hy, front);
}

function drawCap(b, hx, hy, front) {
  const cr = ramp(b.sp.capColor);
  const rows = front
    ? ['..CCCCCCC..', '.CccccccCC.', 'BCCCCCCCCCB', '.BBBBBBBBB.']
    : ['..CCCCCC....', '.CccccCCC...', 'BCCcccCCCC..', 'BBBCCCCCVVVV'];
  drawTemplate(b, rows, hx - 1, hy - 2, { C: [cr, 2], c: [cr, 3], B: [cr, 1], V: [cr, 0] }, Z.hat);
}

function drawBeanie(b, hx, hy, front) {
  const cr = ramp(b.sp.capColor);
  const rows = front
    ? ['...CCCCC...', '..CccccCC..', '.CCcccCCCC.', 'BBBBBBBBBBB']
    : ['...CCCCC...', '..CccccCC..', '.CCcccCCCC.', 'BBBBBBBBBB.', 'B..........'];
  drawTemplate(b, rows, hx - 1, hy - 3, { C: [cr, 2], c: [cr, 3], B: [cr, 1] }, Z.hat);
}

function drawGlasses(b, hx, hy, front) {
  const g = b.sp.glasses;
  if (!g) return;
  const frame = g === 'aviator' ? 0xb8b8c8 : g === 'pink' ? 0xff7ab8 : 0x1a1a22;
  const lens = g === 'pink' ? 0xff9ad0 : g === 'aviator' ? 0x5a6a5a : g === 'dark' ? 0x14141c : null;
  const y = hy + 4;
  const xs = front ? [hx + 1, hx + 2, hx + 3, hx + 5, hx + 6, hx + 7] : [hx + 3, hx + 4, hx + 5, hx + 6, hx + 7];
  xs.forEach((x, i) => b.over(x, y, lens != null && (front ? i % 3 !== 2 : i !== 2) ? lens : frame));
  if (lens != null) b.over(front ? hx + 2 : hx + 4, y, mix(lens, 0xffffff, 0.45));
  if (!front) b.over(hx + 2, y, frame);
}

// ---------- Тело ----------

function drawLeg(b, hip, leg, near, L) {
  const sp = b.sp;
  const [a, bend] = leg;
  const knee = [hip[0] + rot(a, L.thigh)[0], hip[1] + rot(a, L.thigh)[1]];
  const sa = a - bend;
  const ankle = [knee[0] + rot(sa, L.shin)[0], knee[1] + rot(sa, L.shin)[1]];
  const id = near ? Z.legN : Z.legF;
  const pr = ramp(sp.legsSkin ? sp.skin : sp.pants);
  const skinR = ramp(sp.skin, 'skin');
  const shortPants = sp.shorts;
  b.seg(hip, knee, L.legW + 0.3, L.legW - 0.1, near ? pr : pr.map((c) => mix(c, INK, 0.12)), id, { hi: false });
  b.seg(knee, ankle, L.legW - 0.1, L.legW - 0.6, shortPants ? skinR : near ? pr : pr.map((c) => mix(c, INK, 0.12)), id, { hi: false });
  // Складки на колене у джинсов
  if (!sp.legsSkin && Math.abs(bend) > 0.3) b.put(knee[0] + 1, knee[1], id, pr, 0);
  // Обувь: пятка у щиколотки, носок вперёд
  const sh = ramp(sp.shoes);
  const footA = (leg[2] || 0) + (bend > 0.9 ? -0.5 : 0);
  const ax = Math.round(ankle[0]);
  const ay = Math.round(ankle[1]);
  const len = sp.build === 'kid' ? 4 : 5;
  for (let k = -1; k <= len; k++) {
    const yy = ay + Math.round(Math.sin(footA) * k);
    b.put(ax + k, yy, id + 0, sh, k === len ? 1 : 2);
    b.put(ax + k, yy - 1, id + 0, sh, k < 1 ? 1 : 3);
    if (k >= 0 && k < len) b.put(ax + k, yy - 2, id, sh, 2);
  }
  // Белая подошва кроссовок
  if (sp.shoeType !== 'boots' && sp.shoeType !== 'heels' && !sp.dark) {
    for (let k = -1; k <= len; k++) b.put(ax + k, ay + Math.round(Math.sin(footA) * k) + 1, id, ramp(0xe8e8e8), k > len - 2 ? 1 : 2);
  }
  return { knee, ankle };
}

function drawArm(b, sh, arm, near, L, pose) {
  const sp = b.sp;
  const [a, bend] = arm;
  const el = [sh[0] + rot(a, L.upper)[0], sh[1] + rot(a, L.upper)[1]];
  const fa = a + bend;
  const wr = [el[0] + rot(fa, L.fore)[0], el[1] + rot(fa, L.fore)[1]];
  const id = near ? Z.armN : Z.armF;
  const tr = ramp(sp.sleeveColor || sp.topColor);
  const skin = ramp(sp.skin, 'skin');
  const dim = (r) => (near ? r : r.map((c) => mix(c, INK, 0.15)));
  const short = sp.garment === 'tee' || sp.garment === 'dress' || sp.garment === 'tank';
  if (short) {
    const mid = [sh[0] + (el[0] - sh[0]) * 0.55, sh[1] + (el[1] - sh[1]) * 0.55];
    b.seg(sh, mid, L.armW + 0.4, L.armW + 0.2, dim(tr), id);
    b.seg(mid, el, L.armW - 0.3, L.armW - 0.4, dim(skin), id);
    b.seg(el, wr, L.armW - 0.4, L.armW - 0.6, dim(skin), id);
  } else {
    b.seg(sh, el, L.armW + 0.3, L.armW, dim(tr), id);
    b.seg(el, wr, L.armW, L.armW - 0.2, dim(tr), id);
    // Манжета
    const cuff = [el[0] + (wr[0] - el[0]) * 0.85, el[1] + (wr[1] - el[1]) * 0.85];
    b.put(cuff[0], cuff[1], id, dim(tr), 0);
    // Складка на локте
    if (bend > 0.6) b.put(el[0], el[1], id, dim(tr), 0);
  }
  // Кисть
  const hid = near ? Z.handN : Z.handF;
  const hx = wr[0] + rot(fa, 1.6)[0];
  const hy = wr[1] + rot(fa, 1.6)[1];
  b.seg(wr, [hx, hy], 1.2, 1.3, dim(skin), hid);
  if (sp.tattoo && near) b.over(Math.round(wr[0]), Math.round(wr[1]), 0x3a4a6a);
  if (near && pose.hand) drawHandItem(b, hx, hy, pose.hand);
  return { el, wr, hand: [hx, hy] };
}

function drawHandItem(b, x, y, kind) {
  x = Math.round(x);
  y = Math.round(y);
  if (kind === 'phone' || kind === 'phoneScreen') {
    const r = ramp(0x2a2a34);
    for (let yy = -3; yy <= 1; yy++) for (let xx = 0; xx <= 1; xx++) b.put(x + xx, y + yy, Z.item, r, xx ? 1 : 2);
    if (kind === 'phoneScreen') {
      b.over(x + 1, y - 2, 0x8ad8ff);
      b.over(x + 1, y - 1, 0x5aa8ff);
    }
  } else if (kind === 'mic') {
    const r = ramp(0x8a8a9a);
    b.put(x, y - 3, Z.item, r, 3);
    b.put(x + 1, y - 3, Z.item, r, 2);
    b.put(x, y - 2, Z.item, r, 2);
    b.put(x + 1, y - 2, Z.item, r, 1);
    b.put(x, y - 1, Z.item, ramp(0x2a2a30), 2);
  } else if (kind === 'cig') {
    b.over(x + 1, y - 1, 0xe8e0d0);
    b.over(x + 2, y - 1, 0xe8e0d0);
    b.over(x + 3, y - 1, 0xff6a2a);
  } else if (kind === 'grab') {
    b.put(x, y, Z.item, ramp(b.sp.skin, 'skin'), 1);
  }
}

function drawTorso(b, pel, neck, pose, L) {
  const sp = b.sp;
  const tr = ramp(sp.topColor);
  const front = pose.view === 'front';
  const [px, py] = pel;
  const [nx, ny] = neck;
  const sw = L.shoulder;
  const ww = L.waist;
  const hw = L.hips;
  const breath = pose.breath ? 1 : 0;
  const top = ny + 1 - breath * 0.5;
  // Плечи → талия → бёдра; передняя сторона (справа) с грудью
  const lerp = (t) => [px + (nx - px) * t, py + (top - py) * t];
  const [sx, sy] = lerp(1);
  const [wx, wy] = lerp(0.42);
  const pts = front
    ? [[sx - sw / 2 - 0.5, sy + 1], [sx - sw / 2 + 1, sy - 0.5], [sx + sw / 2 - 1, sy - 0.5], [sx + sw / 2 + 0.5, sy + 1], [wx + ww / 2, wy], [px + hw / 2, py + 1], [px - hw / 2, py + 1], [wx - ww / 2, wy]]
    : [[sx - sw / 2 + 0.5, sy + 1.5], [sx - sw / 2 + 2, sy - 0.5], [sx + sw / 2 - 1.5, sy - 0.5], [sx + sw / 2 + 0.5, sy + 2], [sx + sw / 2 + 1 + (sp.female ? 1 : 0.5), sy + 5], [wx + ww / 2 + 0.5, wy], [px + hw / 2, py + 1], [px - hw / 2, py + 1], [wx - ww / 2, wy], [sx - sw / 2, sy + 5]];
  const garment = sp.garment;
  const coatLen = garment === 'coat' ? L.thigh + 2 : garment === 'dress' ? L.thigh * (sp.longDress ? 1.6 : 0.85) : 0;
  b.blob(pts, tr, Z.torso, { cx: (y) => sx + (px - sx) * ((y - sy) / Math.max(1, py - sy)) - 0.5, hw: (y) => (sw + (hw - sw) * ((y - sy) / Math.max(1, py - sy))) / 2 + 0.5, topLight: 0.25 });
  // Низ: юбка / пальто поверх ног
  if (coatLen) {
    const flare = garment === 'dress' ? 3 : 2;
    const skirt = [[px - hw / 2, py - 2], [px + hw / 2 + 0.5, py - 2], [px + hw / 2 + flare, py + coatLen], [px - hw / 2 - flare + 1, py + coatLen]];
    b.blob(skirt, tr, Z.skirt, { cx: px, hw: hw / 2 + flare, topLight: 0.1 });
    // Складки подола
    for (let k = -1; k <= 1; k++) b.over(px + k * 3, py + coatLen - 1, tr[0]);
  }
  const cx = (y) => sx + (px - sx) * ((y - sy) / Math.max(1, py - sy));
  const midY = (k) => sy + (py - sy) * k;
  const fx = (y) => cx(y) + (front ? 0 : sw / 2 - 1); // линия «середины груди» в 3/4
  // Детали одежды
  if (garment === 'hoodie') {
    // Карман-кенгуру
    const y0 = Math.round(midY(0.62));
    for (let y = y0; y < y0 + 4; y++) for (let x = Math.round(cx(y) - (front ? 3 : 1)); x <= Math.round(cx(y) + (front ? 3 : 4)); x++) {
      if (y === y0) b.over(x, y, tr[0]);
      else if (x === Math.round(cx(y) - (front ? 3 : 1))) b.over(x, y, tr[1]);
    }
    // Шнурки капюшона
    const dc = mix(sp.strings ? hex(sp.strings) : tr[4], tr[2], 0.35);
    b.over(fx(sy + 2) - 1, sy + 2, dc);
    b.over(fx(sy + 3) - 1, sy + 3, dc);
    b.over(fx(sy + 2) + 1, sy + 2, dc);
    // Резинка внизу
    for (let x = Math.round(px - hw / 2); x <= Math.round(px + hw / 2); x++) b.over(x, Math.round(py), tr[1]);
    // Капюшон, лежащий на спине
    if (!sp.hood && !front) for (let k = 0; k < 4; k++) b.put(sx - sw / 2 + 1 + k, sy - 1, Z.torso, tr, k === 0 ? 1 : 2);
  } else if (garment === 'tee' || garment === 'tank') {
    // Вырез горловины
    const skin = ramp(sp.skin, 'skin');
    b.over(fx(sy) , sy, skin[1]);
    b.over(fx(sy) + 1, sy, skin[2]);
    b.over(fx(sy + 1), sy + 1, skin[1]);
    for (let x = Math.round(px - hw / 2); x <= Math.round(px + hw / 2); x++) b.over(x, Math.round(py) - 1, tr[1]);
  } else if (['jacket', 'leather', 'leopard', 'cardigan', 'tracksuit', 'coat'].includes(garment)) {
    // Распахнутая куртка: внутри футболка, молния/пуговицы
    const inner = ramp(sp.accent);
    for (let y = Math.round(sy + 1); y < Math.round(py); y++) {
      const x = Math.round(fx(y));
      const w = y < sy + 6 ? 2 : 1;
      for (let k = 0; k < w; k++) b.over(x - k, y, inner[k ? 1 : 2]);
      b.over(x + 1, y, tr[0]);
    }
    // Воротник
    b.over(fx(sy) + 1, sy, tr[3]);
    b.over(fx(sy) - 2, sy, tr[3]);
    if (garment === 'leather') {
      // Блики на коже
      for (let y = Math.round(sy + 3); y < sy + 9; y += 2) b.over(cx(y) - 2, y, tr[4]);
    }
    if (garment === 'leopard') {
      // Пятна леопарда
      for (let y = Math.round(sy + 1); y < py; y++) for (let x = Math.round(cx(y) - sw / 2); x < cx(y) + sw / 2; x++) {
        if (((x * 7 + y * 13) % 11) === 0) b.over(x, y, 0x3a2a1a);
        else if (((x * 5 + y * 11) % 13) === 0) b.over(x, y, tr[0]);
      }
    }
    if (garment === 'tracksuit') {
      for (let y = Math.round(sy); y < py; y++) b.over(Math.round(cx(y) - sw / 2 + 1), y, 0xe8e8e8);
    }
  } else if (garment === 'sweater') {
    for (let x = Math.round(px - hw / 2); x <= Math.round(px + hw / 2); x++) {
      b.over(x, Math.round(py), tr[1]);
      if (x % 2) b.over(x, Math.round(py) - 1, tr[1]);
    }
    if (sp.stripe) for (let x = Math.round(cx(midY(0.35)) - sw / 2 + 1); x < cx(midY(0.35)) + sw / 2; x++) b.over(x, Math.round(midY(0.35)), hex(sp.accent));
  } else if (garment === 'vest') {
    // Сигнальный жилет поверх рубашки: светоотражающие полосы
    for (const k of [0.35, 0.7]) {
      const y = Math.round(midY(k));
      for (let x = Math.round(cx(y) - sw / 2 + 1); x < cx(y) + sw / 2; x++) b.over(x, y, 0xe8e8f0);
    }
  } else if (garment === 'overalls') {
    const sr = ramp(sp.accent);
    for (let y = Math.round(sy); y < midY(0.4); y++) {
      b.over(cx(y) - sw / 2 + 2, y, sr[2]);
      b.over(fx(y) - 1, y, sr[2]);
    }
    for (let y = Math.round(midY(0.4)); y < midY(0.42) + 1; y++) for (let x = Math.round(cx(y) - 2); x < cx(y) + 3; x++) b.over(x, y, tr[3]);
  } else if (garment === 'shirt') {
    for (let y = Math.round(sy + 2); y < py; y += 3) b.over(fx(y), y, 0xe8e8e8);
  }
  if (sp.stripe && garment !== 'sweater') {
    for (let y = Math.round(sy + 2); y < py - 1; y++) b.over(Math.round(cx(y) + 1), y, hex(sp.accent));
  }
  if (sp.print) {
    const y = Math.round(midY(0.3));
    const pc = hex(sp.print);
    b.over(fx(y) - 1, y, pc);
    b.over(fx(y), y, pc);
    b.over(fx(y) - 1, y + 1, pc);
  }
  // Фартук
  if (sp.apron) {
    const ar = ramp(sp.apron);
    const y0 = Math.round(midY(0.15));
    const pts2 = [[fx(y0) - 3, y0], [fx(y0) + 2, y0], [px + hw / 2 + 1, py + L.thigh * 0.7], [px - hw / 2 + 2, py + L.thigh * 0.7]];
    b.blob(pts2, ar, Z.torso, { cx: px + 1, hw: hw / 2 + 2, topLight: 0 });
    // Завязки на шее
    b.over(fx(sy) - 2, sy, ar[1]);
    b.over(fx(sy + 1) - 3, sy + 1, ar[1]);
  }
  // Цепь
  if (sp.chain) {
    const cc = hex(sp.chain === true ? '#d8d8e0' : sp.chain);
    const y0 = Math.round(sy + 1);
    for (let k = 0; k < 4; k++) b.over(Math.round(fx(y0 + k) - 2 + (k < 2 ? k : 3 - k)), y0 + k, k % 2 ? mix(cc, 0xffffff, 0.4) : cc);
  }
  // Наушники на шее (Дэн)
  if (sp.headphones) {
    const hr2 = ramp(0x2a2a30);
    b.put(nx - 3, ny + 1, Z.neck + 1, hr2, 2);
    b.put(nx - 2, ny + 2, Z.neck + 1, hr2, 2);
    b.put(nx + 3, ny + 1, Z.neck + 1, hr2, 3);
    b.put(nx + 3, ny + 2, Z.neck + 1, hr2, 2);
    for (let k = -2; k <= 3; k++) b.over(nx + k, ny + 3, hr2[1]);
  }
}

function lengths(sp) {
  const s = sp.h / 63;
  const heavy = sp.build === 'heavy';
  const slim = sp.build === 'slim' || sp.female;
  const kid = sp.build === 'kid';
  return {
    s,
    thigh: 14.5 * s,
    shin: 13.5 * s,
    torso: (kid ? 18 : 22) * s,
    upper: 10.5 * s,
    fore: 9.5 * s,
    legW: heavy ? 3.1 : slim ? 2.4 : 2.7,
    armW: heavy ? 2.3 : slim ? 1.8 : 2,
    shoulder: (heavy ? 14 : slim ? 10 : kid ? 9 : 12) * (kid ? 1 : 1),
    waist: heavy ? 14 : slim ? 8 : kid ? 9 : 10,
    hips: heavy ? 13 : sp.female ? 11 : kid ? 9 : 10,
  };
}

// Нарисовать один кадр
export function renderFrame(spec, poseFn) {
  const sp = spec;
  const pose = typeof poseFn === 'function' ? poseFn() : poseFn;
  const b = new Body(sp);
  const L = lengths(sp);
  const cx = FW / 2 - 1 + pose.x;
  const hipY = GY - 2 - (L.thigh + L.shin) + pose.y;
  const pel = [cx, hipY];
  const front = pose.view === 'front';
  // Позвоночник наклоняется вперёд вокруг таза
  const neck = [cx + Math.sin(pose.lean) * L.torso, hipY - Math.cos(pose.lean) * L.torso - (pose.breath ? 0.6 : 0)];
  if (sp.stoop) neck[0] += 2;
  // Плечи: ближнее слева, дальнее справа (вид 3/4)
  const shN = front ? [neck[0] - L.shoulder / 2 + 1, neck[1] + 3] : [neck[0] - L.shoulder / 2 + 2.5, neck[1] + 3];
  const shF = front ? [neck[0] + L.shoulder / 2 - 1, neck[1] + 3] : [neck[0] + L.shoulder / 2 - 1, neck[1] + 2.5];
  const hipN = [cx - (front ? 2 : 1.5), hipY];
  const hipF = [cx + (front ? 2 : 2), hipY];

  if (!front) drawArm(b, shF, pose.armF, false, L, pose);
  drawLeg(b, hipF, pose.legF, false, L);
  drawLeg(b, hipN, pose.legN, true, L);
  drawTorso(b, pel, neck, pose, L);
  // Шея
  const skin = ramp(sp.skin, 'skin');
  b.seg([neck[0] + 0.5, neck[1] + 1.5], [neck[0] + 0.8, neck[1] - 1], 1.6, 1.5, skin, Z.neck);
  // Голова: подбородок над шеей, лицо смотрит вправо
  const hx = Math.round(neck[0] - (front ? 3.5 : 3) + pose.headDx + Math.sin(pose.lean) * 2);
  const hy = Math.round(neck[1] - 9 + pose.headDy + (sp.build === 'kid' ? 0 : 0));
  drawHead(b, hx, hy, pose);
  drawHair(b, hx, hy, pose);
  drawGlasses(b, hx, hy, front);
  if (front) {
    drawArm(b, shF, pose.armF, true, L, { ...pose, hand: null });
    drawArm(b, shN, pose.armN, true, L, pose);
  } else drawArm(b, shN, pose.armN, true, L, pose);
  return b.finish();
}

// ---------- Лист кадров и анимации ----------

export function animSet(kind) {
  return kind === 'full' ? SET_FULL : kind === 'crowd' ? SET_CROWD : SET_NPC;
}

// Собрать лист кадров персонажа в одну текстуру: кадры «idle_0», «walk_3» и т. д.
// Если лист уже есть и в нём хватает анимаций — перерисовываем на том же холсте
// (спрайты на сцене обновятся сами), иначе собираем заново.
export function buildSheet(scene, key, rawSpec, kind = 'npc') {
  const sp = normSpec(rawSpec);
  let names = animSet(kind);
  const old = scene.textures.exists(key) ? scene.textures.get(key) : null;
  if (old && old.__anims && names.every((n) => old.__anims.includes(n))) names = old.__anims;
  else if (old) {
    (old.__anims || []).forEach((n) => scene.anims.remove(`${key}@${n}`));
    scene.textures.remove(key);
  }
  const reuse = old && old.__anims === names;
  const frames = [];
  names.forEach((n) => POSES[n].forEach((fn, i) => frames.push([`${n}_${i}`, fn])));
  const cols = 16;
  const rows = Math.ceil(frames.length / cols);
  let canvas;
  if (reuse) {
    canvas = old.getSourceImage();
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = cols * FW;
    canvas.height = rows * FH;
  }
  const ctx = canvas.getContext('2d');
  frames.forEach(([, fn], i) => {
    const p = renderFrame(sp, fn);
    ctx.putImageData(p.img, (i % cols) * FW, Math.floor(i / cols) * FH);
  });
  const t = reuse ? old : scene.textures.addCanvas(key, canvas);
  if (!reuse) frames.forEach(([name], i) => t.add(name, 0, (i % cols) * FW, Math.floor(i / cols) * FH, FW, FH));
  else if (t.source[0].update) t.source[0].update();
  names.forEach((n) => {
    const k = `${key}@${n}`;
    if (scene.anims.exists(k) || POSES[n].length < 2) return;
    scene.anims.create({
      key: k,
      frames: POSES[n].map((_, i) => ({ key, frame: `${n}_${i}` })),
      frameRate: ANIM_RATE[n] || 4,
      repeat: ['pick', 'give'].includes(n) ? 0 : -1,
    });
  });
  t.__spec = sp;
  t.__anims = names;
  return key;
}
