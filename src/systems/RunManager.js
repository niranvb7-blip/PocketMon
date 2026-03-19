/**
 * RunManager – singleton that holds all roguelite run state.
 * Persisted to localStorage between sessions.
 */
import { SaveManager } from './SaveManager';

const SAVE_KEY = 'pocketmon_rogue_run';

export const RunManager = {
  // ── Run state ──────────────────────────────────────────────
  wave: 1,
  party: [],          // Array of active BattlePokemon
  caught: [],         // Pokémon caught but not in party (box)
  items: [],          // Array of { id, name, effect }
  runStats: {
    wavesCleared: 0,
    pokemonCaught: 0,
    trainerBeaten: 0,
    damageDealt: 0,
    startTime: null,
  },

  // ── Initialise a brand-new run ──────────────────────────────
  startRun(starterPokemon) {
    this.wave = 1;
    this.party    = [starterPokemon];
    this.caught   = [];
    this.items    = [];
    this.runStats = {
      wavesCleared: 0,
      pokemonCaught: 0,
      trainerBeaten: 0,
      damageDealt: 0,
      startTime: Date.now(),
    };
    this._persist();
  },

  // ── Advance a wave ──────────────────────────────────────────
  nextWave() {
    this.wave++;
    this.runStats.wavesCleared++;
    this._persist();
  },

  // ── Party helpers ───────────────────────────────────────────
  addToParty(pokemon) {
    if (this.party.length < 6) {
      this.party.push(pokemon);
    } else {
      this.caught.push(pokemon);
    }
    this.runStats.pokemonCaught++;
    this._persist();
  },

  getActivePokemon() {
    return this.party.find(p => p.currentHp > 0) || null;
  },

  isPartyAlive() {
    return this.party.some(p => p.currentHp > 0);
  },

  getNextPokemon(currentIndex) {
    for (let i = currentIndex + 1; i < this.party.length; i++) {
      if (this.party[i].currentHp > 0) return { pokemon: this.party[i], index: i };
    }
    return null;
  },

  // ── Wave type detection ─────────────────────────────────────
  isTrainerWave()    { return this.wave % 10 === 0; },
  isBossWave()       { return this.wave % 50 === 0; },
  getTrainerTier()   { return Math.floor(this.wave / 10); },
  getWaveLevel()     { return Math.max(5, Math.floor(this.wave * 1.4)); },

  // ── Items ───────────────────────────────────────────────────
  addItem(item) {
    this.items.push(item);
    this._persist();
  },

  usePotion(partyIndex) {
    const mon = this.party[partyIndex];
    if (!mon) return false;
    const healed = Math.min(mon.maxHp - mon.currentHp, 30);
    mon.currentHp = Math.min(mon.maxHp, mon.currentHp + 30);
    this._persist();
    return healed;
  },

  // ── Persistence ─────────────────────────────────────────────
  _persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        wave: this.wave,
        party: this.party,
        caught: this.caught,
        items: this.items,
        runStats: this.runStats,
      }));
    } catch { /* quota exceeded etc */ }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(this, data);
      return true;
    } catch {
      return false;
    }
  },

  clearRun() {
    localStorage.removeItem(SAVE_KEY);
    this.wave = 1;
    this.party = [];
    this.caught = [];
    this.items = [];
    this.runStats = { wavesCleared: 0, pokemonCaught: 0, trainerBeaten: 0, damageDealt: 0, startTime: null };
  },

  hasActiveRun() {
    return localStorage.getItem(SAVE_KEY) !== null;
  },
};
