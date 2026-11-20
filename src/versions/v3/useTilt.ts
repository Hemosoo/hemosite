import { useEffect, type RefObject } from "react";

/**
 * Pointer tilt for a card, written straight to CSS variables on the element
 * (--rx, --ry for rotation; --mx, --my for where the light is; --hyp for how
 * much it is being handled). One requestAnimationFrame loop that stops when it
 * settles: no React state per frame.
 *
 * Mouse: hover tilts. Touch: drag tilts (the page still scrolls vertically:
 * the element keeps touch-action: pan-y). Keyboard: the caller can call
 * `nudge` with the arrow keys. With reduced motion the card follows without
 * easing, and `max` should be small.
 */
export function useTilt(
  ref: RefObject<HTMLElement | null>,
  { max = 14, paused }: { max?: number; paused?: () => boolean } = {}
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, th: 0, raf: 0 };
    const k = reduced ? 0.25 : 1;

    const write = () => {
      el.style.setProperty("--rx", `${((0.5 - st.y) * max * k).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((st.x - 0.5) * max * 1.15 * k).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(st.x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(st.y * 100).toFixed(1)}%`);
      el.style.setProperty("--hyp", st.h.toFixed(3));
    };
    const frame = () => {
      st.x += (st.tx - st.x) * 0.14;
      st.y += (st.ty - st.y) * 0.14;
      st.h += (st.th - st.h) * 0.12;
      write();
      const settled = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) + Math.abs(st.th - st.h) < 0.002;
      st.raf = settled ? 0 : requestAnimationFrame(frame);
    };
    const kick = () => {
      if (reduced) {
        st.x = st.tx;
        st.y = st.ty;
        st.h = st.th;
        write();
      } else if (!st.raf) st.raf = requestAnimationFrame(frame);
    };
    const aim = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      st.tx = Math.min(1, Math.max(0, (cx - r.left) / r.width));
      st.ty = Math.min(1, Math.max(0, (cy - r.top) / r.height));
      st.th = 1;
      kick();
    };
    const rest = () => {
      st.tx = 0.5;
      st.ty = 0.5;
      st.th = 0;
      kick();
    };
    let dragging = false;
    const onMove = (e: PointerEvent) => {
      if (paused?.()) return;
      if (e.pointerType === "mouse" || dragging) aim(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !paused?.()) {
        dragging = true;
        aim(e.clientX, e.clientY);
      }
    };
    const onUp = () => {
      dragging = false;
      rest();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") rest();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("blur", rest);
    write();
    return () => {
      cancelAnimationFrame(st.raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("blur", rest);
    };
  }, [ref, max, paused]);
}
