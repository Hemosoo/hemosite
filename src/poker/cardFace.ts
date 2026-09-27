/**
 * Engine card to deck face.
 *
 * The engine stores a card as indices; the deck draws it from a rank glyph
 * and a suit name. One conversion, shared, so a reveal and a table card can
 * never disagree about what is being shown.
 */
import { RANK_CHARS, type Card } from "./cards";
import type { Rank, Suit } from "../components/poker/cardTheme";

/** Engine suit indices are 0=spades 1=hearts 2=diamonds 3=clubs. */
export const SUIT_NAME: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function toFace(card: Card): { rank: Rank; suit: Suit } {
  return { rank: RANK_CHARS[card.r].trim() as Rank, suit: SUIT_NAME[card.s] };
}
