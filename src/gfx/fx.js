// Пост-эффекты: плёночное зерно, виньетка, хроматическая аберрация (только в особых состояниях).
// Зерно и виньетка — обычные спрайты поверх кадра (работают и в WebGL, и в Canvas).
// Аберрация — шейдер WebGL; в Canvas её просто нет.
import Phaser from 'phaser';
import { quality } from './quality.js';

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uAmount;
uniform float uTime;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  vec2 d = uv - 0.5;
  float a = uAmount * (0.6 + 0.4 * sin(uTime * 3.0)) * length(d);
  vec4 c = texture2D(uMainSampler, uv);
  c.r = texture2D(uMainSampler, uv + d * a).r;
  c.b = texture2D(uMainSampler, uv - d * a).b;
  gl_FragColor = c;
}`;

export class AberrationFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'AberrationFX', fragShader: FRAG });
    this.amount = 0;
  }

  onPreRender() {
    this.set1f('uAmount', this.amount);
    this.set1f('uTime', this.game.loop.time / 1000);
  }
}

function makeTextures(scene) {
  if (!scene.textures.exists('grain')) {
    const c = scene.textures.createCanvas('grain', 128, 128);
    const g = c.getContext();
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.random() < 0.5 ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
    c.refresh();
  }
  if (!scene.textures.exists('vignette')) {
    const c = scene.textures.createCanvas('vignette', 480, 270);
    const g = c.getContext();
    const gr = g.createRadialGradient(240, 135, 90, 240, 135, 300);
    gr.addColorStop(0, 'rgba(7,6,13,0)');
    gr.addColorStop(0.6, 'rgba(7,6,13,0.18)');
    gr.addColorStop(1, 'rgba(7,6,13,0.75)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 480, 270);
    c.refresh();
    c.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

// Общий «вид»: виньетка (средняя и высокая), зерно (высокая)
export function applyLook(scene, { grain = 1, vignette = 1 } = {}) {
  const q = quality();
  if (q === 'low') return;
  makeTextures(scene);
  if (vignette) scene.add.image(0, 0, 'vignette').setOrigin(0).setScale(2).setScrollFactor(0).setDepth(985).setAlpha(0.8 * vignette);
  if (q === 'high' && grain) {
    const g = scene.add.tileSprite(0, 0, 480, 270, 'grain').setOrigin(0).setScale(2).setScrollFactor(0).setDepth(986).setAlpha(0.045 * grain).setBlendMode(Phaser.BlendModes.SCREEN);
    scene.time.addEvent({ delay: 60, loop: true, callback: () => {
      g.tilePositionX = Math.random() * 128;
      g.tilePositionY = Math.random() * 128;
    } });
  }
}

// Хроматическая аберрация: кислота, паника, удар. amount 0 — выключить
export function aberration(scene, amount) {
  const cam = scene.cameras.main;
  const webgl = scene.sys.game.renderer.type === Phaser.WEBGL;
  if (!webgl || quality() === 'low') return;
  let fx = cam.getPostPipeline?.('AberrationFX');
  if (Array.isArray(fx)) fx = fx[0];
  if (amount > 0) {
    if (!fx) {
      cam.setPostPipeline('AberrationFX');
      fx = cam.getPostPipeline('AberrationFX');
      if (Array.isArray(fx)) fx = fx[0];
    }
    if (fx) fx.amount = amount;
  } else if (fx) cam.removePostPipeline('AberrationFX');
}
