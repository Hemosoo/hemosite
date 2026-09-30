/**
 * Crystal Spread: the flop built out of one field of fragments.
 *
 * Three cards, one clock, one requestAnimationFrame loop. The board starts
 * empty; fragments of the three real cards converge on it, divide between
 * them, and construct them — and while that is happening the three are pulling
 * apart from each other into their slots. The row opens out as it becomes
 * legible, and the last fragments cascade into all three at once.
 *
 * The rendering is the crystallize reveal's, because it has to be the same
 * material: each fragment is the actual card seen through its own cut, not a
 * generic shard that is swapped for a card at the end. Seated fragments are
 * not drawn at all — their polygon joins a growing clip over a single copy of
 * the card, and once the last one lands the clip is dropped, so the finished
 * card is pixel-identical to an ordinary one rather than a mosaic with seams.
 *
 * It lays itself over the board row and reads the real slot rectangles, so it
 * follows the board at every viewport size, and every path ends at the
 * identity, so the swap back to ordinary board cards is exact.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Card } from "../../poker/cards";
import { toFace } from "../../poker/cardFace";
import type { CrystalSpreadSpec } from "../../poker/flopReveals";
import { CARD_H, CARD_R, CARD_W } from "./cardTheme";
import { TINT_FADE_MS, cardShadow } from "./cardLayout";
import { CardFace } from "./PokerCard";
import { cardShards, shardPoints } from "./cardShards";
import { seamGlow, shardFrame } from "./crystalFlight";
import { crystalCardFrame, planCrystalSpread } from "./crystalSpreadFlight";

interface Slot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function CrystalSpread({
  cards,
  spec,
  rowRef,
  tintFor,
}: {
  /** The three the engine already dealt. This only decides how they arrive. */
  cards: Card[];
  spec: CrystalSpreadSpec;
  /** The board row, whose first three slots these cards land in. */
  rowRef: React.RefObject<HTMLDivElement | null>;
  /** A card that completes a hand finishes already lit. */
  tintFor: (card: Card) => string | undefined;
}) {
  const uid = useId().replace(/:/g, "");
  const [slots, setSlots] = useState<Slot[] | null>(null);

  // Each card is cut differently — three identical breaks would read as one
  // stencil used three times — but all from the one reveal's seed.
  const perCard = useMemo(
    () => cards.map((_, i) => cardShards((spec.seed ^ (0x9e3779b9 * (i + 1))) >>> 0, "coarse")),
    [cards, spec.seed]
  );

  const pitch = slots && slots[0].width ? (slots[1].left - slots[0].left) / slots[0].width : 1.1;
  const flights = useMemo(
    () => planCrystalSpread(perCard, spec, pitch),
    [perCard, spec, pitch]
  );

  const [sheets, setSheets] = useState<Array<string | null>>(() => cards.map(() => null));
  const faceRefs = useRef<Array<SVGGElement | null>>([]);
  const rootRefs = useRef<Array<SVGSVGElement | null>>([]);
  const holderRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Array<SVGGElement | null>>([]);
  const assembledRefs = useRef<Array<SVGGElement | null>>([]);
  const flashRefs = useRef<Array<SVGRectElement | null>>([]);
  const flyRefs = useRef<Array<Array<SVGGElement | null>>>([[], [], []]);
  const clipRefs = useRef<Array<Array<SVGPolygonElement | null>>>([[], [], []]);
  const seamRefs = useRef<Array<Array<SVGPolygonElement | null>>>([[], [], []]);

  // Measured from the row itself, so the choreography is in the board's own
  // units at any size.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const base = row.getBoundingClientRect();
    const got: Slot[] = [];
    for (let i = 0; i < 3; i++) {
      const el = row.children[i] as HTMLElement | undefined;
      if (!el) return;
      const b = el.getBoundingClientRect();
      got.push({
        left: b.left - base.left,
        top: b.top - base.top,
        width: b.width,
        height: b.height,
      });
    }
    setSlots(got);
  }, [rowRef, spec]);

  // Each face, flattened to one self-contained image its own fragments share.
  // Re-rendering the live card subtree through a clip path once per piece in
  // flight is what took the single-card version of this to three frames a
  // second; here there would be three cards' worth of it at once.
  //
  // `slots` is in the dependencies because nothing at all is rendered until
  // the row has been measured — including the faces this reads. Without it
  // this ran once against a tree that did not exist yet, quietly produced
  // three nulls, and the reveal played with no fragments in the air: the
  // cards simply grew out of their own clip.
  useEffect(() => {
    setSheets(
      cards.map((_, i) => {
        const g = faceRefs.current[i];
        if (!g) return null;
        const doc =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
          g.innerHTML +
          `</svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc)}`;
      })
    );
  }, [cards, slots]);

  useEffect(() => {
    if (!slots) return;
    const unit = slots[0].width;
    const started = performance.now();
    let raf = 0;

    const unclipped = cards.map(() => false);
    // Which phase each fragment was in last frame. Writing `display` every
    // frame for every fragment is hundreds of attribute mutations that change
    // nothing; only transitions are worth writing.
    const phase = flights.map((f) => new Array<number>(f.length).fill(-1));
    const glowing = flights.map((f) => new Array<boolean>(f.length).fill(false));

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / spec.totalMs);

      for (let k = 0; k < flights.length; k++) {
        // The card's own drift out of the huddle and into its slot.
        const cf = crystalCardFrame(spec, k, t, pitch);
        const holder = holderRefs.current[k];
        if (holder) holder.style.transform = `translate(${(cf.x * unit).toFixed(2)}px, 0)`;
        cardRefs.current[k]?.setAttribute(
          "transform",
          `translate(${CARD_W / 2} ${CARD_H / 2}) scale(${cf.scale.toFixed(4)}) ` +
            `translate(${-CARD_W / 2} ${-CARD_H / 2})`
        );
        flashRefs.current[k]?.setAttribute("opacity", cf.flash.toFixed(3));

        for (let i = 0; i < flights[k].length; i++) {
          const f = flights[k][i];
          const fly = flyRefs.current[k][i];
          const seated = clipRefs.current[k][i];
          const seam = seamRefs.current[k][i];
          const frame = shardFrame(f, t);

          const state = frame ? 1 : t >= f.lock ? 2 : 0;
          if (state !== phase[k][i]) {
            phase[k][i] = state;
            fly?.setAttribute("display", state === 1 ? "inline" : "none");
            // Past its lock a fragment belongs to the assembled card, not itself.
            seated?.setAttribute("display", state === 2 ? "inline" : "none");
          }
          if (frame && fly) {
            fly.setAttribute("transform", frame.transform);
            fly.setAttribute("opacity", frame.opacity.toFixed(3));
          }

          if (seam) {
            const glow = seamGlow(f, t);
            // Hidden rather than transparent: an element at zero opacity is
            // still composited, and there are dozens of these per card.
            if (glow > 0) {
              if (!glowing[k][i]) {
                glowing[k][i] = true;
                seam.setAttribute("display", "inline");
              }
              seam.setAttribute("opacity", glow.toFixed(3));
            } else if (glowing[k][i]) {
              glowing[k][i] = false;
              seam.setAttribute("display", "none");
            }
          }
        }

        // Once a card has seated everything, the clip is redundant, and
        // dropping it removes every shared-edge seam in one go.
        if (!unclipped[k] && t >= spec.phase.lastLock) {
          unclipped[k] = true;
          assembledRefs.current[k]?.removeAttribute("clip-path");
          // A card only casts its shadow once it is a card.
          rootRefs.current[k]?.style.setProperty("filter", cardShadow(tintFor(cards[k])));
        }
      }

      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `tintFor` is read only at completion and changes identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, spec, flights, pitch, cards]);

  if (!slots) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 25 }}>
      {slots.map((s, k) => (
        <div
          key={k}
          style={{ position: "absolute", left: s.left, top: s.top, width: s.width, height: s.height }}
        >
          <div
            ref={(el) => {
              holderRefs.current[k] = el;
            }}
            // Written inline as well as every frame, so the very first frame is
            // already huddled rather than spread: the loop's first write lands
            // a frame after mount.
            style={{
              width: "100%",
              height: "100%",
              transform: `translate(${(crystalCardFrame(spec, k, 0, pitch).x * s.width).toFixed(2)}px, 0)`,
            }}
          >
            <svg
              ref={(el) => {
                rootRefs.current[k] = el;
              }}
              viewBox={`0 0 ${CARD_W} ${CARD_H}`}
              className="h-full w-full"
              // Fragments spend their flight well outside the card's own box.
              // The shadow is added at completion: one under a half-built card
              // gives away a solid object that is not there yet.
              style={{ overflow: "visible", transition: `filter ${TINT_FADE_MS}ms ease-out` }}
              aria-hidden
            >
              <defs>
                {/* The real card, defined once. Everything below is this. */}
                <g
                  id={`csf-${uid}-${k}`}
                  ref={(el) => {
                    faceRefs.current[k] = el;
                  }}
                >
                  <CardFace
                    rank={toFace(cards[k]).rank}
                    suit={toFace(cards[k]).suit}
                    tint={tintFor(cards[k])}
                    uid={`${uid}-${k}`}
                  />
                </g>

                {perCard[k].map((sh) => (
                  <clipPath key={sh.id} id={`csh-${uid}-${k}-${sh.id}`} clipPathUnits="userSpaceOnUse">
                    <polygon points={shardPoints(sh)} />
                  </clipPath>
                ))}

                {/* Grows as fragments seat: the card is revealed through it. */}
                <clipPath id={`csb-${uid}-${k}`} clipPathUnits="userSpaceOnUse">
                  {perCard[k].map((sh, i) => (
                    <polygon
                      key={sh.id}
                      ref={(el) => {
                        clipRefs.current[k][i] = el;
                      }}
                      points={shardPoints(sh)}
                      display="none"
                    />
                  ))}
                </clipPath>
              </defs>

              <g
                ref={(el) => {
                  cardRefs.current[k] = el;
                }}
              >
                <g
                  ref={(el) => {
                    assembledRefs.current[k] = el;
                  }}
                  clipPath={`url(#csb-${uid}-${k})`}
                >
                  <use href={`#csf-${uid}-${k}`} />
                </g>

                {/* The seam light: an outline that flares as a piece seats. */}
                {perCard[k].map((sh, i) => (
                  <polygon
                    key={sh.id}
                    ref={(el) => {
                      seamRefs.current[k][i] = el;
                    }}
                    points={shardPoints(sh)}
                    fill="none"
                    stroke="#56b6c2"
                    strokeWidth="1.2"
                    display="none"
                  />
                ))}

                {/* Completion: a brief light along all three cards' edges at
                    once, which is the only thing that marks the flop as
                    finished. Deliberately slighter than the turn's. */}
                <rect
                  ref={(el) => {
                    flashRefs.current[k] = el;
                  }}
                  x="1"
                  y="1"
                  width={CARD_W - 2}
                  height={CARD_H - 2}
                  rx={CARD_R}
                  fill="none"
                  stroke="#d7dce5"
                  strokeWidth="2.5"
                  opacity="0"
                />
              </g>

              {/* Fragments still in the air, each the card seen through its
                  own cut. */}
              {sheets[k] &&
                perCard[k].map((sh, i) => (
                  <g
                    key={sh.id}
                    ref={(el) => {
                      flyRefs.current[k][i] = el;
                    }}
                    display="none"
                  >
                    <image
                      href={sheets[k]!}
                      x="0"
                      y="0"
                      width={CARD_W}
                      height={CARD_H}
                      clipPath={`url(#csh-${uid}-${k}-${sh.id})`}
                    />
                  </g>
                ))}
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
