// Пиксельный холст в исходном разрешении (1 пиксель арта = ART пикселей экрана).
// Рисование идёт прямо в буфер (быстро), в конце буфер становится текстурой Phaser.
import { hex, rgb, mix } from './color.js';
import { drawText, textWidth } from './font.js';

export const ART = 2; // во сколько раз арт увеличен на экране
export const M = 36; // пикселей арта в одном метре (рост 1,75 м ≈ 63 px, на экране ≈ 126 px)
export const GROUND = 235; // линия пола в пикселях арта (FLOOR 470 / ART)

// Матрица Байера 4×4 — для плавных переходов «сеточкой»
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

function pack(c, a = 255) {
  const [r, g, b] = rgb(c);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export class Pix {
  constructor(w, h) {
    this.w = Math.ceil(w);
    this.h = Math.ceil(h);
    this.img = new ImageData(this.w, this.h);
    this.d = new Uint32Array(this.img.data.buffer);
    this.cache = new Map();
  }

  col(c) {
    if (c == null) return 0;
    let v = this.cache.get(c);
    if (v === undefined) {
      v = pack(hex(c));
      this.cache.set(c, v);
    }
    return v;
  }

  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = this.col(c);
  }

  setRaw(x, y, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = v;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }

  // Цвет пикселя как 0xRRGGBB (или -1, если пусто)
  getHex(x, y) {
    const v = this.get(x, y);
    if (!(v >>> 24)) return -1;
    return ((v & 255) << 16) | (((v >> 8) & 255) << 8) | ((v >> 16) & 255);
  }

  rect(x, y, w, h, c) {
    const v = this.col(c);
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) this.d.fill(v, yy * this.w + x0, yy * this.w + x1);
  }

  clear(x = 0, y = 0, w = this.w, h = this.h) {
    const x0 = Math.max(0, x);
    const x1 = Math.min(this.w, x + w);
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) this.d.fill(0, yy * this.w + x0, yy * this.w + x1);
  }

  hline(x, y, w, c) {
    this.rect(x, y, w, 1, c);
  }

  vline(x, y, h, c) {
    this.rect(x, y, 1, h, c);
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const v = this.col(c);
    for (;;) {
      this.setRaw(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Заливка многоугольника (точки [[x,y],…]) по строкам; fn(x,y) — свой цвет на каждый пиксель
  poly(pts, c, fn) {
    let minY = Infinity;
    let maxY = -Infinity;
    pts.forEach(([, y]) => {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    const v = c == null ? 0 : this.col(c);
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const cy = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k]));
        const xb = Math.min(this.w - 1, Math.round(xs[k + 1]) - 1);
        for (let x = xa; x <= xb; x++) {
          if (fn) {
            const cc = fn(x, y);
            if (cc != null) this.d[y * this.w + x] = this.col(cc);
          } else this.d[y * this.w + x] = v;
        }
      }
    }
  }

  ellipse(cx, cy, rx, ry, c, fn) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          if (fn) {
            const cc = fn(x, y, dx, dy);
            if (cc != null) this.set(x, y, cc);
          } else this.set(x, y, c);
        }
      }
    }
  }

  // Полупрозрачная заливка (свет, тень, туман): смешиваем с тем, что уже нарисовано
  tint(x, y, w, h, c, a, mask) {
    const [r, g, b] = rgb(c);
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(this.h, Math.round(y + h)); yy++) {
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(this.w, Math.round(x + w)); xx++) {
        const k = typeof a === 'function' ? a(xx, yy) : a;
        if (k <= 0) continue;
        const i = yy * this.w + xx;
        const v = this.d[i];
        if (!(v >>> 24) || (mask && !mask(xx, yy))) continue;
        const nr = (v & 255) + (r - (v & 255)) * k;
        const ng = ((v >> 8) & 255) + (g - ((v >> 8) & 255)) * k;
        const nb = ((v >> 16) & 255) + (b - ((v >> 16) & 255)) * k;
        this.d[i] = ((255 << 24) | (Math.round(nb) << 16) | (Math.round(ng) << 8) | Math.round(nr)) >>> 0;
      }
    }
  }

  // Сеточка Байера: level 0..1 — доля пикселей цвета c
  dither(x, y, w, h, c, level, mask) {
    const v = this.col(c);
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(this.h, Math.round(y + h)); yy++) {
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(this.w, Math.round(x + w)); xx++) {
        const l = typeof level === 'function' ? level(xx, yy) : level;
        if (l > bayer(xx, yy) && (!mask || mask(xx, yy))) this.d[yy * this.w + xx] = v;
      }
    }
  }

  // Вертикальный градиент по списку цветов с дизерингом между соседними
  gradV(x, y, w, h, colors) {
    const n = colors.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const t = (yy / Math.max(1, h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      for (let xx = 0; xx < w; xx++) {
        const px = Math.round(x) + xx;
        const py = Math.round(y) + yy;
        if (px < 0 || py < 0 || px >= this.w || py >= this.h) continue;
        this.d[py * this.w + px] = this.col(f > bayer(px, py) ? colors[i + 1] : colors[i]);
      }
    }
  }

  // Россыпь пикселей (грязь, крошка, звёзды)
  speckle(x, y, w, h, c, density, r) {
    const n = Math.round(w * h * density);
    for (let i = 0; i < n; i++) this.set(x + Math.floor(r() * w), y + Math.floor(r() * h), Array.isArray(c) ? c[Math.floor(r() * c.length)] : c);
  }

  text(str, x, y, c, { shadow, align = 'left', gap = 1 } = {}) {
    const w = textWidth(str, gap);
    const x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    if (shadow != null) drawText((px, py) => this.set(px + 1, py + 1, shadow), str, x0, y, gap);
    drawText((px, py) => this.set(px, py, c), str, x0, y, gap);
    return w;
  }

  // Скопировать другой холст (с прозрачностью); flip — зеркально
  stamp(src, x, y, { flip = false, alpha = 1 } = {}) {
    for (let yy = 0; yy < src.h; yy++) {
      for (let xx = 0; xx < src.w; xx++) {
        const v = src.d[yy * src.w + (flip ? src.w - 1 - xx : xx)];
        if (!(v >>> 24)) continue;
        if (alpha >= 1) this.setRaw(x + xx, y + yy, v);
        else {
          const hexv = ((v & 255) << 16) | (((v >> 8) & 255) << 8) | ((v >> 16) & 255);
          this.tint(x + xx, y + yy, 1, 1, hexv, alpha);
        }
      }
    }
  }

  // Контур вокруг непрозрачного (1 px). sel — свой цвет для каждого пикселя контура
  outline(c, sel) {
    const out = [];
    const { w, h, d } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[y * w + x] >>> 24) continue;
        const n = (x > 0 && d[y * w + x - 1] >>> 24) || (x < w - 1 && d[y * w + x + 1] >>> 24) || (y > 0 && d[(y - 1) * w + x] >>> 24) || (y < h - 1 && d[(y + 1) * w + x] >>> 24);
        if (n) out.push(x, y);
      }
    }
    for (let i = 0; i < out.length; i += 2) this.set(out[i], out[i + 1], sel ? sel(out[i], out[i + 1]) : c);
  }

  // Отражение в луже: копируем то, что выше линии y, вниз — темнее и с рябью
  reflect(x, y, w, h, { dark = 0.45, tint = 0x101830, wave = 1 } = {}) {
    for (let yy = 0; yy < h; yy++) {
      const off = wave ? Math.round(Math.sin(yy * 1.7) * wave) : 0;
      for (let xx = 0; xx < w; xx++) {
        const sx = x + xx + off;
        const sy = y - 1 - yy * 2;
        const v = this.get(sx, sy);
        if (!(v >>> 24)) continue;
        const c = ((v & 255) << 16) | (((v >> 8) & 255) << 8) | ((v >> 16) & 255);
        this.set(x + xx, y + yy, mix(c, tint, dark + yy / h * 0.3));
      }
    }
  }

  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    cv.getContext('2d').putImageData(this.img, 0, 0);
    return cv;
  }

  // Добавить в Phaser как текстуру (если уже есть — заменить)
  texture(scene, key) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    return scene.textures.addCanvas(key, this.canvas());
  }
}

export { textWidth };
