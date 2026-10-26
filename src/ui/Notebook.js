import { state, TAGS } from '../state.js';

// Тетрадь Марка: здесь лежат все собранные строчки для треков
export class Notebook {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1100).setVisible(false);
  }

  show() {
    const s = this.scene;
    this.root.removeAll(true);
    const shade = s.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => this.hide());
    const page = s.add.rectangle(130, 50, 700, 440, 0xf1ead8).setOrigin(0).setStrokeStyle(4, 0x2a2238);
    const items = [shade, page];
    // Линейки в клетку, как в школьной тетради
    for (let y = 120; y < 480; y += 30) items.push(s.add.rectangle(150, y, 660, 1, 0x9ab0d8, 0.6).setOrigin(0));
    items.push(s.add.rectangle(200, 60, 2, 420, 0xd86a6a, 0.7).setOrigin(0));
    items.push(s.add.text(480, 82, 'ТЕТРАДЬ', { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#2a2238' }).setOrigin(0.5));

    if (!state.lines.length) {
      items.push(s.add.text(220, 140, 'Пока пусто. Осматривайся и разговаривай —\nстрочки приходят из жизни.', {
        fontFamily: '"PT Mono", monospace', fontSize: '19px', color: '#5a5070', fontStyle: 'italic', lineSpacing: 10,
      }));
    }
    state.lines.forEach((l, i) => {
      const y = 126 + i * 30;
      items.push(s.add.text(214, y - 2, `«${l.text}»`, { fontFamily: '"PT Mono", monospace', fontSize: '18px', color: '#1e1a2e', fontStyle: 'italic' }));
      items.push(s.add.text(812, y, TAGS[l.tag].name, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff', backgroundColor: TAGS[l.tag].color, padding: { x: 4, y: 3 },
      }).setOrigin(1, 0));
    });
    items.push(s.add.text(480, 470, '[Q] закрыть', { fontFamily: '"PT Mono", monospace', fontSize: '16px', color: '#5a5070' }).setOrigin(0.5));
    this.root.add(items);
    this.root.setVisible(true);
    this.open = true;
  }

  hide() {
    this.root.setVisible(false);
    this.open = false;
  }
}
