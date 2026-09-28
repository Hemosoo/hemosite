/**
 * Flop reveals.
 *
 * Deliberately a separate system from the turn and river. Those are one card
 * arriving and are allowed to be dramatic; the flop is three cards at once and
 * has to read as a single coordinated event, then get out of the way. So these
 * are shorter, lighter, and choreographed across the three cards rather than
 * being the single-card reveal played three times.
 *
 * As with the other reveals, the engine has already decided the cards. A spec
 * only ever describes how they arrive.
 */

export type FlopKind = "spread" | "orbit" | "chain" | "calm";

interface FlopBase {
  kind: FlopKind;
  id: string;
  /** Whole reveal, ms. Kept well under the turn and river on purpose. */
  totalMs: number;
  /** Fixed per reveal, so one playing never re-choreographs mid-flight. */
  seed: number;
}

export interface SpreadSpec extends FlopBase {
  kind: "spread";
  /** Which side the stack comes in from: -1 left, +1 right. */
  from: -1 | 1;
  /** How far the outer cards cant over as they separate, degrees. */
  tilt: number;
}

export interface OrbitSpec extends FlopBase {
  kind: "orbit";
  dir: 1 | -1;
  /** Orbit radius, in card widths. */
  radius: number;
  /** How far round they sweep, degrees. */
  sweep: number;
}

export interface ChainSpec extends FlopBase {
  kind: "chain";
  /** Which side the cards lean in from: -1 left, +1 right. */
  lean: -1 | 1;
}

export interface CalmFlopSpec extends FlopBase {
  kind: "calm";
}

export type FlopSpec = SpreadSpec | OrbitSpec | ChainSpec | CalmFlopSpec;

/**
 * Spread — a dealer putting the flop out.
 *
 * The three arrive as one stack, land, then separate into their places while
 * turning over. The most poker-literal of the three and the one that should
 * feel tactile rather than clever.
 */
function spread(seed: number): SpreadSpec {
  return {
    kind: "spread",
    id: "flop-spread",
    totalMs: 1150,
    seed,
    from: seed % 2 === 0 ? 1 : -1,
    tilt: 5.5 + (seed % 5) * 0.6,
  };
}

/**
 * Orbit — a flourish.
 *
 * The three converge on a point above the board, sweep round it together at
 * different depths, turn over on the way, then break formation into their
 * places. The showy one, and the longest of the three.
 */
function orbit(seed: number): OrbitSpec {
  return {
    kind: "orbit",
    id: "flop-orbit",
    totalMs: 1400,
    seed,
    dir: seed % 2 === 0 ? 1 : -1,
    radius: 1.08 + (seed % 4) * 0.04,
    sweep: 215 + (seed % 5) * 8,
  };
}

/**
 * Chain — each card's landing sets off the next.
 *
 * Rhythmic rather than spatial: soft, then harder, then hardest, with the row
 * locking as the third seats. Nothing explodes; the trigger is carried by
 * timing and a small local reaction.
 */
function chain(seed: number): ChainSpec {
  return {
    kind: "chain",
    id: "flop-chain",
    totalMs: 1200,
    seed,
    lean: seed % 2 === 0 ? 1 : -1,
  };
}

/** A short staggered fade, for prefers-reduced-motion. */
function calmFlop(seed: number): CalmFlopSpec {
  return { kind: "calm", id: "flop-calm", totalMs: 560, seed };
}

export const FLOP_REVEALS: Array<(seed: number) => FlopSpec> = [spread, orbit, chain];

/** Chosen once, when the flop is dealt, and fixed for that whole reveal. */
export function pickFlop(reduced: boolean): FlopSpec {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  if (reduced) return calmFlop(seed);
  return FLOP_REVEALS[Math.floor(Math.random() * FLOP_REVEALS.length)](seed);
}
