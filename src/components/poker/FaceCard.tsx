import { SUIT_COLOR, INK, type Suit } from "./cardTheme";
import { FACE_ART, faceStroke } from "./faceArt";

/** The gradient the face art is stroked with. */
export function FaceGradient({ suit, gid }: { suit: Suit; gid: string }) {
  return (
    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={SUIT_COLOR[suit]} />
      <stop offset="0.55" stopColor={SUIT_COLOR[suit]} stopOpacity="0.92" />
      <stop offset="1" stopColor={INK.violet} />
    </linearGradient>
  );
}

export default function FaceCard({
  rank,
  suit,
  id,
}: {
  rank: "J" | "Q" | "K";
  suit: Suit;
  /** Unique per rendered card, so gradients don't collide in one document. */
  id: string;
}) {
  const gid = `face-${id}`;
  return (
    <>
      <defs>
        <FaceGradient suit={suit} gid={gid} />
      </defs>
      <g {...faceStroke(gid)}>
        {FACE_ART[rank].map((g) => (
          <g key={g.id}>{g.node}</g>
        ))}
      </g>
    </>
  );
}
