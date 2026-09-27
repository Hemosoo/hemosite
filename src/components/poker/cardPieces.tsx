/**
 * The card's visual pieces, as components.
 *
 * PokerCard draws these in one pass; the assembly reveal draws the same ones
 * individually so it can fly them around the table and land them exactly.
 * Both render from here, which is what makes the landing pixel-exact — there
 * is no second copy of the design to drift out of sync. Geometry lives next
 * door in cardLayout.
 */
import { CARD_H, CARD_R, CARD_W, INK, SUIT_COLOR } from "./cardTheme";
import type { Rank, Suit } from "./cardTheme";
import { aceLayout, type PipPlacement } from "./cardLayout";
import SuitIcon from "./SuitIcon";

/**
 * The blank stock: fill, an optional tint wash, then the edge.
 *
 * The hero ace has always worn the deck's violet edge. `tint` generalises it:
 * any card carrying the hand gets the same treatment, so the ace is no longer
 * the only card on the table with a colour of its own.
 */
export function CardBody({ heroAce, tint }: { heroAce?: boolean; tint?: string }) {
  return (
    <>
      <rect x="0" y="0" width={CARD_W} height={CARD_H} rx={CARD_R} fill={INK.face} />
      {tint && (
        <rect x="0" y="0" width={CARD_W} height={CARD_H} rx={CARD_R} fill={tint} opacity="0.13" />
      )}
      <rect
        x="1.5"
        y="1.5"
        width={CARD_W - 3}
        height={CARD_H - 3}
        rx={CARD_R - 1}
        fill="none"
        stroke={tint ?? (heroAce ? INK.violet : INK.faceEdge)}
        strokeWidth={tint ? "3.5" : "2.5"}
        opacity={tint ? 1 : heroAce ? 0.85 : 1}
      />
    </>
  );
}

export function CornerRank({ rank, suit }: { rank: Rank; suit: Suit }) {
  return (
    <text
      x="0"
      y="0"
      fill={SUIT_COLOR[suit]}
      fontSize="40"
      fontWeight="600"
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      letterSpacing="-1"
    >
      {rank}
    </text>
  );
}

export function CornerSuit({ suit }: { suit: Suit }) {
  return <SuitIcon suit={suit} size={26} x={-1} y={9} />;
}

/** One pip, drawn where `pipPlacements` says. */
export function Pip({ suit, p }: { suit: Suit; p: PipPlacement }) {
  const body = <SuitIcon suit={suit} size={p.size} x={p.x} y={p.y} />;
  if (!p.flip) return body;
  return <g transform={`rotate(180 ${p.x + p.size / 2} ${p.y + p.size / 2})`}>{body}</g>;
}

export function AceGradient({ gid }: { gid: string }) {
  return (
    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={SUIT_COLOR.spades} />
      <stop offset="1" stopColor={INK.violet} />
    </linearGradient>
  );
}

export function AceSuit({ suit, gid }: { suit: Suit; gid: string }) {
  const { hero, size, x, y } = aceLayout(suit);
  return <SuitIcon suit={suit} size={size} x={x} y={y} color={hero ? `url(#${gid})` : undefined} />;
}

/** The echoed silhouette inside the hero ace. Spades only. */
export function AceInner({ suit }: { suit: Suit }) {
  const { hero, size, x, y } = aceLayout(suit);
  if (!hero) return null;
  return (
    <g
      transform={`translate(${x + size * 0.18} ${y + size * 0.2}) scale(${(size * 0.64) / 100})`}
      fill="none"
      stroke={INK.face}
      strokeWidth="3"
      opacity="0.75"
    >
      <path d="M50 7C50 7 89 39 89 62c0 13-9.5 22.5-21.5 22.5-6 0-11-2.5-14-6.5l5 17.5H41.5l5-17.5c-3 4-8 6.5-14 6.5C15.5 84.5 6 75 6 62 6 39 50 7 50 7Z" />
    </g>
  );
}
