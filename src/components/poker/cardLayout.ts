/**
 * Where each visual piece of a card sits.
 *
 * Pure geometry, no rendering. PokerCard draws from it in one pass and the
 * assembly reveal flies the same pieces in one at a time; sharing the numbers
 * is what makes a flying pip land exactly where the finished card wants it.
 */
import { CARD_H, CARD_W, FIELD, PIP_LAYOUT, pipSize, type Rank, type Suit } from "./cardTheme";

/** Where PokerCard puts the two corner indices. */
export const CORNER_TL = "translate(20 46)";
export const CORNER_BR = `rotate(180 ${CARD_W / 2} ${CARD_H / 2}) translate(20 46)`;

/** Rotate a point through the card's centre, as CORNER_BR does. */
export const through = (x: number, y: number): [number, number] => [CARD_W - x, CARD_H - y];

export interface PipPlacement {
  /** Top-left of the glyph box, as SuitIcon takes it. */
  x: number;
  y: number;
  size: number;
  /** Pips below the midline print upside down, as on a real card. */
  flip: boolean;
}

export function pipPlacements(rank: Rank): PipPlacement[] {
  const pips = PIP_LAYOUT[rank];
  if (!pips) return [];
  const cx = CARD_W / 2;
  const size = pipSize(rank);
  const span = FIELD.bottom - FIELD.top - size;
  return pips.map(([col, row]) => ({
    x: cx + col * FIELD.colOffset - size / 2,
    y: FIELD.top + row * span,
    size,
    flip: row > 0.5,
  }));
}

/**
 * The ace: one oversized suit, centred. Spades gets the hero treatment from
 * the reference — larger still, and an inner outline echoing the silhouette.
 */
export function aceLayout(suit: Suit) {
  const hero = suit === "spades";
  const size = hero ? 150 : 124;
  return { hero, size, x: (CARD_W - size) / 2, y: (CARD_H - size) / 2 - 6 };
}

/** Where PokerCard places the 100 x 132 face-art box inside the card. */
export const FACE_PLACE = { x: (CARD_W - 100 * 1.52) / 2, y: 74, scale: 1.52 };
