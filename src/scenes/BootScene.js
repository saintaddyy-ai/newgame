import Phaser from 'phaser';
import { createArt } from '../art.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createArt(this);
    this.scene.start('Title');
  }
}
