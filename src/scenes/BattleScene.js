/**
 * BattleScene – Roguelite wave-based battle engine.
 *
 * Supports:
 *   • Wild battles   (wave % 10 !== 0) – with catch mechanic
 *   • Trainer battles (wave % 10 === 0) – AI multi-Pokémon team
 *
 * State machine:
 *   INTRO → PLAYER_CHOICE → [FIGHT_MENU | CATCH | SWITCH] →
 *   PRIORITY → ACTION → CHECK_FAINT → PLAYER_CHOICE | END_BATTLE
 */
import Phaser from 'phaser';
import { buildBattlePokemon }         from '../api/pokeApi';
import { calculateDamage, accuracyCheck, whoGoesFirst } from '../battle/BattleEngine';
import { selectAIMove, shouldSwitch } from '../systems/TrainerAI';
import { RunManager }                 from '../systems/RunManager';
import { WILD_POOLS, TRAINER_CONFIGS } from '../data/gameData';

const FONT   = '"Press Start 2P", monospace';
const C = {
  bg:      0x0d0d1a,
  panel:   0x111128,
  border:  0x2a2a5a,
  green:   0x00ff88,
  red:     0xff4466,
  yellow:  0xffcc00,
  white:   0xffffff,
  dim:     0x555577,
};

export default class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  // ════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ════════════════════════════════════════════════════════════

  async create() {
    this._playerIndex  = 0;    // which party slot is active
    this._enemyIndex   = 0;    // which trainer slot is active
    this._enemyParty   = [];
    this._state        = 'LOADING';
    this._blocking     = false; // prevents double-input
    this._menuIndex    = 0;
    this._moveIndex    = 0;
    this._catchAttempts = 0;

    this._buildUI();
    this._registerKeys();

    await this._loadWave();
  }

  // ════════════════════════════════════════════════════════════
  //  UI CONSTRUCTION
  // ════════════════════════════════════════════════════════════

  _buildUI() {
    const { width, height } = this.scale;

    // ── Full background ─────────────────────────────────────
    this.add.image(0, 0, 'battle-bg').setOrigin(0).setDepth(0);

    // CRT scanline overlay
    const scan = this.add.graphics().setDepth(99);
    scan.lineStyle(1, 0x000000, 0.12);
    for (let y = 0; y < height; y += 3) scan.lineBetween(0, y, width, y);

    // ── Wave banner (top-center) ────────────────────────────
    this._waveBg = this.add.graphics().setDepth(10);
    this._waveText = this.add.text(width / 2, 8, '', {
      fontFamily: FONT, fontSize: '8px', color: '#00ff88',
      stroke: '#003322', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(11);

    this._waveTypeText = this.add.text(width / 2, 18, '', {
      fontFamily: FONT, fontSize: '6px', color: '#886600',
    }).setOrigin(0.5, 0).setDepth(11);

    // ── Enemy side (top-right) ──────────────────────────────
    this._enemyBox = this._makeStatBox(width - 160, 30, 'enemy');

    // ── Player side (bottom-left) ───────────────────────────
    this._playerBox = this._makeStatBox(4, height * 0.55, 'player');

    // ── Party dots (bottom) ─────────────────────────────────
    this._partyDotsY = height - 28;
    this._partyDots  = [];
    this._buildPartyDots();

    // ── Text box ────────────────────────────────────────────
    const tbY = height * 0.73;
    const tbH = height - tbY;
    this._textBg = this.add.graphics().setDepth(20);
    this._textBg.fillStyle(C.panel, 0.97);
    this._textBg.strokeStyle = C.border;
    this._textBg.fillRect(0, tbY, width, tbH);
    this._textBg.lineStyle(1, C.border, 1);
    this._textBg.strokeRect(0, tbY, width, tbH);

    this._textL1 = this._txt(8, tbY + 6, '').setDepth(21);
    this._textL2 = this._txt(8, tbY + 20, '').setDepth(21);

    // ── Fight menu (right side of text box) ─────────────────
    const mX = width * 0.52;
    this._menuBg = this.add.graphics().setDepth(20);
    this._menuItems = [];
    this._menuCursor = this._txt(0, 0, '▶').setVisible(false).setDepth(22)
      .setColor('#00ff88');

    const labels = ['FIGHT', 'BAG', 'POKÉMON', 'RUN'];
    labels.forEach((lbl, i) => {
      const mx = mX + (i % 2) * (width * 0.23);
      const my = tbY + 6 + Math.floor(i / 2) * 16;
      this._menuItems.push(
        this._txt(mx, my, lbl).setVisible(false).setDepth(22)
      );
    });
    this._menuVisible = false;

    // ── Move menu (full text-box area) ──────────────────────
    this._movePanelBg = this.add.graphics().setDepth(20);
    this._moveLabels  = [];
    this._moveCursor  = this._txt(0, 0, '▶').setVisible(false).setDepth(22)
      .setColor('#00ff88');
    this._movePanelVisible = false;

    // ── Trainer party row (enemy bench) ─────────────────────
    this._enemyPartyDots = [];
    this._enemyPartyY    = 29;
  }

  _makeStatBox(x, y, side) {
    const w = 152, h = 50;
    const g = this.add.graphics().setDepth(15);
    g.fillStyle(C.panel, 0.95);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, side === 'player' ? 0x005522 : 0x550011, 1);
    g.strokeRoundedRect(x, y, w, h, 4);

    const nameT = this._txt(x + 5, y + 5,  '').setFontSize('7px').setDepth(16);
    const lvT   = this._txt(x + 5, y + 17, '').setFontSize('6px').setColor('#aaaacc').setDepth(16);
    const hpLbl = this._txt(x + 5, y + 28, 'HP').setFontSize('6px').setDepth(16);

    const barBg = this.add.rectangle(x + 22, y + 30, w - 28, 7, 0x333355).setOrigin(0).setDepth(16);
    const bar   = this.add.rectangle(x + 22, y + 30, w - 28, 7, C.green).setOrigin(0).setDepth(17);
    const hpT   = this._txt(x + 5, y + 39, '').setFontSize('6px').setDepth(16);

    return { nameT, lvT, hpLbl, barBg, bar, hpT, maxW: w - 28, x, y, w, h };
  }

  _buildPartyDots() {
    this._partyDots.forEach(d => d.destroy());
    this._partyDots = [];
    const { width } = this.scale;
    RunManager.party.forEach((mon, i) => {
      const x  = width / 2 - (RunManager.party.length * 14) / 2 + i * 14 + 7;
      const col = mon.currentHp > 0 ? C.green : 0x444444;
      const dot = this.add.circle(x, this._partyDotsY, 4, col).setDepth(25);
      this._partyDots.push(dot);
    });
  }

  _buildEnemyPartyDots(party) {
    this._enemyPartyDots.forEach(d => d.destroy());
    this._enemyPartyDots = [];
    const { width } = this.scale;
    const startX = width - 8 - party.length * 11;
    party.forEach((mon, i) => {
      const col = i === 0 ? C.red : (mon?.currentHp > 0 ? 0x885555 : 0x333333);
      const dot = this.add.circle(startX + i * 11, this._enemyPartyY, 3, col).setDepth(25);
      this._enemyPartyDots.push(dot);
    });
  }

  // ════════════════════════════════════════════════════════════
  //  WAVE LOADING
  // ════════════════════════════════════════════════════════════

  async _loadWave() {
    const wave     = RunManager.wave;
    const isTrainer = RunManager.isTrainerWave();
    const tier     = Math.min(Math.ceil(wave / 10), 8);
    const lv       = RunManager.getWaveLevel();

    this._updateWaveUI(wave, isTrainer);
    this._showText('Preparing battle…');

    try {
      if (isTrainer) {
        await this._loadTrainerBattle(tier, lv);
      } else {
        await this._loadWildBattle(tier, lv);
      }
      // Show intro animation then enter player choice
      this._playIntro();
    } catch (err) {
      console.error('[BattleScene] Load error:', err);
      this._showText('⚠ Network error! Check your connection.');
    }
  }

  async _loadWildBattle(tier, lv) {
    const pool = WILD_POOLS[tier] || WILD_POOLS[1];
    const name = Phaser.Math.RND.pick(pool);
    this._isTrainer = false;
    this._enemyParty = [await buildBattlePokemon(name, lv)];
    this._enemyIndex  = 0;

    this._playerIndex = RunManager.party.findIndex(p => p.currentHp > 0);
    this._showText(`Wild ${this._enemyParty[0].name.toUpperCase()} appeared!`);
    this._loadSprite('spr-enemy',  this._enemyParty[0].spriteUrl,      310, 65, 3);
    this._loadSprite('spr-player', this._getPlayer().spriteBackUrl,    100, 185, 3.5);
    this._updateStatBox(this._enemyBox,  this._enemyParty[0]);
    this._updateStatBox(this._playerBox, this._getPlayer());
    this._buildEnemyPartyDots(this._enemyParty);
    this._buildPartyDots();
  }

  async _loadTrainerBattle(tier, lv) {
    const cfg = TRAINER_CONFIGS[tier] || TRAINER_CONFIGS[1];
    this._isTrainer  = true;
    this._trainerName = cfg.name;
    this._enemyParty  = [];

    for (const name of cfg.party) {
      const mon = await buildBattlePokemon(name, cfg.baseLv + Math.floor(Math.random() * 4));
      this._enemyParty.push(mon);
    }
    this._enemyIndex  = 0;
    this._playerIndex = RunManager.party.findIndex(p => p.currentHp > 0);

    this._showText(`TRAINER ${cfg.name} wants to battle!`);
    this._loadSprite('spr-enemy',  this._enemyParty[0].spriteUrl,      310, 65, 3);
    this._loadSprite('spr-player', this._getPlayer().spriteBackUrl,    100, 185, 3.5);
    this._updateStatBox(this._enemyBox,  this._enemyParty[0]);
    this._updateStatBox(this._playerBox, this._getPlayer());
    this._buildEnemyPartyDots(this._enemyParty);
    this._buildPartyDots();
  }

  _updateWaveUI(wave, isTrainer) {
    const { width } = this.scale;
    this._waveBg.clear();
    this._waveBg.fillStyle(C.panel, 0.9);
    this._waveBg.fillRoundedRect(width / 2 - 70, 2, 140, 26, 4);
    this._waveText.setText(`WAVE  ${wave}`);
    this._waveTypeText.setText(isTrainer ? '◆ TRAINER BATTLE ◆' : '~ WILD BATTLE ~');
    this._waveTypeText.setColor(isTrainer ? '#ff4466' : '#886600');
  }

  // ════════════════════════════════════════════════════════════
  //  BATTLE INTRO
  // ════════════════════════════════════════════════════════════

  _playIntro() {
    this.cameras.main.flash(200, 255, 255, 255, false);
    this.time.delayedCall(600, () => this._enterPlayerChoice());
  }

  // ════════════════════════════════════════════════════════════
  //  STATE: PLAYER CHOICE
  // ════════════════════════════════════════════════════════════

  _enterPlayerChoice() {
    this._state = 'PLAYER_CHOICE';
    this._menuIndex = 0;
    this._showText(`What will ${this._getPlayer().name.toUpperCase()} do?`);
    this._showMainMenu(true);
    this._blocking = false;
  }

  // ════════════════════════════════════════════════════════════
  //  STATE: FIGHT MENU (move select)
  // ════════════════════════════════════════════════════════════

  _enterFightMenu() {
    this._state = 'FIGHT_MENU';
    this._moveIndex = 0;
    this._showMainMenu(false);
    this._buildMovePanel();
    this._blocking = false;
  }

  // ════════════════════════════════════════════════════════════
  //  STATE: ACTION EXECUTION
  // ════════════════════════════════════════════════════════════

  _executeAction(playerMove) {
    this._state = 'ACTION';
    this._showMainMenu(false);
    this._hideMovePanel();
    this._blocking = true;

    const player = this._getPlayer();
    const enemy  = this._getEnemy();

    // ── Trainer AI: consider switching ───────────────────────
    if (this._isTrainer) {
      const bench  = this._enemyParty.filter((m, i) => i !== this._enemyIndex && m.currentHp > 0);
      const sw     = shouldSwitch(enemy, player, bench);
      if (sw) {
        const nextIdx = this._enemyParty.indexOf(sw);
        this._enemyIndex = nextIdx;
        this._typewriter(
          `${this._trainerName} withdrew ${enemy.name.toUpperCase()}! Go, ${sw.name.toUpperCase()}!`,
          () => {
            this._updateStatBox(this._enemyBox, sw);
            this._loadSprite('spr-enemy', sw.spriteUrl, 310, 65, 3);
            this._updateEnemyPartyDots();
            // After switch, still take AI turn then player
            this._doEnemyTurn(playerMove);
          }
        );
        return;
      }
    }

    // Priority order
    const order = whoGoesFirst(player, enemy);
    if (order === 'player') {
      this._doPlayerTurn(playerMove, () => {
        if (this._getEnemy().currentHp <= 0) { this._handleEnemyFaint(); return; }
        this._doEnemyTurn(playerMove);
      });
    } else {
      this._doEnemyTurn(playerMove, () => {
        if (this._getPlayer().currentHp <= 0) { this._handlePlayerFaint(); return; }
        this._doPlayerTurn(playerMove, () => {
          if (this._getEnemy().currentHp <= 0) { this._handleEnemyFaint(); return; }
          this._enterPlayerChoice();
        });
      });
    }
  }

  _doPlayerTurn(move, next) {
    const player = this._getPlayer();
    const enemy  = this._getEnemy();
    playerMove_decrPP(move);

    this._typewriter(`${player.name.toUpperCase()} used ${move.name.toUpperCase()}!`, () => {
      if (!accuracyCheck(move.accuracy)) {
        this._typewriter("It missed!", next); return;
      }
      const { damage, isCrit, typeMultiplier } = calculateDamage(player, enemy, move);
      RunManager.runStats.damageDealt += damage;
      enemy.currentHp = Math.max(0, enemy.currentHp - damage);
      this._shakeSprite('spr-enemy', () => {
        this._animHpBar(this._enemyBox, enemy, () => {
          const msg = this._effectMsg(typeMultiplier, isCrit);
          if (msg) this._typewriter(msg, next); else next();
        });
      });
    });
  }

  _doEnemyTurn(playerMove, next) {
    if (!next) next = () => {
      if (this._getPlayer().currentHp <= 0) this._handlePlayerFaint();
      else this._enterPlayerChoice();
    };
    const enemy  = this._getEnemy();
    const player = this._getPlayer();
    const move   = selectAIMove(enemy, player);
    playerMove_decrPP(move);

    const label = this._isTrainer
      ? `${this._trainerName}'s ${enemy.name.toUpperCase()}`
      : `Wild ${enemy.name.toUpperCase()}`;

    this._typewriter(`${label} used ${move.name.toUpperCase()}!`, () => {
      if (!accuracyCheck(move.accuracy)) {
        this._typewriter("It missed!", next); return;
      }
      const { damage, isCrit, typeMultiplier } = calculateDamage(enemy, player, move);
      player.currentHp = Math.max(0, player.currentHp - damage);
      RunManager._persist();
      this._shakeSprite('spr-player', () => {
        this._animHpBar(this._playerBox, player, () => {
          const msg = this._effectMsg(typeMultiplier, isCrit);
          if (msg) this._typewriter(msg, next); else next();
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  //  FAINT HANDLING
  // ════════════════════════════════════════════════════════════

  _handleEnemyFaint() {
    const enemy = this._getEnemy();
    this._removeSprite('spr-enemy');

    // XP gain
    const xpGain = Math.floor(enemy.level * 40);
    const player  = this._getPlayer();
    player.xp    = (player.xp || 0) + xpGain;

    const nextInParty = this._enemyParty
      .filter((m, i) => i > this._enemyIndex && m.currentHp > 0);

    if (this._isTrainer && nextInParty.length > 0) {
      // Trainer sends next Pokémon
      this._enemyIndex = this._enemyParty.indexOf(nextInParty[0]);
      const next = this._getEnemy();
      this._updateEnemyPartyDots();
      this._typewriter(
        `${this._trainerName} sent out ${next.name.toUpperCase()}!`,
        () => {
          this._loadSprite('spr-enemy', next.spriteUrl, 310, 65, 3);
          this._updateStatBox(this._enemyBox, next);
          this._enterPlayerChoice();
        }
      );
    } else {
      // All enemies fainted → victory
      this._typewriter(
        `+${xpGain} XP! ${this._isTrainer ? this._trainerName + ' was defeated!' : ''}`,
        () => this._enterVictory()
      );
    }
  }

  _handlePlayerFaint() {
    const active = this._getPlayer();
    this._removeSprite('spr-player');
    this._buildPartyDots();

    const next = RunManager.getNextPokemon(this._playerIndex);
    if (next) {
      this._playerIndex = next.index;
      this._typewriter(
        `${active.name.toUpperCase()} fainted! Go, ${next.pokemon.name.toUpperCase()}!`,
        () => {
          this._updateStatBox(this._playerBox, this._getPlayer());
          this._loadSprite('spr-player', this._getPlayer().spriteBackUrl, 100, 185, 3.5);
          this._enterPlayerChoice();
        }
      );
    } else {
      this._typewriter(`${active.name.toUpperCase()} fainted! No more Pokémon!`, () => {
        this.time.delayedCall(400, () => this.scene.start('GameOverScene'));
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  VICTORY / CATCH
  // ════════════════════════════════════════════════════════════

  _enterVictory() {
    if (this._isTrainer) {
      RunManager.runStats.trainerBeaten++;
      RunManager.nextWave();
      RunManager._persist();
      this.time.delayedCall(600, () =>
        this.scene.start('RewardScene', { isTrainer: true })
      );
    } else {
      // Offer a catch attempt
      this._showText(`Wild ${this._getEnemy().name.toUpperCase()} is defeated!\nThrow a Poké Ball? (Z=Yes X=No)`);
      this._state = 'CATCH_PROMPT';
      this._blocking = false;
    }
  }

  _attemptCatch() {
    this._blocking = true;
    const enemy = this._getEnemy();
    const ratio  = enemy.currentHp / enemy.maxHp;
    // Simplified Gen 3 catch: easier at low HP
    const chance = Math.min(0.85, 0.35 + (1 - ratio) * 0.5 + this._catchAttempts * 0.05);

    this._showText('Poké Ball, go!');
    this._animatePokeBall(enemy, Math.random() < chance, (caught) => {
      if (caught) {
        this._showText(`Gotcha! ${enemy.name.toUpperCase()} was caught!`);
        RunManager.addToParty(enemy);
        this._buildPartyDots();
        this.time.delayedCall(1000, () => this._proceedAfterWild());
      } else {
        this._showText(`${enemy.name.toUpperCase()} broke free!`);
        this._catchAttempts++;
        this._state = 'CATCH_PROMPT';
        this._blocking = false;
      }
    });
  }

  _proceedAfterWild() {
    RunManager.nextWave();
    this.scene.start('RewardScene', { isTrainer: false });
  }

  _animatePokeBall(enemy, caught, cb) {
    const { width } = this.scale;
    const ball = this.add.circle(width / 2, 100, 8, 0xff4444).setDepth(30);
    this.tweens.add({
      targets: ball, x: 310, y: 65, duration: 500, ease: 'Power2',
      onComplete: () => {
        this._removeSprite('spr-enemy');
        ball.setFillStyle(0xffffff);
        let shakes = 0;
        const doShake = () => {
          if (shakes >= (caught ? 4 : Phaser.Math.Between(1, 3))) {
            ball.destroy();
            cb(caught);
            return;
          }
          this.tweens.add({
            targets: ball, x: ball.x + (shakes % 2 === 0 ? 6 : -6),
            duration: 150, yoyo: true,
            onComplete: () => { shakes++; this.time.delayedCall(200, doShake); },
          });
        };
        this.time.delayedCall(300, doShake);
      },
    });
  }

  _tryRun() {
    this._showMainMenu(false);
    const p = this._getPlayer();
    const e = this._getEnemy();
    const escapeChance = 0.5 + (p.speed / Math.max(1, e.speed * 2)) * 0.5;
    if (Math.random() < escapeChance) {
      this._typewriter('Got away safely!', () => {
        RunManager.nextWave(); // still advance (don't get reward)
        this.scene.start('BattleScene');
      });
    } else {
      this._typewriter("Can't escape!", () => this._doEnemyTurn(null));
    }
  }

  // ════════════════════════════════════════════════════════════
  //  INPUT
  // ════════════════════════════════════════════════════════════

  _registerKeys() {
    this._keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      x:     Phaser.Input.Keyboard.KeyCodes.X,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
    });
  }

  update() {
    if (this._blocking) return;
    const { up, down, left, right, z, enter, x, esc } = this._keys;
    const jZ   = Phaser.Input.Keyboard.JustDown(z)    || Phaser.Input.Keyboard.JustDown(enter);
    const jX   = Phaser.Input.Keyboard.JustDown(x)    || Phaser.Input.Keyboard.JustDown(esc);
    const jUp  = Phaser.Input.Keyboard.JustDown(up);
    const jDn  = Phaser.Input.Keyboard.JustDown(down);
    const jL   = Phaser.Input.Keyboard.JustDown(left);
    const jR   = Phaser.Input.Keyboard.JustDown(right);

    if (this._state === 'PLAYER_CHOICE') {
      if (jL && this._menuIndex % 2 !== 0)  { this._menuIndex--; this._syncMenuCursor(); }
      if (jR && this._menuIndex % 2 === 0)  { this._menuIndex++; this._syncMenuCursor(); }
      if (jUp && this._menuIndex >= 2)       { this._menuIndex -= 2; this._syncMenuCursor(); }
      if (jDn && this._menuIndex < 2)        { this._menuIndex += 2; this._syncMenuCursor(); }
      if (jZ) {
        this._blocking = true;
        switch (this._menuIndex) {
          case 0: this._enterFightMenu(); break;
          case 1: this._typewriter("Your bag is empty!", () => this._enterPlayerChoice()); break;
          case 2: this._typewriter("Party switching coming soon!", () => this._enterPlayerChoice()); break;
          case 3: this._tryRun(); break;
        }
      }
    } else if (this._state === 'FIGHT_MENU') {
      if (jUp && this._moveIndex > 0)    { this._moveIndex--; this._syncMoveCursor(); }
      if (jDn && this._moveIndex < this._getPlayer().moves.length - 1) { this._moveIndex++; this._syncMoveCursor(); }
      if (jZ) {
        const move = this._getPlayer().moves[this._moveIndex];
        this._executeAction(move);
      }
      if (jX) { this._hideMovePanel(); this._enterPlayerChoice(); }
    } else if (this._state === 'CATCH_PROMPT') {
      if (jZ) this._attemptCatch();
      if (jX) this._proceedAfterWild();
    }
  }

  // ════════════════════════════════════════════════════════════
  //  UI HELPERS
  // ════════════════════════════════════════════════════════════

  _updateStatBox(box, pokemon) {
    box.nameT.setText(pokemon.name.toUpperCase().substring(0, 11));
    box.lvT.setText(`Lv.${pokemon.level}  HP:${pokemon.currentHp}/${pokemon.maxHp}`);
    box.bar.width = box.maxW;
    this._updateHpColor(box, pokemon);
    box.hpT.setText(`${pokemon.currentHp}/${pokemon.maxHp}`);
  }

  _updateHpColor(box, pokemon) {
    const r = pokemon.currentHp / pokemon.maxHp;
    box.bar.setFillStyle(r < 0.2 ? C.red : r < 0.5 ? C.yellow : C.green);
    const targetW = Math.max(0, Math.floor(box.maxW * r));
    box.bar.width = targetW;
  }

  _animHpBar(box, pokemon, cb) {
    const r       = Math.max(0, pokemon.currentHp / pokemon.maxHp);
    const targetW = Math.floor(box.maxW * r);
    this._updateHpColor(box, pokemon);
    box.hpT.setText(`${pokemon.currentHp}/${pokemon.maxHp}`);
    box.lvT.setText(`Lv.${pokemon.level}  HP:${pokemon.currentHp}/${pokemon.maxHp}`);
    this.tweens.add({ targets: box.bar, width: targetW, duration: 350, ease: 'Linear', onComplete: cb });
  }

  _showMainMenu(v) {
    this._menuVisible = v;
    const { width, height } = this.scale;
    const tbY = height * 0.73;
    this._menuBg.clear();
    if (v) {
      this._menuBg.fillStyle(0x0a0a20, 0.98);
      this._menuBg.fillRect(width * 0.50, tbY, width * 0.50, height - tbY);
      this._menuBg.lineStyle(1, C.border, 1);
      this._menuBg.strokeRect(width * 0.50, tbY, width * 0.50, height - tbY);
    }
    this._menuItems.forEach(m => m.setVisible(v));
    this._menuCursor.setVisible(v);
    if (v) this._syncMenuCursor();
  }

  _syncMenuCursor() {
    const { width, height } = this.scale;
    const tbY = height * 0.73;
    const col = this._menuIndex % 2;
    const row = Math.floor(this._menuIndex / 2);
    const mX  = width * 0.52;
    this._menuCursor.x = mX + col * (width * 0.23) - 10;
    this._menuCursor.y = tbY + 6 + row * 16;
    this._menuItems.forEach((m, i) => m.setColor(i === this._menuIndex ? '#ffffff' : '#666688'));
  }

  _buildMovePanel() {
    const { width, height } = this.scale;
    const tbY  = height * 0.73;
    const tbH  = height - tbY;
    const W    = width * 0.52;
    const moves = this._getPlayer().moves;
    this._movePanelBg.clear();
    this._movePanelBg.fillStyle(0x0a0a20, 0.98);
    this._movePanelBg.fillRect(0, tbY, W, tbH);
    this._movePanelBg.lineStyle(1, C.border, 1);
    this._movePanelBg.strokeRect(0, tbY, W, tbH);

    this._moveLabels.forEach(l => l.destroy());
    this._moveLabels = moves.map((m, i) => {
      const t = this._txt(16, tbY + 6 + i * 16,
        `${m.name.toUpperCase()}  PP:${m.currentPp}/${m.pp}`
      ).setFontSize('6px');
      return t;
    });
    this._movePanelVisible = true;
    this._moveCursor.setVisible(true).setDepth(22);
    this._syncMoveCursor();
  }

  _syncMoveCursor() {
    const { height } = this.scale;
    const tbY = height * 0.73;
    this._moveCursor.x = 6;
    this._moveCursor.y = tbY + 6 + this._moveIndex * 16;
    this._moveCursor.setFontSize('7px');
    this._moveLabels.forEach((l, i) => l.setColor(i === this._moveIndex ? '#ffffff' : '#666688'));
  }

  _hideMovePanel() {
    this._movePanelBg.clear();
    this._moveLabels.forEach(l => l.destroy());
    this._moveLabels = [];
    this._moveCursor.setVisible(false);
    this._movePanelVisible = false;
  }

  _showText(msg) {
    const lines = msg.split('\n');
    this._textL1.setText(lines[0] || '');
    this._textL2.setText(lines[1] || '');
  }

  _typewriter(msg, onDone) {
    this._blocking = true;
    let i = 0;
    this._textL1.setText('');
    this._textL2.setText('');
    const full = msg;
    const tick = this.time.addEvent({
      delay: 35, repeat: full.length - 1,
      callback: () => {
        i++;
        const sub = full.substring(0, i);
        if (i <= 28) this._textL1.setText(sub);
        else {
          this._textL1.setText(full.substring(0, 28));
          this._textL2.setText(sub.substring(28));
        }
        if (i >= full.length) {
          this._blocking = false;
          if (onDone) this.time.delayedCall(280, onDone);
        }
      },
    });
  }

  _updateEnemyPartyDots() {
    this._enemyPartyDots.forEach((d, i) => {
      const mon = this._enemyParty[i];
      d.setFillStyle(
        i === this._enemyIndex ? C.red :
        mon?.currentHp > 0     ? 0x885555 : 0x333333
      );
    });
  }

  _loadSprite(key, url, x, y, scale = 3) {
    if (!url) return;
    const existing = this.children.getByName(key);
    if (existing) existing.destroy();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!this.scene.isActive()) return;
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addImage(key, img);
      const sp = this.add.image(x, y, key).setScale(scale).setDepth(8).setName(key);
      // Slide in from edge
      const startX = key === 'spr-player' ? -80 : this.scale.width + 80;
      sp.x = startX;
      this.tweens.add({ targets: sp, x, duration: 380, ease: 'Back.easeOut' });
    };
    img.src = url;
  }

  _removeSprite(key) {
    const sp = this.children.getByName(key);
    if (sp) {
      this.tweens.add({
        targets: sp, alpha: 0, y: sp.y + 20, duration: 250,
        onComplete: () => sp.destroy(),
      });
    }
  }

  _shakeSprite(key, cb) {
    const sp = this.children.getByName(key);
    if (!sp) { cb(); return; }
    const ox = sp.x;
    this.tweens.add({
      targets: sp, x: { from: ox - 5, to: ox + 5 },
      yoyo: true, repeat: 3, duration: 35,
      onComplete: () => { sp.x = ox; cb(); },
    });
  }

  _effectMsg(mult, isCrit) {
    let m = '';
    if (isCrit) m += 'Critical hit! ';
    if (mult >= 2) m += "Super effective!";
    else if (mult === 0) m += "Doesn't affect...";
    else if (mult < 1)  m += "Not very effective...";
    return m.trim();
  }

  _txt(x, y, text) {
    return this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '8px', color: '#ddddee',
    }).setDepth(21);
  }

  _getPlayer() { return RunManager.party[this._playerIndex]; }
  _getEnemy()  { return this._enemyParty[this._enemyIndex]; }
}

/** Decrease PP for a move (handles undefined pp gracefully) */
function playerMove_decrPP(move) {
  if (move && move.currentPp > 0) move.currentPp--;
}
