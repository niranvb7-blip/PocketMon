/**
 * RewardScene – shown after every successful wave.
 * Player picks one of three rewards.
 */
import Phaser from 'phaser';
import { RunManager }    from '../systems/RunManager';
import { REWARD_ITEMS }  from '../data/gameData';

const FONT = '"Press Start 2P", monospace';

export default class RewardScene extends Phaser.Scene {
  constructor() { super('RewardScene'); }

  init(data) {
    this._isTrainer = data?.isTrainer ?? false;
  }

  create() {
    const { width, height } = this.scale;
    this._selected = false;
    this._cardIdx  = 1; // start on middle card

    // ── Background ──────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a0d2e, 0x1a0d2e, 1);
    bg.fillRect(0, 0, width, height);

    // CRT scanlines
    const scan = this.add.graphics();
    scan.lineStyle(1, 0x000000, 0.15);
    for (let y = 0; y < height; y += 3) scan.lineBetween(0, y, width, y);

    // ── Wave cleared banner ─────────────────────────────────
    const cleared = this._isTrainer ? '🏆 TRAINER DEFEATED!' : `WAVE ${RunManager.wave - 1} CLEARED!`;
    this.add.text(width / 2, 14, cleared, {
      fontFamily: FONT, fontSize: '9px', color: '#ffcc00',
      stroke: '#443300', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 28, `Wave ${RunManager.wave} approaches…`, {
      fontFamily: FONT, fontSize: '6px', color: '#555577',
    }).setOrigin(0.5);

    // ── Choose a reward header ───────────────────────────────
    this.add.text(width / 2, 46, 'CHOOSE A REWARD', {
      fontFamily: FONT, fontSize: '8px', color: '#00ff88',
    }).setOrigin(0.5);

    // ── Party status strip ──────────────────────────────────
    this._buildPartyStrip(width, height);

    // ── Reward cards ─────────────────────────────────────────
    this._rewards = this._pickRewards();
    this._cards   = [];
    const cardW   = 130, cardH = 140;
    const totalW  = 3 * cardW + 2 * 10;
    const startX  = (width - totalW) / 2;

    this._rewards.forEach((reward, i) => {
      const cx = startX + i * (cardW + 10);
      this._buildRewardCard(cx, 60, cardW, cardH, reward, i);
    });

    // ── Footer ───────────────────────────────────────────────
    this.add.text(width / 2, height - 12,
      '← → navigate   Z to pick', {
        fontFamily: FONT, fontSize: '6px', color: '#446644',
      }).setOrigin(0.5);

    // ── Input ───────────────────────────────────────────────
    this._keys = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this._highlight(this._cardIdx);

    // Animate entry
    this.cameras.main.flash(250, 0, 20, 40);
  }

  update() {
    if (this._selected) return;
    const { left, right, z, enter } = this._keys;
    if (Phaser.Input.Keyboard.JustDown(left)  && this._cardIdx > 0)
      { this._cardIdx--; this._highlight(this._cardIdx); }
    if (Phaser.Input.Keyboard.JustDown(right) && this._cardIdx < 2)
      { this._cardIdx++; this._highlight(this._cardIdx); }
    if (Phaser.Input.Keyboard.JustDown(z) || Phaser.Input.Keyboard.JustDown(enter))
      this._pick();
  }

  _pickRewards() {
    // Shuffle reward pool and take 3
    const pool = [...REWARD_ITEMS].sort(() => Math.random() - 0.5);
    return pool.slice(0, 3);
  }

  _buildRewardCard(x, y, w, h, reward, i) {
    const COLS = [0x00aaff, 0x00ff88, 0xff9900];
    const col  = COLS[i];

    const bg = this.add.graphics();
    bg.fillStyle(0x111128, 1);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(2, col, 0.4);
    bg.strokeRoundedRect(x, y, w, h, 6);

    // Colour bar
    const bar = this.add.graphics();
    bar.fillStyle(col, 0.2);
    bar.fillRoundedRect(x + 2, y + 2, w - 4, 22, { tl: 4, tr: 4, bl: 0, br: 0 });

    // Icon
    this.add.text(x + w / 2, y + 36, reward.icon, {
      fontSize: '22px',
    }).setOrigin(0.5);

    // Name
    this.add.text(x + w / 2, y + 64, reward.name.toUpperCase(), {
      fontFamily: FONT, fontSize: '6px', color: '#ffffff',
    }).setOrigin(0.5);

    // Description
    this.add.text(x + w / 2, y + 85, reward.desc, {
      fontFamily: FONT, fontSize: '5px', color: '#aaaacc',
      align: 'center', wordWrap: { width: w - 10 },
    }).setOrigin(0.5, 0);

    // Glow border (hidden by default)
    const glow = this.add.graphics();
    glow.lineStyle(3, col, 1);
    glow.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 7);
    glow.setVisible(false);

    this._cards.push({ bg, glow, reward, x, y, w, h, col });
  }

  _highlight(idx) {
    this._cards.forEach((c, i) => {
      c.glow.setVisible(i === idx);
      c.bg.setAlpha(i === idx ? 1 : 0.5);
    });
    // Pulse the selected card
    if (this._glowTween) this._glowTween.stop();
    const glow = this._cards[idx].glow;
    this._glowTween = this.tweens.add({
      targets: glow, alpha: 0.4, duration: 600, yoyo: true, repeat: -1,
    });
  }

  _pick() {
    if (this._selected) return;
    this._selected = true;
    const reward = this._rewards[this._cardIdx];
    this._applyReward(reward);

    this.cameras.main.flash(200, 255, 200, 0);
    this.time.delayedCall(700, () => this.scene.start('BattleScene'));
  }

  _applyReward(reward) {
    switch (reward.id) {
      case 'rare-candy': {
        // Level up first Pokémon
        const mon = RunManager.party[0];
        if (mon) { mon.level++; mon.maxHp = Math.floor(mon.maxHp * 1.08); }
        break;
      }
      case 'potion':
        RunManager.usePotion(0);
        break;
      default:
        RunManager.addItem(reward);
    }
    RunManager._persist();
  }

  _buildPartyStrip(width, height) {
    const stripY = height - 38;
    const g = this.add.graphics();
    g.fillStyle(0x0a0a20, 0.9);
    g.fillRect(0, stripY, width, 26);

    this.add.text(6, stripY + 3, 'PARTY:', {
      fontFamily: FONT, fontSize: '6px', color: '#446644',
    });

    RunManager.party.forEach((mon, i) => {
      const x   = 52 + i * 70;
      const col  = mon.currentHp > 0 ? 0x00ff88 : 0xff4466;
      this.add.circle(x, stripY + 13, 4, col);
      this.add.text(x + 8, stripY + 6, mon.name.toUpperCase().substring(0, 7), {
        fontFamily: FONT, fontSize: '5px', color: '#aaaacc',
      });
    });
  }
}
