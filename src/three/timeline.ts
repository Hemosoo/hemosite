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
 * Cue sheet, in seconds. Total 11.4s: cinematic rather than rushed, and the
 * reset happens while the plane is far outside the frustum.
 */
export const CUE = {
  rest: [0.0, 0.9],
  lift: [0.9, 2.5],
  crease: [2.4, 3.1],
  nose1: [3.05, 4.0],
  nose2: [3.9, 4.85],
  half: [4.8, 5.65],
  wings: [5.5, 6.4],
  trim: [6.3, 6.9],
  launch: [6.8, 7.4],
  flight: [7.2, 10.5],
  reset: [10.5, 11.4],
} as const;

export const LOOP_SECONDS = CUE.reset[1];
