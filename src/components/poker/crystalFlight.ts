/**
 * The choreography behind the crystallize reveal.
 *
 * Pure maths, no React and no DOM. It decides the order the card grows in,
 * when each shard locks, and where each one is at any moment. The component
 * drives it from one requestAnimationFrame loop and writes to refs, so a
 * reveal costs no React renders.
 *
 * Everything is in card coordinates — the 250 x 350 viewBox — which is what
 * lets a locked shard's transform be exactly the identity.
 */
import type { CrystallizeSpec } from "../../poker/reveals";
import type { Shard } from "./cardShards";

const CARD_CX = 125;
const CARD_CY = 175;

/** The table is far wider than it is tall; shards come in from that shape. */
const SPREAD_X = 2.1;
const SPREAD_Y = 0.78;
/** Base distance a shard travels before the spec's reach is applied. */
const RADIUS = 520;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInCubic = (t: number) => t * t * t;

export interface ShardFlight {
  /** Fractions of the whole reveal. */
  enter: number;
  lock: number;
  /** Cubic Bezier: entry point, two controls, then the shard's own centroid. */
  p0: [number, number];
  c1: [number, number];
  c2: [number, number];
  pivot: [number, number];
  /** Degrees it unwinds through on the way in. */
  spin: number;
  /** Depth: peak scale. Above 1 passes near the camera, below runs deep. */
  depth: number;
  /** Quarter-turns of simulated rotation about the vertical, as x-squash. */
  tumble: number;
  /** The last piece in, which gets a beat of its own. */
  hero: boolean;
}

/** How much of a shard's flight is spent drifting before it commits. */
const DRIFT = 0.55;
const DRIFT_SPAN = 0.46;
/** Overshoot past the slot before snapping back, in card units. */
const OVERSHOOT = 4;

/**
 * Plans the growth.
 *
 * Two seeds nucleate — one off-centre, one near the middle — and the card
 * fills outward from whichever is nearer. That is what makes it read as
 * something forming rather than as pieces arriving in a list. Lock times run
 * on a sub-linear curve, so the gaps between arrivals shrink the whole way
 * and the last third comes in as a cascade.
 */
export function planShards(shards: Shard[], spec: CrystallizeSpec): ShardFlight[] {
  const rnd = mulberry32(spec.seed);
  const { phase, reach } = spec;

  const seedA = shards[Math.floor(rnd() * shards.length)];
  // The second seed is the shard furthest from the first, so the two fronts
  // start apart and meet in the middle rather than growing as one blob.
  let seedB = shards[0];
  let far = -1;
  for (const s of shards) {
    const d = Math.hypot(s.cx - seedA.cx, s.cy - seedA.cy);
    if (d > far) {
      far = d;
      seedB = s;
    }
  }

  const cost = shards.map((s) => {
    const d = Math.min(
      Math.hypot(s.cx - seedA.cx, s.cy - seedA.cy),
      Math.hypot(s.cx - seedB.cx, s.cy - seedB.cy)
    );
    // A little noise so the front is ragged rather than a clean wavefront.
    return d * (0.82 + rnd() * 0.36);
  });
  const order = shards.map((_, i) => i).sort((a, b) => cost[a] - cost[b]);

  const flights = new Array<ShardFlight>(shards.length);
  const n = shards.length;

  order.forEach((shardIndex, rank) => {
    const u = n > 1 ? rank / (n - 1) : 1;
    const hero = rank === n - 1;

    // Sub-linear: early arrivals are spaced out, later ones bunch up.
    const lock =
      phase.firstLock + (phase.lastLock - phase.firstLock) * Math.pow(u, phase.curve);
    const s = shards[shardIndex];

    // Bigger pieces fly a little slower, which reads as weight.
    const travel = (phase.flightMin + rnd() * (phase.flightSpan + s.weight * 0.6)) * (hero ? 1.35 : 1);

    const a0 = rnd() * Math.PI * 2;
    const r0 = RADIUS * reach * (0.7 + rnd() * 0.6) * (hero ? 1.3 : 1);
    const p0: [number, number] = [
      CARD_CX + Math.cos(a0) * r0 * SPREAD_X,
      CARD_CY + Math.sin(a0) * r0 * SPREAD_Y,
    ];

    // One control out near the entry, one close in: a sweep, not a straight
    // run at the slot.
    const dir = rnd() < 0.5 ? 1 : -1;
    const a1 = a0 + dir * (0.5 + rnd() * 0.5);
    const c1: [number, number] = [
      CARD_CX + Math.cos(a1) * r0 * 0.72 * SPREAD_X,
      CARD_CY + Math.sin(a1) * r0 * 0.72 * SPREAD_Y,
    ];
    const a2 = a1 + dir * (0.35 + rnd() * 0.4);
    const c2: [number, number] = [
      CARD_CX + Math.cos(a2) * r0 * 0.22 * SPREAD_X,
      CARD_CY + Math.sin(a2) * r0 * 0.22 * SPREAD_Y,
    ];

    flights[shardIndex] = {
      enter: Math.max(0, lock - travel),
      lock,
      p0,
      c1,
      c2,
      pivot: [s.cx, s.cy],
      spin: dir * (55 + rnd() * 190) * (hero ? 1.6 : 1),
      depth: rnd() < 0.42 ? 1.25 + rnd() * 0.55 : 0.5 + rnd() * 0.35,
      tumble: 1 + Math.floor(rnd() * 2),
      hero,
    };
  });

  return flights;
}

function bezier(f: ShardFlight, u: number): [number, number] {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return [
    a * f.p0[0] + b * f.c1[0] + c * f.c2[0] + d * f.pivot[0],
    a * f.p0[1] + b * f.c1[1] + c * f.c2[1] + d * f.pivot[1],
  ];
}

const bell = (u: number) => Math.sin(Math.PI * clamp01(u)) ** 1.3;

/**
 * The lock: the shard runs a couple of pixels past its slot and is pulled
 * back, with a touch of compression as it seats. Mechanical, not springy —
 * one pass, no oscillation.
 */
const lockPush = (p: number) => (p < 0.84 ? 0 : Math.sin(((p - 0.84) / 0.16) * Math.PI));

export interface ShardFrame {
  transform: string;
  opacity: number;
}

/**
 * Where a shard is at time `t` (0..1 across the whole reveal), or null when it
 * should not be drawn at all — either it has not entered yet, or it has locked
 * and the assembled card now covers its area.
 */
export function shardFrame(f: ShardFlight, t: number): ShardFrame | null {
  if (t < f.enter || t >= f.lock) return null;

  let p = (t - f.enter) / (f.lock - f.enter);

  // The last piece hangs for a moment before it commits.
  if (f.hero) {
    const HOLD_FROM = 0.52;
    const HOLD_TO = 0.66;
    if (p > HOLD_FROM && p < HOLD_TO) p = HOLD_FROM;
    else if (p >= HOLD_TO) p = HOLD_FROM + (p - HOLD_TO) * ((1 - HOLD_FROM) / (1 - HOLD_TO));
  }

  const u =
    p < DRIFT
      ? DRIFT_SPAN * easeInOutSine(p / DRIFT)
      : DRIFT_SPAN + (1 - DRIFT_SPAN) * easeInCubic((p - DRIFT) / (1 - DRIFT));

  const [bx, by] = bezier(f, u);

  // The overshoot runs along the shard's last heading.
  const [ax, ay] = bezier(f, Math.min(1, u + 0.02));
  const dx = ax - bx;
  const dy = ay - by;
  const len = Math.hypot(dx, dy) || 1;
  const push = lockPush(p) * OVERSHOOT;

  const x = bx + (dx / len) * push;
  const y = by + (dy / len) * push;

  const scale = (1 + (f.depth - 1) * bell(u)) * (1 - 0.06 * lockPush(p));
  // Simulated rotation about the vertical: the piece turns edge-on and back.
  const squash = 1 - (1 - Math.abs(Math.cos(Math.PI * f.tumble * (1 - u)))) * (1 - u) * 0.85;
  const rotate = f.spin * (1 - u);

  const fade = clamp01(p / 0.12);
  const lit = 0.6 + 0.4 * clamp01((scale - 0.45) / 0.8);

  return {
    transform:
      `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotate.toFixed(2)}) ` +
      `scale(${(scale * squash).toFixed(4)} ${scale.toFixed(4)}) ` +
      `translate(${(-f.pivot[0]).toFixed(2)} ${(-f.pivot[1]).toFixed(2)})`,
    opacity: fade * lit,
  };
}

/**
 * The seam light: a shard's own outline glows for a moment as it seats, then
 * goes out. It is the only thing in the reveal that is not the card itself,
 * and it is gone well before the end.
 */
export function seamGlow(f: ShardFlight, t: number): number {
  const age = t - f.lock;
  if (age < 0 || age > 0.05) return 0;
  return 0.5 * (1 - age / 0.05);
}

/**
 * The completion pulse. Construction finishing, not a card driven through the
 * table — a short compression and recovery, nothing more.
 */
export function completionFrame(spec: CrystallizeSpec, t: number) {
  const hit = spec.impactAt;
  if (t < hit) return { scale: 1, flash: 0 };
  const p = clamp01((t - hit) / (1 - hit));
  // Compresses for a frame or two, then settles. Ends at exactly 1.
  const scale = p < 0.35 ? 1 - 0.018 * Math.sin((p / 0.35) * Math.PI) : 1;
  const flash = p < 0.45 ? 0.55 * (1 - p / 0.45) : 0;
  return { scale, flash };
}
