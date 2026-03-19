/**
 * StarterScene – choose your starter Pokémon.
 * Fetches sprites from PokéAPI for live preview.
 */
import Phaser from 'phaser';
import { STARTERS } from '../data/gameData';
import { buildBattlePokemon } from '../api/pokeApi';
import { RunManager } from '../systems/RunManager';

const FONT = '"Press Start 2P", monospace';

export default class StarterScene extends Phaser.Scene {
  constructor() { super('StarterScene'); }

  create() {
    const { width, height } = this.scale;
    this._idx = 0;
    this._cards = [];
    this._confirmReady = false;

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a102e, 0x1a102e, 1);
    bg.fillRect(0, 0, width, height);

    // CRT scanlines
    const scan = this.add.graphics();
    scan.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < height; y += 3) scan.lineBetween(0, y, width, y);

    // ── Header ──────────────────────────────────────────────
    this.add.text(width / 2, 14, 'CHOOSE YOUR STARTER', {
      fontFamily: FONT, fontSize: '9px', color: '#00ff88',
      stroke: '#003322', strokeThickness: 3,
    }).setOrigin(0.5);

    // ── Starter cards ────────────────────────────────────────
    const cardW = 130, cardH = 180;
    const totalW = STARTERS.length * cardW + (STARTERS.length - 1) * 10;
    const startX = (width - totalW) / 2;

    STARTERS.forEach((starter, i) => {
      const cx = startX + i * (cardW + 10);
      const cy = 50;
      this._buildCard(cx, cy, cardW, cardH, starter, i);
    });

    // ── Footer ───────────────────────────────────────────────
    this._confirmText = this.add.text(width / 2, height - 16,
      'Z / ENTER to select   ←→ to browse', {
        fontFamily: FONT, fontSize: '6px', color: '#666688',
      }).setOrigin(0.5);

    // ── Input ───────────────────────────────────────────────
    this._keys = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this._highlight(0);

    // Load & show sprites async
    this._loadSprites();
  }

  async _loadSprites() {
    for (let i = 0; i < STARTERS.length; i++) {
      try {
        const res  = await fetch(`https://pokeapi.co/api/v2/pokemon/${STARTERS[i].id}`);
        const data = await res.json();
        const url  = data.sprites.front_default;
        if (!url) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const key = `starter-${i}`;
          if (this.textures.exists(key)) this.textures.remove(key);
          this.textures.addImage(key, img);
          const slot = this._cards[i];
          if (slot?.spriteSlot) {
            const sp = this.add.image(slot.spriteSlot.x, slot.spriteSlot.y, key).setScale(2.5).setDepth(5);
            slot.sprite = sp;
          }
        };
        img.src = url;
      } catch { /* ignore – placeholder stays */ }
    }
  }

  _buildCard(x, y, w, h, starter, i) {
    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(0x111128, 1);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(2, starter.color, 0.5);
    bg.strokeRoundedRect(x, y, w, h, 8);

    // Type colour bar at top
    const bar = this.add.graphics();
    bar.fillStyle(starter.color, 0.25);
    bar.fillRoundedRect(x + 2, y + 2, w - 4, 30, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Name
    this.add.text(x + w / 2, y + 14, starter.displayName.toUpperCase(), {
      fontFamily: FONT, fontSize: '7px', color: '#ffffff',
    }).setOrigin(0.5);

    // Sprite placeholder (filled once loaded)
    const spX = x + w / 2, spY = y + 90;
    const placeholder = this.add.circle(spX, spY, 28, starter.color, 0.15);

    // Type badge
    this.add.text(x + w / 2, y + 130, starter.type.toUpperCase(), {
      fontFamily: FONT, fontSize: '5px', color: Phaser.Display.Color.IntegerToColor(starter.color).rgba,
    }).setOrigin(0.5);

    // Description
    this.add.text(x + w / 2, y + 148, starter.description, {
      fontFamily: FONT, fontSize: '5px', color: '#aaaacc', align: 'center',
    }).setOrigin(0.5);

    // Selection glow (hidden by default)
    const glow = this.add.graphics();
    glow.lineStyle(3, starter.color, 1);
    glow.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 9);
    glow.setVisible(false);

    this._cards.push({
      bg, glow, placeholder,
      spriteSlot: { x: spX, y: spY },
      sprite: null,
      starter,
    });
  }

  update() {
    const { left, right, z, enter } = this._keys;
    if (Phaser.Input.Keyboard.JustDown(left)  && this._idx > 0)
      { this._idx--; this._highlight(this._idx); }
    if (Phaser.Input.Keyboard.JustDown(right) && this._idx < STARTERS.length - 1)
      { this._idx++; this._highlight(this._idx); }
    if (Phaser.Input.Keyboard.JustDown(z) || Phaser.Input.Keyboard.JustDown(enter))
      this._confirm();
  }

  _highlight(idx) {
    this._cards.forEach((c, i) => {
      c.glow.setVisible(i === idx);
      c.bg.setAlpha(i === idx ? 1 : 0.5);
      c.sprite?.setAlpha(i === idx ? 1 : 0.5);
    });
    this._confirmText.setText(
      `Choose ${STARTERS[idx].displayName.toUpperCase()}?  Z=YES  ←→=BROWSE`
    );
  }

  async _confirm() {
    if (this._confirmReady) return;
    this._confirmReady = true;

    const starter = STARTERS[this._idx];
    this._confirmText.setText('Loading…').setColor('#ffcc00');

    try {
      const pokemon = await buildBattlePokemon(starter.id, 5);
      RunManager.startRun(pokemon);
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(350, () => this.scene.start('BattleScene'));
    } catch (err) {
      console.error(err);
      this._confirmText.setText('Network error – retry!').setColor('#ff4444');
      this._confirmReady = false;
    }
  }
}
