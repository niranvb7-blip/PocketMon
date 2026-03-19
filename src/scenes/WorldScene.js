/**
 * WorldScene – tile-based overworld with grid movement,
 * collision detection, and random encounter triggering.
 *
 * Tile index reference (procedural tileset from BootScene):
 *   0 = walkable grass
 *   1 = tall grass (encounter zone)
 *   2 = collision (tree/wall)
 *   3 = path
 *   4 = water (collision)
 */
import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';

const TILE_SIZE  = 16;
const MOVE_SPEED = 120;           // ms to cross one tile
const ENCOUNTER_RATE = 0.1;       // 10% chance per tall-grass step

// ---- Procedural map layout ----
// 0=grass 1=tallgrass 2=tree 3=path 4=water
const MAP_DATA = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,2],
  [2,0,2,2,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,2],
  [2,0,2,2,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,2],
  [2,3,3,3,3,3,3,0,0,0,0,1,1,1,1,0,0,0,0,2],
  [2,0,0,0,3,0,0,0,0,0,0,1,1,1,1,0,0,2,0,2],
  [2,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2],
  [2,0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2],
  [2,0,1,1,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2],
  [2,0,1,1,1,0,0,4,4,4,4,4,0,0,0,3,0,0,0,2],
  [2,0,1,1,1,0,0,4,4,4,4,4,0,0,0,3,0,0,0,2],
  [2,0,0,0,0,0,0,4,4,4,4,4,0,0,0,3,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

const MAP_ROWS = MAP_DATA.length;
const MAP_COLS = MAP_DATA[0].length;

/** Tiles that block movement */
const COLLISION_TILES = new Set([2, 4]);
/** Tiles that trigger encounters */
const ENCOUNTER_TILES = new Set([1]);

export default class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  init(data) {
    this._saveData = data?.saveData || SaveManager.newGame();
  }

  create() {
    const { position } = this._saveData;

    // ---- Build tile map ----
    this._buildMap();

    // ---- Player ----
    this._tileX = position.x;
    this._tileY = position.y;
    this._facing = 'down';
    this._moving = false;

    this._player = this.add.sprite(
      this._tileX * TILE_SIZE + TILE_SIZE / 2,
      this._tileY * TILE_SIZE + TILE_SIZE / 2,
      'player', 0
    ).setDepth(10);

    // ---- Camera ----
    this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    this.cameras.main.startFollow(this._player, true, 0.1, 0.1);

    // ---- Input ----
    this._cursors = this.input.keyboard.createCursorKeys();
    this._keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
    });

    // ---- Launch UI overlay ----
    this.scene.launch('UIScene', { worldScene: this });

    // Auto-save every 30 s
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: this._autoSave,
      callbackScope: this,
    });
  }

  update() {
    if (this._moving) return;

    let dx = 0, dy = 0, dir = this._facing;

    const { left, right, up, down } = this._cursors;
    const { a, d, w, s } = this._keys;

    if (left.isDown  || a.isDown)  { dx = -1; dir = 'left';  }
    else if (right.isDown || d.isDown) { dx =  1; dir = 'right'; }
    else if (up.isDown    || w.isDown) { dy = -1; dir = 'up';    }
    else if (down.isDown  || s.isDown) { dy =  1; dir = 'down';  }

    if (dx !== 0 || dy !== 0) {
      this._facing = dir;
      const nx = this._tileX + dx;
      const ny = this._tileY + dy;

      if (this._canWalk(nx, ny)) {
        this._movePlayer(nx, ny, dir);
      } else {
        // Face direction but don't move
        this._player.setFrame(this._dirFrame(dir));
      }
    } else {
      this._player.anims.stop();
      this._player.setFrame(this._dirFrame(this._facing));
    }
  }

  // ---- Helpers ----

  _buildMap() {
    MAP_DATA.forEach((row, ty) => {
      row.forEach((tileId, tx) => {
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;
        // Crop correct tile from generated strip texture
        this.add.image(x, y, 'tileset')
          .setOrigin(0)
          .setCrop(tileId * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      });
    });
  }

  _canWalk(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_COLS || ty >= MAP_ROWS) return false;
    return !COLLISION_TILES.has(MAP_DATA[ty][tx]);
  }

  _movePlayer(nx, ny, dir) {
    this._moving = true;
    this._tileX = nx;
    this._tileY = ny;
    this._player.anims.play(`walk-${dir}`, true);

    this.tweens.add({
      targets: this._player,
      x: nx * TILE_SIZE + TILE_SIZE / 2,
      y: ny * TILE_SIZE + TILE_SIZE / 2,
      duration: MOVE_SPEED,
      onComplete: () => {
        this._moving = false;
        this._checkEncounter();
        this._autoSave();
      },
    });
  }

  _checkEncounter() {
    const tile = MAP_DATA[this._tileY]?.[this._tileX];
    if (ENCOUNTER_TILES.has(tile) && Math.random() < ENCOUNTER_RATE) {
      this._startBattle();
    }
  }

  _startBattle() {
    this._moving = true; // Prevent movement during transition

    // Flash screen before battle
    this.cameras.main.flash(500, 255, 255, 255);
    this.time.delayedCall(550, () => {
      this._saveData.position = { map: 'world', x: this._tileX, y: this._tileY };
      SaveManager.save(this._saveData);
      this.scene.pause('WorldScene');
      this.scene.launch('BattleScene', {
        saveData: this._saveData,
        onBattleEnd: this._onBattleEnd.bind(this),
      });
    });
  }

  _onBattleEnd(result) {
    this._moving = false;
    this.scene.stop('BattleScene');
    this.scene.resume('WorldScene');
  }

  _autoSave() {
    this._saveData.position = { map: 'world', x: this._tileX, y: this._tileY };
    SaveManager.save(this._saveData);
  }

  _dirFrame(dir) {
    const frames = { down: 1, left: 4, right: 7, up: 10 };
    return frames[dir] ?? 1;
  }
}
