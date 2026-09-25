import { useEffect, type RefObject } from "react";

/** Ring boundaries in px from the cursor, inside to outside. */
export const BANDS: [number, string][] = [
  [80, "#e5c07b"],
  [165, "#61afef"],
  [260, "#ffffff"],
];
/** What the text is when the cursor is nowhere near it. */
export const BASE = "#9aa0ac";
const RADIUS = BANDS[BANDS.length - 1][0];

// What reads as "delay" while dragging is steady-state lag, which is
// velocity * (1 - FRICTION) / STIFFNESS — not settle time after a step.
const STIFFNESS = 0.065;
const FRICTION = 0.3;
/** Fixed step so the feel is the same on a 60Hz and a 120Hz display. */
const STEP_MS = 1000 / 60;

/**
 * Two stacked backgrounds clipped to the glyphs: the bands on top, the base
 * grey underneath showing wherever the bands are transparent.
 *
 * This replaces a mix-blend overlay because blending can't do what's wanted
 * here — `multiply` only darkens, so it could never lighten grey text to
 * white, and `screen` would paint the page background instead of the text.
 * Clipping to text sidesteps both, and costs nothing on a single element.
 */
export const bandGradient = () => {
  const stops = BANDS.map(([edge, color], i) => {
    const inner = i === 0 ? 0 : BANDS[i - 1][0];
    return `${color} ${inner}px, ${color} ${edge}px`;
  }).join(", ");
  // Parked far off-frame until the first pointer move, so the text starts flat.
  return (
    `radial-gradient(circle at var(--mx, -9999px) var(--my, -9999px), ${stops}, transparent ${RADIUS}px), ` +
    `linear-gradient(${BASE}, ${BASE})`
  );
};

/** Drives --mx/--my on the element, in its own coordinate space. */
export function useCursorBands(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    const snap = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    let carry = 0;
    let seeded = false;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      if (!seeded) {
        seeded = true;
        at.x = target.x;
        at.y = target.y;
      }
    };

    const tick = (ts: number) => {
      if (!last) last = ts;
      carry += Math.min(ts - last, 100);
      last = ts;

      if (seeded) {
        if (snap) {
          at.x = target.x;
          at.y = target.y;
          carry = 0;
        } else {
          while (carry >= STEP_MS) {
            vel.x = vel.x * FRICTION + (target.x - at.x) * STIFFNESS;
            vel.y = vel.y * FRICTION + (target.y - at.y) * STIFFNESS;
            at.x += vel.x;
            at.y += vel.y;
            carry -= STEP_MS;
          }
        }
        el.style.setProperty("--mx", `${at.x}px`);
        el.style.setProperty("--my", `${at.y}px`);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
