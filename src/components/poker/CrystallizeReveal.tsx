/**
 * The crystallize reveal.
 *
 * The slot starts empty. Shards of the real card fly in from every direction
 * and seat permanently — a few at first, then in a cascade — until the card
 * exists. Nothing here is a stand-in: the card's face is defined once and
 * every shard is that same face seen through its own clip path, so a piece
 * carrying a corner of the 8 shows exactly that corner of the 8.
 *
 * Two layers do the work. Shards that have landed are not drawn at all —
 * their polygon joins a growing clip over a single copy of the card. Once the
 * last one seats the clip is dropped entirely, which is what makes the
 * finished card pixel-identical to an ordinary one rather than a mosaic with
 * seams.
 *
 * Shards still in the air are clipped copies of the same face, but as a
 * single <image> of it rather than the live subtree. That matters: the first
 * version re-rendered the whole card through a clip path once per piece in
 * flight, seventeen of them at the cascade, and the reveal ran at about three
 * frames a second. One image node each is the same picture at a fraction of
 * the cost, and the card that is left at the end is still the real vector.
 *
 * One requestAnimationFrame loop writes transforms straight to refs. No React
 * state per frame, and the geometry is cut once per reveal.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CARD_H, CARD_R, CARD_W, type Rank, type Suit } from "./cardTheme";
import { TINT_FADE_MS, cardShadow } from "./cardLayout";
import { CardFace } from "./PokerCard";
import { cardShards, shardPoints } from "./cardShards";
import { completionFrame, planShards, seamGlow, shardFrame } from "./crystalFlight";
import type { CrystallizeSpec } from "../../poker/reveals";

export default function CrystallizeReveal({
  rank,
  suit,
  spec,
  tint,
}: {
  rank: Rank;
  suit: Suit;
  spec: CrystallizeSpec;
  /** Carried so a card that completes a hand finishes already lit. */
  tint?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const shards = useMemo(() => cardShards(spec.seed), [spec.seed]);
  const flights = useMemo(() => planShards(shards, spec), [shards, spec]);

  const rootRef = useRef<SVGSVGElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const cardRef = useRef<SVGGElement>(null);
  const assembledRef = useRef<SVGGElement>(null);
  const flashRef = useRef<SVGRectElement>(null);
  const flyRefs = useRef<Array<SVGGElement | null>>([]);
  const clipRefs = useRef<Array<SVGPolygonElement | null>>([]);
  const seamRefs = useRef<Array<SVGPolygonElement | null>>([]);

  // The face, flattened to one self-contained image the flying shards share.
  // Built once on mount, well before the first shard is due.
  useEffect(() => {
    const g = faceRef.current;
    if (!g) return;
    const doc =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
      g.innerHTML +
      `</svg>`;
    setSheet(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc)}`);
  }, [rank, suit, tint]);

  useEffect(() => {
    let raf = 0;
    const started = performance.now();
    // Dropped once, at the moment the last shard seats.
    let unclipped = false;
    // Which phase each shard was in last frame. Writing `display` every frame
    // for every shard is dozens of attribute mutations a frame that change
    // nothing; only transitions are worth writing.
    const phase = new Array<number>(flights.length).fill(-1); // -1 unset, 0 waiting, 1 flying, 2 seated
    const glowing = new Array<boolean>(flights.length).fill(false);

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / spec.totalMs);

      for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        const fly = flyRefs.current[i];
        const slot = clipRefs.current[i];
        const seam = seamRefs.current[i];
        const frame = shardFrame(f, t);

        const now = frame ? 1 : t >= f.lock ? 2 : 0;
        if (now !== phase[i]) {
          phase[i] = now;
          fly?.setAttribute("display", now === 1 ? "inline" : "none");
          // Past its lock a shard belongs to the assembled card, not itself.
          slot?.setAttribute("display", now === 2 ? "inline" : "none");
        }
        if (frame && fly) {
          fly.setAttribute("transform", frame.transform);
          fly.setAttribute("opacity", frame.opacity.toFixed(3));
        }

        if (seam) {
          const glow = seamGlow(f, t);
          // Hidden rather than transparent: an element at zero opacity is
          // still composited, and there are dozens of these.
          if (glow > 0) {
            if (!glowing[i]) {
              glowing[i] = true;
              seam.setAttribute("display", "inline");
            }
            seam.setAttribute("opacity", glow.toFixed(3));
          } else if (glowing[i]) {
            glowing[i] = false;
            seam.setAttribute("display", "none");
          }
        }
      }

      // Once everything has seated the clip is redundant, and dropping it
      // removes every shared-edge seam in one go.
      if (!unclipped && t >= spec.phase.lastLock) {
        unclipped = true;
        assembledRef.current?.removeAttribute("clip-path");
        // The card only casts its shadow once it is a card.
        rootRef.current?.style.setProperty("filter", cardShadow(tint));
      }

      const done = completionFrame(spec, t);
      cardRef.current?.setAttribute(
        "transform",
        `translate(${CARD_W / 2} ${CARD_H / 2}) scale(${done.scale.toFixed(4)}) ` +
          `translate(${-CARD_W / 2} ${-CARD_H / 2})`
      );
      flashRef.current?.setAttribute("opacity", done.flash.toFixed(3));

      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spec, flights, tint]);

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 30 }}>
      <svg
        ref={rootRef}
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        className="h-full w-full"
        // Shards spend their flight well outside the card's own box. The card's
        // drop shadow is added at completion, not before: a shadow under a
        // half-built card gives away a solid object that is not there yet.
        style={{ overflow: "visible", transition: `filter ${TINT_FADE_MS}ms ease-out` }}
        aria-hidden
      >
        <defs>
          {/* The real card, defined once. Everything below is this. */}
          <g id={`face-${uid}`} ref={faceRef}>
            <CardFace rank={rank} suit={suit} tint={tint} uid={uid} />
          </g>

          {shards.map((s) => (
            <clipPath key={s.id} id={`sh-${uid}-${s.id}`} clipPathUnits="userSpaceOnUse">
              <polygon points={shardPoints(s)} />
            </clipPath>
          ))}

          {/* Grows as shards seat: the card is revealed through it. */}
          <clipPath id={`built-${uid}`} clipPathUnits="userSpaceOnUse">
            {shards.map((s, i) => (
              <polygon
                key={s.id}
                ref={(el) => {
                  clipRefs.current[i] = el;
                }}
                points={shardPoints(s)}
                display="none"
              />
            ))}
          </clipPath>
        </defs>

        <g ref={cardRef}>
          <g ref={assembledRef} clipPath={`url(#built-${uid})`}>
            <use href={`#face-${uid}`} />
          </g>

          {/* The seam light: an outline that flares as a piece seats and is
              out again within a twentieth of the reveal. */}
          {shards.map((s, i) => (
            <polygon
              key={s.id}
              ref={(el) => {
                seamRefs.current[i] = el;
              }}
              points={shardPoints(s)}
              fill="none"
              stroke="#56b6c2"
              strokeWidth="1.2"
              display="none"
            />
          ))}

          {/* Completion: a brief light along the card's own edge. */}
          <rect
            ref={flashRef}
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

        {/* Shards still in the air, each the card seen through its own cut. */}
        {sheet &&
          shards.map((s, i) => (
            <g
              key={s.id}
              ref={(el) => {
                flyRefs.current[i] = el;
              }}
              display="none"
            >
              <image
                href={sheet}
                x="0"
                y="0"
                width={CARD_W}
                height={CARD_H}
                clipPath={`url(#sh-${uid}-${s.id})`}
              />
            </g>
          ))}
      </svg>
    </div>
  );
}
