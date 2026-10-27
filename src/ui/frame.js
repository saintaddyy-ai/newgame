// Пиксельные рамки интерфейса: тёмная панель с сеточкой, двойной кант (тёмный + цветной),
// срезанные углы. Работает и в WebGL, и в Canvas (Graphics + TileSprite, без NineSlice).
import Phaser from 'phaser';

const INK = 0x0b0912;
const PX = 2; // «пиксель» интерфейса — как пиксель арта

function ditherTexture(scene) {
  if (scene.textures.exists('ui_dither')) return;
  const c = scene.textures.createCanvas('ui_dither', 4, 4);
  const g = c.getContext();
  g.fillStyle = 'rgba(255,255,255,0.06)';
  [[0, 0], [2, 2], [2, 0], [0, 2]].forEach(([x, y], i) => i < 2 && g.fillRect(x, y, 1, 1));
  c.refresh();
}

// Панель: graphics + сеточка. setSize перерисовывает. accent — цвет канта.
export class Panel {
  constructor(scene, x, y, w, h, { fill = 0x0f0c1a, alpha = 0.95, accent = 0xff3d8a, notch = true } = {}) {
    ditherTexture(scene);
    this.scene = scene;
    this.fill = fill;
    this.alpha = alpha;
    this.accent = accent;
    this.notch = notch;
    this.g = scene.add.graphics();
    this.tex = scene.add.tileSprite(x, y, w, h, 'ui_dither').setOrigin(0).setScale(1);
    this.x = x;
    this.y = y;
    this.objects = [this.g, this.tex];
    this.setSize(w, h);
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;
    const g = this.g;
    const { x, y } = this;
    g.clear();
    const n = this.notch ? PX * 2 : 0;
    // Заливка со срезанными углами
    g.fillStyle(this.fill, this.alpha);
    g.fillRect(x + n, y, w - 2 * n, h);
    g.fillRect(x, y + n, w, h - 2 * n);
    // Внешний тёмный кант
    g.fillStyle(INK, 1);
    g.fillRect(x + n, y - PX, w - 2 * n, PX);
    g.fillRect(x + n, y + h, w - 2 * n, PX);
    g.fillRect(x - PX, y + n, PX, h - 2 * n);
    g.fillRect(x + w, y + n, PX, h - 2 * n);
    // Цветной кант и светлый блик сверху-слева
    g.fillStyle(this.accent, 1);
    g.fillRect(x + n, y, w - 2 * n, PX);
    g.fillRect(x + n, y + h - PX, w - 2 * n, PX);
    g.fillRect(x, y + n, PX, h - 2 * n);
    g.fillRect(x + w - PX, y + n, PX, h - 2 * n);
    if (n) {
      g.fillRect(x + PX, y + PX, PX, PX);
      g.fillRect(x + w - 2 * PX, y + PX, PX, PX);
      g.fillRect(x + PX, y + h - 2 * PX, PX, PX);
      g.fillRect(x + w - 2 * PX, y + h - 2 * PX, PX, PX);
    }
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(x + n + PX, y + PX, w - 2 * n - 2 * PX, PX);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(x + n + PX, y + h - 2 * PX, w - 2 * n - 2 * PX, PX);
    this.tex.setPosition(x + PX, y + PX).setSize(Math.max(1, w - 2 * PX), Math.max(1, h - 2 * PX));
    return this;
  }

  setAccent(c) {
    this.accent = c;
    return this.setSize(this.width, this.height);
  }

  setVisible(v) {
    this.objects.forEach((o) => o.setVisible(v));
    return this;
  }
}

// Плашка-клавиша: [E], [Q], [P] — пиксельный «кейкап»
export function keyCap(scene, x, y, label, { color = 0xffd166, size = 22 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = size;
  g.fillStyle(INK, 1).fillRect(-s / 2 - PX, -s / 2, s + PX * 2, s + PX * 2);
  g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(30).color, 1).fillRect(-s / 2, -s / 2 + PX * 2, s, s - PX);
  g.fillStyle(color, 1).fillRect(-s / 2, -s / 2, s, s - PX * 2);
  g.fillStyle(0xffffff, 0.35).fillRect(-s / 2 + PX, -s / 2 + PX, s - PX * 2, PX);
  const t = scene.add.text(0, -PX, label, { fontFamily: '"Press Start 2P"', fontSize: `${Math.round(s * 0.5)}px`, color: '#0c0a16' }).setOrigin(0.5);
  c.add([g, t]);
  c.label = t;
  return c;
}
