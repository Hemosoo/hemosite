/**
 * Where the card's creases run out at its edge, as fractions of its width and
 * height from the top left. From the crease geometry in three/cardModel.ts
 * (a 2.5 x 3.5 card: the nose crease leaves the side 1.25 below the top
 * corner; the wing crease meets the bottom 0.32 either side of centre).
 * Kept apart from three/ so the card can print them without loading three.js.
 */
const W = 2.5;
const H = 3.5;

export const SCORE = {
  noseY: W / 2 / H,
  wingX: 0.5 - 0.32 / W,
};
