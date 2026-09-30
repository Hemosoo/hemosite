/**
 * The choreography for one hand, dealt down the page.
 *
 * Two hole cards, then a board of five photographs dealt the way a board is
 * dealt — three together, then one, then one — and then the five lifting off
 * the table and flying into the sentence below, becoming the words they were
 * always standing in for.
 *
 * The motion is the poker game's rather than an imitation of it. The flop
 * runs the game's own flop choreography; the turn reads the game's slam
 * keyframes; the flight is built from the same formation and peel primitives
 * as the game's deal. What is not borrowed is any of its state: nothing here
 * knows a card has a rank, and nothing here can be affected by a hand in
 * progress.
 *
 * Pure maths. Every position is in viewport pixels because the cards live in
 * a fixed layer — that is what lets one element be dealt onto a table, held
 * there while the page scrolls, and then land on a word in a section that has
 * not scrolled into view yet, without ever being re-parented.
 */
import { spread as flopSpread } from "../../poker/flopReveals";
import { impactSmash } from "../../poker/reveals";
import { flopFrame } from "../poker/flopFlight";
import { slamFrame } from "../poker/slamFlight";
import {
  clamp01,
  easeInOutSine,
  easeOutCubic,
  mix,
  mulberry32,
  peelFrom,
  quadAt,
  remap,
  ringPoint,
  seg,
  swing,
} from "../poker/motion";
import type { AnchorRect } from "./anchors";

export interface Frame {
  x: number;
  y: number;
  /** Split, because a card ends its flight as the shape of a word. */
  scaleX: number;
  scaleY: number;
  rotate: number;
  /** Out of plane, degrees. Small: these are cards, not coins. */
  tiltX: number;
  tiltY: number;
  /** 0 face down, 180 face up — the face is mounted turned over. */
  flip: number;
  opacity: number;
  /** Stacking order, from how near the eye it is passing. */
  depth: number;
  /** 0 photograph, 1 word. */
  morph: number;
  /**
   * The card is a word, in the word's own place, and the bio's copy of it can
   * safely come back. Not the same thing as being fully morphed: the type
   * finishes resolving a little before the position converges, and handing
   * over on the morph alone showed both words a few pixels apart.
   */
  landed: boolean;
}

/**
 * The beats of the hand, as fractions of the scene's scroll.
 *
 * The board arrives the way a board arrives: the flop as one event, then two
 * single cards with more weight each. The last stretch is a hold — long
 * enough to read the completed board, short enough not to be a pause — and
 * the flight is driven by the about section arriving, not by this.
 */
export const HAND = {
  holeIn: [0.0, 0.14] as const,
  holeFan: [0.08, 0.24] as const,
  holeFlip: [0.18, 0.33] as const,
  flop: [0.36, 0.58] as const,
  turn: [0.6, 0.76] as const,
  river: [0.78, 0.92] as const,
} as const;

/** The board's own reveals, fixed for the page rather than drawn per hand. */
const FLOP_SPEC = flopSpread(0x5eed);
const TURN_SPEC = impactSmash("turn", 0);

export interface Metrics {
  w: number;
  h: number;
  cardW: number;
  cardH: number;
  /** Hole cards sit larger — they are the ones being read first. */
  holeW: number;
  holeH: number;
  pitch: number;
  boardY: number;
  holeY: number;
  /** The formation the five fly in, before they break for the bio. */
  ringX: number;
  ringY: number;
}

export function metricsFor(w: number, h: number): Metrics {
  const narrow = w < 720;
  // Five across plus the gaps have to fit the narrowest phone, so the floor
  // here is set by the board's total width, not by what reads well alone.
  const cardW = Math.min(Math.max(w * (narrow ? 0.17 : 0.115), 62), 190);
  // The hand is much larger relative to the board on a phone: it has the full
  // width to itself, and it is the one carrying words that have to be read.
  const holeW = cardW * (narrow ? 1.8 : 1.25);
  const cardH = cardW * 1.4;
  const holeH = holeW * 1.4;

  // The board sits above the hand. Both rows are placed from the card size
  // rather than from fixed fractions of the viewport, so that making the
  // cards bigger cannot quietly slide the board down into the hand.
  const gap = Math.max(24, h * 0.035);
  const centre = h * 0.04;
  const stack = cardH + gap + holeH;

  return {
    w,
    h,
    cardW,
    cardH,
    holeW,
    holeH,
    pitch: cardW * 1.08,
    boardY: centre - stack / 2 + cardH / 2,
    holeY: centre + stack / 2 - holeH / 2,
    // Wide and shallow, like the table the game draws it on, and pulled in on
    // a phone, where there is no room to swing anything.
    ringX: Math.min(w * (narrow ? 0.2 : 0.27), 440),
    ringY: Math.min(h * (narrow ? 0.1 : 0.15), 150),
  };
}

/** The two hole cards: up from below, fanned apart, turned over, then held. */
export function holeFrame(i: number, t: number, m: Metrics): Frame {
  const rise = easeOutCubic(seg(t, ...HAND.holeIn));
  const fan = easeInOutSine(seg(t, ...HAND.holeFan));
  const side = i === 0 ? -1 : 1;
  const scale = mix(0.9, 1, rise);

  return {
    // Far enough apart that both faces read: these two carry words, not pips.
    x: mix(0, side * m.holeW * 0.58, fan) + side * 2,
    y: mix(m.h * 0.42, m.holeY, rise),
    scaleX: scale,
    scaleY: scale,
    rotate: mix(side * -2, side * 8, fan),
    tiltX: 0,
    tiltY: 0,
    // The second card starts turning a beat later but both are over by the
    // same moment, which has to be before the flop is dealt.
    flip: 180 * easeInOutSine(seg(t, HAND.holeFlip[0] + i * 0.04, HAND.holeFlip[1])),
    opacity: clamp01(seg(t, 0, 0.04)),
    depth: 0,
    morph: 0,
    landed: false,
  };
}

/** Where board card `i` comes to rest, in pixels from the layer's centre. */
export function restAt(i: number, m: Metrics) {
  return { x: (i - 2) * m.pitch, y: m.boardY };
}

/** When community card i is dealt. */
export function boardWindow(i: number): readonly [number, number] {
  if (i < 3) return HAND.flop;
  if (i === 3) return HAND.turn;
  return HAND.river;
}

/**
 * A board card arriving.
 *
 * Each third of the board is a different event, and each borrows the game's
 * own. The flop runs the game's spread choreography, which already works in
 * card widths and so needed nothing changed to carry photographs instead of
 * faces. The turn reads the game's slam keyframes — hang, turn over, fall,
 * squash, recover — through a sampler, because a scrolling page has no clock
 * to hand them to. The river crystallises, which happens inside the card's
 * own element rather than in its position, so all this owes it is the moment
 * it begins.
 */
/**
 * Held on the table.
 *
 * The game's reveals are written for a board that sits inside a frame with
 * room around it; here the same offsets are measured from a slot that is
 * already most of the way to the edge, and the flop's entry from three and a
 * half card widths out puts a card's corner off the side of the window. The
 * box always contains the card's own slot, so a guard can never move a card
 * away from where it is going — which would be a worse fault than the
 * overflow it is guarding against.
 */
function onScreen(f: Frame, rest: { x: number; y: number }, m: Metrics): Frame {
  const hw = (m.cardW * f.scaleX) / 2 + 4;
  const hh = (m.cardH * f.scaleY) / 2 + 4;
  const lo = (limit: number, home: number) => Math.min(limit, home);
  const hi = (limit: number, home: number) => Math.max(limit, home);
  return {
    ...f,
    x: Math.min(Math.max(f.x, lo(-(m.w / 2) + hw, rest.x)), hi(m.w / 2 - hw, rest.x)),
    y: Math.min(Math.max(f.y, lo(-(m.h / 2) + hh, rest.y)), hi(m.h / 2 - hh, rest.y)),
  };
}

export function boardFrame(i: number, t: number, m: Metrics): Frame {
  const rest = restAt(i, m);
  const [a, b] = boardWindow(i);

  if (i < 3) {
    // The entry is a quarter of the flop's length and most of its travel —
    // three and a half card widths, crossed at speed, which on a clock reads
    // as a deal and on a scrollbar is a whip. Given near half the scroll it
    // is the same entry at a pace a reader can follow; the spread, which is
    // the part worth watching, keeps the rest.
    const local = remap(seg(t, a, b), [0, 0.45, 1], [0, 0.26, 1]);
    const f = flopFrame(FLOP_SPEC, i, local, m.pitch / m.cardW);
    return onScreen({
      x: rest.x + f.x * m.cardW,
      y: rest.y + f.y * m.cardW,
      scaleX: f.scale,
      scaleY: f.scale,
      rotate: f.rotate,
      tiltX: 0,
      tiltY: 0,
      // The game counts 180 as face down; this layer mounts its faces the
      // other way up, so the two meet in the middle here rather than each
      // being half-right everywhere else.
      flip: 180 - f.flip,
      opacity: f.opacity,
      depth: f.depth - 0.5,
      morph: 0,
      landed: false,
    }, rest, m);
  }

  if (i === 3) {
    // The slam's fall is seven per cent of its length, which on a clock is
    // exactly right and on a scrollbar is twenty-five pixels — one flick of a
    // wheel, and the whole point of the animation is missed. The hang is
    // given less scroll and the fall a great deal more, so the same curve is
    // read slowly where it matters. It costs a third of the impact's speed
    // and buys the impact being seen at all.
    const local = remap(
      seg(t, a, b),
      [0, 0.28, 0.5, 0.86, 1],
      [0, 0.4, 0.58, 0.72, 1]
    );
    const f = slamFrame(TURN_SPEC, local);
    // The slam is written in pixels for a card at the game's board size; its
    // lift and travel scale to whatever this card happens to be.
    const k = m.cardW / 110;
    return onScreen({
      x: rest.x + f.x * k,
      y: rest.y + f.y * k,
      scaleX: f.scale,
      scaleY: f.scale,
      rotate: f.rotate,
      tiltX: 0,
      tiltY: 0,
      flip: 180 - f.flip,
      opacity: clamp01(seg(t, a - 0.01, a + 0.02)),
      // It hangs in front of everything while it is up there.
      depth: 0.9 * (1 - local),
      morph: 0,
      landed: false,
    }, rest, m);
  }

  // The river builds itself out of pieces of its own photograph. Nothing
  // moves, so the frame is simply the slot; the element does the rest.
  return {
    x: rest.x,
    y: rest.y,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    tiltX: 0,
    tiltY: 0,
    flip: 180,
    opacity: t >= a ? 1 : 0,
    depth: 0,
    morph: 0,
    landed: false,
  };
}

/** How far through its own crystallisation the river card is, 0..1. */
export function riverProgress(t: number) {
  return seg(t, HAND.river[0], HAND.river[1]);
}

/** The flight's beats. They overlap: nothing in it waits for anything. */
const FLIGHT = {
  /** Off the table and into formation. */
  lift: [0.0, 0.3] as const,
  /** How far the formation carries round, degrees. */
  sweep: 190,
  /** First card to break away, and the gap between them. */
  leaveFrom: 0.44,
  leaveGap: 0.05,
  /** Formation to word. */
  travel: 0.28,
} as const;

/**
 * The speed a card leaves formation at.
 *
 * Not easeOut, which begins at three times its own average speed: on a clock
 * that is a card flung, and on a scrollbar it is a card gone before the
 * reader has finished the gesture. The first cut of this peaked at ten pixels
 * of card per pixel of scroll immediately after a stretch at under one — a
 * card that sat still and then bolted.
 *
 * Not plain easeInOut either, which begins and ends at rest: a card that
 * stops on the ring before setting off has not peeled out of anything. Mostly
 * a sine, with a little constant motion mixed through it, so it is moving at
 * both ends and never more than half again its own average in the middle.
 */
const PEEL = (u: number) => mix(u, easeInOutSine(u), 0.85);

function leaveAt(i: number) {
  const leave = FLIGHT.leaveFrom + i * FLIGHT.leaveGap;
  return { leave, land: leave + FLIGHT.travel };
}

/**
 * The formation: five evenly spaced places on one turning ellipse about the
 * middle of the board, so the set reads as one system rather than as five
 * cards that happen to be moving at the same time.
 */
function slotOn(i: number, flight: number, m: Metrics) {
  const turn = easeInOutSine(clamp01(flight / 0.85));
  const p = ringPoint(-90 + (i / 5) * 360 + FLIGHT.sweep * turn, m.ringX, m.ringY);
  return { ...p, y: p.y + m.boardY };
}

/**
 * The flight: lift, formation, peel, and the turn from photograph into word.
 *
 * `flight` is its own progress — the about section arriving — so the cards
 * land on words that are on screen rather than on remembered coordinates.
 * Position is continuous at every boundary: the ring is a function of flight
 * rather than a state, a card part of the way onto it is already following
 * it, and a card leaving it goes along the tangent it was already travelling.
 */
export function flightFrame(
  i: number,
  flight: number,
  m: Metrics,
  anchor: AnchorRect | null,
  board: Frame
): Frame {
  if (flight <= 0) return board;

  const rnd = mulberry32((0x9e37 ^ ((i + 1) * 2654435761)) >>> 0);
  const spin = (rnd() < 0.5 ? 1 : -1) * (16 + rnd() * 26);
  const lean = -7 * Math.cos((i / 5) * Math.PI * 2);
  const { leave, land } = leaveAt(i);

  const slot = slotOn(i, flight, m);
  const rest = restAt(i, m);

  const up = easeInOutSine(seg(flight, ...FLIGHT.lift));
  const climb = quadAt(
    [rest.x, rest.y],
    // Out and over rather than straight at it, each card leaning its own way.
    [mix(rest.x, slot.x, 0.5) + (i - 2) * m.cardW * 0.3, mix(rest.y, slot.y, 0.5) - m.h * 0.07],
    [slot.x, slot.y],
    up
  );

  let x = climb[0];
  let y = climb[1];
  // Nearer the eye on the near side of the ring, deeper on the far side.
  let depth = slot.depth * up;
  let scaleX = mix(1, 1 + slot.depth * 0.14, up);
  let scaleY = scaleX;
  let rotate = spin * swing(up) + spin * 0.4 * up;
  let tiltX = mix(0, 9 * slot.depth, up);
  let tiltY = mix(0, lean, up);
  let morph = 0;
  let landed = false;

  if (anchor && flight >= leave) {
    const e = PEEL(seg(flight, leave, land));
    const to: [number, number] = [anchor.cx - m.w / 2, anchor.cy - m.h / 2];
    // Out of formation along the heading it was already travelling.
    const p = peelFrom(slot, to, e, m.cardW * 0.9 * (i % 2 ? 1 : -1), m.h * 0.05);
    x = p[0];
    y = p[1];

    // A card is tall and a word is wide. It keeps its own shape most of the
    // way in and only flattens toward the word's box as it becomes one.
    const tx = anchor.width ? (anchor.width * 1.25) / m.cardW : 0.3;
    const ty = anchor.height ? (anchor.height * 2.1) / m.cardH : 0.24;
    const shrink = mix(1 + slot.depth * 0.14, Math.sqrt(tx * ty), e);
    const flatten = easeInOutSine(seg(e, 0.45, 1));
    scaleX = mix(shrink, tx, flatten);
    scaleY = mix(shrink, ty, flatten);

    rotate = mix(spin * 1.4, 0, e);
    tiltX = mix(9 * slot.depth, 0, e);
    tiltY = mix(lean, 0, e);
    depth = mix(slot.depth, 1, e);

    // The photograph is still the photograph for the first half of the run,
    // the two overlap through the middle, and the word is what lands — long
    // enough that the eye can follow the card it came from.
    morph = clamp01(seg(e, 0.42, 0.94));

    // Set down, not parked: a pixel or two past the word and back.
    const over = seg(flight, land, land + 0.04);
    if (over > 0) {
      const nudge = swing(over);
      x += (i - 2) * 0.9 * nudge;
      y += 1.4 * nudge;
    }
    if (flight >= land + 0.04) {
      x = to[0];
      y = to[1];
      rotate = 0;
      tiltX = 0;
      tiltY = 0;
      morph = 1;
      landed = true;
    }
  }

  return { x, y, scaleX, scaleY, rotate, tiltX, tiltY, flip: 180, opacity: 1, depth, morph, landed };
}

/** Reduced motion: no formation, no depth — straight in, and crossfaded. */
export function calmFlightFrame(
  i: number,
  flight: number,
  m: Metrics,
  anchor: AnchorRect | null,
  board: Frame
): Frame {
  if (!anchor || flight <= 0) return board;
  const rest = restAt(i, m);
  const e = easeInOutSine(seg(flight, i * 0.04, 0.85));
  const to: [number, number] = [anchor.cx - m.w / 2, anchor.cy - m.h / 2];
  const tx = anchor.width ? (anchor.width * 1.25) / m.cardW : 0.3;
  const ty = anchor.height ? (anchor.height * 2.1) / m.cardH : 0.24;
  return {
    x: mix(rest.x, to[0], e),
    y: mix(rest.y, to[1], e),
    scaleX: mix(1, tx, e),
    scaleY: mix(1, ty, e),
    rotate: 0,
    tiltX: 0,
    tiltY: 0,
    flip: 180,
    opacity: 1,
    depth: 0,
    morph: clamp01(seg(e, 0.3, 0.9)),
    landed: e >= 1,
  };
}

/** The hand bows out as the board lifts; it was the introduction. */
export function holeExit(flight: number) {
  return 1 - clamp01(seg(flight, 0, 0.3));
}

/** The table, sized to hold exactly what is on it. */
export interface Felt {
  width: number;
  height: number;
  /** Offset from the viewport's centre. */
  y: number;
}

export function feltFor(m: Metrics): Felt {
  const top = m.boardY - m.cardH / 2;
  const bottom = m.holeY + m.holeH / 2;
  return {
    width: Math.min(4 * m.pitch + m.cardW * 1.7, m.w * 0.96),
    height: Math.min((bottom - top) * 1.14, m.h * 0.92),
    y: (top + bottom) / 2,
  };
}
