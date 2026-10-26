// Фоны локаций, нарисованные прямоугольниками в пиксельном стиле.

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
  // Звёзды
  for (let i = 0; i < width / 12; i++) g.fillStyle(0xffffff, 0.3 + r() * 0.5).fillRect(r() * width, r() * 200, 2, 2);
  g.fillStyle(0xf2e8c8, 1).fillCircle(width * 0.8, 90, 26);
  g.fillStyle(0x15102a, 1).fillCircle(width * 0.8 + 12, 82, 22);

  // Дальний центр: небоскрёбы с неоном
  for (let x = 0; x < width; x += 60 + r() * 50) {
    const h = 140 + r() * 180;
    const w = 40 + r() * 40;
    g.fillStyle(0x1a1430, 1).fillRect(x, groundY - 130 - h, w, h + 130);
    if (r() > 0.6) g.fillStyle(r() > 0.5 ? 0xff3d8a : 0x3df0ff, 0.8).fillRect(x + 6, groundY - 120 - h, w - 12, 3);
  }
  // Ближние панельки с окнами
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

export function drawApartment(scene, width) {
  const g = scene.add.graphics();
  // Обои
  g.fillStyle(0x3a2f4a, 1).fillRect(0, 0, width, FLOOR);
  for (let x = 0; x < 760; x += 40) g.fillStyle(0x44385a, 1).fillRect(x, 0, 14, FLOOR);
  // Пол
  g.fillStyle(0x2a1f1a, 1).fillRect(0, FLOOR, width, 70);
  for (let x = 0; x < width; x += 90) g.fillStyle(0x1f1612, 1).fillRect(x, FLOOR, 3, 70);
  g.fillStyle(0x1e1622, 1).fillRect(0, FLOOR - 10, width, 10);

  // Окно с рассветом над панельками
  g.fillStyle(0xd8d4e0, 1).fillRect(392, 112, 176, 196);
  bands(g, 400, 120, 160, 180, [0x3a2a5a, 0x6a3a6a, 0xa04a6a, 0xe0705a, 0xffa060]);
  g.fillStyle(0x1e1830, 1).fillRect(400, 220, 40, 80).fillRect(450, 190, 50, 110).fillRect(510, 240, 50, 60);
  g.fillStyle(0xffd27a, 1).fillRect(460, 200, 6, 6).fillRect(480, 230, 6, 6).fillRect(416, 240, 6, 6);
  g.fillStyle(0xd8d4e0, 1).fillRect(476, 120, 8, 180).fillRect(400, 205, 160, 6);
  g.fillStyle(0xbab4c8, 1).fillRect(384, 304, 192, 12);

  // Плакат
  g.fillStyle(0x15102a, 1).fillRect(190, 150, 100, 130);
  g.lineStyle(4, 0xff3d8a, 1).strokeRect(190, 150, 100, 130);
  g.fillStyle(0x3df0ff, 1).fillCircle(240, 200, 24);
  g.fillStyle(0x15102a, 1).fillCircle(240, 200, 12);
  g.fillStyle(0xffd166, 1).fillRect(205, 245, 70, 8).fillRect(215, 260, 50, 6);

  // Кровать
  g.fillStyle(0x4a3a2a, 1).fillRect(60, 360, 16, 110).fillRect(330, 390, 14, 80);
  g.fillStyle(0x8a8aa8, 1).fillRect(76, 390, 254, 30);
  g.fillStyle(0x5b4b8a, 1).fillRect(130, 380, 200, 44);
  g.fillStyle(0x6b5b9a, 1).fillRect(130, 380, 200, 8);
  g.fillStyle(0xe8e4f0, 1).fillRect(82, 372, 50, 22);
  g.fillStyle(0x3a2a1e, 1).fillRect(76, 420, 254, 14);

  // Стол с тетрадью и лампой
  g.fillStyle(0x5a4030, 1).fillRect(590, 380, 140, 12).fillRect(598, 392, 10, 78).fillRect(712, 392, 10, 78);
  g.fillStyle(0xf1ead8, 1).fillRect(612, 370, 44, 10);
  g.fillStyle(0xd86a6a, 1).fillRect(612, 370, 4, 10);
  g.fillStyle(0x2a2a2a, 1).fillRect(690, 330, 4, 50).fillRect(680, 376, 24, 4);
  g.fillStyle(0xffd27a, 1).fillTriangle(676, 334, 708, 334, 692, 318);
  g.fillStyle(0xffd27a, 0.08).fillTriangle(692, 334, 600, 380, 740, 380);

  // Проём на кухню
  g.fillStyle(0x251d30, 1).fillRect(760, 0, 22, FLOOR);

  // Кухня: плитка
  g.fillStyle(0x4a5868, 1).fillRect(782, 240, width - 782, FLOOR - 250);
  for (let x = 782; x < width; x += 30) g.fillStyle(0x3e4a5a, 1).fillRect(x, 240, 2, FLOOR - 250);
  for (let y = 240; y < FLOOR - 10; y += 30) g.fillStyle(0x3e4a5a, 1).fillRect(782, y, width - 782, 2);
  // Холодильник
  g.fillStyle(0xd8d8d8, 1).fillRect(820, 280, 84, 190);
  g.fillStyle(0xb8b8b8, 1).fillRect(820, 350, 84, 4).fillRect(890, 300, 4, 30).fillRect(890, 370, 4, 40);
  g.fillStyle(0xff3d8a, 1).fillRect(836, 300, 10, 10);
  g.fillStyle(0xffd166, 1).fillRect(852, 310, 8, 12);
  // Плита с кастрюлей
  g.fillStyle(0xe8e8e8, 1).fillRect(930, 380, 90, 90);
  g.fillStyle(0x2a2a2a, 1).fillRect(930, 376, 90, 6).fillRect(945, 400, 60, 50);
  g.fillStyle(0x8a8a9a, 1).fillRect(950, 346, 50, 30).fillRect(944, 346, 62, 6);
  // Шкафчики
  g.fillStyle(0x6a4a3a, 1).fillRect(910, 150, 220, 70);
  g.fillStyle(0x5a3a2a, 1).fillRect(1018, 150, 4, 70);
  // Стол со счетами
  g.fillStyle(0x7a5a40, 1).fillRect(1100, 380, 170, 12).fillRect(1110, 392, 10, 78).fillRect(1250, 392, 10, 78);
  g.fillStyle(0xf4f4f4, 1).fillRect(1130, 372, 34, 8).fillRect(1170, 370, 30, 10);
  g.fillStyle(0xffd166, 1).fillRect(1212, 374, 8, 6).fillRect(1222, 375, 6, 5);
  // Окно на кухне
  g.fillStyle(0xd8d4e0, 1).fillRect(1110, 120, 120, 100);
  bands(g, 1116, 126, 108, 88, [0x6a3a6a, 0xa04a6a, 0xe0705a]);
  // Входная дверь
  g.fillStyle(0x251d30, 1).fillRect(1392, 262, 96, 208);
  g.fillStyle(0x5a3a2a, 1).fillRect(1400, 270, 80, 200);
  g.fillStyle(0x4a2e22, 1).fillRect(1410, 284, 60, 70).fillRect(1410, 370, 60, 80);
  g.fillStyle(0xd8b040, 1).fillRect(1466, 370, 8, 8);
  return g;
}

export function drawYard(scene, width) {
  drawSkyline(scene, width, { seed: 42, groundY: FLOOR - 10 });
  const g = scene.add.graphics();
  // Асфальт и бордюр
  g.fillStyle(0x2b2b33, 1).fillRect(0, FLOOR - 10, width, 80);
  g.fillStyle(0x4a4a55, 1).fillRect(0, FLOOR - 14, width, 6);
  for (let x = 40; x < width; x += 260) g.fillStyle(0x3a3a48, 1).fillRect(x, FLOOR + 30, 90, 8);
  // Лужи с отражением неона
  g.fillStyle(0x3a2a5a, 0.8).fillEllipse(620, FLOOR + 40, 140, 14);
  g.fillStyle(0xff3d8a, 0.35).fillEllipse(1420, FLOOR + 44, 120, 10);

  // Подъезд
  g.fillStyle(0x3a3448, 1).fillRect(60, 260, 140, 200);
  g.fillStyle(0x1a1626, 1).fillRect(90, 320, 80, 140);
  g.fillStyle(0x6a6a7a, 1).fillRect(80, 300, 100, 10);
  g.fillStyle(0xfff0b0, 1).fillRect(122, 280, 16, 10);
  g.fillStyle(0x4a6a4a, 1).fillRect(150, 380, 12, 12);

  // Фонари
  [480, 1360].forEach((x) => {
    g.fillStyle(0x1a1a22, 1).fillRect(x, 230, 8, FLOOR - 240).fillRect(x - 20, 230, 36, 6);
    g.fillStyle(0xffe0a0, 1).fillRect(x - 22, 236, 16, 6);
    g.fillStyle(0xffe0a0, 0.08).fillTriangle(x - 14, 242, x - 110, FLOOR, x + 80, FLOOR);
  });

  // Детская площадка: качели
  g.fillStyle(0xc04040, 1).fillRect(680, 330, 8, 130).fillRect(820, 330, 8, 130).fillRect(680, 326, 148, 8);
  g.fillStyle(0x8a8a9a, 1).fillRect(724, 334, 2, 80).fillRect(780, 334, 2, 80);
  g.fillStyle(0xd8b040, 1).fillRect(718, 412, 70, 6);

  // Лавочка
  g.fillStyle(0x6a4a30, 1).fillRect(960, 420, 150, 10).fillRect(960, 390, 150, 8);
  g.fillStyle(0x2a2a2a, 1).fillRect(970, 430, 8, 30).fillRect(1092, 430, 8, 30);

  // Стена с граффити
  g.fillStyle(0x4a4450, 1).fillRect(1250, 300, 300, 160);
  for (let y = 300; y < 460; y += 20) g.fillStyle(0x3e3844, 1).fillRect(1250, y, 300, 2);
  const tag = scene.add.text(1400, 380, 'ТЕНЬ', {
    fontFamily: '"Press Start 2P"', fontSize: '42px', color: '#3df0ff', stroke: '#ff3d8a', strokeThickness: 8,
  }).setOrigin(0.5).setAngle(-6);
  tag.setShadow(0, 0, '#3df0ff', 16, true, true);

  // Ряд гаражей, один приоткрыт — у Дэна горит свет
  for (let x = 1620; x < width - 40; x += 130) {
    g.fillStyle(0x3a3f4a, 1).fillRect(x, 320, 124, 140);
    g.fillStyle(0x4a505c, 1).fillRect(x + 8, 340, 108, 120);
    for (let y = 348; y < 460; y += 12) g.fillStyle(0x3e4450, 1).fillRect(x + 8, y, 108, 2);
  }
  g.fillStyle(0xffd27a, 0.9).fillRect(1890 + 8, 430, 108, 30);
  g.fillStyle(0xffd27a, 0.12).fillTriangle(1898, 460, 2006, 460, 1952, 520);
  scene.add.text(1952, 300, '№17', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd166' }).setOrigin(0.5);
  return g;
}

export function drawGarage(scene, width) {
  const g = scene.add.graphics();
  // Бетонные стены
  g.fillStyle(0x34343c, 1).fillRect(0, 0, width, FLOOR);
  for (let y = 0; y < FLOOR; y += 40) {
    for (let x = (y / 40) % 2 ? 0 : -40; x < width; x += 80) g.fillStyle(0x2c2c34, 1).fillRect(x, y, 2, 40);
    g.fillStyle(0x2c2c34, 1).fillRect(0, y, width, 2);
  }
  g.fillStyle(0x24242a, 1).fillRect(0, FLOOR, width, 70);
  g.fillStyle(0x4a3a2a, 0.6).fillRect(560, FLOOR + 6, 360, 50);

  // Ворота гаража
  g.fillStyle(0x4a505c, 1).fillRect(10, 250, 90, 220);
  for (let y = 260; y < 470; y += 14) g.fillStyle(0x3e4450, 1).fillRect(10, y, 90, 2);
  g.fillStyle(0x07060d, 1).fillRect(10, 450, 90, 20);

  // Советский ковёр на стене
  g.fillStyle(0x8a1f28, 1).fillRect(150, 140, 280, 180);
  g.lineStyle(6, 0xd8a040, 1).strokeRect(162, 152, 256, 156);
  g.fillStyle(0x1e3a5a, 1).fillRect(250, 190, 80, 80);
  g.fillStyle(0xd8a040, 1).fillRect(280, 170, 20, 120).fillRect(230, 220, 120, 20);
  g.fillStyle(0x8a1f28, 1).fillRect(284, 224, 12, 12);

  // Диван
  g.fillStyle(0x3a4a6a, 1).fillRect(150, 370, 280, 60).fillRect(150, 340, 280, 34);
  g.fillStyle(0x2e3c58, 1).fillRect(140, 350, 24, 80).fillRect(416, 350, 24, 80);
  g.fillStyle(0x1a1a1a, 1).fillRect(160, 430, 10, 40).fillRect(410, 430, 10, 40);

  // Постеры
  g.fillStyle(0xffd166, 1).fillRect(480, 120, 70, 100);
  g.fillStyle(0x0c0a16, 1).fillRect(490, 140, 50, 50);
  g.fillStyle(0x3df0ff, 1).fillRect(470, 240, 90, 60);
  g.fillStyle(0x0c0a16, 1).fillRect(480, 250, 70, 8).fillRect(480, 266, 50, 8);

  // Стол с ноутбуком, пультом и колонками
  g.fillStyle(0x5a4030, 1).fillRect(600, 380, 260, 12).fillRect(610, 392, 10, 78).fillRect(840, 392, 10, 78);
  g.fillStyle(0x1a1a1e, 1).fillRect(610, 290, 50, 90).fillRect(800, 290, 50, 90);
  g.fillStyle(0x3a3a44, 1).fillCircle(635, 320, 14).fillCircle(825, 320, 14).fillCircle(635, 358, 9).fillCircle(825, 358, 9);
  g.fillStyle(0x2a2a30, 1).fillRect(680, 330, 100, 50);
  g.fillStyle(0x3df0ff, 1).fillRect(686, 336, 88, 36);
  g.fillStyle(0x1e1e24, 1).fillRect(670, 370, 120, 10);
  g.fillStyle(0x2a2a2a, 1).fillRect(690, 366, 80, 6);
  for (let i = 0; i < 8; i++) g.fillStyle(i % 3 ? 0xff3d8a : 0xffd166, 1).fillRect(694 + i * 10, 367, 4, 4);

  // Микрофонная стойка, микрофон в изоленте
  g.fillStyle(0x2a2a2a, 1).fillRect(960, 300, 6, 170).fillRect(940, 466, 46, 4).fillRect(960, 300, 30, 4);
  g.fillStyle(0x8a8a9a, 1).fillRect(986, 284, 14, 26);
  g.fillStyle(0x3a5aaa, 1).fillRect(986, 296, 14, 5);
  g.fillStyle(0xff3d3d, 1).fillCircle(1000, 140, 6);
  scene.add.text(1012, 132, 'REC', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ff3d3d' });

  // Лампочка под потолком
  g.fillStyle(0x1a1a1a, 1).fillRect(718, 0, 4, 60);
  g.fillStyle(0xffe8a8, 1).fillCircle(720, 70, 12);
  g.fillStyle(0xffe8a8, 0.06).fillTriangle(720, 70, 400, FLOOR, 1040, FLOOR);
  return g;
}
