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

  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const hint = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex h-[100svh] items-center justify-center overflow-hidden bg-bg"
    >
      <CardBackdrop />

      <motion.h1
        ref={nameRef}
        style={{
          ...(reduced ? {} : { opacity, scale, y }),
          backgroundImage: bandGradient(),
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
        className="relative z-10 select-none px-6 text-center text-[clamp(3.25rem,15vw,11rem)] font-bold leading-[0.85] tracking-tight"
      >
        <span className="block">Hemosoo</span>
        <span className="block">Woo</span>
      </motion.h1>

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
