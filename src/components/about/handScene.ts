/**
 * The choreography for one hand: two hole cards, a board, and five
 * photographs that end up inside a sentence.
 *
 * Pure maths. Every position is in viewport pixels because the cards live in a
 * fixed layer — that is what lets one element be dealt onto a table, held
 * there while the page scrolls, and then land on a word in a section that has
 * not even scrolled into view yet, without ever being re-parented.
 */
import type { AnchorRect } from "./anchors";

export interface Frame {
  x: number;
  y: number;
  /** Split, because a card ends its flight as the shape of a word. */
  scaleX: number;
  scaleY: number;
  rotate: number;
  /** 0 face down, 180 face up — the face is mounted turned over. */
  flip: number;
  opacity: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * The beats of the hand, as fractions of the scene's scroll.
 *
 * The hand is dealt before the board, the way it is at a table, and the board
 * comes in three then one then one. The last stretch is only a hold: the
 * flight to the bio is driven by the about section arriving, not by this.
 */
export const HAND = {
  holeIn: [0.0, 0.16] as const,
  holeFan: [0.1, 0.28] as const,
  holeFlip: [0.22, 0.38] as const,
  flop: [0.44, 0.6] as const,
  turn: [0.62, 0.74] as const,
  river: [0.76, 0.88] as const,
} as const;

export interface Metrics {
  w: number;
  h: number;
  /** Community card size. */
  cardW: number;
  cardH: number;
  /** Hole cards sit a little larger — they are the ones being read first. */
  holeW: number;
  holeH: number;
  pitch: number;
  boardY: number;
  holeY: number;
}

export function metricsFor(w: number, h: number): Metrics {
  const narrow = w < 720;
  // Five across plus the gaps have to fit the narrowest phone, so the floor
  // here is set by the board's total width, not by what reads well alone.
  const cardW = Math.min(Math.max(w * (narrow ? 0.15 : 0.1), 62), 150);
  const holeW = cardW * (narrow ? 1.15 : 1.25);
  return {
    w,
    h,
    cardW,
    cardH: cardW * 1.4,
    holeW,
    holeH: holeW * 1.4,
    pitch: cardW * 1.08,
    // The board sits above centre and the hand below it, the way they are laid
    // out on the table elsewhere on this site.
    boardY: -h * 0.09,
    holeY: h * 0.24,
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
    // The second card starts turning a beat later but both are over by the
    // same moment, which has to be before the flop is dealt.
    flip: 180 * easeInOutSine(seg(t, HAND.holeFlip[0] + i * 0.04, HAND.holeFlip[1])),
    opacity: clamp01(seg(t, 0, 0.04)),
  };
}

/** When community card i is dealt. */
export function boardWindow(i: number): readonly [number, number] {
  if (i < 3) return HAND.flop;
  if (i === 3) return HAND.turn;
  return HAND.river;
}

/**
 * A community card: dealt from the side onto the board, then held.
 *
 * `flight` is separate progress — the about section arriving — and takes the
 * card from wherever it is on the board to the word it belongs to. The two
 * never overlap, so a card is only ever doing one of the two things.
 */
export function boardFrame(
  i: number,
  t: number,
  flight: number,
  m: Metrics,
  anchor: AnchorRect | null
): Frame {
  const [a, b] = boardWindow(i);
  // The flop's three land in sequence rather than together, which is what
  // gives it a rhythm; the turn and river have their own windows already.
  const stagger = i < 3 ? i * 0.045 : 0;
  const deal = easeOutCubic(seg(t, a + stagger, b + stagger));

  const restX = (i - 2) * m.pitch;
  const restY = m.boardY;
  // In from the dealer's side, off the right edge — the same point for every
  // card, so they arrive as one deal rather than five appearances. It has to be
  // measured from the viewport edge, not from where the card is going to rest,
  // or the first card starts its run already on screen.
  const fromX = m.w * 0.5 + m.cardW * 1.2;
  const fromY = restY - m.h * 0.12;

  let x = mix(fromX, restX, deal);
  let y = mix(fromY, restY, deal);
  const scale = mix(0.84, 1, deal);
  let scaleX = scale;
  let scaleY = scale;
  let rotate = mix(-10, 0, deal);
  let opacity = clamp01(seg(t, a + stagger - 0.02, a + stagger + 0.03));

  if (flight > 0 && anchor) {
    // Viewport centre is where the fixed layer's origin sits, so a word's
    // centre becomes an offset from it.
    const tx = anchor.cx - m.w / 2;
    const ty = anchor.cy - m.h / 2;
    // The travel is done well before the scroll is, so the card gets a beat
    // sitting at word size on the word itself before it dissolves into it.
    // Spread over the whole flight instead, it only ever reads as a big card
    // drifting, and never as the card becoming the highlight.
    const e = easeInOutSine(seg(flight, 0, 0.8));
    // Arcs out and over rather than sliding, so five cards crossing the same
    // gap do not read as one block moving.
    const lift = Math.sin(Math.PI * seg(flight, 0, 0.8)) * (m.h * 0.08 + (i - 2) * 14);
    x = mix(x, tx, e);
    y = mix(y, ty, e) - lift;

    // A card is tall and a word is wide, so landing on one uniformly leaves a
    // photograph standing over the line rather than sitting in it. It shrinks
    // uniformly first — a photograph the whole way in — and only flattens into
    // the word's own shape at the end, as it is already dissolving.
    const tx2 = anchor.width ? (anchor.width * 1.15) / m.cardW : 0.3;
    const ty2 = anchor.height ? (anchor.height * 1.9) / m.cardH : 0.22;
    const uniform = mix(scale, Math.sqrt(tx2 * ty2), e);
    const flatten = easeInOutSine(seg(flight, 0.4, 0.8));
    scaleX = mix(uniform, tx2, flatten);
    scaleY = mix(uniform, ty2, flatten);
    rotate = mix(rotate, 0, e);
    // Gone by the time it is on the word — the word is what stays.
    opacity = 1 - clamp01(seg(flight, 0.62, 0.92));
  }

  return {
    x,
    y,
    scaleX,
    scaleY,
    rotate,
    flip: 180 * easeInOutSine(seg(t, a + stagger + 0.02, b + stagger)),
    opacity,
  };
}

/** The hand bows out as the board starts flying; it was the introduction. */
export function holeExit(flight: number) {
  return 1 - clamp01(seg(flight, 0, 0.35));
}
