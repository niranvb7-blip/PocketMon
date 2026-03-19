/**
 * GameOverScene – shown when the player's entire party faints.
 * Displays run statistics and offers a new run.
 */
import Phaser from 'phaser';
import { RunManager } from '../systems/RunManager';

const FONT = '"Press Start 2P", monospace';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create() {
    const { width, height } = this.scale;

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0000, 0x1a0000, 0x0d0d1a, 0x0d0d1a, 1);
    bg.fillRect(0, 0, width, height);

    // CRT scanlines
    const scan = this.add.graphics();
    scan.lineStyle(1, 0x000000, 0.18);
    for (let y = 0; y < height; y += 3) scan.lineBetween(0, y, width, y);

    // ── Dramatic flash ──────────────────────────────────────
    this.cameras.main.flash(800, 200, 0, 0);

    // ── Title ───────────────────────────────────────────────
    const gt = this.add.text(width / 2, height * 0.18, 'GAME OVER', {
      fontFamily: FONT, fontSize: '24px', color: '#ff4466',
      stroke: '#440011', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: gt, alpha: 1, duration: 1000, ease: 'Power2' });

    // Pulse
    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: gt, scaleX: 1.05, scaleY: 1.05,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // ── Stats panel ─────────────────────────────────────────
    const stats   = RunManager.runStats;
    const elapsed = stats.startTime
      ? Math.floor((Date.now() - stats.startTime) / 1000)
      : 0;
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    const panelX = width / 2 - 130, panelY = height * 0.34, panelW = 260, panelH = 120;
    const pg = this.add.graphics();
    pg.fillStyle(0x111128, 0.9);
    pg.fillRoundedRect(panelX, panelY, panelW, panelH, 6);
    pg.lineStyle(1, 0x331133, 1);
    pg.strokeRoundedRect(panelX, panelY, panelW, panelH, 6);

    const statsData = [
      ['Waves Cleared',    RunManager.wave - 1],
      ['Trainers Beaten',  stats.trainerBeaten],
      ['Pokémon Caught',   stats.pokemonCaught],
      ['Damage Dealt',     stats.damageDealt],
      ['Time',             `${mm}:${ss}`],
    ];

    statsData.forEach(([label, val], i) => {
      this.add.text(panelX + 12, panelY + 12 + i * 20, label, {
        fontFamily: FONT, fontSize: '6px', color: '#886688',
      });
      this.add.text(panelX + panelW - 12, panelY + 12 + i * 20, String(val), {
        fontFamily: FONT, fontSize: '6px', color: '#ffffff',
      }).setOrigin(1, 0);
    });

    // ── Party tombstones ────────────────────────────────────
    RunManager.party.forEach((mon, i) => {
      const x = panelX + 30 + i * 50;
      const y = panelY + panelH + 18;
      this.add.circle(x, y, 6, 0x333344);
      this.add.text(x, y + 10, mon.name.toUpperCase().substring(0, 5), {
        fontFamily: FONT, fontSize: '5px', color: '#444455',
      }).setOrigin(0.5, 0);
    });

    // ── Buttons ─────────────────────────────────────────────
    const btnY = height * 0.82;
    this._btnIdx = 0;
    this._btns   = [
      this.add.text(width / 2 - 60, btnY, 'NEW RUN', {
        fontFamily: FONT, fontSize: '9px', color: '#00ff88',
        stroke: '#003322', strokeThickness: 3,
      }).setOrigin(0.5),
      this.add.text(width / 2 + 60, btnY, 'TITLE', {
        fontFamily: FONT, fontSize: '9px', color: '#aaaacc',
        stroke: '#222244', strokeThickness: 3,
      }).setOrigin(0.5),
    ];
    this._cursor = this.add.text(0, 0, '▶', {
      fontFamily: FONT, fontSize: '9px', color: '#ffcc00',
    }).setOrigin(0.5);
    this._syncCursor();

    this.tweens.add({ targets: this._cursor, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    // ── Input ───────────────────────────────────────────────
    this._keys = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
  }

  update() {
    const { left, right, z, enter } = this._keys;
    if (Phaser.Input.Keyboard.JustDown(left)  && this._btnIdx > 0) { this._btnIdx--; this._syncCursor(); }
    if (Phaser.Input.Keyboard.JustDown(right) && this._btnIdx < 1) { this._btnIdx++; this._syncCursor(); }
    if (Phaser.Input.Keyboard.JustDown(z) || Phaser.Input.Keyboard.JustDown(enter)) {
      RunManager.clearRun();
      if (this._btnIdx === 0) this.scene.start('StarterScene');
      else                     this.scene.start('TitleScene');
    }
  }

  _syncCursor() {
    this._cursor.x = this._btns[this._btnIdx].x - 36;
    this._cursor.y = this._btns[this._btnIdx].y;
    this._btns.forEach((b, i) => b.setAlpha(i === this._btnIdx ? 1 : 0.4));
  }
}
