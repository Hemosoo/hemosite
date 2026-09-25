/** 2..14, where 11=J, 12=Q, 13=K, 14=A. */
export type Rank = number;
/** 0=spades 1=hearts 2=diamonds 3=clubs */
export type Suit = 0 | 1 | 2 | 3;

export interface Card {
  r: Rank;
  s: Suit;
}

export const RANK_CHARS = "  23456789TJQKA";
export const SUIT_CHARS = ["♠", "♥", "♦", "♣"];
/** Red suits get a different colour; the other two stay light. */
export const SUIT_IS_RED = [false, true, true, false];

export const cardText = (c: Card) => RANK_CHARS[c.r] + SUIT_CHARS[c.s];

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) deck.push({ r, s: s as Suit });
  }
  return deck;
}

/** Fisher-Yates. Takes the RNG so tests can seed it. */
export function shuffle<T>(xs: T[], rng: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic RNG so a hand can be replayed in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
