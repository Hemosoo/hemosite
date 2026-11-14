import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useCursorBands, bandGradient } from "../hooks/useCursorBands";
import CardBackdrop from "./CardBackdrop";

/** Full-height wordmark that fades out as the shell below scrolls up. The
 *  cursor bands are painted into the text itself, so nothing else is
 *  affected and no clipping or isolation is needed. */
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  useCursorBands(nameRef);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The fades are functions rather than ranges on purpose: a range is handed
  // to the browser's native scroll timeline, which mapped these wrongly — the
  // name came back to a quarter opacity a screen down, over the first cards,
  // and the hint never left. A function is computed in JS and stays put.
  const opacity = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.55));
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const hint = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.2));

  return (
    <section
      ref={ref}
      className="relative flex h-[100svh] items-center justify-center overflow-hidden bg-bg"
    >
      <CardBackdrop />

      {/* Name and tagline move as one: the tagline is what the name is, and
          the one line a visitor who never scrolls still leaves with. */}
      <motion.div
        style={reduced ? undefined : { opacity, scale, y }}
        className="relative z-10 flex select-none flex-col items-center gap-7 px-6 text-center"
      >
        <h1
          ref={nameRef}
          style={{
            backgroundImage: bandGradient(),
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
          className="text-[clamp(3.25rem,15vw,11rem)] font-bold leading-[0.85] tracking-tight"
        >
          <span className="block">Hemosoo</span>
          <span className="block">Woo</span>
        </h1>
        {/* One line on a wide screen; on a phone, two whole lines, rather
            than a stranded "intern" or a dot left at the start of a line. */}
        <p className="text-xs leading-relaxed text-subtle sm:text-sm">
          <span className="whitespace-nowrap">Backend developer</span>{" "}
          <span className="text-dim">·</span> <span className="whitespace-nowrap">CS @ Penn</span>
          <span className="hidden sm:inline">
            {" "}
            <span className="text-dim">·</span>{" "}
          </span>
          <span className="block whitespace-nowrap sm:inline">3× Amazon SDE intern</span>
        </p>
      </motion.div>

      <motion.div
        style={reduced ? undefined : { opacity: hint }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-xs text-dim"
      >
        <div>scroll</div>
        <div aria-hidden className="mt-1">↓</div>
      </motion.div>

    </section>
  );
}
