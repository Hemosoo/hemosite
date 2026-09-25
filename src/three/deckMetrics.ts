/** Deck dimensions shared between the deck mesh and the card that leaves it. */
export const DECK_COUNT = 46;
export const CARD_THICKNESS = 0.012;
/** Height of the top card of the stack above the deck's origin. */
export const deckTopOffset = () => DECK_COUNT * CARD_THICKNESS;
