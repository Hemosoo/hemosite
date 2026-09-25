import type { Card } from "./cards";
import { scoreBest } from "./evaluate";
import { legalActions, potSize, type Action, type Table } from "./engine";

/** Not a solver — deliberately simple, readable heuristics with enough
 *  personality that the seats don't all play identically. */
export interface Profile {
  /** Hand strength needed to continue, roughly. Higher = tighter. */
  tight: number;
  /** How often a strong hand turns into a raise. */
  aggro: number;
  /** How often a weak hand bets anyway. */
  bluff: number;
}

export const PROFILES: Record<string, Profile> = {
  brick: { tight: 0.38, aggro: 0.35, bluff: 0.06 },
  nit: { tight: 0.58, aggro: 0.22, bluff: 0.02 },
  maniac: { tight: 0.18, aggro: 0.72, bluff: 0.3 },
  rock: { tight: 0.55, aggro: 0.18, bluff: 0.03 },
  fish: { tight: 0.22, aggro: 0.2, bluff: 0.1 },
  shark: { tight: 0.42, aggro: 0.5, bluff: 0.16 },
  donk: { tight: 0.26, aggro: 0.42, bluff: 0.22 },
};

const DEFAULT: Profile = { tight: 0.4, aggro: 0.35, bluff: 0.1 };

/** Rough 0..1 preflop value: high cards, pairs, suitedness, connectedness. */
function preflopStrength(hole: Card[]): number {
  const [a, b] = hole;
  const hi = Math.max(a.r, b.r);
  const lo = Math.min(a.r, b.r);
  const pair = a.r === b.r;
  const suited = a.s === b.s;
  const gap = hi - lo;

  if (pair) {
    // 22 -> ~0.5, AA -> ~1.0
    return Math.min(1, 0.5 + ((hi - 2) / 12) * 0.5);
  }
  let v = (hi - 2) / 12 * 0.45 + (lo - 2) / 12 * 0.25;
  if (suited) v += 0.09;
  if (gap === 1) v += 0.07;
  else if (gap === 2) v += 0.04;
  else if (gap > 4) v -= 0.06;
  return Math.max(0, Math.min(0.92, v));
}

/** Rough 0..1 made-hand value once there's a board. */
function postflopStrength(hole: Card[], board: Card[]): number {
  const score = scoreBest([...hole, ...board]);
  const category = score[0];
  const base = [0.12, 0.34, 0.56, 0.72, 0.84, 0.89, 0.94, 0.98, 1.0][category] ?? 0.12;
  // Within a category, the top card still matters a little.
  const kicker = ((score[1] ?? 0) - 2) / 12;
  const refined = base + kicker * 0.06;

  // A pair that's only on the board isn't really yours.
  if (category === 1) {
    const boardRanks = new Set(board.map((c) => c.r));
    const usesHole = hole.some((h) => boardRanks.has(h.r) || hole[0].r === hole[1].r);
    if (!usesHole) return 0.2;
  }
  return Math.min(1, refined);
}

export function strength(hole: Card[], board: Card[]): number {
  if (hole.length < 2) return 0;
  return board.length === 0 ? preflopStrength(hole) : postflopStrength(hole, board);
}

/** Decide for whoever is currently to act. */
export function botAction(table: Table, rng: () => number = Math.random): Action {
  const p = table.players[table.toAct];
  const legal = legalActions(table);
  const profile = PROFILES[p.name] ?? DEFAULT;
  const s = strength(p.hole, table.board);
  const pot = potSize(table);

  // More opponents means a hand has to be better to be worth playing.
  const opponents = table.players.filter((q) => !q.folded && !q.out && q.id !== p.id).length;
  const pressure = 1 + Math.max(0, opponents - 1) * 0.06;
  const effective = s / pressure;

  const raiseTo = () => {
    const target = Math.round(
      Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, table.currentBet + pot * (0.5 + rng() * 0.6)))
    );
    // Snap to the blind so the numbers read cleanly.
    const snapped = Math.max(legal.minRaiseTo, Math.round(target / table.bigBlind) * table.bigBlind);
    return Math.min(snapped, legal.maxRaiseTo);
  };

  if (legal.canCheck) {
    const wantsToBet = effective > profile.tight + 0.18 ? profile.aggro : profile.bluff;
    if (legal.canRaise && rng() < wantsToBet) return { type: "raise", to: raiseTo() };
    return { type: "check" };
  }

  const call = legal.callAmount;
  const odds = call / Math.max(1, pot + call);
  // Committing the whole stack needs a genuinely good hand.
  const shoveRisk = call >= p.chips ? 0.12 : 0;

  if (effective > profile.tight + 0.28 + shoveRisk && legal.canRaise && rng() < profile.aggro) {
    return { type: "raise", to: raiseTo() };
  }
  if (effective > odds + profile.tight * 0.5 + shoveRisk) return { type: "call" };
  if (rng() < profile.bluff * 0.4 && call <= pot * 0.3) return { type: "call" };
  return { type: "fold" };
}
