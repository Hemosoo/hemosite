/**
 * A timeline that is a pure function of elapsed time.
 *
 * Nothing is stored between frames, so a loop cannot drift or leave residue —
 * at phase 0 every value is its start value by construction, which is what
 * makes the reset invisible without an explicit "restore" step.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Local progress through [start, end], clamped outside it. */
export const span = (t: number, start: number, end: number) =>
  clamp01((t - start) / (end - start));

// Easing. Deliberately no bounce or elastic: paper has weight, not springiness.
export const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
export const power2InOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
export const power2Out = (x: number) => 1 - (1 - x) * (1 - x);
export const power3Out = (x: number) => 1 - Math.pow(1 - x, 3);
export const power3In = (x: number) => x * x * x;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eased interpolation over a window of the timeline. */
export const seg = (
  t: number,
  start: number,
  end: number,
  from: number,
  to: number,
  ease: (x: number) => number = sineInOut
) => mix(from, to, ease(span(t, start, end)));

/**
 * Cue sheet, in seconds.
 *
 * The extraction stages end before FOLD_START, and every fold is driven
 * through `seg`, which clamps to 0 below its window — so no pivot can move
 * while the card is still leaving the deck. That was the old bug: `crease`
 * opened at 2.4s while `lift` ran to 2.5s, so the card creased itself on the
 * stack.
 */
export const CUE = {
  rest: [0.0, 0.08],
  /** Straight off the stack, dead flat. */
  lift: [0.08, 1.23],
  /** Out into clear space, then a beat to settle. */
  drift: [1.23, 1.88],

  // Folding. Nothing above this point touches a pivot.
  crease: [1.98, 2.36],
  /** The single nose fold; given the time the two folds used to share. */
  nose1: [2.36, 3.16],
  /**
   * The body fold and the wing fold deliberately overlap.
   *
   * Run in sequence, the halves reach 77 degrees with the wings still flat,
   * so the wings point straight up and sit there: measured peak 1.24 above
   * the card plane, held for ~0.6s. That is the "explosive" swing. Starting
   * the wings 18% into the body fold lets them counter-rotate as the body
   * closes, so the wings stay near level and only the keel drops — peak 0.65,
   * and they still finish last, which keeps a readable wing beat.
   */
  half: [3.46, 4.31],
  wings: [3.61, 4.46],

  /**
   * Finished plane. 0.75s -> 0.25s -> 0.16s. Long enough to register the
   * shape, short enough that it never reads as a pause; the hover keeps it
   * alive and takeoff picks the motion straight up.
   */
  hero: [4.46, 4.62],
  /**
   * Takeoff. Not a pose blend: physics starts here with almost no speed and
   * ramps speed, steering and orientation rate in over 0.8s, so there is no
   * frame where anything switches on.
   */
  takeoff: [4.62, 5.42],
  /** Chasing the cursor. Length comes from FLIGHT_CONFIG. */
  flight: [5.42, 12.42],
  /** Heading off-frame, then fading once it is mostly gone. */
  exit: [12.42, 14.42],
  reset: [14.42, 14.79],
} as const;

/** No fold value may be non-zero before this. */
export const FOLD_START = CUE.crease[0];

export const LOOP_SECONDS = CUE.reset[1];
