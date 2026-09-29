/**
 * The five community cards: a photograph each, and the word in the bio that
 * each one flies into when the about section arrives.
 *
 * Order is the storytelling, not the poker. The flop lays down what is on
 * paper — school, work, the thing I do with other people — and the turn and
 * river are the two that are just mine. Dunking lands last because it is the
 * only one still unfinished, which is a better note to end on than a job.
 *
 * No rank and no suit on these. They are photographs, and an index in the
 * corner would only be a label competing with the picture.
 */
export interface Topic {
  id: string;
  /** The highlighted word in the bio this card lands on. */
  word: string;
  img: string;
  /** Where the photo should sit when it is cropped hard. */
  focus: string;
}

const asset = (name: string) => `${import.meta.env.BASE_URL}about/${name}`;

export const TOPICS: Topic[] = [
  {
    id: "penn",
    word: "Penn",
    // Hey Day: the one afternoon of the year the whole junior class is in red
    // with a cane and a hat. A portrait of me in a building would have been a
    // picture of a person; this is a picture of the place.
    img: asset("heyday.jpg"),
    focus: "50% 30%",
  },
  {
    id: "amazon",
    word: "Amazon",
    img: asset("amazon.jpg"),
    focus: "50% 38%",
  },
  {
    id: "acapella",
    word: "acapella",
    img: asset("acapella.jpg"),
    focus: "50% 40%",
  },
  {
    id: "poker",
    word: "poker",
    // The only wide shot of the five, and the only one with someone else in
    // it: centred, the crop keeps the other player and loses me. Weighted left.
    img: asset("poker.jpg"),
    focus: "18% 22%",
  },
  {
    id: "dunking",
    word: "dunking",
    img: asset("dunking.jpg"),
    focus: "50% 30%",
  },
];

/**
 * The hand itself: the two cards that open the story before the board comes.
 * These stay as words — they are the claim, and the board is the evidence.
 */
export interface HoleFace {
  pip: string;
  rank: string;
  title: string;
  lines: string[];
  tint: string;
}

export const HOLE: HoleFace[] = [
  {
    pip: "\u2660",
    rank: "3\u00d7",
    title: "Amazon SDE Intern",
    lines: ["Seattle, WA", "2024 \u00b7 2025 \u00b7 2026"],
    tint: "text-primary",
  },
  {
    pip: "\u2665",
    rank: "Penn",
    title: "BSE + MSE",
    lines: ["Computer Science", "Class of 2027"],
    tint: "text-red",
  },
];
