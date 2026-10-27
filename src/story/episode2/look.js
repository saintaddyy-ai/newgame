// Образ Марка: одежда из «Второй кожи», стрижка из «Опасной бритвы», пирсинг и тату из «Чернил».
// Перерисовывает текстуры mark_0 / mark_1 прямо на холсте — спрайты обновляются сами.
import { state } from '../../state.js';

const BASE = {
  palette: { H: '#22222e', h: '#33334a', s: '#e3b48c', e: '#141418', T: '#22222e', W: '#d8d8e8', P: '#2d3550', B: '#eeeeee', R: '#4a5a7a', K: '#1a1410', X: '#e8e8f0' },
  hood: [
    '....HHHH....',
    '...HhhhhH...',
    '..HhhsssH...',
    '..HhsssesH..',
    '..Hhsssss...',
    '...Hssss....',
    '....HHH.....',
  ],
  body: [
    '..TTTTTTT...',
    '.TTTTTTTTT..',
    '.TTTWTTTTT..',
    '.TTTTWTTTT..',
    '.sTTTTTTTs..',
    '.sTTTTTTTs..',
    '..TTTTTTT...',
    '..PPPPPPP...',
  ],
};

// Одежда из «Второй кожи»: id, название, цена, цвета палитры
export const OUTFITS = [
  ['hoodie_grey', 'Серое худи', 2500, { T: '#6a6a7a', H: '#5a5a6a', h: '#7a7a8a' }],
  ['hoodie_red', 'Красное худи', 3000, { T: '#a02a34', H: '#8a1f28', h: '#b03a44' }],
  ['leather', 'Кожанка', 6000, { T: '#1a1a1e', H: '#2a2a2e', h: '#3a3a3e', W: '#c0c0c8' }],
  ['white_tee', 'Белая футболка и цепь', 2000, { T: '#e8e8e8', H: '#22222e', h: '#33334a', W: '#e8d070' }],
  ['leopard', 'Леопардовая куртка (как у Рея)', 4500, { T: '#c8a040', H: '#a07a2a', h: '#d8b050', W: '#3a2a1a' }],
];

// Без капюшона видно причёску
const HAIR = {
  default: ['....KKKK....', '...KKKKKK...', '..KKsssss...', '..Kssssess..', '..Kssssss...', '...sssss....', '....sss.....'],
  buzz: ['....ssss....', '...sKsKss...', '..ssssssss..', '..sssssess..', '..sssssss...', '...sssss....', '....sss.....'],
  undercut: ['...KKKKK....', '..KKKKKKKK..', '..sKsssss...', '..sssssess..', '..sssssss...', '...sssss....', '....sss.....'],
  curls: ['..K.KK.K....', '.KKKKKKKK...', '.KKKKsssK...', '..KKsssess..', '..Kssssss...', '...sssss....', '....sss.....'],
  bleach: ['....YYYY....', '...YKKKKY...', '..KKsssss...', '..Kssssess..', '..Kssssss...', '...sssss....', '....sss.....'],
};

const LEGS = [
  ['...PPP.PPP..', '...PPP.PPP..', '...PPP.PPP..', '...PPP.PPP..', '...BBB.BBBB.'],
  ['...PPPPPP...', '..PPP..PPP..', '.PPP....PPP.', '.PPP....PPP.', '.BBB....BBBB'],
];

function draw(scene, key, rows, pal) {
  const tex = scene.textures.get(key);
  if (!tex || !tex.getContext) return;
  const c = tex.getContext();
  c.clearRect(0, 0, tex.width, tex.height);
  const scale = tex.width / rows[0].length;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    c.fillStyle = pal[ch];
    c.fillRect(x * scale, y * scale, scale, scale);
  }));
  tex.refresh();
}

export function repaintMark(scene) {
  const F = state.flags;
  const outfit = OUTFITS.find((o) => o[0] === F.lookOutfit);
  const pal = { ...BASE.palette, ...(outfit ? outfit[3] : {}), Y: '#f0e0a0' };
  // В худи — капюшон (пока не подстригся: после барбера капюшон снят); в кожанке и футболке видна стрижка
  const hooded = (!outfit || outfit[0].startsWith('hoodie')) && !F.lookHair;
  let head = hooded ? [...BASE.hood] : [...(HAIR[F.lookHair] || HAIR.default)];
  if (F.lookPiercing) head[4] = head[4].slice(0, 9) + 'X' + head[4].slice(10);
  const body = [...BASE.body];
  if (outfit?.[0] === 'white_tee') {
    body[1] = '.TTTWTWTTT..';
    body[2] = '.TTTTWTTTT..';
  }
  if (F.lookTattoo) body[5] = '.RTTTTTTTs..';
  for (const [i, legs] of LEGS.entries()) draw(scene, `mark_${i}`, [...head, ...body, ...legs], pal);
}
