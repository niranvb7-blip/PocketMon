/**
 * TitleScene – retro dark PokeRogue-style title screen.
 */
import Phaser from 'phaser';
import { RunManager } from '../systems/RunManager';

const FONT = '"Press Start 2P", monospace';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const { width, height } = this.scale;

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a0d2e, 0x1a0d2e, 1);
    bg.fillRect(0, 0, width, height);

    // CRT scanlines
    const scan = this.add.graphics();
    scan.lineStyle(1, 0x000000, 0.18);
    for (let y = 0; y < height; y += 3) scan.lineBetween(0, y, width, y);

    // ── Animated particles ──────────────────────────────────
    this._spawnParticles();

    // ── Title ───────────────────────────────────────────────
    // Glow effect: two offset copies in dim color
    ['#0f3f0f', '#3f0f0f'].forEach((col, i) => {
      this.add.text(width / 2 + (i === 0 ? -1 : 1), height * 0.28, 'POCKET', {
        fontFamily: FONT, fontSize: '22px', color: col,
      }).setOrigin(0.5).setAlpha(0.6);
    });

    this.add.text(width / 2, height * 0.28, 'POCKET', {
      fontFamily: FONT, fontSize: '22px', color: '#00ff88',
      stroke: '#003322', strokeThickness: 4,
    }).setOrigin(0.5);

    const titleMon = this.add.text(width / 2, height * 0.43, 'MON', {
      fontFamily: FONT, fontSize: '32px', color: '#ffffff',
      stroke: '#440011', strokeThickness: 6,
    }).setOrigin(0.5);

    // Pulse the main title
    this.tweens.add({
      targets: titleMon, scaleX: 1.04, scaleY: 1.04,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, height * 0.56, 'ROGUELITE EDITION', {
      fontFamily: FONT, fontSize: '7px', color: '#886600',
    }).setOrigin(0.5);

    // ── Menu ────────────────────────────────────────────────
    const hasRun = RunManager.hasActiveRun();
    const opts   = hasRun ? ['NEW RUN', 'CONTINUE'] : ['NEW RUN'];

    this._idx    = 0;
    this._items  = opts.map((label, i) =>
      this.add.text(width / 2, height * 0.70 + i * 22, label, {
        fontFamily: FONT, fontSize: '10px', color: '#cccccc',
      }).setOrigin(0.5)
    );
    this._arrow = this.add.text(width / 2 - 62, height * 0.70, '▶', {
      fontFamily: FONT, fontSize: '10px', color: '#00ff88',
    }).setOrigin(0.5);

    this.tweens.add({ targets: this._arrow, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    // Wave record
    if (hasRun) {
      RunManager.load();
      this.add.text(width / 2, height - 12,
        `CURRENT WAVE: ${RunManager.wave}`, {
          fontFamily: FONT, fontSize: '6px', color: '#555577',
        }).setOrigin(0.5);
    }

    // ── Input ───────────────────────────────────────────────
    this._keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
  }

  update() {
    const { up, down, z, enter } = this._keys;
    if (Phaser.Input.Keyboard.JustDown(up) && this._idx > 0)
      { this._idx--; this._sync(); }
    if (Phaser.Input.Keyboard.JustDown(down) && this._idx < this._items.length - 1)
      { this._idx++; this._sync(); }
    if (Phaser.Input.Keyboard.JustDown(z) || Phaser.Input.Keyboard.JustDown(enter))
      this._select();
  }

  _sync() {
    const { height } = this.scale;
    this._arrow.y = height * 0.70 + this._idx * 22;
    this._items.forEach((t, i) =>
      t.setColor(i === this._idx ? '#ffffff' : '#666688'));
  }

  _select() {
    const hasRun = RunManager.hasActiveRun();
    const opts   = hasRun ? ['new', 'continue'] : ['new'];
    const choice = opts[this._idx];

    if (choice === 'continue') {
      RunManager.load();
      this.scene.start('BattleScene');
    } else {
      RunManager.clearRun();
      this.scene.start('StarterScene');
    }
  }

  _spawnParticles() {
    const { width, height } = this.scale;
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 1.5);
      const col  = Phaser.Math.RND.pick([0x00ff88, 0xffcc00, 0xff4466, 0x44aaff]);
      const dot  = this.add.circle(x, y, size, col, 0.7);
      this.tweens.add({
        targets: dot, y: y - Phaser.Math.Between(20, 80),
        alpha: 0, duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 3000), repeat: -1,
        onRepeat: () => { dot.y = Phaser.Math.Between(0, height); dot.x = Phaser.Math.Between(0, width); dot.alpha = 0.7; },
      });
    }
  }
}
