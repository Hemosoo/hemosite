/**
 * Jack, Queen and King as line art, declared as a handful of named groups.
 *
 * Stroke only, no fills — matching the reference, where the figures read as
 * technical drawings rather than illustrations. Each is drawn in a 100 x 132
 * box and stroked with a gradient that runs from the suit colour at the crown
 * to violet at the shoulders, which is the deck's signature on these cards.
 *
 * The grouping exists so the assembly reveal can fly a crown in separately
 * from a robe. Painting order is preserved and a <g> inherits stroke and
 * fill, so drawing the groups in sequence is identical to drawing the paths
 * directly.
 */
import type { ReactNode } from "react";

export interface FaceGroup {
  id: string;
  /** Rough centre in the 100 x 132 art box: what the piece spins about. */
  pivot: [number, number];
  node: ReactNode;
}

const JACK: FaceGroup[] = [
  {
    id: "hat",
    pivot: [46, 28],
    node: (
      <>
        <path d="M62 30h-30l-4-7h38z" />
        <path d="M30 30v6h32v-6" />
      </>
    ),
  },
  {
    id: "head",
    pivot: [44, 50],
    node: (
      <>
        <path d="M58 36c-4-3-10-4-15-2-7 3-11 9-11 16 0 5 2 9 5 12l-4 5 5 3" />
        <path d="M33 44c-2 1-3 3-3 5m8-9c1 0 2 1 2 2" />
        <path d="M37 60c2 2 5 3 8 2" />
      </>
    ),
  },
  {
    id: "hair",
    pivot: [61, 52],
    node: (
      <>
        <path d="M58 36c4 4 6 10 6 16 0 8-3 14-8 18" />
        <path d="M62 44c2 4 2 9 1 13" />
      </>
    ),
  },
  {
    id: "body",
    pivot: [50, 98],
    node: (
      <>
        <path d="M34 70c-9 3-16 10-16 20v30h64V90c0-10-7-17-16-20" />
        <path d="M34 70 68 120M44 70l24 36" />
        <path d="M26 96c-3 6-4 14-4 24" />
      </>
    ),
  },
  {
    id: "halberd",
    pivot: [70, 84],
    node: (
      <>
        <path d="M74 34v86M70 40l8-8 4 6-8 8z" />
        <circle cx="52" cy="102" r="4" />
        <circle cx="40" cy="112" r="3" />
      </>
    ),
  },
];

const QUEEN: FaceGroup[] = [
  {
    id: "crown",
    pivot: [50, 27],
    node: (
      <>
        <path d="M32 34 36 18l10 10 4-13 4 13 10-10 4 16z" />
        <path d="M32 34h36v6H32z" />
        <circle cx="50" cy="24" r="3" />
      </>
    ),
  },
  {
    id: "hair",
    pivot: [50, 62],
    node: (
      <>
        <path d="M38 40c0 14 5 24 12 24s12-10 12-24" />
        <path d="M38 40c-4 6-6 16-6 26 0 12 3 22 8 28" />
        <path d="M62 40c4 6 6 16 6 26 0 12-3 22-8 28" />
      </>
    ),
  },
  {
    id: "face",
    pivot: [50, 54],
    node: (
      <>
        <path d="M44 48c1-1 3-1 4 0m4 0c1-1 3-1 4 0" />
        <path d="M50 50v6l-2 2" />
        <path d="M45 60c3 2 7 2 10 0" />
      </>
    ),
  },
  {
    id: "bodice",
    pivot: [50, 112],
    node: (
      <>
        <path d="M40 94c-10 4-16 12-16 22v16h52v-16c0-10-6-18-16-22" />
        <path d="M40 94 50 118 60 94" />
        <path d="M50 118v14" />
      </>
    ),
  },
  { id: "pendant", pivot: [50, 82], node: <path d="m50 76 5 6-5 6-5-6z" /> },
];

const KING: FaceGroup[] = [
  {
    id: "crown",
    pivot: [50, 26],
    node: (
      <>
        <path d="M30 36 34 16l12 12 4-14 4 14 12-12 4 20z" />
        <path d="M30 36h40v6H30z" />
        <path d="M50 12v8M46 16h8" />
      </>
    ),
  },
  {
    id: "head",
    pivot: [50, 52],
    node: (
      <>
        <path d="M38 42c0 8 1 14 3 19" />
        <path d="M62 42c0 8-1 14-3 19" />
        <path d="M41 61c2 6 5 10 9 10s7-4 9-10" />
        <path d="M38 52h8M54 52h8" />
        <path d="M50 54v5l-2 2" />
      </>
    ),
  },
  {
    id: "beard",
    pivot: [50, 76],
    node: (
      <>
        <path d="M36 58c-2 12 1 24 6 32 3 5 5 8 8 8s5-3 8-8c5-8 8-20 6-32" />
        <path d="M44 74c4 2 8 2 12 0" />
      </>
    ),
  },
  {
    id: "robe",
    pivot: [50, 112],
    node: (
      <>
        <path d="M38 92c-11 4-18 12-18 22v18h60v-18c0-10-7-18-18-22" />
        <path d="M38 92 50 114 62 92" />
        <path d="M30 100c-3 6-4 16-4 32M70 100c3 6 4 16 4 32" />
      </>
    ),
  },
  {
    id: "accents",
    pivot: [50, 116],
    node: (
      <>
        <path d="m50 114 6 7-6 7-6-7z" />
        <circle cx="35" cy="112" r="2.5" />
        <circle cx="65" cy="112" r="2.5" />
      </>
    ),
  },
];

export const FACE_ART: Record<"J" | "Q" | "K", FaceGroup[]> = {
  J: JACK,
  Q: QUEEN,
  K: KING,
};

/** Where PokerCard places the 100 x 132 art box inside the 250 x 350 card. */
export const FACE_PLACE = { x: (250 - 100 * 1.52) / 2, y: 74, scale: 1.52 };


/** The stroke the art is drawn with. Shared so a flying piece matches. */
export function faceStroke(gid: string) {
  return {
    fill: "none",
    stroke: `url(#${gid})`,
    strokeWidth: 2.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}
