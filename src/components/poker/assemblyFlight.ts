/**
 * The choreography behind the assembly reveal.
 *
 * Pure maths, no React and no DOM: given the card's pieces and the spec, it
 * plans one curved path per piece and can then be asked, for any moment, what
 * transform that piece should carry. The component drives it from a single
 * requestAnimationFrame loop and writes straight to refs, so a reveal costs
 * no React renders at all.
 *
 * Everything is in card coordinates — the 250 x 350 viewBox — which is what
 * lets a piece's resting state be the identity transform.
 */
import type { AssemblySpec } from "../../poker/reveals";
import type { CardPart } from "./cardParts";

const CARD_CX = 125;
const CARD_CY = 175;

/**
 * The table is much wider than it is tall, so flight paths are stretched to
 * match. Kept in card units: 250 of them is one card width.
 */
const SPREAD_X = 1.95;
const SPREAD_Y = 0.72;
/** Base orbit radius before the spec's reach is applied. */
const RADIUS = 640;

/** Deterministic noise, so one reveal always choreographs the same way. */
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
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Linear keyframes with a soft ease between stops. */
export function track(t: number, times: number[], values: number[]): number {
  if (t <= times[0]) return values[0];
  const last = times.length - 1;
  if (t >= times[last]) return values[last];
  let i = 0;
  while (i < last && t > times[i + 1]) i++;
  const span = times[i + 1] - times[i] || 1;
  return values[i] + (values[i + 1] - values[i]) * easeInOutSine((t - times[i]) / span);
}

export interface Flight {
  /** When the piece appears, and when it is locked down, as fractions of 1. */
  enter: number;
  lock: number;
  /** Cubic Bezier: entry point, two controls, then the piece's own pivot. */
  p0: [number, number];
  c1: [number, number];
  c2: [number, number];
  pivot: [number, number];
  /** Degrees it unwinds through on the way in. */
  spin: number;
  /** Scale at the middle of the flight: over 1 passes near the camera. */
  peak: number;
  /** Unit vector of the final approach, for the overshoot on lock. */
  dir: [number, number];
}

/** How much of a piece's flight is spent drifting before it commits. */
const DRIFT = 0.6;
/** Distance covered during the drift, of the whole path. */
const DRIFT_SPAN = 0.52;
/** Overshoot past the target before snapping back, in card units. */
const OVERSHOOT = 5;

/**
 * Plans every piece's path.
 *
 * Waves enter at different times, pieces leave from spread-out points around
 * the table rather than from one source, and locks are ordered from the edges
 * of the card inward so the centre completes last — on the frame the stock
 * hits the felt.
 */
export function planFlights(parts: CardPart[], spec: AssemblySpec): Flight[] {
  const rnd = mulberry32(spec.seed);
  const { phase, spinDir, reach } = spec;

  // Lock order: outermost first, most central last. The final piece lands
  // exactly at impact, which is what makes the whole thing feel like one
  // event rather than an animation that happens to finish near a bang.
  const order = parts
    .map((p, i) => ({ i, c: p.settle }))
    .sort((a, b) => a.c - b.c)
    .map((o) => o.i);
  const lockAt = new Array<number>(parts.length);
  order.forEach((partIndex, rank) => {
    const u = parts.length > 1 ? rank / (parts.length - 1) : 1;
    // Mostly even, with a little of the old outward-first acceleration left
    // in. On easeOutCubic alone the last-ordered pieces crammed together: a
    // court card's five art groups all seated inside 37ms, so its figure
    // appeared in one frame at the very end instead of being drawn in.
    const spread = 0.65 * u + 0.35 * easeOutCubic(u);
    lockAt[partIndex] = phase.lockFrom + (spec.impactAt - phase.lockFrom) * spread;
  });

  return parts.map((part, i) => {
    const enterBase =
      part.wave === 0 ? phase.suitEnter : part.wave === 1 ? phase.rankEnter : phase.restEnter;
    const stagger = part.wave === 0 ? 0.1 : part.wave === 1 ? 0.06 : 0.14;
    const enter = enterBase + rnd() * stagger;

    // Entry points walk around the table rather than clustering, so pieces
    // arrive from genuinely different places.
    const a0 = rnd() * Math.PI * 2 + i * 2.399;
    const r0 = RADIUS * reach * (0.78 + rnd() * 0.5);
    const p0: [number, number] = [
      CARD_CX + Math.cos(a0) * r0 * SPREAD_X,
      CARD_CY + Math.sin(a0) * r0 * SPREAD_Y,
    ];

    // Two controls swung around in the orbit direction turn the straight run
    // into a spiral: out wide, around the board, then in.
    const a1 = a0 + spinDir * (0.85 + rnd() * 0.55);
    const c1: [number, number] = [
      CARD_CX + Math.cos(a1) * r0 * 0.94 * SPREAD_X,
      CARD_CY + Math.sin(a1) * r0 * 0.94 * SPREAD_Y,
    ];
    const a2 = a1 + spinDir * (0.65 + rnd() * 0.45);
    const c2: [number, number] = [
      CARD_CX + Math.cos(a2) * r0 * 0.3 * SPREAD_X,
      CARD_CY + Math.sin(a2) * r0 * 0.3 * SPREAD_Y,
    ];

    const dx = part.pivot[0] - c2[0];
    const dy = part.pivot[1] - c2[1];
    const len = Math.hypot(dx, dy) || 1;

    return {
      enter,
      lock: lockAt[i],
      p0,
      c1,
      c2,
      pivot: part.pivot,
      spin: spinDir * (150 + rnd() * 340),
      // Depth is assigned by what a piece has to communicate. The rank is the
      // moment the card becomes guessable, so it passes close to the camera
      // and reads from across the table; the suit hints stay legible; the
      // rest split between near passes and deep ones so the field has volume.
      peak: part.delicate
        ? // Line art never runs deep; below 1 its stroke falls under a pixel.
          1.3 + rnd() * 0.55
        : part.wave === 1
          ? 2.4 + rnd() * 0.9
          : part.wave === 0
            ? 1.5 + rnd() * 0.7
            : rnd() < 0.45
              ? 1.35 + rnd() * 0.7
              : 0.45 + rnd() * 0.3,
      dir: [dx / len, dy / len],
    };
  });
}

function bezier(f: Flight, u: number): [number, number] {
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

/** A bump that rises and falls over 0..1, for mid-flight depth. */
const bell = (u: number) => Math.sin(Math.PI * clamp01(u)) ** 1.4;

/**
 * Magnetic lock: a piece runs slightly past its slot then snaps back, with a
 * touch of compression as it seats. Small on purpose — at board scale a card
 * unit is under half a pixel, so five of them is the couple of pixels of
 * overshoot that reads as "clicked into place" rather than "bounced".
 */
const lockPush = (p: number) => (p < 0.88 ? 0 : Math.sin(((p - 0.88) / 0.12) * Math.PI));

export interface PartFrame {
  transform: string;
  opacity: number;
}

/**
 * Where a piece is at time `t` (0..1 across the whole reveal).
 *
 * At and after its lock the transform is exactly the identity, so the piece
 * sits where the finished card draws it and the handover to PokerCard at the
 * end of the reveal is invisible.
 */
export function partFrame(f: Flight, t: number): PartFrame {
  if (t < f.enter) return { transform: "translate(0 0)", opacity: 0 };
  const p = clamp01((t - f.enter) / (f.lock - f.enter));
  if (p >= 1) return { transform: "translate(0 0)", opacity: 1 };

  // Drift while the identity is still being teased, then commit hard.
  const u =
    p < DRIFT
      ? DRIFT_SPAN * easeInOutSine(p / DRIFT)
      : DRIFT_SPAN + (1 - DRIFT_SPAN) * easeInCubic((p - DRIFT) / (1 - DRIFT));

  const [bx, by] = bezier(f, u);
  const push = lockPush(p) * OVERSHOOT;
  const x = bx + f.dir[0] * push - f.pivot[0];
  const y = by + f.dir[1] * push - f.pivot[1];

  const depth = 1 + (f.peak - 1) * bell(u);
  // Seats with a touch of compression rather than a bounce.
  const scale = depth * (1 - 0.075 * lockPush(p));
  const rotate = f.spin * (1 - u);

  // Pieces running deep sit back into the table; near ones stay full strength.
  const fade = clamp01((p / 0.16) * 1);
  const lit = 0.55 + 0.45 * clamp01((depth - 0.45) / 0.75);

  return {
    transform:
      `translate(${(f.pivot[0] + x).toFixed(2)} ${(f.pivot[1] + y).toFixed(2)}) ` +
      `rotate(${rotate.toFixed(2)}) scale(${scale.toFixed(4)}) ` +
      `translate(${(-f.pivot[0]).toFixed(2)} ${(-f.pivot[1]).toFixed(2)})`,
    opacity: fade * lit,
  };
}

/**
 * The card stock itself: hangs back while the pieces are still flying, then
 * drops onto the board. Pieces lock inside this frame, so they ride it down
 * and the whole card arrives as one object.
 */
export function frameTransform(spec: AssemblySpec, t: number) {
  const hit = spec.impactAt;
  const k = spec.reach;
  // Settled by 0.97, not 1: the reveal hands back to PokerCard at the end, so
  // the card must already be at rest when it does, or the swap shows.
  const times = [0, 0.55, 0.78, 0.86, hit, hit + 0.03, 0.97, 1];
  const y = track(t, times, [-54 * k, -48 * k, -41 * k, -30 * k, 0, -6, 0, 0]);
  const scale = track(t, times, [1.16, 1.14, 1.12, 1.09, 0.955, 1.02, 1, 1]);
  const rotate = track(t, times, [-4 * k, -3.2 * k, -2.4 * k, -1.5, 0.7, -0.25, 0, 0]);
  return {
    transform:
      `translate(${CARD_CX} ${CARD_CY + y}) rotate(${rotate}) scale(${scale}) ` +
      `translate(${-CARD_CX} ${-CARD_CY})`,
    /** Height above the felt, 0..1, for the shadow. */
    lift: Math.min(1, Math.abs(y) / (54 * k)),
  };
}

/**
 * Stock opacity. Deliberately late: a solid blank rectangle sitting there
 * while its own pips orbit would give the game away and look silly. It
 * materialises as a faint silhouette and is only fully opaque just before the
 * final pieces seat onto it.
 */
export function bodyOpacity(t: number) {
  return track(t, [0, 0.34, 0.52, 0.74, 0.88, 1], [0, 0, 0.22, 0.5, 1, 1]);
}

/**
 * The contact shadow under the stock. It hands over to the card's own CSS
 * drop shadow at impact, so the two never stack.
 */
export function contactShadow(spec: AssemblySpec, t: number, lift: number) {
  const fade = 1 - clamp01((t - spec.impactAt) / 0.05);
  return { rx: 64 + lift * 52, opacity: (0.62 - lift * 0.46) * fade };
}

/**
 * The ring that punches outward at impact. Finished well before the reveal
 * ends, for the same reason the rebound is.
 */
export function shockwave(spec: AssemblySpec, t: number) {
  const p = clamp01((t - spec.impactAt) / 0.055);
  return { scale: 1 + 0.55 * easeOutCubic(p), opacity: p <= 0 || p >= 1 ? 0 : 0.55 * (1 - p) };
}
