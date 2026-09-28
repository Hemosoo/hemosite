/**
 * Community-card reveal animations.
 *
 * A reveal is pure data: keyframes plus timings. The card it shows is decided
 * entirely by the engine — an animation never chooses or changes a card, it
 * only describes how the already-dealt one arrives. That separation is what
 * keeps a visual change from becoming a game-state bug.
 *
 * Three reveals exist. Slam hangs the card above the board and drives it
 * down. Assembly takes the card apart and flies its own pips, rank glyphs and
 * face art around the table before snapping them back together on impact.
 * Crystallize starts from nothing and builds the card out of shards of
 * itself. They share the fields the table itself reads — length, impact
 * moment, how far the room dims, the shake — so PokerTable does not care
 * which one is running.
 */

export type BigStreet = "turn" | "river";

interface RevealBase {
  id: string;
  /** Whole reveal, ms. Kept inside ~1.2-2.2s so it stays fun on repeat. */
  totalMs: number;
  /** Fraction of totalMs at which the card lands. Drives shake and particles. */
  impactAt: number;
  /** How far the rest of the UI dims while attention moves to the card. */
  dim: number;
  /** Table reaction at impact. */
  shake: { px: number; ms: number };
  /** Neighbouring board cards shove outward by this much, briefly. */
  nudgePx: number;
}

export interface SlamSpec extends RevealBase {
  kind: "slam";
  /** Outer transform: suspended above the board, then slammed down. */
  outer: {
    times: number[];
    scale: number[];
    y: number[];
    x: number[];
    rotate: number[];
  };
  /** Inner 3D flip. 180 = face down, 0 = face up. */
  flip: { times: number[]; rotateY: number[] };
}

export interface AssemblySpec extends RevealBase {
  kind: "assembly";
  /** Intensity dial: how far pieces travel, how hard the card lands. */
  reach: number;
  /** Fixed per reveal, so one playing never re-choreographs mid-flight. */
  seed: number;
  /** +1 clockwise, -1 counter-clockwise. */
  spinDir: 1 | -1;
  /**
   * When each wave enters and when locking begins, as fractions of totalMs.
   * Suit first, rank second, the rest last: the point is that you can guess
   * the card before it finishes arriving.
   */
  phase: { suitEnter: number; rankEnter: number; restEnter: number; lockFrom: number };
}

export interface CrystallizeSpec extends RevealBase {
  kind: "crystallize";
  /** Intensity dial: how far shards travel, how hard it completes. */
  reach: number;
  /** Fixed per reveal, so one playing never re-cuts the card mid-flight. */
  seed: number;
  phase: {
    /** Fractions of totalMs at which the first and last shard seat. */
    firstLock: number;
    lastLock: number;
    /** Below 1: arrivals bunch up towards the end. */
    curve: number;
    /** How long a shard is in the air, as a fraction of totalMs. */
    flightMin: number;
    flightSpan: number;
  };
}

export type RevealSpec = SlamSpec | AssemblySpec | CrystallizeSpec;

/**
 * Impact Smash — card hangs above the board, turns over, then slams down.
 *
 * The river runs the same shape with more of everything: longer suspense, a
 * bigger card, a harder landing. One builder, two intensities, so the two
 * streets can diverge without the code doing so.
 */
function impactSmash(street: BigStreet, seed: number): SlamSpec {
  void seed;
  const river = street === "river";
  const k = river ? 1.22 : 1; // one intensity dial
  /** How large the card hangs before it falls, and how far above the slot. */
  const hero = river ? 2.5 : 2.15;
  const lift = river ? -60 : -52;

  return {
    kind: "slam",
    id: "impact-smash",
    totalMs: river ? 1850 : 1520,
    impactAt: 0.72,
    dim: river ? 0.42 : 0.34,

    /**
     * The hero pose.
     *
     * It used to hang at 1.55 and slide down from 110px up — big, but not so
     * big that the drop meant much. It now comes in at better than twice the
     * card's size, which is where the drama is: the gap between what is
     * hanging there and the ordinary card left on the felt.
     *
     * The lift came down as the scale went up. A card this size at the old
     * height ran off the top of the frame, and the river, already the taller
     * pose, was the one that broke first.
     */
    outer: {
      //    focus      suspended        pre-drop    IMPACT   rebound  settled
      times: [0, 0.16, 0.42, 0.62, 0.68, 0.74, 0.82, 1],
      scale: [
        hero, hero * 0.94, hero * 0.88, hero * 0.85, hero * 0.74,
        // Squashes on contact for a frame or two, then recovers.
        0.94, 1.04, 1,
      ],
      y: [
        lift, lift * 0.95, lift * 0.89, lift * 0.86, lift * 0.56,
        // Overshoots past the resting line, then comes back to it.
        8, -4, 0,
      ],
      x: [18 * k, 10 * k, 5 * k, 3 * k, 2, 0, 0, 0],
      rotate: [-9 * k, -6 * k, -3.5 * k, -2.5 * k, -1.2, 0.8, -0.3, 0],
    },

    flip: {
      // Held face down through the suspense, turned over just before the drop.
      times: [0, 0.3, 0.44, 0.6, 1],
      rotateY: [180, 180, 96, 0, 0],
    },

    shake: { px: river ? 9 : 6.5, ms: river ? 320 : 260 },
    nudgePx: river ? 9 : 6.5,
  };
}

/**
 * Dismantle / Assembly — the card arrives as its own parts.
 *
 * Its pips, corner indices and face art fly in from around the table on
 * separate curved paths, hinting the suit before the rank and the rank before
 * the whole card, then converge and lock as the stock hits the felt. The
 * river version reaches further, lingers slightly longer and lands harder.
 *
 * Everything below is timing and intensity only. What the pieces are comes
 * from the card's own design, read out of the shared layout data.
 */
function dismantleAssembly(street: BigStreet, seed: number): AssemblySpec {
  const river = street === "river";
  const k = river ? 1.22 : 1;

  return {
    kind: "assembly",
    id: "dismantle-assembly",
    totalMs: river ? 2650 : 2300,
    // The last piece locks here, at the same frame the stock hits the felt.
    impactAt: river ? 0.935 : 0.93,
    dim: river ? 0.4 : 0.32,

    reach: k,
    seed,
    spinDir: seed % 2 === 0 ? 1 : -1,
    phase: river
      ? { suitEnter: 0.13, rankEnter: 0.3, restEnter: 0.37, lockFrom: 0.81 }
      : { suitEnter: 0.11, rankEnter: 0.28, restEnter: 0.34, lockFrom: 0.8 },

    shake: { px: river ? 9.5 : 7, ms: river ? 330 : 270 },
    nudgePx: river ? 9.5 : 7,
  };
}

/**
 * Crystallize — the card is built, not delivered.
 *
 * The slot is empty, then shards of the real card fly in from every direction
 * and seat permanently, a few at first and then in a cascade, until the card
 * exists. It is deliberately not the assembly reveal: nothing separates and
 * returns, and no element is ever shown on its own. The suit and rank become
 * readable only because the pieces carrying them have arrived.
 *
 * The river runs the same shape with more travel and a harder finish.
 */
function crystallize(street: BigStreet, seed: number): CrystallizeSpec {
  const river = street === "river";

  return {
    kind: "crystallize",
    id: "crystallize",
    totalMs: river ? 1850 : 1700,
    // The last shard seats here, and the pulse runs from it to the end.
    impactAt: river ? 0.88 : 0.87,
    dim: river ? 0.34 : 0.28,

    reach: river ? 1.13 : 1,
    seed,
    phase: {
      firstLock: river ? 0.25 : 0.24,
      lastLock: river ? 0.88 : 0.87,
      // Under 1, so the gaps shrink all the way to the cascade at the end.
      curve: river ? 0.58 : 0.62,
      flightMin: 0.16,
      flightSpan: 0.1,
    },

    // Lighter than the slam on purpose: this is a lock, not a landing.
    shake: { px: river ? 5 : 4, ms: river ? 230 : 200 },
    nudgePx: river ? 4.5 : 3.5,
  };
}

/** A gentle slide and flip, for prefers-reduced-motion. */
function calmReveal(street: BigStreet): SlamSpec {
  void street;
  return {
    kind: "slam",
    id: "calm",
    totalMs: 520,
    impactAt: 1,
    dim: 0,
    outer: {
      times: [0, 1],
      scale: [1, 1],
      y: [-18, 0],
      x: [0, 0],
      rotate: [0, 0],
    },
    flip: { times: [0, 0.55, 1], rotateY: [180, 90, 0] },
    shake: { px: 0, ms: 0 },
    nudgePx: 0,
  };
}

/** Everything the picker may choose from. */
export const REVEAL_ANIMATIONS: Array<(s: BigStreet, seed: number) => RevealSpec> = [
  impactSmash,
  dismantleAssembly,
  crystallize,
];

/**
 * Chooses once, at the moment the street turns, and the choice is then fixed
 * for that whole reveal — nothing re-rolls mid-animation.
 */
export function pickReveal(street: BigStreet, reduced: boolean): RevealSpec {
  if (reduced) return calmReveal(street);
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const build = REVEAL_ANIMATIONS[Math.floor(Math.random() * REVEAL_ANIMATIONS.length)];
  return build(street, seed);
}

/**
 * Dealer deal for the flop: three cards sliding in, not appearing.
 *
 * Each card gets its own offsets so the three don't move in lockstep — real
 * cards land with slight variation.
 */
export function dealSpec(index: number) {
  const jitter = [0, 1, 2].map((i) => Math.sin((index + 1) * (i + 3) * 2.7));
  return {
    /** Starts at the dealer's side of the table. */
    fromX: 300 + jitter[0] * 26,
    fromY: -120 + jitter[1] * 14,
    spin: -28 + jitter[2] * 16,
    /** 100-180ms between cards, so the three read as one action. */
    delayMs: index * 140,
    settleMs: 520 + jitter[0] * 55,
  };
}
