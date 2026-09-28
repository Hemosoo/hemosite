/**
 * The choreography behind the three flop reveals.
 *
 * Pure maths: given the spec, which of the three cards, and where we are in
 * the reveal, it returns that card's offset from the slot it will end in.
 * Every path ends at the identity — no offset, no rotation, face up — so the
 * handover to the ordinary board card is exact.
 *
 * Distances are in card widths, so the same numbers work at every viewport
 * size; the component multiplies by the measured width. `pitch` is the
 * distance between neighbouring slots in those units, which is what lets the
 * three stack on one slot without hard-coding the gap.
 */
import type { FlopSpec } from "../../poker/flopReveals";

export interface FlopFrame {
  /** Offset from the card's own slot, in card widths. */
  x: number;
  y: number;
  scale: number;
  /** In-plane rotation, degrees. */
  rotate: number;
  /** 180 is face down, 0 face up. */
  flip: number;
  opacity: number;
  /** Rough depth, 0..1. Only used for stacking order. */
  depth: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Local progress inside a window of the reveal. */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Rises and falls over 0..1. For rotations that swing out and come back. */
const swing = (t: number) => Math.sin(Math.PI * clamp01(t));

const AT_REST: FlopFrame = { x: 0, y: 0, scale: 1, rotate: 0, flip: 0, opacity: 1, depth: 0.5 };

/**
 * Everything is at rest by here, not at the end.
 *
 * The reveal unmounts on its last frame and the ordinary board cards take
 * over, so motion that is still running at t=1 hands over mid-stride: the
 * first cut of this was still 2.5px out of its slot when it swapped, which
 * shows as a jump. Each style's settle is written to finish by this point and
 * the guard below makes it true whatever the curve does.
 */
const SETTLED = 0.95;

/**
 * A flip that runs over its own window and is face up thereafter. Kept as one
 * helper so all three reveals turn a card over the same way.
 */
function flipAt(t: number, start: number, length: number) {
  const p = seg(t, start, start + length);
  return 180 * (1 - easeInOutSine(p));
}

/**
 * Spread: a stack arrives, lands, and separates.
 *
 * The three sit on the middle slot while stacked, which is why every offset
 * here is measured against `pitch` — card 0 has to travel a slot to the right
 * to join the stack, and a slot back to leave it.
 */
function spreadFrame(spec: Extract<FlopSpec, { kind: "spread" }>, i: number, t: number, pitch: number): FlopFrame {
  const stackX = (1 - i) * pitch;
  // A stack is not perfectly square: each card sits a hair off the one below.
  const fan = (i - 1) * 0.9 + spec.from * 0.4;
  const nudge = i * 0.012;

  const enter = seg(t, 0, 0.26);
  const land = seg(t, 0.26, 0.36);
  const open = seg(t, 0.36, 0.84);
  const settle = seg(t, 0.84, SETTLED);

  // In from the side, a little above the felt.
  const fromX = stackX + spec.from * 3.5;
  const fromY = -1.45;

  const eo = easeOutCubic(enter);
  let x = mix(fromX, stackX + nudge, eo);
  let y = mix(fromY, nudge, eo);
  let rotate = mix(spec.from * -7, fan, eo);
  // Placed, not dropped: a touch of compression and nothing more.
  let scale = mix(0.9, 1, eo) - 0.02 * swing(land);

  if (open > 0) {
    const e = easeInOutSine(open);
    x = mix(stackX + nudge, 0, e);
    y = mix(nudge, 0, e);
    // Cants outward as it travels and comes back level as it arrives.
    rotate = mix(fan, 0, e) + (i - 1) * spec.tilt * swing(open);
    scale = 1;
  }
  if (settle > 0) {
    // A pixel or so past the slot, then back.
    x += (i - 1) * 0.045 * swing(settle);
    scale = 1;
  }

  return {
    x,
    y,
    scale,
    rotate,
    flip: flipAt(t, 0.4 + i * 0.075, 0.24),
    opacity: clamp01(enter / 0.15),
    // Top of the stack first, so the one that leaves first is the one on top.
    depth: 0.5 + (2 - i) * 0.1,
  };
}

/**
 * Orbit: converge, sweep round a shared centre, break formation.
 *
 * The three keep 120 degrees of separation the whole way round, so they read
 * as one system rather than three cards that happen to be circling.
 */
function orbitFrame(spec: Extract<FlopSpec, { kind: "orbit" }>, i: number, t: number, pitch: number): FlopFrame {
  const cx = (1 - i) * pitch;
  const cy = -1.25;
  const rad = (d: number) => (d * Math.PI) / 180;

  const start = 90 + i * 120;
  const at = (deg: number) => {
    const a = rad(deg);
    // Wider than tall: the orbit lies in the table's plane, not the screen's.
    return { x: cx + Math.cos(a) * spec.radius * 1.3, y: cy + Math.sin(a) * spec.radius * 0.6, s: Math.sin(a) };
  };

  const enter = seg(t, 0, 0.22);
  const round = seg(t, 0.22, 0.6);
  const peel = seg(t, 0.6, 0.88);
  const settle = seg(t, 0.88, SETTLED);

  const deg = start + spec.dir * spec.sweep * easeInOutSine(round);
  const here = at(deg);

  let x: number;
  let y: number;
  let scale: number;

  if (enter < 1) {
    // In from far out along its own spoke, but flatter than it is wide: the
    // table has room to the sides and almost none above. A spoke scaled
    // equally in both put a card 84px off the top of the frame on some seeds.
    const far = at(start);
    const e = easeOutCubic(enter);
    x = mix(cx + (far.x - cx) * 3.2, here.x, e);
    y = mix(cy + (far.y - cy) * 1.5, here.y, e);
    scale = mix(0.78, 1 + 0.16 * here.s, e);
  } else {
    x = here.x;
    y = here.y;
    // One passes near the eye, one runs deep, one stays on the plane.
    scale = 1 + 0.16 * here.s;
  }

  if (peel > 0) {
    // Out of the orbit on a curve rather than a straight run at the slot.
    const e = easeOutQuint(peel);
    const exit = at(deg);
    const ctrlX = exit.x * 0.45 + (i - 1) * 0.5;
    const ctrlY = exit.y * 0.5 - 0.35;
    const v = 1 - e;
    x = v * v * exit.x + 2 * v * e * ctrlX;
    y = v * v * exit.y + 2 * v * e * ctrlY;
    scale = mix(1 + 0.16 * exit.s, 1, e);
  }
  if (settle > 0) {
    x += (i - 1) * 0.035 * swing(settle);
    scale = 1;
  }

  const spin = spec.dir * 14 * swing(clamp01((t - 0.15) / 0.6));

  return {
    x,
    y,
    scale,
    rotate: peel > 0 ? spin * (1 - easeOutQuint(peel)) : spin,
    // Turned over at the strongest part of the sweep, not after it.
    flip: flipAt(t, 0.3 + i * 0.07, 0.22),
    opacity: clamp01(enter / 0.12),
    depth: 0.5 + here.s * 0.4,
  };
}

/**
 * Chain: each landing sets off the next.
 *
 * The three windows abut rather than overlap, which is what makes it read as
 * cause and effect. Each card is a little faster and comes from a little
 * further than the one before, so the rhythm builds.
 */
function chainFrame(spec: Extract<FlopSpec, { kind: "chain" }>, i: number, t: number, pitch: number): FlopFrame {
  void pitch;
  const begin = [0.02, 0.3, 0.58][i];
  const end = [0.32, 0.6, 0.88][i];
  const travel = seg(t, begin, end);
  const energy = 1 + i * 0.22;

  // Later cards come from further out and arrive harder.
  const fromX = spec.lean * (2.9 + i * 0.5);
  const fromY = -1 - i * 0.28;
  const e = i === 2 ? easeOutQuint(travel) : easeOutCubic(travel);

  let x = mix(fromX, 0, e);
  let y = mix(fromY, 0, e);
  let rotate = mix(spec.lean * -9 * energy, 0, e);
  let scale = mix(0.88, 1, e);

  // The beat on landing: a short compression, stronger for each card.
  const hit = seg(t, end, end + 0.05);
  if (travel >= 1) scale = 1 - 0.015 * energy * swing(hit);

  // The row locks together as the third seats.
  const lock = seg(t, 0.86, SETTLED);
  if (lock > 0) {
    y += 0.01 * swing(lock);
    x = 0;
    rotate = 0;
  }

  return {
    x,
    y,
    scale,
    rotate,
    // Turned over in flight, so each one adds to the board as it arrives.
    flip: flipAt(t, begin + 0.1, 0.16),
    opacity: clamp01(seg(t, begin, begin + 0.06)),
    depth: 0.5 + i * 0.05,
  };
}

/** Reduced motion: a short stagger, a little travel, no flight. */
function calmFrame(i: number, t: number): FlopFrame {
  const p = seg(t, i * 0.14, i * 0.14 + 0.5);
  const e = easeOutCubic(p);
  return { x: 0, y: mix(-0.12, 0, e), scale: 1, rotate: 0, flip: 0, opacity: e, depth: 0.5 };
}

export function flopFrame(spec: FlopSpec, i: number, t: number, pitch: number): FlopFrame {
  if (t >= SETTLED) return AT_REST;
  switch (spec.kind) {
    case "spread":
      return spreadFrame(spec, i, t, pitch);
    case "orbit":
      return orbitFrame(spec, i, t, pitch);
    case "chain":
      return chainFrame(spec, i, t, pitch);
    default:
      return calmFrame(i, t);
  }
}
