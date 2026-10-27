// Скриншоты ключевых экранов: node scripts/screens.cjs <папка> [порт]
// Нужен запущенный сервер (npm run dev или npx vite preview --port 4173).
// Пример: npx vite build && npx vite preview --port 4173 & node scripts/screens.cjs docs/screens/after
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(process.argv[2] || 'docs/screens/after');
const PORT = process.argv[3] || '4173';
const W = +(process.env.W || 960), H = +(process.env.H || 540);

// Локации Эп.2 (самый полный мир): [имя файла, локация, x, время (мин от полуночи), день]
const SPOTS = [
  ['02-room', 'apartment', 300, 9 * 60, 'fri'],
  ['03-kitchen', 'apartment', 1100, 9 * 60, 'fri'],
  ['04-bathroom-mirror', 'bathroom', 250, 9 * 60, 'fri'],
  ['05-yard-day', 'yard', 1200, 13 * 60, 'fri'],
  ['06-yard-night', 'yard', 1200, 23 * 60, 'fri'],
  ['07-garages', 'yard', 2300, 21 * 60, 'fri'],
  ['08-dan-garage', 'garage', 500, 21 * 60, 'fri'],
  ['09-street-cars', 'crossroads', 1300, 20 * 60, 'fri'],
  ['10-podval', 'podval', 700, 21 * 60, 'fri'],
  ['11-metro', 'metro', 700, 12 * 60, 'fri'],
  ['12-cafe', 'cafe_zerno', 600, 12 * 60, 'fri'],
  ['13-shawarma', 'shawarma', 600, 18 * 60, 'fri'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => m.type() === 'error' && !/404|Failed to load/.test(m.text()) && errs.push('CONSOLE ' + m.text()));
  await p.goto(`http://localhost:${PORT}`);
  await p.waitForTimeout(2500);
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  await shot('01-title');
  await p.keyboard.press('3'); // «Сразу Эпизод 2»
  await p.waitForFunction(() => game.scene.getScene('Location')?.sys.isActive() && game.scene.getScene('Location').player, null, { timeout: 30000 });
  await p.waitForTimeout(1000);
  // Закрываем вступление
  for (let i = 0; i < 40; i++) {
    const busy = await p.evaluate(() => { const s = game.scene.getScene('Location'); return s.busy || (s.dialogue && s.dialogue.active); });
    if (!busy) break;
    await p.keyboard.press('Space');
    await p.waitForTimeout(150);
  }
  for (const [name, loc, x, min, day] of SPOTS) {
    await p.evaluate(([loc, x, min, day]) => {
      const st = window.__state;
      st.time.min = min; st.time.day = day;
      const s = game.scene.getScene('Location');
      s.scene.restart({ loc, spawnX: x });
    }, [loc, x, min, day]);
    await p.waitForTimeout(1800);
    // Убираем входящие звонки и баннеры — для чистого кадра
    await p.evaluate(() => { const s = game.scene.getScene('Location'); if (s.phone) { s.phone.queue = []; s.phone.hide(true); } });
    // Пропускаем возможные сценки при входе (сценка может начаться не сразу)
    for (let i = 0, calm = 0; i < 60 && calm < 4; i++) {
      const busy = await p.evaluate(() => { const s = game.scene.getScene('Location'); return s.busy || (s.dialogue && s.dialogue.active); });
      if (!busy) { calm++; await p.waitForTimeout(150); continue; }
      calm = 0;
      await p.keyboard.press('Space');
      await p.waitForTimeout(120);
    }
    await p.waitForTimeout(500);
    await shot(name);
  }
  // Диалог, тетрадь, телефон — во дворе
  await p.evaluate(() => { window.__state.time.min = 19 * 60; game.scene.getScene('Location').scene.restart({ loc: 'yard', spawnX: 900 }); });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { const s = game.scene.getScene('Location'); if (s.phone) { s.phone.queue = []; s.phone.hide(true); } s.dialogue.say('Стас', 'Бро, это не проблема. Это контент.'); });
  await p.waitForTimeout(1500);
  await shot('20-dialogue');
  await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.keyboard.press('Space');
  await p.waitForTimeout(400);
  await p.keyboard.press('q'); await p.waitForTimeout(700);
  await shot('21-notebook');
  await p.keyboard.press('q'); await p.waitForTimeout(400);
  await p.evaluate(() => game.scene.getScene('Location').dialogue.close());
  await p.keyboard.press('p'); await p.waitForTimeout(900);
  await shot('22-phone');
  // Телефон можно сдвинуть влево — «Дела» с самочувствием
  await p.evaluate(() => {
    const s = game.scene.getScene('Location');
    s.phone.hide(true);
    window.__state.settings.phoneX = 20;
    s.phone.root.x = 20;
    s.phone.show('quests');
  });
  await p.waitForTimeout(900);
  await shot('23-phone-left-needs');
  console.log(errs.length ? errs.join('\n') : 'ERRORS []');
  await b.close();
})();
