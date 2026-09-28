/**
 * A card, taken apart into the pieces the assembly reveal flies around.
 *
 * Every piece is drawn from the same components and the same layout data that
 * PokerCard uses, in absolute card coordinates. That is the whole trick: a
 * part's resting transform is the identity, so when its flight reaches zero
 * offset it is, to the pixel, where the finished card wants it.
 *
 * Pieces are grouped by how much they give away. The suit shows first, then
 * the rank, then everything that completes the card — long enough for a
 * player to work out what is landing before it lands.
 */
import type { ReactNode } from "react";
import { isFace, type Rank, type Suit } from "./cardTheme";
import {
  CORNER_BR,
  CORNER_TL,
  FACE_PLACE,
  aceLayout,
  pipPlacements,
  through,
  type PipPlacement,
} from "./cardLayout";
import { AceInner, AceSuit, CornerRank, CornerSuit, Pip } from "./cardPieces";
import { FACE_ART, faceStroke } from "./faceArt";

/** 0 hints the suit, 1 shows the rank, 2 completes the card. */
export type Wave = 0 | 1 | 2;

export interface CardPart {
  id: string;
  /** Rough visual centre in card coordinates: what the piece spins about. */
  pivot: [number, number];
  wave: Wave;
  /**
   * How central the piece is, 0..1. Used to order the locks so the outermost
   * pieces settle first and the centre of the card completes last.
   */
  centrality: number;
  /**
   * Stroke-only line art. A pip is a filled shape that survives being flown
   * small; a court figure is a 2.1-unit line, and at a deep pass it thins to
   * well under a pixel and disappears. Delicate pieces are kept near the
   * camera so the artwork is actually watchable on its way in.
   */
  delicate?: boolean;
  /** Drawn in absolute card coordinates, exactly as PokerCard draws it. */
  node: ReactNode;
}

/**
 * Independently flying pieces, at most. Past this the effect stops reading as
 * choreography and starts reading as confetti; a ten in particular has to
 * travel partly in clusters.
 */
const MAX_SOLO_PIPS = 6;

const CENTRE: [number, number] = [125, 175];

const dist = (p: [number, number]) =>
  Math.hypot(p[0] - CENTRE[0], p[1] - CENTRE[1]) / Math.hypot(CENTRE[0], CENTRE[1]);

const pipPivot = (p: PipPlacement): [number, number] => [p.x + p.size / 2, p.y + p.size / 2];

/**
 * Splits the pips into pieces that fly.
 *
 * A few lead the reveal as the suit hint. Past MAX_SOLO_PIPS the remainder
 * travel as one or two clusters, which land as a unit and therefore still
 * land exactly: a cluster is only a <g> around pips already drawn at their
 * final coordinates.
 */
function pipParts(rank: Rank, suit: Suit, seed: number): CardPart[] {
  const places = pipPlacements(rank);
  if (!places.length) return [];

  // Which pip leads varies per reveal, within a fixed range — the reveal
  // should feel the same every time, not identical every time.
  const lead = seed % places.length;
  const order = places.map((_, i) => (i + lead) % places.length);

  const hintCount = Math.min(3, places.length);
  const hints = new Set(order.slice(0, hintCount));
  const solo = new Set(order.slice(0, Math.min(MAX_SOLO_PIPS, places.length)));

  const parts: CardPart[] = [];
  for (const i of solo) {
    const p = places[i];
    parts.push({
      id: `pip-${i}`,
      pivot: pipPivot(p),
      wave: hints.has(i) ? 0 : 2,
      centrality: 1 - dist(pipPivot(p)),
      node: <Pip suit={suit} p={p} />,
    });
  }

  const rest = order.filter((i) => !solo.has(i));
  if (rest.length) {
    // Split by side, so the two clusters come in from opposite directions.
    const sides: [number[], number[]] = [[], []];
    for (const i of rest) sides[places[i].x + places[i].size / 2 < CENTRE[0] ? 0 : 1].push(i);
    sides.forEach((group, s) => {
      if (!group.length) return;
      const pv: [number, number] = [
        group.reduce((a, i) => a + pipPivot(places[i])[0], 0) / group.length,
        group.reduce((a, i) => a + pipPivot(places[i])[1], 0) / group.length,
      ];
      parts.push({
        id: `pip-cluster-${s}`,
        pivot: pv,
        wave: 2,
        centrality: 1 - dist(pv),
        node: (
          <>
            {group.map((i) => (
              <Pip key={i} suit={suit} p={places[i]} />
            ))}
          </>
        ),
      });
    });
  }
  return parts;
}

function faceParts(rank: "J" | "Q" | "K", gid: string): CardPart[] {
  const { x, y, scale } = FACE_PLACE;
  return FACE_ART[rank].map((g) => {
    const pivot: [number, number] = [x + g.pivot[0] * scale, y + g.pivot[1] * scale];
    return {
      id: `art-${g.id}`,
      pivot,
      wave: 2 as Wave,
      centrality: 1 - dist(pivot),
      delicate: true,
      // Transform and stroke on one <g>, which is what PokerCard ends up with
      // once its placement wrapper and FaceCard's stroke wrapper are composed.
      node: (
        <g {...faceStroke(gid)} transform={`translate(${x} ${y}) scale(${scale})`}>
          {g.node}
        </g>
      ),
    };
  });
}

/**
 * The card's pieces, plus whatever <defs> they refer to.
 *
 * `uid` must be unique in the document, and the gradients it names are the
 * same ones PokerCard builds, so the handover at the end of the reveal is
 * invisible.
 */
export function cardParts(
  rank: Rank,
  suit: Suit,
  uid: string,
  seed: number
): { parts: CardPart[]; heroAce: boolean } {
  const heroAce = rank === "A" && suit === "spades";
  const aceGid = `ace-${uid}`;
  const faceGid = `face-${uid}`;

  const corner = (tag: string, transform: string, pivot: [number, number], node: ReactNode) => ({
    id: tag,
    pivot,
    centrality: 1 - dist(pivot),
    node: <g transform={transform}>{node}</g>,
  });

  const parts: CardPart[] = [
    // The corner suits lead: they are small, and they give away only the suit.
    {
      ...corner("suit-tl", CORNER_TL, [32, 68], <CornerSuit suit={suit} />),
      wave: 0 as Wave,
    },
    {
      ...corner("suit-br", CORNER_BR, through(32, 68), <CornerSuit suit={suit} />),
      wave: 0 as Wave,
    },
    // Then the rank, which is the moment the card becomes guessable.
    {
      ...corner("rank-tl", CORNER_TL, [32, 32], <CornerRank rank={rank} suit={suit} />),
      wave: 1 as Wave,
    },
    {
      ...corner("rank-br", CORNER_BR, through(32, 32), <CornerRank rank={rank} suit={suit} />),
      wave: 1 as Wave,
    },
  ];

  if (rank === "A") {
    const { size, x, y } = aceLayout(suit);
    const pivot: [number, number] = [x + size / 2, y + size / 2];
    parts.push({
      id: "ace",
      pivot,
      wave: 2,
      centrality: 1 - dist(pivot),
      node: <AceSuit suit={suit} gid={aceGid} />,
    });
    if (heroAce) {
      parts.push({
        id: "ace-inner",
        pivot,
        wave: 2,
        centrality: 1,
        node: <AceInner suit={suit} />,
      });
    }
  } else if (isFace(rank)) {
    parts.push(...faceParts(rank as "J" | "Q" | "K", faceGid));
  } else {
    parts.push(...pipParts(rank, suit, seed));
  }

  return { parts, heroAce };
}
