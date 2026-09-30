/**
 * Initial deals.
 *
 * A fourth reveal system, alongside the turn and river's and the flop's. The
 * hole cards are the one moment where every seat gets something at once, so it
 * is its own event: fast, wide, and over before the first bet — a flourish that
 * populates the table rather than a card arriving somewhere.
 *
 * As with the others, the engine has already dealt. A spec only ever describes
 * how the cards get to the seats that already own them.
 *
 * One style so far. The shape is here so the next one is a function and a line
 * in the list, the way `dealerFlick`, `radialBurst` or `cascadeDeal` would be.
 */

export type DealKind = "orbitDeal" | "calm";

interface DealBase {
  kind: DealKind;
  id: string;
  /** Whole deal, ms. */
  totalMs: number;
  /** Fixed per deal, so one playing never re-choreographs mid-flight. */
  seed: number;
}

export interface OrbitDealSpec extends DealBase {
  kind: "orbitDeal";
  /** Which way round the table the formation turns. */
  dir: 1 | -1;
  /** Orbit radii, as a share of the frame's half-width and half-height. */
  radiusX: number;
  radiusY: number;
  /** How far round the formation carries, degrees. */
  sweep: number;
  /** Where the formation starts, degrees. */
  phase: number;
}

export interface CalmDealSpec extends DealBase {
  kind: "calm";
}

export type DealSpec = OrbitDealSpec | CalmDealSpec;

/**
 * Orbit Deal — the deck opens, the cards fly the table, the formation breaks.
 *
 * Every card leaves the deck, joins one turning ellipse around the table, and
 * peels out of it toward the seat that owns it — first card to every player,
 * then second, the way a hand is actually dealt, but with the waves overlapping
 * so it never reads as waiting.
 *
 * Under two seconds, because it happens before every hand and a flourish that
 * outstays its welcome stops being one.
 */
export function orbitDeal(seed: number): OrbitDealSpec {
  return {
    kind: "orbitDeal",
    id: "deal-orbit",
    totalMs: 1780,
    seed,
    dir: seed % 2 === 0 ? 1 : -1,
    // The table is much wider than it is tall, and so is the orbit: a circle
    // in screen space would put half the formation off the top of the frame.
    radiusX: 0.52 + (seed % 5) * 0.012,
    radiusY: 0.3 + (seed % 3) * 0.015,
    sweep: 150 + (seed % 6) * 9,
    phase: (seed % 360) * 1,
  };
}

/** A short staggered slide from the deck, for prefers-reduced-motion. */
function calmDeal(seed: number): CalmDealSpec {
  return { kind: "calm", id: "deal-calm", totalMs: 760, seed };
}

export const DEAL_REVEALS: Array<(seed: number) => DealSpec> = [orbitDeal];

/** Chosen once, when the hand starts, and fixed for that whole deal. */
export function pickDeal(reduced: boolean): DealSpec {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  if (reduced) return calmDeal(seed);
  return DEAL_REVEALS[Math.floor(Math.random() * DEAL_REVEALS.length)](seed);
}
