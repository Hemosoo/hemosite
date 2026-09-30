/**
 * The initial deal, as one event.
 *
 * Every hole card on the table is driven from a single requestAnimationFrame
 * loop, which is what lets them read as one formation rather than as a dozen
 * cards that happen to be moving at once.
 *
 * It lays itself over the whole table and measures the real seats — the slots
 * the cards are going to occupy anyway — so it follows the layout at every
 * viewport size and lands exactly where the cards live. The seats hold their
 * cards invisible while this plays and reveal them on the same frame this
 * unmounts, so there is no swap to see: a villain's copy arrives face down and
 * the real one is face down; yours turns over on the way in and is already
 * face up when it takes over.
 *
 * Villains' cards are never in this tree face up. The deal must not put hidden
 * information in the DOM that the table itself is careful to keep out of it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card } from "../../poker/cards";
import type { DealSpec } from "../../poker/dealReveals";
import { dealFrame, deckFrame, type DealTarget } from "./dealFlight";

interface Placed extends DealTarget {
  card?: Card;
}

export default function DealReveal({
  spec,
  frameRef,
  heroCards,
  renderCard,
}: {
  spec: DealSpec;
  /** The table frame these coordinates are relative to. */
  frameRef: React.RefObject<HTMLDivElement | null>;
  /** Your two, the only ones this tree is allowed to know. */
  heroCards: Card[];
  renderCard: (card: Card | undefined, hidden: boolean, w: number, h: number) => React.ReactNode;
}) {
  const [geo, setGeo] = useState<{
    w: number;
    h: number;
    seats: number;
    origin: { x: number; y: number };
    placed: Placed[];
  } | null>(null);

  const deckRef = useRef<HTMLDivElement>(null);
  const outerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Measured once, from the table itself: the seats publish the slots their
  // cards are about to occupy, so this lands on the real layout at any size
  // rather than on a second copy of it that could drift.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const base = frame.getBoundingClientRect();
    if (!base.width) return;
    // The middle of the table: the centre of the formation, and where the deck
    // sits. A little above the frame's own centre, which is where the felt is.
    const origin = { x: base.width / 2, y: base.height * 0.44 };

    const placed: Placed[] = [];
    const orders = new Set<number>();
    frame.querySelectorAll<HTMLElement>("[data-deal]").forEach((el) => {
      const [order, which, hero] = el.dataset.deal!.split(":").map(Number);
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      orders.add(order);
      placed.push({
        at: {
          x: r.left - base.left + r.width / 2 - origin.x,
          y: r.top - base.top + r.height / 2 - origin.y,
        },
        width: r.width,
        height: r.height,
        order,
        which: which as 0 | 1,
        hero: hero === 1,
        card: hero === 1 ? heroCards[which] : undefined,
      });
    });
    if (placed.length === 0) return;
    // Dealt in order: first card to every seat, then second.
    placed.sort((a, b) => a.which - b.which || a.order - b.order);
    setGeo({ w: base.width, h: base.height, seats: orders.size, origin, placed });
  }, [frameRef, heroCards, spec]);

  useEffect(() => {
    if (!geo) return;
    const { w, h, placed, seats: seatCount } = geo;
    // The deck sits at the middle of the table. Its own coordinates are the
    // same as everything else's, so a card launches from exactly where it is.
    const deck = { x: 0, y: 0 };
    const started = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / spec.totalMs);

      const d = deckFrame(spec, t);
      if (deckRef.current) {
        deckRef.current.style.transform =
          `translate(0px, ${d.lift.toFixed(2)}px) rotate(${d.tilt.toFixed(2)}deg) ` +
          `scaleY(${d.squash.toFixed(4)})`;
        deckRef.current.style.opacity = d.opacity.toFixed(3);
      }

      for (let i = 0; i < placed.length; i++) {
        const outer = outerRefs.current[i];
        const inner = innerRefs.current[i];
        if (!outer || !inner) continue;
        const f = dealFrame(spec, placed[i], i, seatCount, placed.length, t, deck, w, h);
        outer.style.transform =
          `translate3d(${f.x.toFixed(2)}px, ${f.y.toFixed(2)}px, 0) ` +
          `rotate(${f.rotate.toFixed(2)}deg) scale(${f.scale.toFixed(4)})`;
        outer.style.opacity = f.opacity.toFixed(3);
        // Local to this overlay's own stacking context, so a card passing near
        // the eye is drawn over one running deep without any of these numbers
        // meaning anything to the reveals outside.
        outer.style.zIndex = String(2 + Math.round(f.depth * 6));
        inner.style.transform =
          `rotateY(${f.flip.toFixed(2)}deg) rotateX(${f.tiltX.toFixed(2)}deg) ` +
          `rotateZ(${f.tiltY.toFixed(2)}deg)`;
      }

      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, spec]);

  if (!geo) return null;
  const { origin, placed } = geo;
  // The deck is drawn at whatever the smallest card on the table is.
  const deckW = Math.min(...placed.map((p) => p.width));
  const deckH = Math.min(...placed.map((p) => p.height));

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 40 }} aria-hidden>
      {/* The deck. It exists for the deal and no longer: a permanent stack on
          the felt is a piece of furniture this table does not otherwise have. */}
      <div
        ref={deckRef}
        style={{
          position: "absolute",
          left: origin.x - deckW / 2,
          top: origin.y - deckH / 2,
          width: deckW,
          height: deckH,
          opacity: 0,
        }}
      >
        {[2, 1, 0].map((k) => (
          <div
            key={k}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${k * 1.1}px, ${-k * 1.6}px)`,
              opacity: 1 - k * 0.18,
            }}
          >
            {renderCard(undefined, true, deckW, deckH)}
          </div>
        ))}
      </div>

      {placed.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: origin.x - p.width / 2,
            top: origin.y - p.height / 2,
            width: p.width,
            height: p.height,
            // Depth belongs to each card, so one can pass nearer than another.
            perspective: 1100,
          }}
        >
          <div
            ref={(el) => {
              outerRefs.current[i] = el;
            }}
            style={{ width: "100%", height: "100%", opacity: 0 }}
          >
            <div
              ref={(el) => {
                innerRefs.current[i] = el;
              }}
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                transformStyle: "preserve-3d",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Only your own cards have a face in this tree at all. */}
              {p.hero && p.card && (
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
                  {renderCard(p.card, false, p.width, p.height)}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {renderCard(undefined, true, p.width, p.height)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
