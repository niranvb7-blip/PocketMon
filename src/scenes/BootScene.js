/**
 * BootScene – generates all procedural textures.
 * Dark PokeRogue-esque palette.
 */
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this._makeBattleBg();
    this._makePlayerSprite();
    this._makeParticle();
    this.scene.start('PreloadScene');
  }

  _makeBattleBg() {
    const g = this.make.graphics({ add: false });

    // ---- PLAYER platform (bottom-left) ----
    g.fillGradientStyle(0x1a3a1a, 0x1a3a1a, 0x0d1f0d, 0x0d1f0d, 1);
    g.fillRect(0, 0, 160, 60);
    // Edge highlight
    g.fillStyle(0x2d6a2d, 0.6); g.fillRect(0, 0, 160, 3);

    g.generateTexture('platform-player', 160, 60);
    g.clear();

    // ---- ENEMY platform (top-right) ----
    g.fillGradientStyle(0x3a1a1a, 0x3a1a1a, 0x1f0d0d, 0x1f0d0d, 1);
    g.fillRect(0, 0, 160, 60);
    g.fillStyle(0x8a2d2d, 0.6); g.fillRect(0, 0, 160, 3);

    g.generateTexture('platform-enemy', 160, 60);
    g.clear();

    // ---- Background gradient (full scene) ----
    g.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a0d2e, 0x1a0d2e, 1);
    g.fillRect(0, 0, 480, 320);

    // Subtle grid lines for CRT feel
    g.lineStyle(1, 0xffffff, 0.03);
    for (let y = 0; y < 320; y += 4) {
      g.lineBetween(0, y, 480, y);
    }

    g.generateTexture('battle-bg', 480, 320);
    g.destroy();
  }

  _makePlayerSprite() {
    // Minimal placeholder sprites (16×16 frames, 3 per direction)
    const g = this.make.graphics({ add: false });
    const dirs = [0x3c7ad4, 0xcc3333]; // blue=player, red=enemy
    dirs.forEach((col, di) => {
      for (let frame = 0; frame < 3; frame++) {
        const ox = (di * 3 + frame) * 16;
        g.fillStyle(col);        g.fillRect(ox + 3, 8,  10, 7);
        g.fillStyle(0xf5c99e);   g.fillRect(ox + 4, 2,  8,  7);
        g.fillStyle(0x222244);   g.fillRect(ox + 3, 14, 4,  2);
        g.fillStyle(0x222244);   g.fillRect(ox + 9, 14, 4,  2);
      }
    });
    g.generateTexture('trainer-sprites', 16 * 6, 16);
    g.destroy();
  }

  _makeParticle() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
