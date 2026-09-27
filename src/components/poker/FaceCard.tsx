import { SUIT_COLOR, INK, type Suit } from "./cardTheme";

/**
 * Jack, Queen and King as line art.
 *
 * Stroke only, no fills — matching the reference, where the figures read as
 * technical drawings rather than illustrations. Each is drawn in a 100 x 132
 * box and stroked with a gradient that runs from the suit colour at the crown
 * to violet at the shoulders, which is the deck's signature on these cards.
 */

const Jack = () => (
  <g>
    {/* Profile facing left, under a flat-topped hat. */}
    <path d="M62 30h-30l-4-7h38z" />
    <path d="M30 30v6h32v-6" />
    <path d="M58 36c-4-3-10-4-15-2-7 3-11 9-11 16 0 5 2 9 5 12l-4 5 5 3" />
    <path d="M33 44c-2 1-3 3-3 5m8-9c1 0 2 1 2 2" />
    <path d="M37 60c2 2 5 3 8 2" />
    {/* Hair falling behind. */}
    <path d="M58 36c4 4 6 10 6 16 0 8-3 14-8 18" />
    <path d="M62 44c2 4 2 9 1 13" />
    {/* Shoulders and sash. */}
    <path d="M34 70c-9 3-16 10-16 20v30h64V90c0-10-7-17-16-20" />
    <path d="M34 70 68 120M44 70l24 36" />
    <path d="M26 96c-3 6-4 14-4 24" />
    {/* Halberd. */}
    <path d="M74 34v86M70 40l8-8 4 6-8 8z" />
    <circle cx="52" cy="102" r="4" />
    <circle cx="40" cy="112" r="3" />
  </g>
);

const Queen = () => (
  <g>
    {/* Five-point crown with a centre stone. */}
    <path d="M32 34 36 18l10 10 4-13 4 13 10-10 4 16z" />
    <path d="M32 34h36v6H32z" />
    <circle cx="50" cy="24" r="3" />
    {/* Face and long hair. */}
    <path d="M38 40c0 14 5 24 12 24s12-10 12-24" />
    <path d="M38 40c-4 6-6 16-6 26 0 12 3 22 8 28" />
    <path d="M62 40c4 6 6 16 6 26 0 12-3 22-8 28" />
    <path d="M44 48c1-1 3-1 4 0m4 0c1-1 3-1 4 0" />
    <path d="M50 50v6l-2 2" />
    <path d="M45 60c3 2 7 2 10 0" />
    {/* Bodice with a V neck and pendant. */}
    <path d="M40 94c-10 4-16 12-16 22v16h52v-16c0-10-6-18-16-22" />
    <path d="M40 94 50 118 60 94" />
    <path d="M50 118v14" />
    <path d="m50 76 5 6-5 6-5-6z" />
  </g>
);

const King = () => (
  <g>
    {/* Crown with a cross finial. */}
    <path d="M30 36 34 16l12 12 4-14 4 14 12-12 4 20z" />
    <path d="M30 36h40v6H30z" />
    <path d="M50 12v8M46 16h8" />
    {/* Head, then a full beard that squares off the jaw. */}
    <path d="M38 42c0 8 1 14 3 19" />
    <path d="M62 42c0 8-1 14-3 19" />
    <path d="M41 61c2 6 5 10 9 10s7-4 9-10" />
    <path d="M38 52h8M54 52h8" />
    <path d="M50 54v5l-2 2" />
    <path d="M36 58c-2 12 1 24 6 32 3 5 5 8 8 8s5-3 8-8c5-8 8-20 6-32" />
    <path d="M44 74c4 2 8 2 12 0" />
    {/* Robe with a heavy collar. */}
    <path d="M38 92c-11 4-18 12-18 22v18h60v-18c0-10-7-18-18-22" />
    <path d="M38 92 50 114 62 92" />
    <path d="M30 100c-3 6-4 16-4 32M70 100c3 6 4 16 4 32" />
    <path d="m50 114 6 7-6 7-6-7z" />
    <circle cx="35" cy="112" r="2.5" />
    <circle cx="65" cy="112" r="2.5" />
  </g>
);

const ART = { J: Jack, Q: Queen, K: King };

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
  const Art = ART[rank];
  const gid = `face-${id}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SUIT_COLOR[suit]} />
          <stop offset="0.55" stopColor={SUIT_COLOR[suit]} stopOpacity="0.92" />
          <stop offset="1" stopColor={INK.violet} />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Art />
      </g>
    </>
  );
}
