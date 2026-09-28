/**
 * The flop, as one event.
 *
 * All three cards are driven from a single requestAnimationFrame loop so they
 * stay choreographed against each other — which is the whole point, and the
 * reason this is not the single-card reveal played three times.
 *
 * It lays itself over the board row and reads the real slot rectangles rather
 * than recomputing the layout, so it follows the board at every viewport size
 * and cannot drift out of step with it. Every path ends at the identity, so
 * the swap back to ordinary board cards is exact.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card } from "../../poker/cards";
import type { FlopSpec } from "../../poker/flopReveals";
import { flopFrame } from "./flopFlight";

interface Slot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function FlopReveal({
  cards,
  spec,
  rowRef,
  renderCard,
}: {
  /** The three the engine already dealt. This only decides how they arrive. */
  cards: Card[];
  spec: FlopSpec;
  /** The board row, whose first three slots these cards land in. */
  rowRef: React.RefObject<HTMLDivElement | null>;
  renderCard: (card: Card | undefined, hidden: boolean) => React.ReactNode;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const outerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Measured once, from the row itself. Reading the real slots keeps the
  // choreography in the board's own units at any size.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const base = row.getBoundingClientRect();
    const got: Slot[] = [];
    for (let i = 0; i < 3; i++) {
      const el = row.children[i] as HTMLElement | undefined;
      if (!el) return;
      const b = el.getBoundingClientRect();
      got.push({ left: b.left - base.left, top: b.top - base.top, width: b.width, height: b.height });
    }
    setSlots(got);
  }, [rowRef, spec]);

  useEffect(() => {
    if (!slots) return;
    const unit = slots[0].width;
    // Distance between neighbouring slots, in card widths: what lets the three
    // stack on one slot without the gap being written down anywhere here.
    const pitch = (slots[1].left - slots[0].left) / unit;
    const started = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / spec.totalMs);
      for (let i = 0; i < 3; i++) {
        const outer = outerRefs.current[i];
        const inner = innerRefs.current[i];
        if (!outer || !inner) continue;
        const f = flopFrame(spec, i, t, pitch);
        outer.style.transform =
          `translate(${(f.x * unit).toFixed(2)}px, ${(f.y * unit).toFixed(2)}px) ` +
          `rotate(${f.rotate.toFixed(2)}deg) scale(${f.scale.toFixed(4)})`;
        outer.style.opacity = f.opacity.toFixed(3);
        outer.style.zIndex = String(10 + Math.round(f.depth * 10));
        inner.style.transform = `rotateY(${f.flip.toFixed(2)}deg)`;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slots, spec]);

  if (!slots) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 25 }}>
      {slots.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            // Depth belongs to each card, so one can pass nearer than another.
            perspective: 1000,
          }}
        >
          <div ref={(el) => { outerRefs.current[i] = el; }} style={{ width: "100%", height: "100%", opacity: 0 }}>
            <div
              ref={(el) => { innerRefs.current[i] = el; }}
              style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transform: "rotateY(180deg)" }}
            >
              {/* Two real faces. Backface culling swaps them at 90 degrees, so
                  the rank never shows through mirrored. */}
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
                {renderCard(cards[i], false)}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {renderCard(undefined, true)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
