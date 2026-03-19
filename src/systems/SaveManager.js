/**
 * SaveManager – persists player data to localStorage.
 * Stores: party, position, badges, playtime.
 */

const SAVE_KEY = 'pocketmon_save';

const defaultSave = {
  version: 1,
  playerName: 'Red',
  party: [],      // Array of { id, name, level, currentHp, maxHp, moves }
  position: { map: 'world', x: 7, y: 10 },  // tile coordinates
  badges: [],
  money: 500,
  playtimeSeconds: 0,
};

export const SaveManager = {
  /** Load save data, merging with defaults for forward-compatibility */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return { ...defaultSave, ...JSON.parse(raw) };
    } catch {
      return null;
    }
  },

  /** Save data object to localStorage */
  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave, ...data }));
      return true;
    } catch {
      return false;
    }
  },

  /** Wipe save data */
  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  },

  /** Check whether a save file exists */
  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  },

  /** Return a fresh default save (new game) */
  newGame(playerName = 'Red') {
    return { ...defaultSave, playerName };
  },
};
