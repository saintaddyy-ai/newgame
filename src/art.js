// Общие текстуры: персонажи (листы кадров из gfx/chars.js), частицы, афиши.

import { ensureActor } from './gfx/actors.js';
import { CAST_SPECS } from './gfx/cast.js';
import { portraitKey } from './gfx/portraits.js';
import { boxTextures } from './gfx/places/scenes.js';

export function createArt(scene) {
  // Именные персонажи: Марку — все анимации, остальным — основные
  for (const name of Object.keys(CAST_SPECS)) ensureActor(scene, name, null, name === 'mark' ? 'full' : 'npc');

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
  g.destroy();
  boxTextures(scene);

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

  // Голуби, кошки и птицы — в gfx/life.js (createLifeTextures)
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
  const acts = [['roma', '3g0th2002'], ['ray', 'RAY'], [null, '???'], ['adam', 'twinspeak']].map(([k, n]) => [k && portraitKey(scene, k, CAST_SPECS[k], 'neutral', 0x2a1b3d), n]);
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
