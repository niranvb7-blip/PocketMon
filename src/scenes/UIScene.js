/**
 * UIScene – persistent HUD overlay.
 * Shows wave counter and party HP chips.
 * Runs on top of BattleScene.
 */
import Phaser from 'phaser';
import { RunManager } from '../systems/RunManager';

const FONT = '"Press Start 2P", monospace';

export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    // UIScene is not used in this roguelite version (BattleScene has its own HUD)
    // Kept for future extensibility
  }
}
