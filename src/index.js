import Phaser from 'phaser';
import BootScene     from './scenes/BootScene';
import PreloadScene  from './scenes/PreloadScene';
import TitleScene    from './scenes/TitleScene';
import StarterScene  from './scenes/StarterScene';
import BattleScene   from './scenes/BattleScene';
import RewardScene   from './scenes/RewardScene';
import GameOverScene from './scenes/GameOverScene';
import UIScene       from './scenes/UIScene';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 320,
  zoom: 2,
  parent: document.body,
  backgroundColor: '#0d0d1a',
  pixelArt: true,
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    StarterScene,
    BattleScene,
    RewardScene,
    GameOverScene,
    UIScene,
  ],
};

const game = new Phaser.Game(config);
export default game;
