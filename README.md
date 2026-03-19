# PocketMon

A PokéRogue Pokémon adventure game built with **Phaser 3** + **Electron**.

## Tech Stack
| Layer | Tool |
|---|---|
| Game Framework | Phaser 3 |
| PC Wrapper | Electron 28 |
| Bundler | Webpack 5 |
| Data | PokéAPI v2 |
| Packaging | Electron Forge |

## Project Structure
```
src/
  scenes/
    BootScene.js       – Procedural asset generation
    PreloadScene.js    – Asset loading + animation setup
    TitleScene.js      – Animated title screen
    WorldScene.js      – Overworld / movement / encounters
    BattleScene.js     – Full turn-based battle engine
    UIScene.js         – Persistent HUD overlay
  api/
    pokeApi.js         – PokéAPI wrapper with caching
  battle/
    BattleEngine.js    – Damage formula, type chart, crits
  systems/
    SaveManager.js     – localStorage save/load
  data/
    typeChart.json     – Gen 3 type effectiveness table
electron/
  main.js              – Electron main process
  preload.js           – Context bridge
```

## Quick Start

```bash
npm install
npm run dev       # Opens Electron with hot-reload
```

## Build a .exe Installer

```bash
npm run build     # Bundle with Webpack
npm run make      # Electron Forge → out/make/
```

## Controls
| Key | Action |
|---|---|
| Arrow Keys / WASD | Move player |
| Z / Enter | Confirm |
| X / Escape | Back / Cancel |

## Adding Real Assets
- Place your Gen 3 tileset PNG at `src/assets/tilesets/gen3.png`
- Export your Tiled map JSON to `src/assets/maps/world.json`
- Player walk spritesheet goes to `src/assets/sprites/player.png` (48×16, 3 frames per direction)

The game works with procedural graphics out of the box; replacing them only improves visuals.

## Battle System
Implements the official Gen 3 damage formula with:
- STAB (×1.5)
- Full 18-type effectiveness chart
- Critical hits (~6.25%)
- Random factor (0.85–1.00)
- Speed priority

## Disclaimer
PocketMon is a personal learning project. All Pokémon data is sourced from [PokéAPI](https://pokeapi.co) (open, non-commercial). No Nintendo / TPCi IP is distributed.
