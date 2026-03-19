/**
 * PokeAPI Wrapper
 * Fetches Pokémon data from PokéAPI v2 with in-memory caching.
 * Returns a clean "BattlePokemon" object ready for the battle engine.
 */

const BASE_URL = 'https://pokeapi.co/api/v2';

// ----- In-memory cache (per session) -----
const _cache = new Map();

/**
 * Fetch raw Pokémon data from PokéAPI (with caching).
 * @param {string|number} nameOrId
 * @returns {Promise<Object>} raw API response
 */
async function fetchRaw(nameOrId) {
  const key = String(nameOrId).toLowerCase();
  if (_cache.has(key)) return _cache.get(key);

  const res = await fetch(`${BASE_URL}/pokemon/${key}`);
  if (!res.ok) throw new Error(`PokeAPI: Could not fetch "${nameOrId}" (${res.status})`);
  const data = await res.json();
  _cache.set(key, data);
  return data;
}

/**
 * Fetch move data from PokéAPI (with caching).
 * @param {string} moveUrl  full URL returned by the pokemon endpoint
 */
async function fetchMove(moveUrl) {
  if (_cache.has(moveUrl)) return _cache.get(moveUrl);
  const res = await fetch(moveUrl);
  if (!res.ok) return null;
  const data = await res.json();
  _cache.set(moveUrl, data);
  return data;
}

/**
 * Build a clean BattlePokemon object.
 * @param {string|number} nameOrId
 * @param {number} [level=5]
 * @returns {Promise<BattlePokemon>}
 */
export async function buildBattlePokemon(nameOrId, level = 5) {
  const raw = await fetchRaw(nameOrId);

  // ---- Stats ----
  const statMap = {};
  for (const s of raw.stats) statMap[s.stat.name] = s.base_stat;

  const maxHp = calcHp(statMap.hp, level);

  // ---- Types ----
  const types = raw.types.map(t => t.type.name);

  // ---- Moves (pick first 4 learnable with power) ----
  // to keep API calls minimal, resolve only the first 4 moves that have damage
  const movePool = raw.moves
    .filter(m => m.version_group_details.some(v => v.move_learn_method.name === 'level-up'))
    .slice(0, 20); // fetch at most 20 candidates

  const resolvedMoves = [];
  for (const entry of movePool) {
    if (resolvedMoves.length >= 4) break;
    const move = await fetchMove(entry.move.url);
    if (move && move.power && move.power > 0) {
      resolvedMoves.push({
        name: move.name,
        type: move.type.name,
        power: move.power,
        accuracy: move.accuracy ?? 100,
        pp: move.pp,
        currentPp: move.pp,
      });
    }
  }

  // Fallback: Struggle if no usable moves found
  if (resolvedMoves.length === 0) {
    resolvedMoves.push({ name: 'struggle', type: 'normal', power: 50, accuracy: 100, pp: 999, currentPp: 999 });
  }

  return {
    id: raw.id,
    name: raw.name,
    level,
    types,
    maxHp,
    currentHp: maxHp,
    attack:   calcStat(statMap.attack,           level),
    defense:  calcStat(statMap.defense,          level),
    spAtk:    calcStat(statMap['special-attack'], level),
    spDef:    calcStat(statMap['special-defense'],level),
    speed:    calcStat(statMap.speed,             level),
    moves: resolvedMoves,
    spriteUrl: raw.sprites.front_default,
    spriteBackUrl: raw.sprites.back_default,
  };
}

// ---- Gen 3 simplified stat formulas ----

/** HP stat formula (Gen 3 simplified) */
function calcHp(baseStat, level) {
  return Math.floor(((2 * baseStat * level) / 100) + level + 10);
}

/** Other stats formula (Gen 3 simplified, no EVs/IVs for simplicity) */
function calcStat(baseStat, level) {
  return Math.floor(((2 * baseStat * level) / 100) + 5);
}
