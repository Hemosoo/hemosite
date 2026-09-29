/**
 * Where a topic card is, at every point in the section.
 *
 * The whole point of this sequence is that a card *becomes* a word rather than
 * being swapped for one, so both states have to live in the same coordinate
 * space: one element travels from the board to the anchor list and never
 * unmounts. Everything is derived from the measured viewport, so the two
 * layouts stay consistent with each other at any size instead of being written
 * twice and drifting.
 *
 * Distances come back in pixels because that is what a transform wants;
 * nothing here animates layout.
 */
export interface Viewport {
  w: number;
  h: number;
}

export interface Layout {
  /** Card face size on the board. */
  cardW: number;
  cardH: number;
  /** Board: centre of card i, relative to the middle of the frame. */
  boardX: (i: number) => number;
  boardY: number;
  /** Anchor list: where card i ends up, and how much smaller it gets. */
  anchorX: (i: number) => number;
  anchorY: (i: number) => number;
  anchorScale: number;
  /** Type sizes for the anchor row, in px. */
  wordSize: number;
  noteSize: number;
  /** Gap from the thumbnail's centre to where its word starts. */
  wordOffset: number;
  /** Below this the five-across board would be too tight, so it stacks. */
  narrow: boolean;
}

export function layoutFor({ w, h }: Viewport): Layout {
  // Narrow screens get a smaller board and a tighter list rather than a
  // different story. Five across still fits; they just travel less.
  const narrow = w < 680;

  const cardW = Math.min(Math.max(w * (narrow ? 0.155 : 0.108), 68), 158);
  const cardH = cardW * 1.4;
  const pitch = cardW * (narrow ? 1.06 : 1.14);

  // The board sits above centre, which leaves the lower half free for the
  // list the cards are about to become.
  const boardY = -h * (narrow ? 0.2 : 0.17);

  const rowH = Math.min(Math.max(h * 0.108, 56), 92);
  const listH = rowH * 5;
  const thumbW = rowH * 0.58;
  const anchorScale = thumbW / cardW;

  // The list hangs off the left of a centred column, so the words all start
  // on one line rather than being centred individually.
  const colW = Math.min(w * 0.82, 720);
  const listLeft = -colW / 2;

  return {
    cardW,
    cardH,
    boardX: (i) => (i - 2) * pitch,
    boardY,
    anchorX: () => listLeft + thumbW / 2,
    anchorY: (i) => -listH / 2 + rowH * (i + 0.5),
    anchorScale,
    wordSize: Math.min(Math.max(rowH * 0.46, 22), 44),
    noteSize: Math.min(Math.max(rowH * 0.17, 11), 15),
    wordOffset: thumbW / 2 + rowH * 0.26,
    narrow,
  };
}

/**
 * The section's beats, as fractions of its scroll.
 *
 * The flop takes one window for all three, because three cards arriving at
 * once is the point of a flop; the turn and river get their own. The long tail
 * is the transformation, which is the part worth scrolling slowly through.
 */
export const BEAT = {
  flopIn: [0.08, 0.28] as const,
  turnIn: [0.28, 0.42] as const,
  riverIn: [0.42, 0.56] as const,
  /** Everything is on the board and readable. */
  hold: [0.56, 0.66] as const,
  /** Board to anchor list. */
  morph: [0.66, 0.9] as const,
  settled: 0.9,
};
