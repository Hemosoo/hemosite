/**
 * The dismantle / assembly reveal.
 *
 * The card's own pieces — corner indices, pips, face art, the ace — fly in
 * from around the table on separate curved paths and snap onto the stock as
 * it hits the felt. Nothing here is generic: every flying object is the same
 * component, with the same geometry and colour, that the finished card draws.
 *
 * One requestAnimationFrame loop writes transforms straight to refs. There is
 * no React state per frame, no re-render while it plays, and the SVG is built
 * once and reused.
 */
import { useEffect, useId, useMemo, useRef } from "react";
import { CARD_H, CARD_R, CARD_W, isFace, type Rank, type Suit } from "./cardTheme";
import { AceGradient, CardBody } from "./cardPieces";
import { FaceGradient } from "./FaceCard";
import { cardParts } from "./cardParts";
import {
  bodyOpacity,
  contactShadow,
  frameTransform,
  partFrame,
  planFlights,
  shockwave,
} from "./assemblyFlight";
import type { AssemblySpec } from "../../poker/reveals";

export default function AssemblyReveal({
  rank,
  suit,
  spec,
}: {
  rank: Rank;
  suit: Suit;
  spec: AssemblySpec;
}) {
  const uid = useId().replace(/:/g, "");
  const { parts, heroAce } = useMemo(
    () => cardParts(rank, suit, uid, spec.seed),
    [rank, suit, uid, spec.seed]
  );
  const flights = useMemo(() => planFlights(parts, spec), [parts, spec]);

  const frameRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const ringRef = useRef<SVGRectElement>(null);
  const partRefs = useRef<Array<SVGGElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / spec.totalMs);

      const frame = frameTransform(spec, t);
      frameRef.current?.setAttribute("transform", frame.transform);
      bodyRef.current?.setAttribute("opacity", String(bodyOpacity(t)));

      if (shadowRef.current) {
        // Tightens and darkens as the stock comes down: the cue that reads as
        // height without needing a real light.
        const sh = contactShadow(spec, t, frame.lift);
        shadowRef.current.setAttribute("rx", String(sh.rx));
        shadowRef.current.setAttribute("opacity", String(sh.opacity));
      }

      for (let i = 0; i < flights.length; i++) {
        const el = partRefs.current[i];
        if (!el) continue;
        const f = partFrame(flights[i], t);
        el.setAttribute("transform", f.transform);
        el.setAttribute("opacity", f.opacity.toFixed(3));
      }

      if (ringRef.current) {
        const w = shockwave(spec, t);
        ringRef.current.setAttribute(
          "transform",
          `translate(${CARD_W / 2} ${CARD_H / 2}) scale(${w.scale}) translate(${-CARD_W / 2} ${-CARD_H / 2})`
        );
        ringRef.current.setAttribute("opacity", String(w.opacity));
      }

      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spec, flights]);

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 30 }}>
      <svg
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        // The same drop shadow the finished board card carries, so the
        // handover back to PokerCard at the end of the reveal is invisible.
        className="h-full w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
        // Pieces spend most of the reveal well outside the card's own box.
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs>
          {heroAce && <AceGradient gid={`ace-${uid}`} />}
          {isFace(rank) && <FaceGradient suit={suit} gid={`face-${uid}`} />}
          <radialGradient id={`shadow-${uid}`}>
            <stop offset="0" stopColor="#000" stopOpacity="1" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse
          ref={shadowRef}
          cx={CARD_W / 2}
          cy={CARD_H + 14}
          rx={110}
          ry={16}
          fill={`url(#shadow-${uid})`}
          opacity={0.16}
        />

        <g ref={frameRef}>
          <g ref={bodyRef} opacity={0}>
            <CardBody heroAce={heroAce} />
          </g>
          {parts.map((p, i) => (
            <g
              key={p.id}
              ref={(el) => {
                partRefs.current[i] = el;
              }}
              opacity={0}
            >
              {p.node}
            </g>
          ))}
        </g>

        {/* Punches outward from the resting outline at the moment of contact. */}
        <rect
          ref={ringRef}
          x="0"
          y="0"
          width={CARD_W}
          height={CARD_H}
          rx={CARD_R}
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          opacity={0}
        />
      </svg>
    </div>
  );
}
