/**
 * A photograph that builds itself out of pieces of itself.
 *
 * The river card. It is the poker game's crystallize reveal with the card
 * taken out of it: the same cut, the same flight per piece, the same lock —
 * and, as there, the pieces are the real thing seen through their own clip
 * rather than stand-ins that get swapped for it at the end. A photograph is
 * already one image, so it does not even need the flattening step the vector
 * cards do.
 *
 * Driven by scroll rather than by a clock, so it takes a getter for its own
 * progress and reads it on its own frame. Nothing here renders on scroll.
 */
import { useEffect, useId, useMemo, useRef } from "react";
import { CARD_H, CARD_W } from "../poker/cardTheme";
import { cardShards, shardPoints } from "../poker/cardShards";
import { planShards, seamGlow, shardFrame } from "../poker/crystalFlight";
import type { CrystallizeSpec } from "../../poker/reveals";

export default function PhotoCrystallize({
  photo,
  focus,
  spec,
  progress,
  radius,
}: {
  photo: string;
  /** Where the photograph sits when it is cropped hard, as `50% 30%`. */
  focus: string;
  spec: CrystallizeSpec;
  /** Reads the reveal's own progress, 0..1. Called once a frame. */
  progress: () => number;
  /** The card's corner radius in its own coordinates. */
  radius: number;
}) {
  const uid = useId().replace(/:/g, "");
  // Coarse, as the flop's three are: fewer, larger pieces of a photograph read
  // better than many small ones, which at this size are just texture.
  const shards = useMemo(() => cardShards(spec.seed, "coarse"), [spec.seed]);
  const flights = useMemo(() => planShards(shards, spec), [shards, spec]);

  const assembledRef = useRef<SVGGElement | null>(null);
  const flyRefs = useRef<Array<SVGGElement | null>>([]);
  const clipRefs = useRef<Array<SVGPolygonElement | null>>([]);
  const seamRefs = useRef<Array<SVGPolygonElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    let unclipped = false;
    // Which phase each piece was in last frame. Writing `display` every frame
    // for every piece is dozens of attribute mutations that change nothing.
    const phase = new Array<number>(flights.length).fill(-1);
    const glowing = new Array<boolean>(flights.length).fill(false);

    const tick = () => {
      const t = progress();

      for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        const fly = flyRefs.current[i];
        const seated = clipRefs.current[i];
        const seam = seamRefs.current[i];
        const frame = shardFrame(f, t);

        const state = frame ? 1 : t >= f.lock ? 2 : 0;
        if (state !== phase[i]) {
          phase[i] = state;
          fly?.setAttribute("display", state === 1 ? "inline" : "none");
          seated?.setAttribute("display", state === 2 ? "inline" : "none");
        }
        if (frame && fly) {
          fly.setAttribute("transform", frame.transform);
          fly.setAttribute("opacity", frame.opacity.toFixed(3));
        }
        if (seam) {
          const glow = seamGlow(f, t);
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

      // Scroll runs both ways, so this has to be able to come back on.
      const done = t >= spec.phase.lastLock;
      if (done !== unclipped) {
        unclipped = done;
        if (done) assembledRef.current?.removeAttribute("clip-path");
        else assembledRef.current?.setAttribute("clip-path", `url(#pcb-${uid})`);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flights, spec, progress, uid]);

  return (
    <svg
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      className="h-full w-full"
      // Pieces spend their flight well outside the card's own box.
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <clipPath id={`pcr-${uid}`} clipPathUnits="userSpaceOnUse">
          <rect x="0" y="0" width={CARD_W} height={CARD_H} rx={radius} />
        </clipPath>
        {shards.map((s) => (
          <clipPath key={s.id} id={`pcs-${uid}-${s.id}`} clipPathUnits="userSpaceOnUse">
            <polygon points={shardPoints(s)} />
          </clipPath>
        ))}
        {/* Grows as pieces seat: the photograph is revealed through it. */}
        <clipPath id={`pcb-${uid}`} clipPathUnits="userSpaceOnUse">
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

      <g ref={assembledRef} clipPath={`url(#pcb-${uid})`}>
        <g clipPath={`url(#pcr-${uid})`}>
          <image
            href={photo}
            x="0"
            y="0"
            width={CARD_W}
            height={CARD_H}
            preserveAspectRatio={`${focus} slice`}
          />
        </g>
      </g>

      {/* The seam light: an outline that flares as a piece seats. */}
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

      {/* Pieces still in the air, each the photograph through its own cut. */}
      {shards.map((s, i) => (
        <g
          key={s.id}
          ref={(el) => {
            flyRefs.current[i] = el;
          }}
          display="none"
        >
          <image
            href={photo}
            x="0"
            y="0"
            width={CARD_W}
            height={CARD_H}
            preserveAspectRatio={`${focus} slice`}
            clipPath={`url(#pcs-${uid}-${s.id})`}
          />
        </g>
      ))}
    </svg>
  );
}
