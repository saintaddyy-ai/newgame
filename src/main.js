import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/pt-mono/400.css';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { StudioScene } from './scenes/StudioScene.js';
import { EndScene } from './scenes/EndScene.js';
import { WarehouseScene } from './scenes/WarehouseScene.js';
import { StageScene } from './scenes/StageScene.js';
import { ChaseScene } from './scenes/ChaseScene.js';
import { state } from './state.js';
import { audioCtx } from './audio.js';

// Для автотестов и отладки из консоли
window.__state = state;
window.__ac = audioCtx;

// Ждём шрифты (но не дольше 2 секунд), иначе первый текст отрисуется системным шрифтом
async function loadFonts() {
  if (!document.fonts) return;
  const wait = Promise.all([
    document.fonts.load('16px "Press Start 2P"', 'ПЛАТИНА platina'),
    document.fonts.load('18px "PT Mono"', 'Тень tень'),
    document.fonts.load('italic 18px "PT Mono"', 'Тень'),
  ]);
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2000))]).catch(() => {});
}

loadFonts().then(() => {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: '#07060d',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, LocationScene, StudioScene, EndScene, WarehouseScene, StageScene, ChaseScene],
  });
});
