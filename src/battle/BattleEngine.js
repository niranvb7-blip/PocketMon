/**
 * BattleEngine – Gen 3 damage formula and modifier helpers.
 * Pure functions, no Phaser dependency.
 */

import typeChart from '../data/typeChart.json';

// ---- Type effectiveness ----

/**
 * Get type multiplier for a move against a target.
 * @param {string} moveType
 * @param {string[]} defenderTypes
 * @returns {number}
 */
export function getTypeMultiplier(moveType, defenderTypes) {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const row = typeChart[moveType];
    if (row && row[defType] !== undefined) {
      multiplier *= row[defType];
    }
  }
  return multiplier;
}

// ---- STAB ----

/**
 * @param {string} moveType
 * @param {string[]} attackerTypes
 * @returns {number} 1.5 if STAB, else 1
 */
export function getStab(moveType, attackerTypes) {
  return attackerTypes.includes(moveType) ? 1.5 : 1;
}

// ---- Critical hit ----

/**
 * Roll for a critical hit (Gen 3: ~6.25% base chance).
 * @returns {{ isCrit: boolean, multiplier: number }}
 */
export function rollCritical() {
  const isCrit = Math.random() < 0.0625;
  return { isCrit, multiplier: isCrit ? 1.5 : 1 };
}

// ---- Random factor ----

/** Returns a random number in [0.85, 1.00] */
export function randomFactor() {
  return (85 + Math.floor(Math.random() * 16)) / 100;
}

// ---- Main damage formula (Gen 3 official) ----

/**
 * Calculate damage dealt by `attacker` using `move` on `defender`.
 *
 * Damage = floor(floor(floor(2L/5 + 2) × P × A/D / 50) + 2) × M
 *
 * @param {Object} attacker   BattlePokemon
 * @param {Object} defender   BattlePokemon
 * @param {Object} move       { name, type, power, accuracy, pp }
 * @returns {{ damage: number, isCrit: boolean, typeMultiplier: number, stab: number }}
 */
export function calculateDamage(attacker, defender, move) {
  const L = attacker.level;
  const P = move.power;

  // Use special attack/defense for non-physical move types
  const specialTypes = ['fire','water','electric','grass','ice','psychic','dragon','dark'];
  const isSpecial = specialTypes.includes(move.type);

  const A = isSpecial ? attacker.spAtk  : attacker.attack;
  const D = isSpecial ? defender.spDef  : defender.defense;

  // Core formula
  const base = Math.floor(
    (Math.floor((2 * L / 5 + 2) * P * A / D) / 50) + 2
  );

  // Modifiers
  const stab           = getStab(move.type, attacker.types);
  const typeMultiplier = getTypeMultiplier(move.type, defender.types);
  const { isCrit, multiplier: critMult } = rollCritical();
  const rng            = randomFactor();

  const M = stab * typeMultiplier * critMult * rng;
  const damage = Math.max(1, Math.floor(base * M));

  return { damage, isCrit, typeMultiplier, stab };
}

// ---- Accuracy check ----

/**
 * @param {number} accuracy  0-100
 * @returns {boolean}
 */
export function accuracyCheck(accuracy) {
  return Math.random() * 100 < accuracy;
}

// ---- Speed tie-break ----

/**
 * Returns 'player' or 'enemy' depending on who moves first.
 * @param {Object} player  BattlePokemon
 * @param {Object} enemy   BattlePokemon
 * @returns {'player'|'enemy'}
 */
export function whoGoesFirst(player, enemy) {
  if (player.speed > enemy.speed) return 'player';
  if (enemy.speed  > player.speed) return 'enemy';
  // Speed tie: random
  return Math.random() < 0.5 ? 'player' : 'enemy';
}
