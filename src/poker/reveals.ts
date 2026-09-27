/**
 * Community-card reveal animations.
 *
 * A reveal is pure data: keyframes plus timings. The card it shows is decided
 * entirely by the engine — an animation never chooses or changes a card, it
 * only describes how the already-dealt one arrives. That separation is what
 * keeps a visual change from becoming a game-state bug.
 *
 * Adding one of the planned reveals later means writing another builder and
 * putting it in REVEAL_ANIMATIONS; nothing else changes.
 */

export type BigStreet = "turn" | "river";

export interface RevealSpec {
  id: string;
  /** Whole reveal, ms. Kept inside ~1.2-2.0s so it stays fun on repeat. */
  totalMs: number;
  /** Fraction of totalMs at which the card lands. Drives shake and particles. */
  impactAt: number;
  /** How far the rest of the UI dims while attention moves to the card. */
  dim: number;
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
  /** Table reaction at impact. */
  shake: { px: number; ms: number };
  /** Neighbouring board cards shove outward by this much, briefly. */
  nudgePx: number;
}

/**
 * Impact Smash — card hangs above the board, turns over, then slams down.
 *
 * The river runs the same shape with more of everything: longer suspense, a
 * bigger card, a harder landing. One builder, two intensities, so the two
 * streets can diverge without the code doing so.
 */
function impactSmash(street: BigStreet): RevealSpec {
  const river = street === "river";
  const k = river ? 1.22 : 1; // one intensity dial

  return {
    id: "impact-smash",
    totalMs: river ? 1850 : 1520,
    impactAt: 0.72,
    dim: river ? 0.42 : 0.34,

    outer: {
      //    focus      suspended        pre-drop    IMPACT   rebound  settled
      times: [0, 0.16, 0.42, 0.62, 0.68, 0.74, 0.82, 1],
      scale: [
        1.55 * k, 1.42 * k, 1.36 * k, 1.34 * k, 1.3 * k,
        // Squashes on contact for a frame or two, then recovers.
        0.94, 1.04, 1,
      ],
      y: [
        -110 * k, -96 * k, -88 * k, -84 * k, -58 * k,
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

/** A gentle slide and flip, for prefers-reduced-motion. */
function calmReveal(street: BigStreet): RevealSpec {
  void street;
  return {
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

/** Everything the picker may choose from. Three more are planned. */
export const REVEAL_ANIMATIONS: Array<(s: BigStreet) => RevealSpec> = [
  impactSmash,
  // cinematicSlow,
  // cardThrow,
  // glitchResolve,
];

export function pickReveal(street: BigStreet, reduced: boolean): RevealSpec {
  if (reduced) return calmReveal(street);
  const build = REVEAL_ANIMATIONS[Math.floor(Math.random() * REVEAL_ANIMATIONS.length)];
  return build(street);
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
