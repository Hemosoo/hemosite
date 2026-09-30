/**
 * The choreography behind the initial deal.
 *
 * Pure maths: given the spec, which card, and where we are in the deal, it
 * returns that card's position in frame pixels. No React, no DOM, nothing
 * measured — the component hands in the geometry it measured once and drives
 * this from a single requestAnimationFrame loop.
 *
 * The one rule the whole file is written around is continuity. A card is never
 * handed from one animation to another: it launches out of the deck onto the
 * ellipse, it turns with the ellipse, and it leaves the ellipse along the
 * tangent it was already travelling. Position, scale and rotation are the same
 * value either side of every boundary, so nothing anywhere ever restarts.
 */
import type { DealSpec, OrbitDealSpec } from "../../poker/dealReveals";

export interface Point {
  x: number;
  y: number;
}

export interface DealTarget {
  /** Centre of the seat's card slot, in the overlay's coordinates. */
  at: Point;
  /** Card box, so the flying copy matches the slot it lands in. */
  width: number;
  height: number;
  /** Order round the table from the dealer: decides when this card is dealt. */
  order: number;
  /** Which of the player's two cards. */
  which: 0 | 1;
  /** Yours pass nearer the eye and turn over as they arrive. */
  hero: boolean;
}

export interface DealFrame {
  x: number;
  y: number;
  scale: number;
  /** In-plane rotation, degrees. */
  rotate: number;
  /** Out-of-plane lean, degrees. Small: this is a card, not a coin. */
  tiltX: number;
  tiltY: number;
  /** 180 face down, 0 face up. */
  flip: number;
  opacity: number;
  /** Stacking order, from how near the eye it is passing. */
  depth: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const swing = (t: number) => Math.sin(Math.PI * clamp01(t));
const rad = (d: number) => (d * Math.PI) / 180;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The beats. They overlap on purpose: nothing here waits for anything. */
const BEAT = {
  /** The deck settles itself before it gives anything up. */
  wake: [0, 0.11] as const,
  /** First and last card off the deck. */
  launchFrom: 0.08,
  launchSpan: 0.19,
  /** How long a card takes to get from the deck onto the ellipse. */
  join: 0.2,
  /** First card of each wave leaves the formation here. */
  waveOne: 0.44,
  waveTwo: 0.6,
  /** Gap between neighbouring seats within a wave. */
  seatGap: 0.026,
  /** Formation to seat. */
  land: 0.2,
} as const;

/** The deck's own small anticipation, and its fade once it is spent. */
export function deckFrame(spec: DealSpec, t: number) {
  if (spec.kind === "calm") {
    return { lift: 0, squash: 1, tilt: 0, opacity: 1 - clamp01(seg(t, 0.45, 0.8)) };
  }
  const wake = seg(t, ...BEAT.wake);
  // Compresses, then lifts as it starts throwing. Nothing more: the deck is a
  // hint that cards are about to exist, not an event of its own.
  return {
    lift: -6 * swing(wake) - 3 * swing(seg(t, 0.1, 0.34)),
    squash: 1 - 0.05 * swing(wake),
    tilt: -2.4 * swing(seg(t, 0.04, 0.4)),
    opacity: clamp01(seg(t, 0, 0.06)) * (1 - clamp01(seg(t, 0.52, 0.72))),
  };
}

/** The order cards come off the deck: first card to everyone, then second. */
function launchRank(target: DealTarget, seats: number) {
  return target.which * seats + target.order;
}

/** When this card leaves the formation, and when it is home. */
function window_(target: DealTarget) {
  const leave = (target.which === 0 ? BEAT.waveOne : BEAT.waveTwo) + target.order * BEAT.seatGap;
  return { leave, land: leave + BEAT.land };
}

/**
 * The shared formation: one ellipse about the table's middle, turning.
 *
 * Every card holds its own place on it, evenly spaced, so the set reads as one
 * system rather than as a dozen tweens that happen to overlap. `k` is the
 * card's slot, `n` how many there are.
 */
function ring(spec: OrbitDealSpec, k: number, n: number, t: number, w: number, h: number) {
  const turn = easeInOutSine(clamp01(t / 0.9));
  const deg = spec.phase + (k / n) * 360 + spec.dir * spec.sweep * turn;
  const a = rad(deg);
  const rx = (w / 2) * spec.radiusX;
  const ry = (h / 2) * spec.radiusY;
  return {
    x: Math.cos(a) * rx,
    y: Math.sin(a) * ry,
    /** Depth: +1 nearest the eye, -1 deepest. */
    s: Math.sin(a),
    /** Unit tangent, for leaving along the heading already being travelled. */
    tx: -Math.sin(a) * rx,
    ty: Math.cos(a) * ry,
  };
}

/**
 * Where a card is at time `t`.
 *
 * `deck` and the target are in the overlay's coordinates, with the origin at
 * the table's middle, which is also the centre of the orbit.
 */
export function dealFrame(
  spec: DealSpec,
  target: DealTarget,
  index: number,
  seats: number,
  count: number,
  t: number,
  deck: Point,
  w: number,
  h: number
): DealFrame {
  if (spec.kind === "calm") return calmFrame(target, seats, t, deck);

  const rnd = mulberry32((spec.seed ^ ((index + 1) * 0x9e3779b9)) >>> 0);
  const jitter = rnd();
  const spinDir = rnd() < 0.5 ? 1 : -1;

  const rank = launchRank(target, seats);
  const launch = BEAT.launchFrom + (rank / Math.max(1, count - 1)) * BEAT.launchSpan + jitter * 0.012;
  const { leave, land } = window_(target);

  // The card's own place in the formation, which it keeps from the moment it
  // arrives until the moment it leaves.
  const slot = ring(spec, rank, count, t, w, h);
  const joined = easeOutCubic(seg(t, launch, launch + BEAT.join));

  // Out of the deck and onto the ellipse. The approach bows outward rather
  // than running straight, and each card takes a slightly different line.
  const bow = (0.5 + jitter) * 0.5;
  const ctrlX = mix(deck.x, slot.x, 0.5) + slot.tx * bow * 0.35;
  const ctrlY = mix(deck.y, slot.y, 0.5) + slot.ty * bow * 0.35 - h * 0.05;
  const v = 1 - joined;
  let x = v * v * deck.x + 2 * v * joined * ctrlX + joined * joined * slot.x;
  let y = v * v * deck.y + 2 * v * joined * ctrlY + joined * joined * slot.y;

  // Depth: a card on the near side of the ring passes larger, one on the far
  // side smaller. Yours passes a little nearer still.
  const ringScale = (1 + slot.s * 0.13) * (target.hero ? 1.06 : 1);
  let scale = mix(0.82, ringScale, joined);
  let depth = slot.s;

  // Rotation unwinds toward level as the card settles into the formation, and
  // again as it lands. It is never set from anywhere: it is always a mix.
  // Restrained: a card turning through a whole revolution reads as a prop in
  // a trick rather than a card being dealt. Eighty degrees is the ceiling.
  const spinIn = spinDir * (22 + jitter * 38);
  let rotate = mix(spinIn * 1.35, spinIn * (1 - 0.55 * joined), joined);
  let tiltX = mix(14 * spinDir, 7 * slot.s, joined);
  let tiltY = mix(-18 * spinDir, -9 * spinDir * (1 - joined * 0.5), joined);

  const out = seg(t, leave, land);
  if (out > 0) {
    // Leaving formation: a cubic whose first control lies along the tangent
    // the card is already travelling, so it curves away rather than turning a
    // corner. That is the whole difference between peeling out and stopping.
    const e = easeOutCubic(out);
    const len = Math.hypot(slot.tx, slot.ty) || 1;
    const c1x = slot.x + (slot.tx / len) * spec.dir * w * 0.09;
    const c1y = slot.y + (slot.ty / len) * spec.dir * h * 0.09;
    const c2x = mix(slot.x, target.at.x, 0.72);
    const c2y = mix(slot.y, target.at.y, 0.72) - h * 0.03;
    const u = 1 - e;
    x =
      u * u * u * slot.x + 3 * u * u * e * c1x + 3 * u * e * e * c2x + e * e * e * target.at.x;
    y =
      u * u * u * slot.y + 3 * u * u * e * c1y + 3 * u * e * e * c2y + e * e * e * target.at.y;

    // Ends at exactly 1: the flying copy and the real card are the same size
    // at the handover, or the swap shows.
    scale = mix(ringScale, 1, e);
    rotate = mix(spinIn * (1 - 0.55), 0, e);
    tiltX = mix(7 * slot.s, 0, e);
    tiltY = mix(-9 * spinDir * 0.5, 0, e);
    depth = mix(slot.s, 1, e);

    // A pixel or two past the slot and back, and a hair of compression: the
    // card is set down, not parked.
    const settle = seg(t, land, land + 0.05);
    if (settle > 0) {
      const nudge = swing(settle);
      x += (target.at.x - slot.x > 0 ? 1 : -1) * 1.6 * nudge;
      y += 1.2 * nudge;
      scale = 1 + 0.012 * nudge;
    }
  }

  // A guard, not a shape. The curves are written to stay on the table, but a
  // narrow window puts the side seats close enough to the edge that the arc
  // out of formation can clip a card's corner off the frame; eight pixels on a
  // phone, and nothing at all on anything larger. Held inside by its own
  // half-width, which is a pixel a frame where it engages and invisible.
  // The box always contains the card's own destination, so a seat that sits
  // close to the edge is still landed on exactly. A guard that moved a card
  // off its slot would be worse than the overflow it was guarding against.
  const hw = (target.width * scale) / 2 + 4;
  const hh = (target.height * scale) / 2 + 4;
  x = Math.min(Math.max(x, Math.min(-(w / 2) + hw, target.at.x)), Math.max(w / 2 - hw, target.at.x));
  y = Math.min(
    Math.max(y, Math.min(-(h * 0.44) + hh, target.at.y)),
    Math.max(h * 0.56 - hh, target.at.y)
  );

  return {
    x,
    y,
    scale,
    rotate,
    tiltX,
    tiltY,
    // Face down the whole way. Yours turns over as it arrives, so it is
    // already face up when the real card takes over and nothing swaps.
    flip: target.hero ? 180 * (1 - easeInOutSine(seg(t, leave + BEAT.land * 0.45, land + 0.03))) : 180,
    opacity: clamp01(seg(t, launch - 0.015, launch + 0.02)),
    depth,
  };
}

/** Reduced motion: out of the deck, to the seat, in order. No formation. */
function calmFrame(target: DealTarget, seats: number, t: number, deck: Point): DealFrame {
  const rank = launchRank(target, seats);
  const start = 0.05 + rank * 0.035;
  const e = easeOutCubic(seg(t, start, start + 0.4));
  return {
    x: mix(deck.x, target.at.x, e),
    y: mix(deck.y, target.at.y, e),
    scale: 1,
    rotate: 0,
    tiltX: 0,
    tiltY: 0,
    flip: target.hero ? 180 * (1 - clamp01(seg(t, start + 0.3, start + 0.42))) : 180,
    opacity: clamp01(seg(t, start - 0.01, start + 0.02)),
    depth: 0,
  };
}

/** True once every card is home, whatever the style. */
export function dealSettled(spec: DealSpec, targets: DealTarget[], t: number) {
  if (spec.kind === "calm") return t >= 0.98;
  return targets.every((tg) => t >= window_(tg).land + 0.05);
}
