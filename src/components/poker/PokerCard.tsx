import { useId, type CSSProperties } from "react";
import { CARD_H, CARD_W, isFace, type Rank, type Suit } from "./cardTheme";
import { AceGradient, AceInner, AceSuit, CardBody, CornerRank, CornerSuit, Pip } from "./cardPieces";
import { CORNER_BR, CORNER_TL, FACE_PLACE, pipPlacements } from "./cardLayout";
import FaceCard from "./FaceCard";
import CardBack from "./CardBack";

/**
 * A playing card, entirely vector.
 *
 * Rendered from the shared theme rather than drawn per card: the 52 faces are
 * a corner index, a pip layout and — for the courts — one of three pieces of
 * line art. Nothing rasterises, so the turn and river can scale a card up
 * several times without it going soft.
 *
 * The individual pieces live in cardPieces, because the assembly reveal draws
 * exactly the same ones one at a time.
 */

/** Rank glyph plus its suit, as it appears in a corner. */
function Corner({ rank, suit }: { rank: Rank; suit: Suit }) {
  return (
    <g>
      <CornerRank rank={rank} suit={suit} />
      <CornerSuit suit={suit} />
    </g>
  );
}

export interface PokerCardProps {
  rank?: Rank;
  suit?: Suit;
  faceUp?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Set when this card is part of a made hand; washes and edges it. */
  tint?: string;
  /** Accessible name; falls back to "Ace of spades" style text. */
  label?: string;
}

export default function PokerCard({
  rank,
  suit,
  faceUp = true,
  className,
  style,
  tint,
  label,
}: PokerCardProps) {
  const uid = useId().replace(/:/g, "");
  const showFace = faceUp && rank && suit;
  const heroAce = !!showFace && rank === "A" && suit === "spades";
  const gid = `ace-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      className={className}
      style={style}
      role="img"
      aria-label={label ?? (showFace ? `${rank} of ${suit}` : "face-down card")}
      // preserveAspectRatio default keeps the 2.5:3.5 proportion at any size.
    >
      {!showFace ? (
        <CardBack />
      ) : (
        <>
          {heroAce && (
            <defs>
              <AceGradient gid={gid} />
            </defs>
          )}
          <CardBody tint={tint} />

          {/* Corner indices, the second rotated through the centre. */}
          <g transform={CORNER_TL}>
            <Corner rank={rank} suit={suit} />
          </g>
          <g transform={CORNER_BR}>
            <Corner rank={rank} suit={suit} />
          </g>

          {rank === "A" && (
            <>
              <AceSuit suit={suit} gid={gid} />
              <AceInner suit={suit} />
            </>
          )}
          {isFace(rank) && (
            <g transform={`translate(${FACE_PLACE.x} ${FACE_PLACE.y}) scale(${FACE_PLACE.scale})`}>
              <FaceCard rank={rank as "J" | "Q" | "K"} suit={suit} id={uid} />
            </g>
          )}
          {!isFace(rank) &&
            rank !== "A" &&
            pipPlacements(rank).map((p, i) => <Pip key={i} suit={suit} p={p} />)}
        </>
      )}
    </svg>
  );
}
