/**
 * TrainerAI – smart move selection for enemy trainers.
 * Scores each available move and picks the best one.
 */
import { getTypeMultiplier, getStab } from '../battle/BattleEngine';

/**
 * Pick the best move for an AI Pokémon against a target.
 * Falls back to the highest-power move if type calcs tie.
 *
 * @param {Object} aiPokemon    BattlePokemon (AI)
 * @param {Object} target       BattlePokemon (player)
 * @returns {Object} move
 */
export function selectAIMove(aiPokemon, target) {
  const usable = aiPokemon.moves.filter(m => m.currentPp > 0);
  if (usable.length === 0) {
    // Struggle fallback
    return { name: 'struggle', type: 'normal', power: 50, accuracy: 100, pp: 999, currentPp: 999 };
  }

  const scored = usable.map(move => ({
    move,
    score: _scoreMove(move, aiPokemon, target),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Add small random jitter to top-ranked moves to feel less robotic
  const top = scored.filter(s => s.score >= scored[0].score * 0.85);
  return top[Math.floor(Math.random() * Math.min(top.length, 2))].move;
}

function _scoreMove(move, attacker, defender) {
  if (!move.power || move.power <= 0) return 0;
  const type  = getTypeMultiplier(move.type, defender.types);
  const stab  = getStab(move.type, attacker.types);
  // Prioritise super-effective moves strongly
  const typeBonus = type >= 2 ? 2.5 : type <= 0 ? -999 : type;
  return move.power * typeBonus * stab;
}

/**
 * Should the trainer switch Pokémon?
 * Returns true if the current mon is at a type disadvantage and has a better option.
 *
 * @param {Object} current   active AI BattlePokemon
 * @param {Object} target    player's current BattlePokemon
 * @param {Object[]} bench   remaining AI party (non-fainted, not current)
 * @returns {Object|null} the Pokémon to switch to, or null
 */
export function shouldSwitch(current, target, bench) {
  if (bench.length === 0) return null;
  // Current mon's best move effectiveness vs target
  const currentBest = Math.max(
    ...current.moves.map(m => getTypeMultiplier(m.type, target.types) * getStab(m.type, current.types)),
    0
  );
  if (currentBest >= 1) return null; // No need to switch

  // Find a bench mon with better coverage
  const better = bench
    .filter(mon => mon.currentHp > 0)
    .map(mon => ({
      mon,
      score: Math.max(...mon.moves.map(m => getTypeMultiplier(m.type, target.types) * getStab(m.type, mon.types)), 0),
    }))
    .filter(x => x.score > currentBest)
    .sort((a, b) => b.score - a.score);

  // Only switch if we have a meaningfully better option
  return better.length > 0 && better[0].score > currentBest * 1.3 ? better[0].mon : null;
}
