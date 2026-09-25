import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import CursorRings from "./CursorRings";

/**
 * Full-height wordmark that fades out as the shell below scrolls up.
 *
 * `isolate` plus an opaque background confines the cursor bands to this
 * section, and `overflow-hidden` clips them to its box — together that's what
 * keeps the effect on the name and off the rest of the page.
 */
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const hint = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative isolate flex h-[100svh] items-center justify-center overflow-hidden bg-bg"
    >
      <motion.h1
        style={reduced ? undefined : { opacity, scale, y }}
        className="select-none px-6 text-center text-[clamp(2.75rem,12vw,10rem)] font-bold leading-[0.92] tracking-tight text-white"
      >
        Hemosoo Woo
      </motion.h1>

      <motion.div
        style={reduced ? undefined : { opacity: hint }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-xs text-dim"
      >
        <div>scroll</div>
        <div aria-hidden className="mt-1">↓</div>
      </motion.div>

      <CursorRings />
    </section>
  );
}
