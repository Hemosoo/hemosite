/**
 * The viewport, in pixels, updated on resize rather than on every frame.
 *
 * Scroll-driven layouts need real pixels to build transforms from, and reading
 * them during animation would mean a layout read per frame. Measuring once and
 * on resize keeps the animation to transforms alone.
 */
import { useEffect, useState } from "react";

export function useViewport() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  return size;
}
