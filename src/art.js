// Пиксельные спрайты-заглушки, нарисованные прямо в коде.
// Каждый символ — один пиксель, '.' — прозрачный. Позже заменим на нормальную графику.

export const SCALE = 8;

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

  // ---------- Независимые (по фото) ----------
  // Рей: блондин, леопардовая куртка на молнии, розовые очки, тату на кисти
  ray: {
    palette: { H: '#e0c890', h: '#b89a60', s: '#ecc6a6', e: '#141418', g: '#ff7ab8', y: '#ffd166', L: '#cfc6ae', l: '#4a4438', z: '#9a9a9a', t: '#4a5a6a', P: '#2a2a34', B: '#e8e8e8' },
    body: [
      '...hHHHh....',
      '..HHHHHHHh..',
      '..hHHssHHH..',
      '..Hggsggs...',
      '...sssss....',
      '...ssyss....',
      '....sss.....',
      '..LlLzLLL...',
      '.LLlLzLlLL..',
      '.lLLLzLLLl..',
      '.LLlLzLlLL..',
      '.sLLLzLLLs..',
      '.tLlLzLLlt..',
      '..LLLzLlL...',
      '..PPPPPPP...',
    ],
  },
  // Аркаша: тёмные лохматые волосы, белая футболка, джинсы с ремнём
  arkasha: {
    palette: { H: '#2a1e18', h: '#4a3426', s: '#e6bc9a', e: '#141418', W: '#f2f2f2', w: '#d8d8dc', b: '#3a2418', P: '#5a7aa8', B: '#e8e8e8' },
    body: [
      '..hHHHHH....',
      '.HHHHHHHHh..',
      'hHHsssHHHH..',
      '.HHssesHH...',
      '.HHsssss....',
      '...sssss....',
      '....sss.....',
      '..WWWWWWW...',
      '.WWWWwWWWW..',
      '.WWWWWWWWW..',
      '.sWWWWWWWs..',
      '.sWwWWWWWs..',
      '..WWWWWWW...',
      '..bbbbbbb...',
      '..PPPPPPP...',
    ],
  },
  // Стас: русая чёлка, очки-авиаторы, чёрная футболка, серебряная цепь
  stas: {
    palette: { H: '#5a3e2a', h: '#7a5a3e', s: '#ecc4a4', e: '#2a3a2a', g: '#b8b8c0', T: '#1a1a1e', c: '#e0e0e8', p: '#3a3a3a', y: '#d8b040', P: '#22242c', B: '#1a1a1a' },
    body: [
      '...hHHHh....',
      '..HHHHHHHh..',
      '..HHHHHHHH..',
      '..ggegges...',
      '..Hsssss....',
      '...sssss....',
      '....sss.....',
      '..TcTTTcT...',
      '.TTTcTcTTT..',
      '.TTTTcTTTT..',
      '.sTTTTTpyT..',
      '.sTTTTTTTs..',
      '..TTTTTTT...',
      '..TTTTTTT...',
      '..PPPPPPP...',
    ],
  },
  // Адам: чёрные дреды до плеч, серый свитшот с принтом, тёмные джинсы
  adam: {
    palette: { H: '#141010', h: '#2a2420', s: '#d8a888', e: '#141418', u: '#8a6a6a', G: '#cfcfd4', p: '#7a7a82', P: '#22242c', B: '#2a2a2a' },
    body: [
      '..hHHHHh....',
      '.HHHHHHHHh..',
      'hHHsssHHHH..',
      'HHueseuHHh..',
      'HHsssssHH...',
      'H.sssss.H...',
      '....sss.....',
      '..GGGGGGG...',
      '.GGGGGGGGG..',
      '.GGppppGGG..',
      '.GGpGGpGGG..',
      '.sGGppGGGs..',
      '.sGGGGGGGs..',
      '..GGGGGGG...',
      '..PPPPPPP...',
    ],
  },
  // Рома (3g0th2002): рыжие кудри на глаза, пирсинг, усики, чёрное худи
  roma: {
    palette: { H: '#d0742a', h: '#f0a050', s: '#e8c0a0', e: '#141418', r: '#e0e0e8', m: '#8a5a3a', K: '#1e1e26', k: '#2e2e38', P: '#1a1a22', B: '#1a1a1a' },
    body: [
      '.hHHHhHH....',
      'HHHhHHHHHh..',
      'HHHHHHHHHH..',
      'hHHHHHesHH..',
      '.HHsssrsH...',
      '..ssmmms....',
      '...ssrs.....',
      '..KKKKKKK...',
      '.KKKKkKKKK..',
      '.KKKkKkKKK..',
      '.KKKKKKKKK..',
      '.sKKKKKKKs..',
      '..KKKKKKK...',
      '..KKKKKKK...',
      '..PPPPPPP...',
    ],
  },

  // ---------- Эпизод 1 ----------
  // Палыч: бригадир, кепка, оранжевый жилет со светоотражающей полосой, пузо
  palych: {
    palette: { C: '#2a3a6a', s: '#d8a080', e: '#141418', m: '#5a3a2a', O: '#ff8a20', R: '#e8e8e8', T: '#4a4a52', P: '#2a3040', B: '#1a1a1a' },
    body: [
      '...CCCCC....',
      '..CCCCCCCC..',
      '..ssssss....',
      '..sssess....',
      '..ssssss....',
      '..smmmms....',
      '...ssss.....',
      '.OOOTTOOO...',
      'OOOOTTOOOO..',
      'RRRRRRRRRR..',
      'OOOOOOOOOO..',
      'sOOOOOOOOs..',
      'sOOOOOOOOs..',
      '.OOOOOOOO...',
      '..PPPPPPP...',
    ],
  },
  // Ахмед: грузчик, борода, синий комбинезон
  akhmed: {
    palette: { H: '#141010', s: '#c8946c', e: '#141418', b: '#1e1814', U: '#2a4a8a', u: '#22407a', T: '#9a9aa2', P: '#2a4a8a', B: '#3a2a1a' },
    body: [
      '....HHH.....',
      '...HHHHH....',
      '..HHsssH....',
      '..Hsssess...',
      '..bsssss....',
      '...bbbbb....',
      '....bbb.....',
      '..TUTTTUT...',
      '.TTUTTTUTT..',
      '.UUUUUUUUU..',
      '.UUuUUUuUU..',
      '.sUUUUUUUs..',
      '.sUUUUUUUs..',
      '..UUUUUUU...',
      '..PPPPPPP...',
    ],
  },
  // Гоша с барахолки: шапка, провода на шее
  gosha: {
    palette: { K: '#6a2a8a', s: '#e0b898', e: '#141418', c: '#ff3d3d', d: '#2a2a2a', J: '#4a6a4a', j: '#3a5a3a', P: '#3a3a3a', B: '#5a3a2a' },
    body: [
      '...KKKKK....',
      '..KKKKKKK...',
      '..KKKKKKK...',
      '..ssssse....',
      '..ssssss....',
      '...ssss.....',
      '..cdcdcdc...',
      '..JdJcJdJ...',
      '.JJJJjJJJJ..',
      '.JJJJjJJJJ..',
      '.JJJJjJJJJ..',
      '.sJJJjJJJs..',
      '.sJJJJJJJs..',
      '..JJJJJJJ...',
      '..PPPPPPP...',
    ],
  },
  // Лёва из ломбарда: лысина, очки, кардиган, золотая цепь
  leva: {
    palette: { s: '#e0b090', h: '#b8b8b8', e: '#141418', g: '#d8b040', K: '#6a5a4a', k: '#5a4a3a', y: '#ffd166', W: '#e8e0d0', P: '#3a3448', B: '#2a1a1a' },
    body: [
      '............',
      '...sssss....',
      '..ssssssh...',
      '..sggsggh...',
      '..ssssss....',
      '...ssss.....',
      '....yyy.....',
      '..KKWWWKK...',
      '.KKKWyWKKK..',
      '.KKKWWWKKK..',
      '.KkKKKKKkK..',
      '.sKKKKKKKs..',
      '.sKKKKKKKs..',
      '..KKKKKKK...',
      '..PPPPPPP...',
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
  g.clear();
  g.fillStyle(0xffffff, 1).fillRect(3, 0, 2, 8).fillRect(0, 3, 8, 2);
  g.generateTexture('spark', 8, 8);
  g.clear();
  g.lineStyle(2, 0xffffff, 0.8).strokeCircle(10, 10, 8);
  g.fillStyle(0xffffff, 0.8).fillRect(6, 5, 3, 3);
  g.generateTexture('bubble', 20, 20);
  g.clear();
  g.fillStyle(0xc89a5a, 1).fillRect(0, 0, 44, 36);
  g.fillStyle(0xa87a3a, 1).fillRect(0, 14, 44, 6).fillRect(19, 0, 6, 36);
  g.generateTexture('box', 44, 36);
  g.clear();
  g.fillStyle(0xc84040, 1).fillRect(0, 0, 44, 36);
  g.fillStyle(0xffffff, 1).fillRect(4, 14, 36, 8);
  g.generateTexture('box_fragile', 44, 36);
  g.destroy();

  // Мягкое пятно света для фонарей, окон и кислотного режима
  const glow = scene.textures.createCanvas('glow', 128, 128);
  const gc = glow.getContext();
  const grad = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gc.fillStyle = grad;
  gc.fillRect(0, 0, 128, 128);
  glow.refresh();

  // Голубь и кот
  paint(scene, 'pigeon_0', ['..GG...', '.GGeG..', 'GGGGGGw', '.GGGGG.', '..o.o..'], { G: '#7a7a8a', e: '#141418', w: '#c8c8d0', o: '#c86a4a' }, 4);
  paint(scene, 'cat_0', ['K...K...', 'KK.KK...', 'KyKyK...', 'KKKKK..K', '.KKKKK.K', '.KKKKKKK', '.KKKKKK.', '.K.K.K..'], { K: '#1a1420', y: '#d8e040' }, 5);
  paint(scene, 'cat_1', ['K...K...', 'KK.KK...', 'KyKyK..K', 'KKKKK..K', '.KKKKKK.', '.KKKKKK.', '.KKKKKK.', '.K.K.K..'], { K: '#1a1420', y: '#d8e040' }, 5);

  paint(scene, 'bird_0', ['B.....B', '.B...B.', '..BBB..'], { B: '#1a1426' }, 3);
  paint(scene, 'bird_1', ['.......', 'BBBBBBB', '...B...'], { B: '#1a1426' }, 3);
  scene.anims.create({ key: 'bird_fly', frames: [{ key: 'bird_0' }, { key: 'bird_1' }], frameRate: 8, repeat: -1 });

  drawArenaPoster(scene);
  drawOpenMicPoster(scene);
  drawTapePoster(scene);
}

function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Афиша «Арены» из гаража Дэна: сцена, лучи прожекторов, толпа с поднятыми руками
function drawArenaPoster(scene) {
  const W = 240;
  const H = 340;
  const tex = scene.textures.createCanvas('poster_arena', W, H);
  const c = tex.getContext();
  const r = rand(17);

  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b0b2e');
  bg.addColorStop(0.55, '#4a0f3a');
  bg.addColorStop(1, '#0a0612');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // Лучи прожекторов
  c.globalCompositeOperation = 'lighter';
  [[40, '#ff3d8a'], [120, '#ffd166'], [200, '#3df0ff']].forEach(([x, col]) => {
    [-1, 1].forEach((dir) => {
      const g = c.createLinearGradient(x, 120, x + dir * 60, 300);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(x, 118);
      c.lineTo(x + dir * 90 - 14, 300);
      c.lineTo(x + dir * 90 + 14, 300);
      c.closePath();
      c.fill();
    });
  });
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';

  // Сцена и артист с микрофоном в контровом свете
  c.fillStyle = '#ffe6b0';
  c.beginPath();
  c.ellipse(120, 236, 46, 10, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0a0612';
  c.fillRect(112, 196, 16, 38); // тело
  c.beginPath();
  c.arc(120, 188, 9, 0, Math.PI * 2); // голова
  c.fill();
  c.fillRect(126, 186, 14, 4); // рука с микрофоном
  c.fillRect(100, 176, 4, 22); // вскинутая рука
  c.fillRect(100, 196, 14, 4);

  // Толпа: головы и руки
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 26; i++) {
      const x = i * 10 - 6 + r() * 6 + row * 4;
      const y = 262 + row * 18 + r() * 6;
      c.fillStyle = row === 0 ? '#1a0d24' : row === 1 ? '#120818' : '#07040c';
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x - 7, y + 4, 14, 40);
      if (r() > 0.6) c.fillRect(x + (r() > 0.5 ? 4 : -6), y - 22, 3, 20);
      if (r() > 0.85) {
        c.fillStyle = '#fff6c8';
        c.fillRect(x + 3, y - 26, 4, 5); // фонарики телефонов
      }
    }
  }

  // Заголовок
  c.textAlign = 'center';
  c.font = '30px "Press Start 2P"';
  c.shadowColor = '#ff3d8a';
  c.shadowBlur = 14;
  c.fillStyle = '#ffffff';
  c.fillText('АРЕНА', W / 2, 58);
  c.shadowBlur = 0;
  c.font = '10px "Press Start 2P"';
  c.fillStyle = '#ffd166';
  c.fillText('20 000 МЕСТ', W / 2, 82);
  c.fillStyle = '#3df0ff';
  c.font = '8px "Press Start 2P"';
  c.fillText('ГЛАВНАЯ СЦЕНА ГОРОДА', W / 2, 100);
  c.fillStyle = '#ffffff';
  c.font = '9px "Press Start 2P"';
  c.fillText('ТВОЁ ИМЯ ЗДЕСЬ?', W / 2, 330);

  // Скотч по углам и потёртости
  c.fillStyle = 'rgba(235,225,190,0.75)';
  c.save();
  c.translate(8, 8);
  c.rotate(-0.6);
  c.fillRect(-14, -6, 34, 12);
  c.restore();
  c.save();
  c.translate(W - 8, 8);
  c.rotate(0.6);
  c.fillRect(-20, -6, 34, 12);
  c.restore();
  for (let i = 0; i < 400; i++) {
    c.fillStyle = `rgba(255,255,255,${r() * 0.06})`;
    c.fillRect(r() * W, r() * H, 2, 2);
  }
  tex.refresh();
}

// Вторая афиша: старый кассетный рэп-сборник
function drawTapePoster(scene) {
  const W = 120;
  const H = 160;
  const tex = scene.textures.createCanvas('poster_tape', W, H);
  const c = tex.getContext();
  c.fillStyle = '#f0c040';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#1a1426';
  c.fillRect(14, 50, 92, 58);
  c.fillStyle = '#e8e0d0';
  c.fillRect(22, 58, 76, 24);
  c.fillStyle = '#1a1426';
  c.beginPath();
  c.arc(42, 70, 8, 0, Math.PI * 2);
  c.arc(78, 70, 8, 0, Math.PI * 2);
  c.fill();
  c.textAlign = 'center';
  c.font = '11px "Press Start 2P"';
  c.fillText('РАЙОН', W / 2, 30);
  c.font = '7px "Press Start 2P"';
  c.fillText('СБОРНИК 2009', W / 2, 132);
  c.fillText('ТОЛЬКО ПОДВАЛ', W / 2, 146);
  tex.refresh();
}

// Афиша «ПОДВАЛ: OPEN MIC» с портретами выступающих (портреты грузятся в BootScene)
function drawOpenMicPoster(scene) {
  const W = 240;
  const H = 312;
  const tex = scene.textures.createCanvas('poster_openmic', W, H);
  const c = tex.getContext();
  c.fillStyle = '#120a1e';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ff3d8a';
  c.fillRect(0, 0, W, 6);
  c.fillRect(0, H - 6, W, 6);
  c.textAlign = 'center';
  c.fillStyle = '#ffffff';
  c.font = '20px "Press Start 2P"';
  c.fillText('ПОДВАЛ', W / 2, 36);
  c.fillStyle = '#3df0ff';
  c.font = '8px "Press Start 2P"';
  c.fillText('OPEN MIC · ПТ 20:00', W / 2, 54);
  const acts = [['portrait_roma', '3g0th2002'], ['portrait_ray', 'RAY'], [null, '???'], ['portrait_adam', 'twinspeak']];
  acts.forEach(([key, name], i) => {
    const x = 20 + (i % 2) * 110;
    const y = 66 + Math.floor(i / 2) * 112;
    c.fillStyle = '#2a1b3d';
    c.fillRect(x, y, 90, 90);
    if (key && scene.textures.exists(key)) {
      c.imageSmoothingEnabled = false;
      c.drawImage(scene.textures.get(key).getSourceImage(), x, y, 90, 90);
    } else {
      c.fillStyle = '#ff3d8a';
      c.font = '30px "Press Start 2P"';
      c.fillText('?', x + 45, y + 60);
    }
    c.fillStyle = '#ffd166';
    c.font = '8px "Press Start 2P"';
    c.fillText(name, x + 45, y + 104);
  });
  c.fillStyle = '#c9c4ee';
  c.font = '8px "Press Start 2P"';
  c.fillText('ВХОД 300 ₽', W / 2, H - 14);
  tex.refresh();
}
