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
  g.destroy();

  paint(scene, 'bird_0', ['B.....B', '.B...B.', '..BBB..'], { B: '#1a1426' }, 3);
  paint(scene, 'bird_1', ['.......', 'BBBBBBB', '...B...'], { B: '#1a1426' }, 3);
  scene.anims.create({ key: 'bird_fly', frames: [{ key: 'bird_0' }, { key: 'bird_1' }], frameRate: 8, repeat: -1 });

  drawArenaPoster(scene);
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
