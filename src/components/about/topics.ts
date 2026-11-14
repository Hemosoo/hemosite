/**
 * The five photographs under the bio, and the word in the bio each one
 * belongs to.
 *
 * Order is the sentence's order, so the strip reads left to right the way
 * the bio does: school, work, the thing I do with other people, and the two
 * that are just mine. Dunking is last because it is the only one still
 * unfinished, which is a better note to end on than a job.
 */
export interface Topic {
  id: string;
  /** The highlighted word in the bio this photograph belongs to. */
  word: string;
  /** What is in the picture, under it. Short: a caption, not a story. */
  caption: string;
  /** The word's colour in the bio, so card and word read as a pair. */
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
    // Hey Day: the one afternoon of the year the whole junior class is in red
    // with a cane and a hat. A portrait of me in a building would have been a
    // picture of a person; this is a picture of the place.
    caption: "Hey Day",
    tint: "text-accent",
    img: asset("heyday.jpg"),
    focus: "50% 30%",
  },
  {
    id: "amazon",
    word: "Amazon",
    caption: "the Spheres, Seattle",
    tint: "text-yellow",
    img: asset("amazon.jpg"),
    focus: "50% 38%",
  },
  {
    id: "acapella",
    word: "acapella",
    caption: "on stage",
    tint: "text-green",
    img: asset("acapella.jpg"),
    focus: "50% 40%",
  },
  {
    id: "poker",
    word: "poker",
    // The only wide shot of the five, and the only one with someone else in
    // it: centred, the crop keeps the other player and loses me. Weighted left.
    caption: "at the table",
    tint: "text-yellow",
    img: asset("poker.jpg"),
    focus: "18% 22%",
  },
  {
    id: "dunking",
    word: "dunking",
    caption: "in progress",
    tint: "text-orange",
    img: asset("dunking.jpg"),
    focus: "50% 30%",
  },
];
