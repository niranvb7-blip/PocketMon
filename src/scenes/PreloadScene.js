/**
 * PreloadScene – loads external assets and transitions to TitleScene.
 */
import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    const { width, height } = this.scale;

    // ── Progress bar ────────────────────────────────────────
    const barW = 260, barH = 14;
    const bx = (width - barW) / 2, by = height / 2 - barH / 2;

    const bg  = this.add.rectangle(width / 2, height / 2, barW + 4, barH + 4, 0x111128).setOrigin(0.5);
    const bar = this.add.rectangle(bx, by, 0, barH, 0x00ff88).setOrigin(0);
    this.add.text(width / 2, by - 18, 'LOADING…', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px', color: '#00ff88',
    }).setOrigin(0.5, 1);

    this.load.on('progress', v => { bar.width = barW * v; });

    // ── Assets (add real ones here later) ───────────────────
    // this.load.image('tileset', 'assets/tilesets/gen3.png');
    // this.load.tilemapTiledJSON('worldMap', 'assets/maps/world.json');

    this.load.on('loaderror', file => {
      console.warn(`[Preload] Skipped missing asset: ${file.src}`);
    });
  }

  create() {
    this.scene.start('TitleScene');
  }
}
