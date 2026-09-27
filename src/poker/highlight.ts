/**
 * Which cards are carrying the hand.
 *
 * The deck already tints one card — the ace of spades wears the deck's violet.
 * This extends that to any card doing work: your pocket pair, the two sevens
 * that paired the board, all five of a flush. Kickers are left alone, because
 * highlighting them would say nothing.
 *
 * Read-only. Nothing here can change a hand; it only reads the table.
 */
import { bestFive, coreCards } from "./evaluate";
import type { Card } from "./cards";
import type { Table } from "./engine";

/** A card is unique in a deck, so rank and suit identify it. */
export const cardKey = (c: Card) => `${c.r}-${c.s}`;

/**
 * The cards to tint, as keys.
 *
 * While the hand is live this is your hand, so you can watch it form. At a
 * showdown it switches to whoever won, which is the question everyone is
 * actually asking by then.
 */
export function highlightSet(table: Table): Set<string> {
  const keys = new Set<string>();
  const add = (cards: Card[]) => {
    for (const c of cards) keys.add(cardKey(c));
  };

  const core = (hole: Card[]) => {
    if (hole.length < 2) return [];
    // Before the flop there is no five-card hand to score, but a pocket pair
    // is still a made pair and reads as one.
    if (table.board.length === 0) return hole[0].r === hole[1].r ? hole : [];
    if (hole.length + table.board.length < 5) return [];
    const { score, five } = bestFive([...hole, ...table.board]);
    return coreCards(five, score);
  };

  if (table.revealed && table.result) {
    // Showdown: everyone still in is compared, and the best hands light up.
    const contenders = table.players.filter((p) => !p.folded && !p.out && p.hole.length === 2);
    let best: number[] | null = null;
    const scored = contenders.map((p) => {
      const { score, five } = bestFive([...p.hole, ...table.board]);
      return { p, score, five };
    });
    for (const s of scored) {
      if (!best || cmp(s.score, best) > 0) best = s.score;
    }
    for (const s of scored) {
      if (best && cmp(s.score, best) === 0) add(coreCards(s.five, s.score));
    }
    return keys;
  }

  const you = table.players.find((p) => p.isHuman);
  if (you && !you.folded && !you.out) add(core(you.hole));
  return keys;
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
