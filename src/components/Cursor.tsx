import { useEffect, useRef } from "react";

const SIZE = 14;

/**
 * Solid white dot standing in for the native cursor.
 *
 * Written straight from the pointermove handler rather than through a rAF
 * loop or a spring — browsers coalesce pointermove to one event per frame, so
 * this is the lowest latency available and the dot stays exactly under the
 * pointer while the hero bands trail behind it.
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    // Only hide the native cursor once we know we can draw a replacement.
    document.documentElement.classList.add("cursor-none");

    const onMove = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      el.style.opacity = "1";
      // `cursor: none` removes the pointer affordance, so give it back.
      const hit = (e.target as Element | null)?.closest?.(
        'a, button, input, textarea, select, label, [role="button"], [role="slider"]'
      );
      el.dataset.over = hit ? "1" : "0";
    };
    const hide = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      document.documentElement.classList.remove("cursor-none");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      data-over="0"
      className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full bg-white opacity-0 transition-[width,height,opacity] duration-150 data-[over=1]:h-9 data-[over=1]:w-9 data-[over=1]:bg-white/30"
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
