// Фоны локаций, нарисованные прямоугольниками в пиксельном стиле.
// Двери рисуются отдельно (LocationScene.makeDoor), здесь для них только проёмы.

const FLOOR = 470;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function bands(g, x, y, w, h, colors) {
  const bh = Math.ceil(h / colors.length);
  colors.forEach((c, i) => g.fillStyle(c, 1).fillRect(x, y + i * bh, w, bh));
}

// Ночной город с панельками — для титульника и двора
export function drawSkyline(scene, width, { seed = 1, groundY = 540 } = {}) {
  const r = rng(seed);
  const g = scene.add.graphics();
  bands(g, 0, 0, width, groundY, [0x07060d, 0x0d0b1e, 0x15102a, 0x1e1535, 0x2a1b3d, 0x3a1f45]);
  for (let i = 0; i < width / 12; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.5).fillRect(r() * width, r() * 200, 2, 2);
  g.fillStyle(0xf2e8c8, 1).fillCircle(width * 0.8, 90, 26);
  g.fillStyle(0x15102a, 1).fillCircle(width * 0.8 + 12, 82, 22);

  for (let x = 0; x < width; x += 60 + r() * 50) {
    const h = 140 + r() * 180;
    const w = 40 + r() * 40;
    g.fillStyle(0x1a1430, 1).fillRect(x, groundY - 130 - h, w, h + 130);
    if (r() > 0.6) g.fillStyle(r() > 0.5 ? 0xff3d8a : 0x3df0ff, 0.8).fillRect(x + 6, groundY - 120 - h, w - 12, 3);
  }
  for (let x = -20; x < width; x += 170 + r() * 40) {
    const h = 200 + r() * 90;
    const w = 150;
    g.fillStyle(0x221c38, 1).fillRect(x, groundY - h, w, h);
    g.fillStyle(0x2c2448, 1).fillRect(x, groundY - h, w, 6);
    for (let wy = groundY - h + 18; wy < groundY - 20; wy += 22) {
      for (let wx = x + 12; wx < x + w - 14; wx += 20) {
        const lit = r();
        g.fillStyle(lit > 0.78 ? 0xffd27a : lit > 0.72 ? 0x7a9cff : 0x14102a, 1).fillRect(wx, wy, 10, 12);
      }
    }
  }
  return g;
}

// Стена-перегородка между комнатами с дверным проёмом
function partition(g, x, color) {
  g.fillStyle(0x1e1626, 1).fillRect(x, 0, 70, FLOOR);
  g.fillStyle(color, 1).fillRect(x + 6, 0, 58, FLOOR);
}

export function drawApartment(scene, width) {
  const g = scene.add.graphics();
  // Спальня — фиолетовые обои
  g.fillStyle(0x3a2f4a, 1).fillRect(0, 0, 740, FLOOR);
  for (let x = 0; x < 740; x += 40) g.fillStyle(0x44385a, 1).fillRect(x, 0, 14, FLOOR);
  // Кухня — плитка
  g.fillStyle(0x3d3550, 1).fillRect(810, 0, 530, FLOOR);
  g.fillStyle(0x4a5868, 1).fillRect(810, 240, 530, FLOOR - 250);
  for (let x = 810; x < 1340; x += 30) g.fillStyle(0x3e4a5a, 1).fillRect(x, 240, 2, FLOOR - 250);
  for (let y = 240; y < FLOOR - 10; y += 30) g.fillStyle(0x3e4a5a, 1).fillRect(810, y, 530, 2);
  // Прихожая — тёмно-зелёные обои в ромбик
  g.fillStyle(0x2a3a34, 1).fillRect(1410, 0, width - 1410, FLOOR);
  for (let y = 20; y < FLOOR; y += 40) for (let x = 1420; x < width; x += 40) g.fillStyle(0x324640, 1).fillRect(x + ((y / 40) % 2) * 20, y, 8, 8);

  // Пол
  g.fillStyle(0x2a1f1a, 1).fillRect(0, FLOOR, width, 70);
  for (let x = 0; x < width; x += 90) g.fillStyle(0x1f1612, 1).fillRect(x, FLOOR, 3, 70);
  g.fillStyle(0x1e1622, 1).fillRect(0, FLOOR - 10, width, 10);
  // Линолеум на кухне
  g.fillStyle(0x4a3a3a, 1).fillRect(810, FLOOR, 530, 70);
  for (let x = 810; x < 1340; x += 40) g.fillStyle(0x5a4646, 1).fillRect(x, FLOOR + 10, 20, 20);

  partition(g, 740, 0x2e2540);
  partition(g, 1340, 0x2a2238);

  // ---- Спальня ----
  // Окно с рассветом
  g.fillStyle(0xd8d4e0, 1).fillRect(392, 112, 176, 196);
  bands(g, 400, 120, 160, 180, [0x3a2a5a, 0x6a3a6a, 0xa04a6a, 0xe0705a, 0xffa060]);
  g.fillStyle(0x1e1830, 1).fillRect(400, 220, 40, 80).fillRect(450, 190, 50, 110).fillRect(510, 240, 50, 60);
  g.fillStyle(0xffd27a, 1).fillRect(460, 200, 6, 6).fillRect(480, 230, 6, 6).fillRect(416, 240, 6, 6);
  g.fillStyle(0xd8d4e0, 1).fillRect(476, 120, 8, 180).fillRect(400, 205, 160, 6);
  g.fillStyle(0xbab4c8, 1).fillRect(384, 304, 192, 12);
  // Плакат
  g.fillStyle(0x15102a, 1).fillRect(190, 130, 100, 130);
  g.lineStyle(4, 0xff3d8a, 1).strokeRect(190, 130, 100, 130);
  g.fillStyle(0x3df0ff, 1).fillCircle(240, 180, 24);
  g.fillStyle(0x15102a, 1).fillCircle(240, 180, 12);
  g.fillStyle(0xffd166, 1).fillRect(205, 225, 70, 8).fillRect(215, 240, 50, 6);
  // Кровать
  g.fillStyle(0x4a3a2a, 1).fillRect(50, 350, 18, 120).fillRect(330, 390, 14, 80);
  g.fillStyle(0x8a8aa8, 1).fillRect(68, 400, 262, 26);
  g.fillStyle(0x5b4b8a, 1).fillRect(130, 392, 200, 40);
  g.fillStyle(0x6b5b9a, 1).fillRect(130, 392, 200, 8);
  g.fillStyle(0xe8e4f0, 1).fillRect(74, 384, 54, 20);
  g.fillStyle(0x3a2a1e, 1).fillRect(68, 426, 262, 14);
  // Стол с тетрадью и лампой
  g.fillStyle(0x5a4030, 1).fillRect(590, 404, 130, 10).fillRect(598, 414, 10, 56).fillRect(702, 414, 10, 56);
  g.fillStyle(0xf1ead8, 1).fillRect(608, 396, 44, 8);
  g.fillStyle(0xd86a6a, 1).fillRect(608, 396, 4, 8);
  g.fillStyle(0x2a2a2a, 1).fillRect(684, 356, 4, 48).fillRect(674, 400, 24, 4);
  g.fillStyle(0xffd27a, 1).fillTriangle(670, 360, 702, 360, 686, 344);
  g.fillStyle(0xffd27a, 0.08).fillTriangle(686, 360, 590, 404, 730, 404);

  // ---- Кухня ----
  // Холодильник
  g.fillStyle(0xd8d8d8, 1).fillRect(830, 290, 84, 180);
  g.fillStyle(0xb8b8b8, 1).fillRect(830, 356, 84, 4).fillRect(900, 310, 4, 30).fillRect(900, 376, 4, 40);
  g.fillStyle(0xff3d8a, 1).fillRect(846, 306, 10, 10);
  g.fillStyle(0xffd166, 1).fillRect(862, 316, 8, 12);
  // Плита
  g.fillStyle(0xe8e8e8, 1).fillRect(940, 390, 90, 80);
  g.fillStyle(0x2a2a2a, 1).fillRect(940, 386, 90, 6).fillRect(955, 408, 60, 46);
  g.fillStyle(0x8a8a9a, 1).fillRect(960, 360, 50, 26).fillRect(954, 360, 62, 6);
  // Шкафчики
  g.fillStyle(0x6a4a3a, 1).fillRect(920, 150, 220, 70);
  g.fillStyle(0x5a3a2a, 1).fillRect(1028, 150, 4, 70);
  // Стол со счетами
  g.fillStyle(0x7a5a40, 1).fillRect(1110, 404, 170, 10).fillRect(1120, 414, 10, 56).fillRect(1260, 414, 10, 56);
  g.fillStyle(0xf4f4f4, 1).fillRect(1140, 396, 34, 8).fillRect(1180, 394, 30, 10);
  g.fillStyle(0xffd166, 1).fillRect(1222, 398, 8, 6).fillRect(1232, 399, 6, 5);
  // Табуретка
  g.fillStyle(0x6a4a30, 1).fillRect(1290, 420, 40, 8).fillRect(1294, 428, 6, 42).fillRect(1320, 428, 6, 42);
  // Окно на кухне
  g.fillStyle(0xd8d4e0, 1).fillRect(1170, 120, 120, 100);
  bands(g, 1176, 126, 108, 88, [0x6a3a6a, 0xa04a6a, 0xe0705a]);

  // ---- Прихожая ----
  // Вешалка с маминым пальто
  g.fillStyle(0x5a3a2a, 1).fillRect(1440, 220, 90, 8);
  g.fillStyle(0x8a8a9a, 1).fillRect(1450, 228, 4, 10).fillRect(1480, 228, 4, 10).fillRect(1510, 228, 4, 10);
  g.fillStyle(0x6a2a3a, 1).fillRect(1440, 236, 30, 120);
  g.fillStyle(0x2a3a5a, 1).fillRect(1500, 236, 26, 90);
  // Обувница
  g.fillStyle(0x4a3a2a, 1).fillRect(1440, 430, 100, 40);
  g.fillStyle(0x1a1a1a, 1).fillRect(1450, 420, 24, 10).fillRect(1480, 420, 24, 10);
  g.fillStyle(0xeeeeee, 1).fillRect(1510, 420, 24, 10);
  // Зеркало
  g.fillStyle(0x8a6a40, 1).fillRect(1570, 170, 70, 130);
  g.fillStyle(0x8ab0c8, 1).fillRect(1576, 176, 58, 118);
  g.fillStyle(0xc8e0f0, 0.6).fillTriangle(1580, 180, 1610, 180, 1580, 230);
  // Проём входной двери (сами двери — отдельные объекты)
  g.fillStyle(0x15101c, 1).fillRect(1790, 258, 100, FLOOR - 258);
  g.fillStyle(0xfff0b0, 1).fillRect(1682, 250, 40, 10); // табличка ванной
  g.fillStyle(0x1e1626, 1).fillRect(1694, 252, 16, 6);
  return g;
}

export function drawYard(scene, width, opts = {}) {
  drawSkyline(scene, width, { seed: 42, groundY: FLOOR - 10 });
  const g = scene.add.graphics();

  // Наш дом: фасад панельки, из которого выходим
  g.fillStyle(0x2c2638, 1).fillRect(0, 60, 380, FLOOR - 60);
  for (let y = 60; y < FLOOR; y += 80) g.fillStyle(0x24202e, 1).fillRect(0, y, 380, 4);
  for (let x = 0; x < 380; x += 95) g.fillStyle(0x24202e, 1).fillRect(x, 60, 4, FLOOR - 60);
  const r = rng(5);
  for (let y = 80; y < 240; y += 80) {
    for (let x = 20; x < 380; x += 95) {
      g.fillStyle(r() > 0.6 ? 0xffd27a : 0x15102a, 1).fillRect(x + 14, y + 14, 44, 40);
      g.fillStyle(0x3a3448, 1).fillRect(x + 34, y + 14, 4, 40);
    }
  }
  // Подъезд: козырёк, дверь, ступени, домофон, лампа
  g.fillStyle(0x1e1a28, 1).fillRect(90, 258, 130, FLOOR - 258);
  g.fillStyle(0x4a4a58, 1).fillRect(70, 244, 170, 14);
  g.fillStyle(0x3a3a48, 1).fillRect(70, 258, 170, 4);
  g.fillStyle(0x5a5a68, 1).fillRect(80, FLOOR - 16, 150, 8).fillRect(70, FLOOR - 8, 170, 8);
  g.fillStyle(0xfff0b0, 1).fillRect(144, 230, 22, 12);
  g.fillStyle(0xfff0b0, 0.1).fillTriangle(155, 242, 60, FLOOR, 250, FLOOR);
  g.fillStyle(0x6a6a7a, 1).fillRect(232, 330, 16, 26);
  g.fillStyle(0x3df0ff, 1).fillRect(236, 334, 8, 4);
  scene.add.text(155, 210, 'ПОДЪЕЗД 3', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c9c4ee' }).setOrigin(0.5);

  // Асфальт и бордюр
  g.fillStyle(0x2b2b33, 1).fillRect(0, FLOOR - 10, width, 80);
  g.fillStyle(0x4a4a55, 1).fillRect(380, FLOOR - 14, width - 380, 6);
  for (let x = 440; x < width; x += 260) g.fillStyle(0x3a3a48, 1).fillRect(x, FLOOR + 30, 90, 8);
  g.fillStyle(0x3a2a5a, 0.8).fillEllipse(620, FLOOR + 40, 140, 14);
  g.fillStyle(0xff3d8a, 0.35).fillEllipse(1420, FLOOR + 44, 120, 10);

  // Фонари
  [520, 1360].forEach((x) => {
    g.fillStyle(0x1a1a22, 1).fillRect(x, 200, 8, FLOOR - 210).fillRect(x - 20, 200, 36, 6);
    g.fillStyle(0xffe0a0, 1).fillRect(x - 22, 206, 16, 6);
    g.fillStyle(0xffe0a0, 0.08).fillTriangle(x - 14, 212, x - 120, FLOOR, x + 90, FLOOR);
  });

  // Качели — под рост людей
  g.fillStyle(0xc04040, 1).fillRect(660, 220, 10, 240).fillRect(860, 220, 10, 240).fillRect(660, 214, 210, 10);
  g.fillStyle(0x8a8a9a, 1).fillRect(724, 224, 2, 170).fillRect(800, 224, 2, 170);
  g.fillStyle(0xd8b040, 1).fillRect(716, 392, 94, 8);

  // Лавочка
  g.fillStyle(0x6a4a30, 1).fillRect(950, 410, 170, 12).fillRect(950, 372, 170, 10);
  g.fillStyle(0x2a2a2a, 1).fillRect(962, 382, 8, 28).fillRect(1100, 382, 8, 28).fillRect(962, 422, 8, 38).fillRect(1100, 422, 8, 38);

  // Стена с граффити
  g.fillStyle(0x4a4450, 1).fillRect(1250, 280, 300, 180);
  for (let y = 280; y < 460; y += 20) g.fillStyle(0x3e3844, 1).fillRect(1250, y, 300, 2);
  scene.graffiti = scene.add.text(1400, 370, 'ТЕНЬ', {
    fontFamily: '"Press Start 2P"', fontSize: '42px', color: '#3df0ff', stroke: '#ff3d8a', strokeThickness: 8,
  }).setOrigin(0.5).setAngle(-6);
  scene.graffiti.setShadow(0, 0, '#3df0ff', 16, true, true);

  // Гаражи — выше человеческого роста
  for (let x = 1620; x < Math.min(width, 2200) - 40; x += 160) {
    g.fillStyle(0x3a3f4a, 1).fillRect(x, 250, 154, 210);
    g.fillStyle(0x2e323c, 1).fillRect(x - 4, 242, 162, 10);
    g.fillStyle(0x4a505c, 1).fillRect(x + 10, 270, 134, 190);
    for (let y = 280; y < 460; y += 14) g.fillStyle(0x3e4450, 1).fillRect(x + 10, y, 134, 2);
  }
  // Гараж №17 приоткрыт, оттуда свет
  g.fillStyle(0xffd27a, 0.9).fillRect(1950, 420, 134, 40);
  g.fillStyle(0xffd27a, 0.12).fillTriangle(1950, 460, 2084, 460, 2017, 530);
  scene.add.text(2017, 228, '№17', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd166' }).setOrigin(0.5);
  if (width > 2200) drawArch(scene, g, opts);
  return g;
}

// За гаражами: дом с аркой, через арку видна улица
function drawArch(scene, g, opts) {
  const x0 = 2180;
  // Улица за аркой — светлее и живее двора
  bands(g, 2440, 200, 150, FLOOR - 200, [0x3a2a5a, 0x5a3a6a, 0x7a4a6a]);
  g.fillStyle(0x2a2238, 1).fillRect(2440, 330, 150, 130);
  g.fillStyle(0xffd27a, 0.9).fillRect(2452, 350, 30, 40).fillRect(2540, 350, 34, 40);
  if (opts.barberSign) {
    g.fillStyle(0x1a1a22, 1).fillRect(2456, 300, 120, 26);
    scene.add.text(2516, 313, 'ОПАСНАЯ БРИТВА', { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff3d8a' }).setOrigin(0.5);
    // Полосатый столб барбершопа
    for (let y = 330; y < 400; y += 12) g.fillStyle(y % 24 ? 0xffffff : 0xd83a3a, 1).fillRect(2584, y, 6, 12);
  }
  // Дом и арка
  g.fillStyle(0x2c2436, 1).fillRect(x0, 120, 260, FLOOR - 120).fillRect(2590, 120, 2700 - 2590, FLOOR - 120);
  g.fillStyle(0x2c2436, 1).fillRect(2440, 120, 150, 80);
  g.fillStyle(0x3a3046, 1).fillRect(2436, 196, 158, 8);
  for (let y = 140; y < FLOOR - 20; y += 26) for (let x = x0 + 10; x < 2700; x += 34) {
    if (x > 2420 && x < 2600 && y > 190) continue;
    g.fillStyle(0x251f2e, 1).fillRect(x, y, 30, 2);
  }
  // Окна дома
  [[2200, 150], [2290, 150], [2620, 150], [2200, 250], [2620, 250]].forEach(([x, y], i) => {
    g.fillStyle(i % 2 ? 0x15102a : 0xffd27a, 1).fillRect(x, y, 44, 40);
  });
  // Фонарь над аркой
  g.fillStyle(0xffe0a0, 1).fillRect(2506, 206, 18, 8);
  g.fillStyle(0xffe0a0, 0.1).fillTriangle(2515, 214, 2420, FLOOR, 2610, FLOOR);
  if (opts.merc) drawMerc(g, 2215);
  if (opts.openMic) scene.add.image(2660, 300, 'poster_openmic').setDisplaySize(64, 83).setAngle(2);
}

// Старый «Мерс» Рея (боком)
function drawMerc(g, x) {
  const y = FLOOR - 70;
  g.fillStyle(0x8a8c94, 1).fillRect(x, y + 20, 200, 38).fillRect(x + 40, y, 110, 24);
  g.fillStyle(0x2a3a4a, 1).fillRect(x + 48, y + 4, 44, 18).fillRect(x + 98, y + 4, 44, 18);
  g.fillStyle(0x6a6c74, 1).fillRect(x, y + 40, 200, 4);
  g.fillStyle(0xffe8a8, 1).fillRect(x + 194, y + 26, 6, 8);
  g.fillStyle(0xd83a3a, 1).fillRect(x, y + 26, 5, 8);
  g.fillStyle(0x141418, 1).fillCircle(x + 40, y + 60, 15).fillCircle(x + 160, y + 60, 15);
  g.fillStyle(0xb8b8c0, 1).fillCircle(x + 40, y + 60, 6).fillCircle(x + 160, y + 60, 6);
}

// Ванная: плитка, ванна, раковина с зеркалом, унитаз, «Малютка»
export function drawBathroom(scene, width) {
  const g = scene.add.graphics();
  g.fillStyle(0x6a8a9a, 1).fillRect(0, 0, width, 200);
  g.fillStyle(0x8ab4c8, 1).fillRect(0, 200, width, FLOOR - 200);
  for (let x = 0; x < width; x += 30) g.fillStyle(0x7aa0b4, 1).fillRect(x, 200, 2, FLOOR - 200);
  for (let y = 200; y < FLOOR; y += 30) g.fillStyle(0x7aa0b4, 1).fillRect(0, y, width, 2);
  // Отбитые плитки
  [[150, 260], [420, 320], [880, 230], [700, 410]].forEach(([x, y]) => g.fillStyle(0x5a7080, 1).fillRect(x, y, 28, 28));
  // Пол в шашечку
  for (let x = 0; x < width; x += 40) for (let y = FLOOR; y < 540; y += 35) g.fillStyle((x / 40 + (y - FLOOR) / 35) % 2 ? 0x4a5a68 : 0x5a6a78, 1).fillRect(x, y, 40, 35);
  g.fillStyle(0x3a4a58, 1).fillRect(0, FLOOR - 6, width, 6);
  // Лампочка
  g.fillStyle(0x1a1a1a, 1).fillRect(498, 0, 4, 40);
  g.fillStyle(0xfff0c0, 1).fillCircle(500, 48, 10);
  g.fillStyle(0xfff0c0, 0.07).fillTriangle(500, 50, 150, FLOOR, 850, FLOOR);
  // Стиральная машина «Малютка»
  g.fillStyle(0xe8e8ec, 1).fillRect(170, 380, 70, 90);
  g.fillStyle(0xb8b8c0, 1).fillRect(170, 372, 70, 10);
  g.fillStyle(0x3a6aaa, 1).fillRect(186, 400, 38, 6);
  // Раковина и зеркальный шкафчик
  g.fillStyle(0xf0f0f4, 1).fillRect(300, 370, 90, 22).fillRect(334, 392, 22, 78);
  g.fillStyle(0xb8b8c0, 1).fillRect(340, 352, 6, 20);
  g.fillStyle(0xe8e0d0, 1).fillRect(296, 210, 98, 120);
  g.fillStyle(0x9ab8c8, 1).fillRect(304, 218, 82, 104);
  g.fillStyle(0xd8e4ec, 0.6).fillRect(304, 218, 82, 104); // запотело
  // Унитаз
  g.fillStyle(0xf0f0f4, 1).fillRect(480, 340, 50, 70).fillRect(462, 410, 80, 26).fillRect(476, 436, 50, 34);
  g.fillStyle(0xc8c8d0, 1).fillRect(498, 330, 14, 10);
  // Полка с кремами
  g.fillStyle(0x8a6a48, 1).fillRect(580, 250, 110, 8);
  [[590, 0xff9ab8], [612, 0xffffff], [632, 0x8ae6a0], [656, 0xffd166]].forEach(([x, c]) => g.fillStyle(c, 1).fillRect(x, 226, 14, 24));
  // Ванна с отбитой эмалью и краном
  g.fillStyle(0xf4f4f8, 1).fillRect(700, 380, 260, 70);
  g.fillStyle(0xd8d8e0, 1).fillRect(700, 380, 260, 10);
  g.fillStyle(0x2a2a30, 1).fillRect(760, 410, 10, 8).fillRect(880, 420, 14, 8);
  g.fillStyle(0xc8c8d0, 1).fillRect(712, 450, 10, 20).fillRect(938, 450, 10, 20);
  g.fillStyle(0xb8b8c0, 1).fillRect(770, 330, 8, 50).fillRect(758, 330, 30, 8);
  // Полотенца на крючках
  g.fillStyle(0xff9ab8, 1).fillRect(610, 300, 30, 60);
  g.fillStyle(0x6a8aff, 1).fillRect(650, 300, 30, 70);
  return g;
}

// Склад «ЛогистЛайн»: стеллажи, конвейер, погрузчик
export function drawWarehouse(scene, width) {
  const g = scene.add.graphics();
  g.fillStyle(0x3a3e46, 1).fillRect(0, 0, width, FLOOR);
  for (let x = 0; x < width; x += 120) g.fillStyle(0x34383f, 1).fillRect(x, 0, 6, FLOOR);
  g.fillStyle(0x2a2c30, 1).fillRect(0, FLOOR, width, 70);
  g.fillStyle(0xd8b040, 1);
  for (let x = 0; x < width; x += 80) g.fillRect(x, FLOOR + 20, 40, 6);
  // Лампы дневного света
  for (let x = 120; x < width; x += 300) {
    g.fillStyle(0xe8f4ff, 1).fillRect(x, 30, 120, 8);
    g.fillStyle(0xe8f4ff, 0.05).fillTriangle(x + 60, 38, x - 80, FLOOR, x + 200, FLOOR);
  }
  // Стеллажи с коробками
  for (let x = 320; x < 1100; x += 260) {
    g.fillStyle(0x2a5aa8, 1).fillRect(x, 120, 8, 350).fillRect(x + 200, 120, 8, 350);
    for (let y = 180; y < 470; y += 100) {
      g.fillStyle(0xff8a20, 1).fillRect(x, y, 208, 6);
      for (let b = x + 12; b < x + 190; b += 50) g.fillStyle(0xc89a5a, 1).fillRect(b, y - 40, 44, 40);
    }
  }
  // Ворота фуры
  g.fillStyle(0x1a1c20, 1).fillRect(1260, 200, 220, FLOOR - 200);
  g.fillStyle(0xd8b040, 1).fillRect(1260, 196, 220, 6);
  g.fillStyle(0xd8d8d8, 1).fillRect(1290, 260, 170, 140);
  g.fillStyle(0x2a2c30, 1).fillRect(1300, 270, 150, 120);
  // Погрузчик
  g.fillStyle(0xffc020, 1).fillRect(150, 380, 90, 60).fillRect(170, 330, 50, 50);
  g.fillStyle(0x2a2a2a, 1).fillRect(240, 330, 6, 120).fillCircle(170, 450, 16).fillCircle(225, 450, 12);
  // Табличка
  g.fillStyle(0xff8a20, 1).fillRect(40, 90, 200, 40);
  scene.add.text(140, 110, 'ЛОГИСТЛАЙН', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#1a1c20' }).setOrigin(0.5);
  scene.add.text(140, 150, 'УРОНИЛ — ЗАПЛАТИЛ', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ff8a20' }).setOrigin(0.5);
  return g;
}

// Ломбард: решётка, прилавок, витрины с гитарами и телевизорами
export function drawPawnshop(scene, width) {
  const g = scene.add.graphics();
  g.fillStyle(0x3a2a24, 1).fillRect(0, 0, width, FLOOR);
  for (let x = 0; x < width; x += 50) g.fillStyle(0x34261f, 1).fillRect(x, 0, 25, FLOOR);
  g.fillStyle(0x2a1e1a, 1).fillRect(0, FLOOR, width, 70);
  // Полки: гитары, телевизоры, магнитофоны
  g.fillStyle(0x5a3a2a, 1).fillRect(40, 140, 360, 8).fillRect(40, 250, 360, 8);
  [[60, 0xc8642a], [130, 0x2a2a2a], [200, 0xd8b040]].forEach(([x, c]) => {
    g.fillStyle(c, 1).fillEllipse(x + 20, 228, 40, 36).fillRect(x + 16, 150, 8, 70);
  });
  g.fillStyle(0x2a2a30, 1).fillRect(260, 90, 60, 50).fillRect(330, 100, 50, 40);
  g.fillStyle(0x6a8aaa, 1).fillRect(266, 96, 48, 36).fillRect(336, 106, 38, 28);
  g.fillStyle(0x4a4a52, 1).fillRect(270, 210, 110, 40);
  // Прилавок с решёткой
  g.fillStyle(0x5a3a2a, 1).fillRect(520, 360, 320, 110);
  g.fillStyle(0x8ab4c8, 0.3).fillRect(530, 370, 300, 40);
  g.fillStyle(0xffd166, 1).fillRect(560, 390, 20, 6).fillRect(620, 392, 30, 4).fillRect(700, 388, 12, 12);
  for (let x = 520; x <= 840; x += 20) g.fillStyle(0x6a6a72, 1).fillRect(x, 160, 3, 200);
  g.fillStyle(0x6a6a72, 1).fillRect(520, 160, 323, 4);
  // Вывеска
  g.fillStyle(0xd8b040, 1).fillRect(560, 70, 240, 40);
  scene.add.text(680, 90, 'ЛОМБАРД 24', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#2a1e1a' }).setOrigin(0.5);
  // Выход
  g.fillStyle(0x15101c, 1).fillRect(910, 250, 90, FLOOR - 250);
  return g;
}

// Барахолка под эстакадой у станции
export function drawFlea(scene, width) {
  const g = scene.add.graphics();
  bands(g, 0, 0, width, FLOOR, [0x15102a, 0x1e1535, 0x2a1b3d, 0x3a1f45]);
  // Эстакада
  g.fillStyle(0x3a3a44, 1).fillRect(0, 60, width, 50);
  for (let x = 80; x < width; x += 400) g.fillStyle(0x34343c, 1).fillRect(x, 110, 50, FLOOR - 110);
  g.fillStyle(0x2b2b33, 1).fillRect(0, FLOOR, width, 70);
  // Гирлянда
  for (let x = 10; x < width; x += 36) g.fillStyle([0xffd166, 0xff3d8a, 0x3df0ff][(x / 36) % 3 | 0], 1).fillCircle(x, 140 + Math.sin(x / 60) * 10, 4);
  // Прилавки под тентами
  [[160, 0x2a6a8a], [520, 0x8a2a4a], [900, 0x4a6a2a], [1260, 0x6a4a8a]].forEach(([x, c]) => {
    g.fillStyle(c, 1).fillRect(x, 230, 260, 30);
    for (let i = 0; i < 260; i += 26) g.fillStyle(0xe8e0d0, 1).fillRect(x + i, 230, 13, 30);
    g.fillStyle(0x5a3a2a, 1).fillRect(x + 10, 380, 240, 14).fillRect(x + 20, 394, 10, 76).fillRect(x + 230, 394, 10, 76);
    g.fillStyle(0x3a3a3a, 1).fillRect(x, 260, 6, 210).fillRect(x + 254, 260, 6, 210);
  });
  // Товар: кассеты, провода, микрофоны, колонки
  for (let i = 0; i < 9; i++) g.fillStyle([0xe8e0d0, 0x2a2a2a, 0xd83a3a][i % 3], 1).fillRect(180 + i * 24, 364, 18, 16);
  g.fillStyle(0x2a2a2a, 1).fillRect(560, 330, 40, 50).fillRect(620, 340, 30, 40);
  g.fillStyle(0x8a8a9a, 1).fillRect(940, 350, 12, 30).fillRect(980, 345, 12, 35).fillRect(1020, 352, 12, 28).fillRect(1060, 348, 12, 32);
  g.fillStyle(0x3a3a44, 1).fillCircle(946, 348, 9).fillCircle(986, 343, 9).fillCircle(1026, 350, 9).fillCircle(1066, 346, 9);
  g.fillStyle(0x6a4a2a, 1).fillRect(1300, 330, 60, 50);
  scene.add.text(1030, 214, 'ЗВУК · ПРОВОДА · МИКРОФОНЫ', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffd166' }).setOrigin(0.5);
  scene.add.text(width / 2, 86, 'СТ. ЗАВОДСКАЯ', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ff3d3d' }).setOrigin(0.5);
  return g;
}

export function drawGarage(scene, width) {
  const g = scene.add.graphics();
  g.fillStyle(0x34343c, 1).fillRect(0, 0, width, FLOOR);
  for (let y = 0; y < FLOOR; y += 40) {
    for (let x = (y / 40) % 2 ? 0 : -40; x < width; x += 80) g.fillStyle(0x2c2c34, 1).fillRect(x, y, 2, 40);
    g.fillStyle(0x2c2c34, 1).fillRect(0, y, width, 2);
  }
  g.fillStyle(0x24242a, 1).fillRect(0, FLOOR, width, 70);
  g.fillStyle(0x4a3a2a, 0.6).fillRect(560, FLOOR + 6, 360, 50);

  // Проём ворот (сами ворота — объект-дверь)
  g.fillStyle(0x07060d, 1).fillRect(6, 240, 126, FLOOR - 240);

  // Ковёр на стене
  g.fillStyle(0x8a1f28, 1).fillRect(160, 120, 280, 180);
  g.lineStyle(6, 0xd8a040, 1).strokeRect(172, 132, 256, 156);
  g.fillStyle(0x1e3a5a, 1).fillRect(260, 170, 80, 80);
  g.fillStyle(0xd8a040, 1).fillRect(290, 150, 20, 120).fillRect(240, 200, 120, 20);
  g.fillStyle(0x8a1f28, 1).fillRect(294, 204, 12, 12);

  // Диван
  g.fillStyle(0x3a4a6a, 1).fillRect(160, 392, 280, 44).fillRect(160, 362, 280, 34);
  g.fillStyle(0x2e3c58, 1).fillRect(150, 376, 24, 60).fillRect(426, 376, 24, 60);
  g.fillStyle(0x1a1a1a, 1).fillRect(170, 436, 10, 34).fillRect(420, 436, 10, 34);

  // Стол: колонки и пульт ставятся объектами (они качаются в такт)
  g.fillStyle(0x5a4030, 1).fillRect(600, 404, 260, 10).fillRect(610, 414, 10, 56).fillRect(840, 414, 10, 56);
  g.fillStyle(0x2a2a30, 1).fillRect(690, 346, 80, 50);
  g.fillStyle(0x1e1e24, 1).fillRect(724, 396, 12, 8);
  g.fillStyle(0x1e1e24, 1).fillRect(670, 396, 120, 8);

  // Микрофонная стойка
  g.fillStyle(0x2a2a2a, 1).fillRect(1000, 320, 6, 150).fillRect(980, 466, 46, 4).fillRect(1000, 320, 26, 4);
  g.fillStyle(0x8a8a9a, 1).fillRect(1022, 306, 14, 26);
  g.fillStyle(0x3a5aaa, 1).fillRect(1022, 318, 14, 5);
  g.fillStyle(0xff3d3d, 1).fillCircle(1000, 140, 6);
  scene.add.text(1012, 132, 'REC', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ff3d3d' });

  // Лампочка
  g.fillStyle(0x1a1a1a, 1).fillRect(718, 0, 4, 60);
  scene.bulb = scene.add.circle(720, 70, 12, 0xffe8a8);
  scene.bulbLight = scene.add.triangle(0, 0, 720, 70, 400, FLOOR, 1040, FLOOR, 0xffe8a8, 0.06).setOrigin(0);

  // Афиши (картинки нарисованы в art.js)
  scene.add.image(520, 190, 'poster_arena').setDisplaySize(110, 156).setAngle(-2);
  scene.add.image(915, 200, 'poster_tape').setDisplaySize(70, 94).setAngle(3);

  // Колонки и экран — отдельными объектами, чтобы «дышали» под бит
  scene.speakers = [];
  [645, 815].forEach((x) => {
    scene.add.rectangle(x, 352, 54, 104, 0x1a1a1e);
    const big = scene.add.circle(x, 336, 15, 0x3a3a44);
    const small = scene.add.circle(x, 378, 9, 0x3a3a44);
    scene.speakers.push(big, small);
  });
  scene.screen = scene.add.rectangle(730, 371, 70, 36, 0x3df0ff);
  return g;
}
