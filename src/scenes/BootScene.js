import Phaser from 'phaser';
import { createArt } from '../art.js';
import { loadVoiceManifest } from '../voice.js';
import { loadSettings } from '../state.js';
import { applySettings } from '../ui/Phone.js';

const PORTRAITS = ['ray', 'arkasha', 'stas', 'adam', 'roma'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    PORTRAITS.forEach((p) => this.load.image(`portrait_${p}`, `./portraits/${p}.png`));
  }

  create() {
    createArt(this);
    loadSettings();
    applySettings();
    loadVoiceManifest();
    this.scene.start('Title');
  }
}
