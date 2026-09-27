/**
 * The deck's visual language, taken from the PokerCards reference.
 *
 * Everything is derived from these constants so the 52 cards stay a system
 * rather than 52 drawings. Suit colours are Atom One, which is also what the
 * rest of the site runs on — the deck was designed against the same palette.
 */

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

/** Card is drawn in this space and scaled by the consumer. 2.5 : 3.5. */
export const CARD_W = 250;
export const CARD_H = 350;
export const CARD_R = 22;

export const INK = {
  /** Face stock: near-black slate, a touch lighter than the table. */
  face: "#20242c",
  faceEdge: "#2c3240",
  /** Back stock is a shade deeper, so a face-down card reads as different. */
  back: "#1b1f27",
  backLine: "#8fa3bd",
  backAccent: "#98c379",
  /** Face-card line art fades toward this. */
  violet: "#c678dd",
} as const;

export const SUIT_COLOR: Record<Suit, string> = {
  spades: "#61afef",
  hearts: "#e06c75",
  diamonds: "#e5c07b",
  clubs: "#98c379",
};

/**
 * Suit silhouettes, each drawn in a 100 x 100 box so they can be dropped into
 * any slot by transform alone. Real paths, not glyphs: a font would render
 * differently across platforms and break the deck's consistency.
 */
export const SUIT_PATH: Record<Suit, string> = {
  spades:
    "M50 7C50 7 89 39 89 62c0 13-9.5 22.5-21.5 22.5-6 0-11-2.5-14-6.5l5 " +
    "17.5H41.5l5-17.5c-3 4-8 6.5-14 6.5C15.5 84.5 6 75 6 62 6 39 50 7 50 7Z",
  hearts:
    "M50 93C50 93 9 63.5 9 38.5 9 24 19.5 13 33 13c8 0 14 4.5 17 10.5C53 " +
    "17.5 59 13 67 13c13.5 0 24 11 24 25.5C91 63.5 50 93 50 93Z",
  diamonds: "M50 5 90 50 50 95 10 50Z",
  clubs:
    "M50 8c10.5 0 19 8.5 19 19 0 3.6-1 7-2.8 9.8 3-1.8 6.5-2.8 10.3-2.8 " +
    "10.5 0 19 8.5 19 19s-8.5 19-19 19c-8.2 0-15.2-5.2-17.9-12.5L56 " +
    "62l5.5 31H38.5L44 62l-2.6 -2.5C38.7 66.8 31.7 72 23.5 72 13 72 4.5 " +
    "63.5 4.5 53s8.5-19 19-19c3.8 0 7.3 1 10.3 2.8A18.9 18.9 0 0 1 31 " +
    "27c0-10.5 8.5-19 19-19Z",
};

/**
 * Pip layouts: [column, row] with column -1/0/1 and row 0..1 down the field.
 *
 * These are the classic arrangements a real deck prints. An earlier attempt
 * described them as a top half plus a mirrored half, which was fewer numbers
 * but produced scattered sevens and nines — the standard layouts are not
 * symmetric halves, so describing them that way could not express them.
 */
export type Pip = [number, number];

const COL_L = -1;
const COL_R = 1;
const MID = 0;

/** The six-pip frame that 6, 7 and 8 are built on. */
const SIX: Pip[] = [
  [COL_L, 0], [COL_R, 0],
  [COL_L, 0.5], [COL_R, 0.5],
  [COL_L, 1], [COL_R, 1],
];
/** The eight-pip frame behind 9 and 10. */
const EIGHT: Pip[] = [
  [COL_L, 0], [COL_R, 0],
  [COL_L, 1 / 3], [COL_R, 1 / 3],
  [COL_L, 2 / 3], [COL_R, 2 / 3],
  [COL_L, 1], [COL_R, 1],
];

export const PIP_LAYOUT: Record<string, Pip[]> = {
  "2": [[MID, 0], [MID, 1]],
  "3": [[MID, 0], [MID, 0.5], [MID, 1]],
  "4": [[COL_L, 0], [COL_R, 0], [COL_L, 1], [COL_R, 1]],
  "5": [[COL_L, 0], [COL_R, 0], [MID, 0.5], [COL_L, 1], [COL_R, 1]],
  "6": SIX,
  "7": [...SIX, [MID, 0.25]],
  "8": [...SIX, [MID, 0.25], [MID, 0.75]],
  "9": [...EIGHT, [MID, 0.5]],
  "10": [...EIGHT, [MID, 1 / 6], [MID, 5 / 6]],
};

/**
 * The pip field. Starts below the corner index so the left column never
 * crowds it, and columns sit far enough apart to read as columns.
 */
export const FIELD = {
  top: 86,
  bottom: CARD_H - 86,
  colOffset: 58,
};

/**
 * Pips shrink as the count grows, the way a real deck does it.
 *
 * At a fixed 38 the four-row layouts had 40px of pitch for 38px of pip, so
 * nines and tens rendered as overlapping stacks.
 */
export function pipSize(rank: string) {
  if (rank === "9" || rank === "10") return 32;
  if (rank === "6" || rank === "7" || rank === "8") return 37;
  return 43;
}

export const isFace = (r: Rank) => r === "J" || r === "Q" || r === "K";
