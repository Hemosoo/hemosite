import { useId } from "react";
import {
  CARD_W,
  CARD_H,
  CARD_R,
  FIELD,
  INK,
  PIP_LAYOUT,
  pipSize,
  SUIT_COLOR,
  isFace,
  type Rank,
  type Suit,
} from "./cardTheme";
import SuitIcon from "./SuitIcon";
import FaceCard from "./FaceCard";
import CardBack from "./CardBack";

/**
 * A playing card, entirely vector.
 *
 * Rendered from the shared theme rather than drawn per card: the 52 faces are
 * a corner index, a pip layout and — for the courts — one of three pieces of
 * line art. Nothing rasterises, so the turn and river can scale a card up
 * several times without it going soft.
 */

/** Rank glyph plus its suit, as it appears in a corner. */
function Corner({ rank, suit }: { rank: Rank; suit: Suit }) {
  const color = SUIT_COLOR[suit];
  return (
    <g>
      <text
        x="0"
        y="0"
        fill={color}
        fontSize="40"
        fontWeight="600"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        letterSpacing="-1"
      >
        {rank}
      </text>
      <SuitIcon suit={suit} size={26} x={-1} y={9} />
    </g>
  );
}

function Pips({ rank, suit }: { rank: Rank; suit: Suit }) {
  const pips = PIP_LAYOUT[rank];
  if (!pips) return null;
  const cx = CARD_W / 2;
  const s = pipSize(rank);
  const span = FIELD.bottom - FIELD.top - s;

  return (
    <g>
      {pips.map(([col, row], i) => {
        const x = cx + col * FIELD.colOffset - s / 2;
        const y = FIELD.top + row * span;
        // Pips below the midline print upside down, as on a real card.
        const flip = row > 0.5;
        return (
          <g
            key={i}
            transform={flip ? `rotate(180 ${x + s / 2} ${y + s / 2})` : undefined}
          >
            <SuitIcon suit={suit} size={s} x={x} y={y} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * The ace: one oversized suit, centred.
 *
 * Spades gets the hero treatment from the reference — larger still, a violet
 * edge on the card, and an inner outline echoing the silhouette.
 */
function Ace({ suit, id }: { suit: Suit; id: string }) {
  const hero = suit === "spades";
  const size = hero ? 150 : 124;
  const x = (CARD_W - size) / 2;
  const y = (CARD_H - size) / 2 - 6;
  const gid = `ace-${id}`;
  return (
    <>
      {hero && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SUIT_COLOR.spades} />
            <stop offset="1" stopColor={INK.violet} />
          </linearGradient>
        </defs>
      )}
      <SuitIcon suit={suit} size={size} x={x} y={y} color={hero ? `url(#${gid})` : undefined} />
      {hero && (
        <g
          transform={`translate(${x + size * 0.18} ${y + size * 0.2}) scale(${(size * 0.64) / 100})`}
          fill="none"
          stroke={INK.face}
          strokeWidth="3"
          opacity="0.75"
        >
          <path d="M50 7C50 7 89 39 89 62c0 13-9.5 22.5-21.5 22.5-6 0-11-2.5-14-6.5l5 17.5H41.5l5-17.5c-3 4-8 6.5-14 6.5C15.5 84.5 6 75 6 62 6 39 50 7 50 7Z" />
        </g>
      )}
    </>
  );
}

export interface PokerCardProps {
  rank?: Rank;
  suit?: Suit;
  faceUp?: boolean;
  className?: string;
  /** Accessible name; falls back to "Ace of spades" style text. */
  label?: string;
}

export default function PokerCard({
  rank,
  suit,
  faceUp = true,
  className,
  label,
}: PokerCardProps) {
  const uid = useId().replace(/:/g, "");
  const showFace = faceUp && rank && suit;
  const heroAce = showFace && rank === "A" && suit === "spades";

  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      className={className}
      role="img"
      aria-label={label ?? (showFace ? `${rank} of ${suit}` : "face-down card")}
      // preserveAspectRatio default keeps the 2.5:3.5 proportion at any size.
    >
      {!showFace ? (
        <CardBack />
      ) : (
        <>
          <rect
            x="0"
            y="0"
            width={CARD_W}
            height={CARD_H}
            rx={CARD_R}
            fill={INK.face}
          />
          <rect
            x="1.5"
            y="1.5"
            width={CARD_W - 3}
            height={CARD_H - 3}
            rx={CARD_R - 1}
            fill="none"
            stroke={heroAce ? INK.violet : INK.faceEdge}
            strokeWidth="2.5"
            opacity={heroAce ? 0.85 : 1}
          />

          {/* Corner indices, the second rotated through the centre. */}
          <g transform="translate(20 46)">
            <Corner rank={rank} suit={suit} />
          </g>
          <g transform={`rotate(180 ${CARD_W / 2} ${CARD_H / 2}) translate(20 46)`}>
            <Corner rank={rank} suit={suit} />
          </g>

          {rank === "A" && <Ace suit={suit} id={uid} />}
          {isFace(rank) && (
            <g transform={`translate(${(CARD_W - 100 * 1.52) / 2} 74) scale(1.52)`}>
              <FaceCard rank={rank as "J" | "Q" | "K"} suit={suit} id={uid} />
            </g>
          )}
          {!isFace(rank) && rank !== "A" && <Pips rank={rank} suit={suit} />}
        </>
      )}
    </svg>
  );
}
