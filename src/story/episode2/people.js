// Генератор людей: внешность собирается из частей (причёска, кожа, одежда, очки, пирсинг).
// Работники кафе и магазинов, прохожие, фанаты, покупатели и полицейские в штатском.

const SKIN = ['#f0d0b0', '#e8bc98', '#e3b48c', '#c89070', '#9a6a48', '#7a5038'];
const HAIR = ['#1a1410', '#3a2416', '#6b3e26', '#c8a040', '#e8d8a0', '#b03030', '#2a2a2a', '#8a8a8a', '#ff7ad8', '#3df0ff', '#7a3ac8'];
const TOPS = ['#c0303a', '#2a3a6a', '#3a8a5a', '#e8e8e8', '#1a1a1e', '#d8a040', '#7a5a8c', '#4a4a58', '#ff7ab8', '#3a6a8a', '#8a3a2a', '#e8d8b0'];
const PANTS = ['#2d3550', '#1e1e26', '#3a3448', '#4a5a7a', '#5a4a3a', '#2a2a2a', '#6a6a7a'];
const SHOES = ['#eeeeee', '#1a1a1a', '#5a3a2a', '#c03a3a', '#2a2a3a'];
export const HAIRSTYLES = ['short', 'bald', 'long', 'bun', 'mohawk', 'cap', 'curly', 'dreads', 'ponytail', 'hood', 'beanie', 'bob'];

function rng(seed) {
  let s = (Math.abs(seed) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// Случайная внешность по сиду; opts переопределяют любые части
export function randomSpec(seed, opts = {}) {
  const r = rng(typeof seed === 'string' ? hashStr(seed) : seed);
  const female = opts.female ?? r() < 0.5;
  const hair = female ? pick(r, ['long', 'bun', 'ponytail', 'bob', 'curly', 'beanie', 'short']) : pick(r, ['short', 'bald', 'mohawk', 'cap', 'curly', 'dreads', 'hood', 'beanie', 'short']);
  return {
    female,
    hair,
    hairColor: pick(r, HAIR),
    skin: pick(r, SKIN),
    top: pick(r, TOPS),
    accent: pick(r, TOPS),
    pants: pick(r, PANTS),
    shoes: pick(r, SHOES),
    glasses: r() < 0.18,
    piercing: r() < 0.15,
    mustache: !female && r() < 0.15,
    lipstick: female && r() < 0.35 ? pick(r, ['#c03a5a', '#1a1a1e', '#8a3a6a']) : null,
    chain: r() < 0.12,
    stripe: r() < 0.3,
    dress: female && r() < 0.25,
    apron: null,
    ...opts,
  };
}

function head(spec) {
  const rows = [
    '....HHHH....',
    '...HHHHHH...',
    '..HHsssss...',
    '..Hssssess..',
    '..Hssssss...',
    '...sssss....',
    '....sss.....',
  ];
  const set = (y, x, ch) => {
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  };
  switch (spec.hair) {
    case 'bald':
      rows[0] = '....ssss....';
      rows[1] = '...ssssss...';
      rows[2] = '..sssssss...';
      rows[3] = '..sssssess..';
      rows[4] = '..sssssss...';
      break;
    case 'long':
    case 'bob':
      rows[0] = '...HHHHH....';
      rows[1] = '..HHHHHHH...';
      rows[2] = '.HHHsssss...';
      rows[3] = '.HHssssess..';
      rows[4] = '.HHssssss...';
      rows[5] = spec.hair === 'long' ? '.HHHsssss...' : '..HHssss....';
      if (spec.hair === 'long') rows[6] = '.HH.sss.....';
      break;
    case 'bun':
      rows[0] = '..HH.HH.....';
      rows[1] = '..HHHHHHH...';
      break;
    case 'ponytail':
      rows[1] = '.HHHHHHH....';
      rows[2] = 'HHHHsssss...';
      rows[3] = 'H.Hssssess..';
      break;
    case 'mohawk':
      rows[0] = '.....HH.....';
      rows[1] = '....HHHH....';
      rows[2] = '..ssssss....';
      rows[3] = '..sssssess..';
      rows[4] = '..sssssss...';
      break;
    case 'cap':
      rows[0] = '...CCCCC....';
      rows[1] = '..CCCCCCCCC.';
      break;
    case 'beanie':
      rows[0] = '...CCCCC....';
      rows[1] = '..CCCCCCC...';
      rows[2] = '..Cssssss...';
      break;
    case 'curly':
      rows[0] = '...H.HH.H...';
      rows[1] = '..HHHHHHHH..';
      rows[2] = '.HHHssssH...';
      break;
    case 'dreads':
      rows[1] = '..HHHHHHH...';
      rows[2] = '.HHHsssss...';
      rows[3] = '.H.Hsssess..';
      rows[4] = '.H.Hsssss...';
      rows[5] = '.H.HHssss...';
      rows[6] = '.H.H.sss....';
      break;
    case 'hood':
      rows[0] = '....CCCC....';
      rows[1] = '...CCCCCC...';
      rows[2] = '..CCsssss...';
      rows[3] = '..Cssssess..';
      rows[4] = '..Cssssss...';
      rows[5] = '...Cssss....';
      rows[6] = '....CCC.....';
      break;
    default:
      break;
  }
  if (spec.glasses) {
    set(3, 6, 'G');
    set(3, 7, 'G');
    set(3, 8, 'G');
  }
  if (spec.piercing) set(4, 9, 'X');
  if (spec.mustache) {
    set(5, 6, 'H');
    set(5, 7, 'H');
  }
  if (spec.lipstick) set(5, 7, 'L');
  return rows;
}

function body(spec) {
  const rows = [
    '..TTTTTTT...',
    '.TTTTTTTTT..',
    '.TTTTTTTTT..',
    '.TTTTTTTTT..',
    '.sTTTTTTTs..',
    '.sTTTTTTTs..',
    '..TTTTTTT...',
    '..PPPPPPP...',
  ];
  const set = (y, x, ch) => {
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  };
  if (spec.stripe) for (let y = 1; y < 7; y++) set(y, 5, 't');
  if (spec.chain) {
    set(1, 4, 'Y');
    set(2, 5, 'Y');
    set(1, 6, 'Y');
  }
  if (spec.apron) {
    for (let y = 2; y < 8; y++) for (let x = 3; x < 8; x++) set(y, x, 'A');
    set(1, 3, 'A');
    set(1, 7, 'A');
  }
  if (spec.dress) {
    rows[6] = '.TTTTTTTTT..';
    rows[7] = '.TTTTTTTTT..';
  }
  return rows;
}

const LEGS = [
  ['...PPP.PPP..', '...PPP.PPP..', '...PPP.PPP..', '...PPP.PPP..', '...BBB.BBBB.'],
  ['...PPPPPP...', '..PPP..PPP..', '.PPP....PPP.', '.PPP....PPP.', '.BBB....BBBB'],
];

function paint(scene, key, rows, pal, scale = 8) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, rows[0].length * scale, rows.length * scale);
  const c = tex.getContext();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    c.fillStyle = pal[ch];
    c.fillRect(x * scale, y * scale, scale, scale);
  }));
  tex.refresh();
}

// Создаёт текстуры key_0 / key_1 и анимацию key_walk; возвращает key
export function personTexture(scene, spec, key) {
  key = key || `p_${hashStr(JSON.stringify(spec)).toString(36)}`;
  if (scene.textures.exists(`${key}_0`)) return key;
  const legsSkin = spec.dress ? spec.skin : spec.pants;
  const pal = {
    H: spec.hairColor, s: spec.skin, e: '#141418', T: spec.top, t: spec.accent, P: legsSkin, B: spec.shoes,
    G: '#1a1a22', X: '#e8e8f0', L: spec.lipstick || spec.skin, C: spec.accent, Y: '#e8d070', A: spec.apron || spec.top,
  };
  // В платье: ноги кожей, под платьем — пусто
  const legs = LEGS.map((l) => (spec.dress ? l.map((r) => r.replace(/P/g, 'P')) : l));
  const top = [...head(spec), ...body(spec)];
  paint(scene, `${key}_0`, [...top, ...legs[0]], pal);
  paint(scene, `${key}_1`, [...top, ...legs[1]], pal);
  if (!scene.anims.exists(`${key}_walk`)) {
    scene.anims.create({ key: `${key}_walk`, frames: [{ key: `${key}_1` }, { key: `${key}_0` }], frameRate: 6, repeat: -1 });
  }
  return key;
}

// ---------- Именованные персонажи Эпизода 2 ----------

export const CAST = {
  mira: { female: true, hair: 'bob', hairColor: '#3a2416', skin: '#f0d0b0', top: '#e8d8b0', accent: '#3a6a8a', pants: '#4a5a7a', shoes: '#eeeeee', glasses: false, stripe: true },
  lola: { female: true, hair: 'long', hairColor: '#e8d8a0', skin: '#e8bc98', top: '#ff7ab8', accent: '#ffd166', pants: '#1a1a1e', shoes: '#c03a3a', dress: true, lipstick: '#c03a5a', chain: true },
  kira: { female: true, hair: 'long', hairColor: '#1a1410', skin: '#f0d0b0', top: '#1a1a1e', accent: '#7a3ac8', pants: '#1a1a1e', shoes: '#1a1a1a', piercing: true, lipstick: '#1a1a1e' },
  vika: { female: true, hair: 'bun', hairColor: '#b03030', skin: '#e3b48c', top: '#8a3a6a', accent: '#ffd166', pants: '#1a1a1e', shoes: '#c03a3a', dress: true, lipstick: '#c03a5a' },
  timur: { female: false, hair: 'short', hairColor: '#1a1410', skin: '#c89070', top: '#e8e8e8', accent: '#c0303a', pants: '#2a2a2a', shoes: '#1a1a1a', apron: '#c0303a', mustache: true },
  bulldog: { female: false, hair: 'bald', hairColor: '#1a1410', skin: '#e8bc98', top: '#1a1a1e', accent: '#e8e8e8', pants: '#1e1e26', shoes: '#1a1a1a', chain: true },
  barber: { female: false, hair: 'curly', hairColor: '#1a1410', skin: '#e3b48c', top: '#1a1a1e', accent: '#e8e8e8', pants: '#2a2a2a', shoes: '#5a3a2a', mustache: true, apron: '#2a2a2a' },
  tattoo: { female: true, hair: 'mohawk', hairColor: '#3df0ff', skin: '#f0d0b0', top: '#1a1a1e', accent: '#ff3d8a', pants: '#1a1a1e', shoes: '#1a1a1a', piercing: true },
  photolab: { female: false, hair: 'bald', hairColor: '#8a8a8a', skin: '#e8bc98', top: '#7a5a8c', accent: '#e8e8e8', pants: '#3a3448', shoes: '#5a3a2a', glasses: true },
  plumber: { female: false, hair: 'cap', hairColor: '#3a2416', skin: '#c89070', top: '#2a3a6a', accent: '#d8a040', pants: '#2a3a6a', shoes: '#1a1a1a', mustache: true },
  cop: { female: false, hair: 'cap', hairColor: '#1a1410', skin: '#e8bc98', top: '#2a3a5a', accent: '#1a2a4a', pants: '#1a2a4a', shoes: '#1a1a1a' },
  olymp: { female: true, hair: 'bun', hairColor: '#1a1410', skin: '#f0d0b0', top: '#1a1a1e', accent: '#ffd166', pants: '#1a1a1e', shoes: '#1a1a1a', glasses: true },
};

export function castKey(scene, id) {
  return personTexture(scene, CAST[id], `cast_${id}`);
}
