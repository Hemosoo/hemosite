/**
 * The choreography behind Crystal Spread.
 *
 * Pure maths, no React and no DOM. Two things happen at once and both are
 * planned here: one field of fragments divides itself between three cards, and
 * those three cards separate into their places while the fragments are still
 * arriving.
 *
 * The flight of an individual fragment is the crystallize reveal's — same
 * bezier, same lock, same tumble — because that language is already right and
 * the point of this reveal is the event, not the piece. What is different is
 * that the schedule is global: the three cards' fragments are interleaved on
 * one clock, so the board fills evenly and all three finish together instead
 * of left, pause, centre, pause, right.
 *
 * Fragment coordinates are the card's own 250 x 350 space, which is what lets
 * a seated fragment's transform be exactly the identity.
 */
import type { CrystalSpreadSpec } from "../../poker/flopReveals";
import { CARD_H, CARD_W } from "./cardTheme";
import type { Shard } from "./cardShards";
import type { ShardFlight } from "./crystalFlight";

const CARD_CX = CARD_W / 2;
const CARD_CY = CARD_H / 2;

/** The board is far wider than it is tall; the field comes in from that shape. */
const SPREAD_X = 2.45;
const SPREAD_Y = 0.8;
/** Base distance a fragment travels before the spec's reach is applied. */
const RADIUS = 545;

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
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const swing = (t: number) => Math.sin(Math.PI * clamp01(t));

/**
 * The order one card fills in: outward from two nuclei, so it reads as
 * something forming rather than as pieces arriving in a list.
 */
function growthOrder(shards: Shard[], rnd: () => number): number[] {
  const seedA = shards[Math.floor(rnd() * shards.length)];
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
    // A little noise, so the front is ragged rather than a clean wavefront.
    return d * (0.82 + rnd() * 0.36);
  });
  return shards.map((_, i) => i).sort((a, b) => cost[a] - cost[b]);
}

/**
 * Plans all three cards at once.
 *
 * `pitch` is the gap between neighbouring board slots in card widths, which is
 * how a fragment knows where the board's centre is from inside a card that is
 * one slot off it. Entry points are drawn around that shared centre, so the
 * three cards are visibly fed by one field rather than by three of their own.
 *
 * Locks are assigned by merging the three growth orders on a single clock:
 * card k's rank r competes on r / n, so a card cut into fewer pieces does not
 * finish early. The last fragment of each card therefore lands within a few
 * frames of the other two, which is the whole point of the reveal.
 */
export function planCrystalSpread(
  perCard: Shard[][],
  spec: CrystalSpreadSpec,
  pitch: number
): ShardFlight[][] {
  const rnd = mulberry32(spec.seed);
  const { phase, reach } = spec;

  const orders = perCard.map((shards) => growthOrder(shards, rnd));
  const total = perCard.reduce((n, s) => n + s.length, 0);

  // One merged queue across all three cards. A card's fragment competes on how
  // far through its own card it is, so a card cut into fewer pieces does not
  // run ahead of the others; a hair of noise keeps the three off lockstep.
  const queue = orders.flatMap((order, card) =>
    order.map((shard, rank) => ({
      card,
      shard,
      at: (order.length > 1 ? rank / (order.length - 1) : 1) + (rnd() - 0.5) * 0.04,
    }))
  );
  queue.sort((a, b) => a.at - b.at);

  const flights: ShardFlight[][] = perCard.map((s) => new Array<ShardFlight>(s.length));

  queue.forEach((entry, g) => {
    const u = total > 1 ? g / (total - 1) : 1;
    // The last fragment of each card, not just the last of the three.
    const hero = g >= total - perCard.length;
    const lock = phase.firstLock + (phase.lastLock - phase.firstLock) * Math.pow(u, phase.curve);

    const s = perCard[entry.card][entry.shard];
    // Bigger pieces fly a little slower, which reads as weight.
    const travel = phase.flightMin + rnd() * (phase.flightSpan + s.weight * 0.5);

    // Where the board's centre is, seen from inside this card. The cards are
    // still mostly converged while fragments are entering, so the field is
    // measured against where they are then, not where they end up.
    const ox = CARD_CX - (entry.card - 1) * pitch * CARD_W * (1 - spec.converge * 0.75);

    const a0 = rnd() * Math.PI * 2;
    const r0 = RADIUS * reach * (0.7 + rnd() * 0.6) * (hero ? 1.25 : 1);
    const p0: [number, number] = [
      ox + Math.cos(a0) * r0 * SPREAD_X,
      CARD_CY + Math.sin(a0) * r0 * SPREAD_Y,
    ];

    // Both controls swing the same way for the whole field, so the mass
    // arrives with one sense of rotation instead of cancelling itself out.
    const dir = spec.dir;
    const a1 = a0 + dir * (0.45 + rnd() * 0.45);
    const c1: [number, number] = [
      ox + Math.cos(a1) * r0 * 0.7 * SPREAD_X,
      CARD_CY + Math.sin(a1) * r0 * 0.7 * SPREAD_Y,
    ];
    const a2 = a1 + dir * (0.3 + rnd() * 0.35);
    const c2: [number, number] = [
      ox + Math.cos(a2) * r0 * 0.2 * SPREAD_X,
      CARD_CY + Math.sin(a2) * r0 * 0.2 * SPREAD_Y,
    ];

    flights[entry.card][entry.shard] = {
      enter: Math.max(0, lock - travel),
      lock,
      p0,
      c1,
      c2,
      pivot: [s.cx, s.cy],
      spin: (rnd() < 0.5 ? 1 : -1) * (50 + rnd() * 170),
      depth: rnd() < 0.4 ? 1.22 + rnd() * 0.5 : 0.52 + rnd() * 0.34,
      tumble: 1 + Math.floor(rnd() * 2),
      hero,
    };
  });

  return flights;
}

export interface CardFrame {
  /** Offset from this card's own slot, in card widths. */
  x: number;
  scale: number;
  /** The completion light along the card's edge, 0..1. */
  flash: number;
}

/**
 * Where card `i` is at time `t`.
 *
 * It starts pulled in toward the middle of the board and opens out to its slot
 * by `spreadBy`, which is before the last fragments arrive — so the cards are
 * standing in their places for the final cascade and the row is not still
 * moving when it completes.
 */
export function crystalCardFrame(
  spec: CrystalSpreadSpec,
  i: number,
  t: number,
  pitch: number
): CardFrame {
  const open = easeInOutSine(seg(t, 0.12, spec.spreadBy));
  // Card 0 sits a slot left of centre, card 2 a slot right; converged means
  // each has moved that fraction of the way back in.
  const x = (1 - i) * pitch * spec.converge * (1 - open);

  // One compression across all three as the last fragments lock, then level.
  const done = seg(t, spec.phase.lastLock, 1);
  const scale = 1 - 0.016 * swing(clamp01(done / 0.55));
  const flash = done > 0 ? 0.5 * (1 - clamp01(done / 0.42)) : 0;

  return { x, scale, flash };
}
