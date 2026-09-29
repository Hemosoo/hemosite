/**
 * The five things the board is dealt from.
 *
 * Order is the storytelling, not the poker. The flop lays down what is on
 * paper — school, work, the thing I do with other people — and the turn and
 * river are the two that are just mine. Dunking lands last because it is the
 * only one still unfinished, which is a better note to end on than a job.
 *
 * The hole cards two sections up have already said "3× Amazon" and "class of
 * 2027"; those are credentials. These are the person.
 */
export interface Topic {
  id: string;
  /** The word the card becomes. */
  word: string;
  /** One line, read once the card has landed as an anchor. */
  note: string;
  /** Corner index, so a topic card still reads as a playing card. */
  rank: string;
  pip: string;
  /** Tailwind text colour for the pip, from the site's existing palette. */
  tint: string;
  img: string;
  /** Where the photo should sit when it is cropped hard. */
  focus: string;
}

const asset = (name: string) => `${import.meta.env.BASE_URL}about/${name}`;

export const TOPICS: Topic[] = [
  {
    id: "penn",
    word: "Penn",
    note: "CS senior, submatriculating into the master's",
    rank: "A",
    pip: "♠",
    tint: "text-primary",
    img: asset("penn.jpg"),
    focus: "50% 32%",
  },
  {
    id: "amazon",
    word: "Amazon",
    note: "Three summers an SDE intern in Seattle",
    rank: "K",
    pip: "♦",
    tint: "text-yellow",
    img: asset("amazon.jpg"),
    focus: "50% 38%",
  },
  {
    id: "acapella",
    word: "acapella",
    note: "I sing, in front of people, on purpose",
    rank: "Q",
    pip: "♥",
    tint: "text-red",
    img: asset("acapella.jpg"),
    focus: "50% 40%",
  },
  {
    id: "poker",
    word: "poker",
    note: "The table on this site is the real thing",
    rank: "J",
    pip: "♣",
    tint: "text-green",
    img: asset("poker.jpg"),
    focus: "50% 45%",
  },
  {
    id: "dunking",
    word: "dunking",
    note: "Still on the way up. Ask me next year",
    rank: "10",
    pip: "♠",
    tint: "text-orange",
    img: asset("dunking.jpg"),
    focus: "50% 30%",
  },
];

/** Which street each card comes on: three, then one, then one. */
export const FLOP = [0, 1, 2];
export const TURN = 3;
export const RIVER = 4;
