// Автотест кликабельных списков: реальные клики мышью и пальцем при разных размерах окна,
// со сдвинутым на странице холстом и сдвинутой камерой.
//   • тетрадь «ОТДАТЬ РЕЮ» — выбрать 3 строчки и «ГОТОВО», потом «ОТКАЗАТЬСЯ»;
//   • варианты ответа в диалоге;
//   • комп Дэна (папка «ДЕМКИ») — включить/выключить демку, прокрутить к восьмой, закрыть;
//   • телефон — открыть «Телефон» и нажать на контакт.
// Запуск: npm run build && npx vite preview --port 4173, затем  node tests/clicks.cjs  (PORT=5173 — для npm run dev).
// Нужен Playwright с Chromium:  npm i -D playwright && npx playwright install chromium
const { chromium } = require('playwright');

const URL = `http://localhost:${process.env.PORT || 4173}`;
const SIZES = [[960, 540], [1280, 720], [800, 600], [1920, 1080], [390, 844]];

// Центр игрового объекта (с учётом контейнеров) → координаты на странице
async function pagePoint(p, expr) {
  return p.evaluate((expr) => {
    const s = game.scene.getScene('Location');
    // eslint-disable-next-line no-new-func
    const o = new Function('s', `return ${expr}`)(s);
    if (!o) return null;
    const b = o.getBounds();
    const c = game.canvas.getBoundingClientRect();
    return [c.left + ((b.x + b.width * 0.8) / 960) * c.width, c.top + ((b.y + b.height / 2) / 540) * c.height];
  }, expr);
}

async function run(w, h, mode) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mode === 'touch' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const results = {};
  const tap = async (expr) => {
    const pt = await pagePoint(p, expr);
    if (!pt) throw new Error(`нет объекта: ${expr}`);
    if (mode === 'touch') await p.touchscreen.tap(pt[0], pt[1]);
    else await p.mouse.click(pt[0], pt[1]);
    await p.waitForTimeout(200);
  };
  try {
    await p.goto(URL);
    await p.waitForTimeout(1800);
    await p.keyboard.press('2'); // «Сразу Эпизод 1» (сохранений нет — второй пункт)
    await p.waitForFunction(() => game.scene.getScene('Location')?.player, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    // Камера сдвинута: у арки во дворе; холст сдвинут на странице без resize
    await p.evaluate(() => game.scene.getScene('Location').scene.restart({ loc: 'yard', spawnX: 2400 }));
    await p.waitForFunction(() => game.scene.getScene('Location')?.locKey === 'yard' && game.scene.getScene('Location').player, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      const s = game.scene.getScene('Location');
      s.phone.queue = [];
      s.phone.hide(true);
      s.dialogue.close();
      s.busy = true; // сюжетные сцены не мешают
      document.body.style.paddingTop = '37px';
      document.getElementById('game').style.marginLeft = '23px';
    });
    await p.waitForTimeout(300);

    // 1. Тетрадь: выбрать три строчки и «ГОТОВО»
    await p.evaluate(() => {
      window.__r = undefined;
      game.scene.getScene('Location').notebook.pick(3, 'ОТДАТЬ РЕЮ').then((r) => (window.__r = r ? r.map((l) => l.text) : null));
    });
    await p.waitForTimeout(400);
    const zone = (i) => `s.notebook.root.list.filter((o) => o.input && o.width > 500)[${i}]`;
    await tap(zone(0));
    await tap(zone(2));
    await tap(zone(4));
    await tap(`s.notebook.root.list.find((o) => o.type === 'Text' && o.text === 'ГОТОВО')`);
    await p.waitForTimeout(400);
    const r1 = await p.evaluate(() => window.__r);
    results.notebook = Array.isArray(r1) && r1.length === 3;
    // …и «ОТКАЗАТЬСЯ»
    await p.evaluate(() => {
      window.__r = undefined;
      game.scene.getScene('Location').notebook.pick(3, 'ОТДАТЬ РЕЮ').then((r) => (window.__r = r === null ? 'cancel' : r));
    });
    await p.waitForTimeout(400);
    await tap(`s.notebook.root.list.find((o) => o.type === 'Text' && o.text === 'ОТКАЗАТЬСЯ')`);
    await p.waitForTimeout(300);
    results.refuse = (await p.evaluate(() => window.__r)) === 'cancel';

    // 2. Диалог: второй вариант из трёх
    await p.evaluate(() => {
      window.__r = undefined;
      game.scene.getScene('Location').dialogue.choose(['Первый', 'Второй', 'Третий']).then((i) => (window.__r = i));
    });
    await p.waitForTimeout(500);
    await tap('s.dialogue.choiceItems[1].bg');
    await p.waitForTimeout(500);
    results.choice = (await p.evaluate(() => window.__r)) === 1;
    await p.evaluate(() => game.scene.getScene('Location').dialogue.close());

    // 3. Комп Дэна: восемь демок в «ДЕМКАХ»
    await p.evaluate(() => new Promise((res) => {
      const req = indexedDB.open('platina', 2);
      req.onupgradeneeded = () => ['demos', 'photos', 'memos'].forEach((n) => req.result.objectStoreNames.contains(n) || req.result.createObjectStore(n, { keyPath: 'id' }));
      req.onsuccess = () => {
        const t = req.result.transaction('demos', 'readwrite');
        for (let i = 0; i < 8; i++) {
          t.objectStore('demos').put({ id: `demo_t${i}`, title: `Тест ${i + 1}`, theme: 'street', lines: [], items: [], voice: null, beatFrom: 0, length: 4, score: null, createdAt: Date.now() - i * 1000 });
        }
        t.oncomplete = () => res();
      };
    }));
    await p.evaluate(() => { game.scene.getScene('Location').pc.show(); });
    await p.waitForTimeout(900);
    await tap('s.pc.rowsBox.list.filter((o) => o.input)[1]');
    await p.waitForTimeout(900);
    const playing = await p.evaluate(() => game.scene.getScene('Location').pc.playing?.id || null);
    await tap('s.pc.rowsBox.list.filter((o) => o.input)[1]');
    await p.waitForTimeout(500);
    const stopped = await p.evaluate(() => !game.scene.getScene('Location').pc.playing);
    results.pcPlay = !!playing && stopped;
    // Прокрутка к восьмой: кнопка ▼ (или колёсико)
    for (let i = 0; i < 3; i++) {
      const has = await p.evaluate(() => !!game.scene.getScene('Location').pc.downBtn?.active);
      if (!has) break;
      await tap('s.pc.downBtn');
    }
    const titles = await p.evaluate(() => game.scene.getScene('Location').pc.rowsBox.list.filter((o) => o.type === 'Text').map((t) => t.text).join('|'));
    results.pcScroll = /Тест 8/.test(titles);
    await tap(`s.pc.root.list.find((o) => o.type === 'Text' && o.text === '[X]')`);
    await p.waitForTimeout(300);
    results.pcClose = await p.evaluate(() => !game.scene.getScene('Location').pc.open);

    // 4. Телефон: «Телефон» → нажать на контакт → звонок
    await p.evaluate(() => {
      const s = game.scene.getScene('Location');
      s.busy = false;
      s.phone.show('contacts');
    });
    await p.waitForTimeout(700);
    await tap('s.phone.focus[0].r');
    await p.waitForTimeout(500);
    results.phone = await p.evaluate(() => ['call'].includes(game.scene.getScene('Location').phone.page) || !!game.scene.getScene('Location').pill);
  } catch (e) {
    errs.push(`ТЕСТ: ${e.message}`);
  }
  await b.close();
  return { results, errs };
}

(async () => {
  let fails = 0;
  for (const [w, h] of SIZES) {
    for (const mode of ['mouse', 'touch']) {
      const { results, errs } = await run(w, h, mode);
      const bad = Object.entries(results).filter(([, v]) => !v).map(([k]) => k);
      if (bad.length || errs.length || Object.keys(results).length < 7) fails++;
      console.log(`${w}x${h} ${mode}: ${Object.entries(results).map(([k, v]) => `${k}=${v ? 'OK' : 'FAIL'}`).join(' ')}${errs.length ? `  ОШИБКИ: ${errs.join('; ')}` : ''}`);
    }
  }
  console.log(fails ? `ПРОВАЛОВ: ${fails}` : 'ВСЁ OK');
  process.exit(fails ? 1 : 0);
})();
