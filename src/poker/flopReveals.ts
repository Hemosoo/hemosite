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

export type FlopKind = "spread" | "orbit" | "crystalSpread" | "calm";

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

export interface CrystalSpreadSpec extends FlopBase {
  kind: "crystalSpread";
  /**
   * How far in from their slots the three begin, as a share of the gap between
   * slots. They crystallise close together and separate as they build.
   */
  converge: number;
  /** When the three have reached their places, as a fraction of the reveal. */
  spreadBy: number;
  /** How far out the shared field of fragments reaches. */
  reach: number;
  /** Which way the field swirls in. */
  dir: 1 | -1;
  phase: {
    /** Fractions of totalMs at which the first and last fragment seat. */
    firstLock: number;
    lastLock: number;
    /** Below 1: arrivals bunch up toward the end. */
    curve: number;
    /** How long a fragment is in the air, as a fraction of totalMs. */
    flightMin: number;
    flightSpan: number;
  };
}

export interface CalmFlopSpec extends FlopBase {
  kind: "calm";
}

export type FlopSpec = SpreadSpec | OrbitSpec | CrystalSpreadSpec | CalmFlopSpec;

/**
 * Spread — a dealer putting the flop out.
 *
 * The three arrive as one stack, land, then separate into their places while
 * turning over. The most poker-literal of the three and the one that should
 * feel tactile rather than clever.
 */
export function spread(seed: number): SpreadSpec {
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
export function orbit(seed: number): OrbitSpec {
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
 * Crystal Spread — the flop is built rather than delivered.
 *
 * The board is empty, then one field of fragments converges on it and divides
 * between three cards that are standing too close together. They construct and
 * separate at the same time, so the row opens out as it becomes legible, and
 * the last fragments cascade into all three at once.
 *
 * The crystallisation language is the turn and river's, but the event is the
 * flop's: one field, three cards, one completion. It is not the single-card
 * reveal played three times — that is precisely what it exists not to be.
 */
function crystalSpread(seed: number): CrystalSpreadSpec {
  return {
    kind: "crystalSpread",
    id: "flop-crystal",
    totalMs: 1420,
    seed,
    // Two thirds of the way in: close enough to read as one forming mass,
    // far enough apart that three cards are distinguishable from the start.
    converge: 0.62 + (seed % 4) * 0.03,
    spreadBy: 0.78,
    reach: 0.94 + (seed % 5) * 0.04,
    dir: seed % 2 === 0 ? 1 : -1,
    phase: {
      firstLock: 0.3,
      lastLock: 0.88,
      // Under 1, so the gaps shrink the whole way and the end is a cascade.
      curve: 0.66,
      flightMin: 0.17,
      flightSpan: 0.11,
    },
  };
}

/** A short staggered fade, for prefers-reduced-motion. */
function calmFlop(seed: number): CalmFlopSpec {
  return { kind: "calm", id: "flop-calm", totalMs: 560, seed };
}

export const FLOP_REVEALS: Array<(seed: number) => FlopSpec> = [spread, orbit, crystalSpread];

/** Chosen once, when the flop is dealt, and fixed for that whole reveal. */
export function pickFlop(reduced: boolean): FlopSpec {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  if (reduced) return calmFlop(seed);
  return FLOP_REVEALS[Math.floor(Math.random() * FLOP_REVEALS.length)](seed);
}
