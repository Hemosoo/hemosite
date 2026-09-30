/**
 * The motion primitives the reveals are built from.
 *
 * Pure maths, no React, no DOM and no knowledge of poker. The reveals in the
 * game and the scroll-driven hand on the front page both compose these, which
 * is what makes the two feel like one piece of work rather than two that
 * happen to involve cards.
 *
 * Everything here takes progress 0..1 and returns numbers. Nothing here knows
 * what is being animated or what drives the clock — a timer in the game, the
 * scrollbar on the front page.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Local progress inside a window of a longer timeline. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeInCubic = (t: number) => t * t * t;
/** Rises and falls over 0..1. For anything that swings out and comes back. */
export const swing = (t: number) => Math.sin(Math.PI * clamp01(t));

/**
 * A cubic bezier easing, the same curve CSS and framer-motion mean by four
 * numbers. Solved by bisection rather than Newton: a couple of dozen halvings
 * is exact to well under a pixel and cannot diverge, and this is called a
 * handful of times a frame, not thousands.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (curve(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return curve(y1, y2, (lo + hi) / 2);
  };
}

/**
 * Reads a keyframe track — the `times` and values arrays a spec is written in
 * — at an arbitrary point.
 *
 * The game hands those arrays to framer-motion, which owns the clock. Nothing
 * owns the clock on a scrolling page, so the same numbers have to be readable
 * at whatever progress the scrollbar happens to be at. This is that reader,
 * which is why the slam on the front page is the slam from the game rather
 * than a second set of numbers that look similar.
 */
export function sampleTrack(
  times: number[],
  values: number[],
  t: number,
  ease: (u: number) => number = easeInOutSine
): number {
  const n = Math.min(times.length, values.length);
  if (n === 0) return 0;
  if (t <= times[0]) return values[0];
  if (t >= times[n - 1]) return values[n - 1];
  for (let i = 1; i < n; i++) {
    if (t <= times[i]) {
      const span = times[i] - times[i - 1];
      const u = span > 0 ? (t - times[i - 1]) / span : 1;
      return mix(values[i - 1], values[i], ease(u));
    }
  }
  return values[n - 1];
}

/**
 * A quadratic bezier, and the point a hair further along it.
 *
 * The second is what lets a card be oriented along the direction it is
 * actually travelling rather than along a straight line to its destination.
 */
export function quadAt(
  p0: [number, number],
  c: [number, number],
  p1: [number, number],
  u: number
): [number, number] {
  const v = 1 - u;
  return [
    v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0],
    v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1],
  ];
}

/** A cubic bezier through two controls. */
export function cubicAt(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p1: [number, number],
  u: number
): [number, number] {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1],
  ];
}

/**
 * One point on a turning ellipse, with the tangent there.
 *
 * The formation every coordinated flight in this project is built on: cards
 * hold evenly spaced places on a shared ring so they read as one system, and
 * leave it along the heading they were already travelling, which is what the
 * tangent is for. Wider than it is tall, because a table is.
 */
export function ringPoint(
  angleDeg: number,
  rx: number,
  ry: number
): { x: number; y: number; depth: number; tx: number; ty: number } {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(a) * rx,
    y: Math.sin(a) * ry,
    /** +1 nearest the eye, -1 deepest. */
    depth: Math.sin(a),
    tx: -Math.sin(a) * rx,
    ty: Math.cos(a) * ry,
  };
}

/**
 * Leaving a formation without turning a corner.
 *
 * The first control lies along the tangent the card is already travelling, so
 * position and heading are continuous across the moment it breaks away. It is
 * the difference between peeling out of formation and stopping to go
 * somewhere else, and it is the one thing that makes a flight of cards look
 * flown rather than tweened.
 */
export function peelFrom(
  from: { x: number; y: number; tx: number; ty: number },
  to: [number, number],
  e: number,
  kick: number,
  lift: number
): [number, number] {
  const len = Math.hypot(from.tx, from.ty) || 1;
  const c1: [number, number] = [from.x + (from.tx / len) * kick, from.y + (from.ty / len) * kick];
  const c2: [number, number] = [mix(from.x, to[0], 0.72), mix(from.y, to[1], 0.72) - lift];
  return cubicAt([from.x, from.y], c1, c2, to, e);
}

/** Deterministic noise, so one playing always choreographs the same way. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bends one timeline onto another through a few matched points.
 *
 * A reveal written against a clock spends its time where the drama is: a slam
 * hangs for most of its length and falls in a fraction of it, which is right,
 * because the fall being fast is the whole idea. On a scrolling page the
 * reader owns the clock, and a beat that takes seven per cent of the timeline
 * takes seven per cent of the scroll — a few dozen pixels, crossed in one
 * flick of a wheel and never seen. This gives that beat room without
 * rewriting the numbers that describe it: the same curve, read more slowly
 * where it matters and more quickly where it does not.
 */
export function remap(u: number, from: number[], to: number[]): number {
  const n = Math.min(from.length, to.length);
  if (u <= from[0]) return to[0];
  if (u >= from[n - 1]) return to[n - 1];
  for (let i = 1; i < n; i++) {
    if (u <= from[i]) {
      const span = from[i] - from[i - 1];
      return mix(to[i - 1], to[i], span > 0 ? (u - from[i - 1]) / span : 1);
    }
  }
  return to[n - 1];
}
