import { useEffect, useRef } from "react";

/**
 * `color` takes hue and saturation from this layer and luminosity from the
 * backdrop. At luminosity zero that resolves to black no matter the hue, so a
 * pure #000 page is immune while every lit pixel is fully recoloured —
 * including near-white bold text, which `hue` could not move because a hue
 * rotation is imperceptible at 92% luminance.
 */
const BLEND = "color" as const;

/** Ring boundaries in px from the cursor, and the colour of each band. */
const BANDS: [number, string][] = [
  [58, "#61afef"],
  [116, "#c678dd"],
  [174, "#56b6c2"],
  [232, "#98c379"],
  [290, "#e5c07b"],
];
const RADIUS = BANDS[BANDS.length - 1][0];
/** How fast the rings chase the pointer. 1 = instant. */
const EASE = 0.18;

const gradient = () => {
  const stops = BANDS.map(([edge, color], i) => {
    const inner = i === 0 ? 0 : BANDS[i - 1][0];
    return `${color} ${inner}px, ${color} ${edge}px`;
  });
  return `radial-gradient(circle at center, ${stops.join(", ")}, transparent ${RADIUS}px)`;
};

/** Concentric colour bands that follow the cursor, shifting text hue. */
export default function CursorRings() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nothing to follow without a real pointer.
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const at = { ...target };
    let raf = 0;
    let visible = false;
    const snap = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        at.x = target.x;
        at.y = target.y;
        el.style.opacity = "1";
      }
    };

    const tick = () => {
      at.x += (target.x - at.x) * (snap ? 1 : EASE);
      at.y += (target.y - at.y) * (snap ? 1 : EASE);
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
