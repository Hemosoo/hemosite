import { useEffect, useRef } from "react";

/**
 * `color` takes hue and saturation from this layer and luminosity from the
 * backdrop. At luminosity zero that resolves to black whatever the hue, so a
 * pure #000 page is immune while every lit pixel is fully recoloured —
 * including near-white bold text, which `hue` could not move because a hue
 * rotation is imperceptible at 92% luminance.
 */
const BLEND = "color" as const;

/** Ring boundaries in px from the cursor, and the colour of each band. */
const BANDS: [number, string][] = [
  [100, "#61afef"],
  [210, "#c678dd"],
  [330, "#98c379"],
];
const RADIUS = BANDS[BANDS.length - 1][0];

// Spring, not a lerp: the rings carry momentum, overshoot slightly on a fast
// drag and settle back, instead of easing in a straight line.
const STIFFNESS = 0.26;
const FRICTION = 0.42;
/** Fixed step so the feel doesn't change between a 60Hz and a 120Hz display. */
const STEP_MS = 1000 / 60;

const gradient = () => {
  const stops = BANDS.map(([edge, color], i) => {
    const inner = i === 0 ? 0 : BANDS[i - 1][0];
    return `${color} ${inner}px, ${color} ${edge}px`;
  });
  return `radial-gradient(circle at center, ${stops.join(", ")}, transparent ${RADIUS}px)`;
};

/** Concentric colour bands that trail the cursor, recolouring text. */
export default function CursorRings() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nothing to follow without a real pointer.
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    const snap = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const at = { ...target };
    const vel = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    let carry = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
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
      // Cap the catch-up so a backgrounded tab doesn't fling the rings.
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
      className="pointer-events-none fixed left-0 top-0 z-30 opacity-0 transition-opacity duration-500 will-change-transform"
      style={{
        width: RADIUS * 2,
        height: RADIUS * 2,
        backgroundImage: gradient(),
        mixBlendMode: BLEND,
      }}
    />
  );
}
