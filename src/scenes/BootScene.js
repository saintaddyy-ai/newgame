import Phaser from 'phaser';
import { createArt } from '../art.js';
import { createLifeTextures } from '../gfx/life.js';
import { loadVoiceManifest } from '../voice.js';
import { loadSettings } from '../state.js';
import { applySettings } from '../ui/Phone.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createArt(this);
    createLifeTextures(this);
    loadSettings();
    applySettings();
    loadVoiceManifest();
    this.scene.start('Title');
  }
}
