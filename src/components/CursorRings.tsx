import { useEffect, useRef } from "react";

/**
 * `multiply` is the right blend once this is scoped to white-on-black:
 * black x anything is black, white x colour is exactly that colour. So the
 * backdrop is untouched and the name takes the band colour at full strength.
 *
 * (`color` — used when this ran page-wide — takes luminosity from the
 * backdrop, which means pure white stays white. Wrong for a white wordmark.)
 */
const BLEND = "multiply" as const;

/** Ring boundaries in px from the cursor, and the colour of each band. */
const BANDS: [number, string][] = [
  [100, "#61afef"],
  [210, "#e5c07b"],
  [330, "#98c379"],
];
const RADIUS = BANDS[BANDS.length - 1][0];

// What reads as "delay" while dragging is steady-state lag, which is
// velocity * (1 - FRICTION) / STIFFNESS — not settle time after a step.
// At 1200px/s the bands sit ~195px behind, about 59% of the radius.
const STIFFNESS = 0.065;
const FRICTION = 0.30;
/** Fixed step so the feel is the same on a 60Hz and a 120Hz display. */
const STEP_MS = 1000 / 60;

const gradient = () => {
  const stops = BANDS.map(([edge, color], i) => {
    const inner = i === 0 ? 0 : BANDS[i - 1][0];
    return `${color} ${inner}px, ${color} ${edge}px`;
  });
  return `radial-gradient(circle at center, ${stops.join(", ")}, transparent ${RADIUS}px)`;
};

/**
 * Colour bands that trail the cursor and recolour whatever they cross.
 *
 * Scoped to its parent, which must be `relative isolate overflow-hidden` with
 * an opaque background: `isolate` keeps the blend from reaching the page, and
 * the clip stops the bands painting outside the parent's box.
 */
export default function CursorRings() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;

    const snap = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    let carry = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      if (!visible) {
        visible = true;
        at.x = target.x;
        at.y = target.y;
        vel.x = 0;
        vel.y = 0;
        el.style.opacity = "1";
      }
    };

    const tick = (ts: number) => {
      if (!last) last = ts;
      carry += Math.min(ts - last, 100);
      last = ts;

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

      el.style.transform = `translate3d(${at.x - RADIUS}px, ${at.y - RADIUS}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-500 will-change-transform"
      style={{
        width: RADIUS * 2,
        height: RADIUS * 2,
        backgroundImage: gradient(),
        mixBlendMode: BLEND,
      }}
    />
  );
}
