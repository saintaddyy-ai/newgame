// Пиксельные спрайты-заглушки, нарисованные прямо в коде.
// Каждый символ — один пиксель, '.' — прозрачный. Позже заменим на нормальную графику.

export const SCALE = 5;

const LEGS_STAND = [
  '...PPP.PPP..',
  '...PPP.PPP..',
  '...PPP.PPP..',
  '...PPP.PPP..',
  '...BBB.BBBB.',
];
const LEGS_WALK = [
  '...PPPPPP...',
  '..PPP..PPP..',
  '.PPP....PPP.',
  '.PPP....PPP.',
  '.BBB....BBBB',
];

const CHARACTERS = {
  // Марк «Тень»: чёрное худи с капюшоном
  mark: {
    palette: { H: '#22222e', h: '#33334a', s: '#e3b48c', e: '#141418', T: '#22222e', W: '#d8d8e8', P: '#2d3550', B: '#eeeeee' },
    body: [
      '....HHHH....',
      '...HhhhhH...',
      '..HhhsssH...',
      '..HhsssesH..',
      '..Hhsssss...',
      '...Hssss....',
      '....HHH.....',
      '..TTTTTTT...',
      '.TTTTTTTTT..',
      '.TTTWTTTTT..',
      '.TTTTWTTTT..',
      '.sTTTTTTTs..',
      '.sTTTTTTTs..',
      '..TTTTTTT...',
      '..PPPPPPP...',
    ],
  },
  // Мама: каштановые волосы в пучке, свитер, фартук
  mom: {
    palette: { H: '#6b3e26', s: '#e8bc98', e: '#141418', T: '#7a5a8c', A: '#e8e0d0', P: '#3a3448', B: '#5a3a2a', m: '#b05a5a' },
    body: [
      '....HHH.....',
      '...HHHHH....',
      '..HHsssHH...',
      '..HsssesH...',
      '..Hsssss....',
      '...ssmss....',
      '....sss.....',
      '..TTTTTTT...',
      '.TTAAAAATT..',
      '.TTAAAAATT..',
      '.sTAAAAATs..',
      '.s.AAAAA.s..',
      '...AAAAA....',
      '..PPPPPPP...',
      '..PPPPPPP...',
    ],
  },
  // Дэн: наушники на шее, красное худи, кепка
  dan: {
    palette: { C: '#e8e8e8', c: '#2a2a2a', H: '#1a1410', s: '#9a6a48', e: '#0e0e10', T: '#c0303a', t: '#8a1f28', G: '#555560', P: '#1e1e26', B: '#f0c040' },
    body: [
      '...CCCCC....',
      '..CCCCCCCc..',
      '..HsssssH...',
      '..Hsssess...',
      '...sssss....',
      '...sssss....',
      '..GGsssGG...',
      '..TGGGGGT...',
      '.TTTTtTTTT..',
      '.TTTTtTTTT..',
      '.TTTTtTTTT..',
      '.sTTTTTTTs..',
      '.sTTTTTTTs..',
      '..TTTTTTT...',
      '..PPPPPPP...',
    ],
  },
  // Бабушка на лавочке: платок, пальто
  granny: {
    palette: { K: '#8a4a7a', s: '#e0b898', e: '#141418', T: '#4a5a4a', P: '#3a3a3a', B: '#2a2a2a' },
    body: [
      '....KKK.....',
      '...KKKKK....',
      '..KKsssKK...',
      '..KsssesK...',
      '..KKssssK...',
      '...KKKKK....',
      '....sss.....',
      '..TTTTTTT...',
      '.TTTTTTTTT..',
      '.TTTTTTTTT..',
      '.sTTTTTTTs..',
      '..TTTTTTT...',
      '..TTTTTTT...',
      '..TTTTTTT...',
      '..TTTTTTT...',
    ],
  },
  // Пацан с мячом
  kid: {
    palette: { H: '#c8a040', s: '#f0c8a0', e: '#141418', T: '#3a8a5a', P: '#2a3a6a', B: '#e8e8e8' },
    body: [
      '............',
      '............',
      '............',
      '....HHHH....',
      '...HHHHHH...',
      '...Hsssse...',
      '...Hsssss...',
      '....ssss....',
      '...TTTTTT...',
      '..TTTTTTTT..',
      '..sTTTTTTs..',
      '...TTTTTT...',
      '...PPPPPP...',
      '...PPPPPP...',
      '...PPPPPP...',
    ],
  },
};

function paint(scene, key, rows, palette, scale) {
  const w = rows[0].length;
  const h = rows.length;
  const tex = scene.textures.createCanvas(key, w * scale, h * scale);
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || !palette[ch]) return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  tex.refresh();
}

export function createArt(scene) {
  for (const [name, def] of Object.entries(CHARACTERS)) {
    const legsWalk = name === 'kid' ? LEGS_STAND : LEGS_WALK;
    paint(scene, `${name}_0`, [...def.body, ...LEGS_STAND], def.palette, SCALE);
    paint(scene, `${name}_1`, [...def.body, ...legsWalk], def.palette, SCALE);
    scene.anims.create({
      key: `${name}_walk`,
      frames: [{ key: `${name}_1` }, { key: `${name}_0` }],
      frameRate: 6,
      repeat: -1,
    });
  }

  // Мелкие текстуры для эффектов
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x9ab0ff, 1).fillRect(0, 0, 2, 14);
  g.generateTexture('drop', 2, 14);
  g.clear();
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  g.generateTexture('px', 4, 4);
  g.clear();
  g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.destroy();
}
