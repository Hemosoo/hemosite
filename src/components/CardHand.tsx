import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";

interface Face {
  pip: string;
  rank: string;
  title: string;
  lines: string[];
  tint: string;
}

const FACES: Face[] = [
  {
    pip: "♠",
    rank: "3×",
    title: "Amazon SDE Intern",
    lines: ["Seattle, WA", "2024 · 2025 · 2026"],
    tint: "text-primary",
  },
  {
    pip: "♥",
    rank: "27",
    title: "BSE + MSE, Penn",
    lines: ["Computer Science", "Computer & Information Science"],
    tint: "text-red",
  },
];

/** One card: patterned back, content on the face, flipped by scroll. */
function Card({ face, flip }: { face: Face; flip: MotionValue<number> | number }) {
  return (
    <motion.div
      className="relative h-full w-full"
      style={{ transformStyle: "preserve-3d", rotateY: flip }}
    >
      {/* Back */}
      <div
        className="absolute inset-0 rounded-xl border border-primary/25 bg-[repeating-linear-gradient(45deg,#111a24_0_8px,#0b1219_8px_16px)] shadow-2xl"
        style={{ backfaceVisibility: "hidden" }}
      >
        <div className="absolute inset-3 rounded-lg border border-primary/15" />
      </div>

      {/* Face */}
      <div
        className="absolute inset-0 flex flex-col justify-between rounded-xl border border-line bg-[#f2f4f8] p-3 text-[#11151b] shadow-2xl sm:p-4"
        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        <div className={`text-lg font-bold leading-none ${face.tint}`}>{face.pip}</div>
        <div className="text-center">
          <div className="text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none">{face.rank}</div>
          <div className="mt-2 text-[11px] font-semibold leading-tight sm:text-xs">{face.title}</div>
          {face.lines.map((l) => (
            <div key={l} className="mt-0.5 text-[10px] leading-tight text-[#5b616b] sm:text-[11px]">
              {l}
            </div>
          ))}
        </div>
        <div className={`rotate-180 text-lg font-bold leading-none ${face.tint}`}>{face.pip}</div>
      </div>
    </motion.div>
  );
}

/**
 * Two hole cards dealt face-down at the bottom edge, lifted and fanned apart
 * by scrolling, then turned over to reveal what's on them.
 *
 * The section is tall and its contents stick, so the scroll distance drives
 * the animation instead of the page moving past it.
 */
export default function CardHand() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Rise from below the fold, fan apart, then turn over.
  const rise = useTransform(scrollYProgress, [0, 0.42], ["46vh", "0vh"]);
  const scale = useTransform(scrollYProgress, [0, 0.42], [0.86, 1]);
  const leftX = useTransform(scrollYProgress, [0.18, 0.62], ["0%", "-56%"]);
  const rightX = useTransform(scrollYProgress, [0.18, 0.62], ["0%", "56%"]);
  const leftRot = useTransform(scrollYProgress, [0.18, 0.62], [-4, -12]);
  const rightRot = useTransform(scrollYProgress, [0.18, 0.62], [2, 10]);
  const flipL = useTransform(scrollYProgress, [0.46, 0.78], [0, 180]);
  const flipR = useTransform(scrollYProgress, [0.52, 0.84], [0, 180]);
  const captionIn = useTransform(scrollYProgress, [0.82, 0.96], [0, 1]);

  return (
    <section ref={ref} className="relative h-[280vh] bg-bg">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <motion.div
          className="relative flex items-center justify-center"
          style={reduced ? undefined : { y: rise, scale }}
        >
          <div className="relative" style={{ perspective: 1400 }}>
            {/* Invisible spacer gives the box a size; both cards fill it, so
                they start perfectly stacked and fan from one centre. */}
            <div aria-hidden className="aspect-[2.5/3.5] w-[clamp(8.5rem,21vw,14rem)]" />

            <motion.div
              className="absolute inset-0"
              style={reduced ? { x: "56%", rotate: 10 } : { x: rightX, rotate: rightRot }}
            >
              <Card face={FACES[1]} flip={reduced ? 180 : flipR} />
            </motion.div>

            {/* Dealt on top, the way the near card covers the far one. */}
            <motion.div
              className="absolute inset-0 z-10"
              style={reduced ? { x: "-56%", rotate: -12 } : { x: leftX, rotate: leftRot }}
            >
              <Card face={FACES[0]} flip={reduced ? 180 : flipL} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          style={reduced ? undefined : { opacity: captionIn }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-xs text-dim"
        >
          <div>about me</div>
          <div aria-hidden className="mt-1">↓</div>
        </motion.div>
      </div>
    </section>
  );
}
