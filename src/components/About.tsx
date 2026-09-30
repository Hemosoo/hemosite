import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import WordPhoto from "./about/WordPhoto";
import { SKILLS, LINKS } from "../data";
import PokerTell from "./PokerTell";

const reveal = (reduced: boolean | null, delay = 0) => ({
  initial: reduced ? {} : { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" } as const,
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const About = forwardRef<HTMLElement, { onPoker: () => void }>(function About({ onPoker }, ref) {
  const reduced = useReducedMotion();

  return (
    <section
      ref={ref}
      id="about"
      className="relative border-t border-line bg-bg px-6 py-24 sm:py-32"
    >
      {/* The portrait lives in the margin beside the column rather than in it,
          so the measure of the text is untouched and it can simply not be
          there on a window too narrow to have a margin. `data-portrait` is how
          the hover photographs know this side is taken. */}
      <div
        data-portrait
        aria-hidden
        className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 xl:block"
        // Sized to the margin and centred in it, rather than pinned to the
        // window at a fixed width. Fixed, it was a small picture stranded
        // against the edge with a hundred and forty pixels of nothing between
        // it and the text on the screens this is actually read on — every
        // width between the breakpoints got whichever size was wrong for it.
        style={{
          ["--gutter" as string]: "calc((100vw - 48rem) / 2)",
          ["--pw" as string]: "clamp(11rem, calc(var(--gutter) - 3rem), 20rem)",
          left: "calc((var(--gutter) - var(--pw)) / 2)",
          width: "var(--pw)",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}about/portrait.jpg`}
          alt=""
          className="w-full rounded-2xl border border-line object-cover shadow-2xl"
          style={{ aspectRatio: "3 / 4", objectPosition: "50% 30%" }}
        />
      </div>

      <div data-bio className="mx-auto flex max-w-3xl flex-col gap-10">
        <motion.div {...reveal(reduced)} className="flex flex-col gap-5">
          <span className="text-xs uppercase tracking-[0.22em] text-dim">about</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white">
            I build backend services and the infrastructure around them.
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-subtle">
            CS senior at <WordPhoto id="penn" className="text-accent">Penn</WordPhoto>, submatriculating into a
            master&apos;s in Computer and Information Science. Three summers as an SDE intern at{" "}
            <WordPhoto id="amazon" className="text-yellow">Amazon</WordPhoto> in <span className="text-cyan">Seattle</span>:
            two on customer-service systems — routing configuration read at runtime by Amazon
            Connect, and a network-health pipeline built from scratch — and one on{" "}
            <span className="text-orange">Fashion Fitness Tech</span>, building LLM tooling for the
            Amazon.com gateway.
          </p>
          <p className="max-w-2xl leading-relaxed text-subtle">
            Outside of that I sing <WordPhoto id="acapella" className="text-green">acapella</WordPhoto>, play{" "}
            <WordPhoto id="poker" className="inline-block">
              <PokerTell onOpen={onPoker} />
            </WordPhoto>
            , and am on the journey to{" "}
            <WordPhoto id="dunking" className="text-orange">dunking</WordPhoto>. Amazon Future Engineer scholar.
          </p>
        </motion.div>

        <motion.div {...reveal(reduced, 0.08)} className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line px-3 py-1 text-xs text-subtle"
            >
              {s}
            </span>
          ))}
        </motion.div>

        <motion.div {...reveal(reduced, 0.14)} className="flex flex-wrap items-center gap-3">
          <a
            href={LINKS.resume}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-[#000] transition-transform hover:scale-[1.03]"
          >
            Resume
          </a>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-subtle transition-colors hover:border-primary/60 hover:text-text"
          >
            GitHub
          </a>
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-subtle transition-colors hover:border-primary/60 hover:text-text"
          >
            LinkedIn
          </a>
          <span className="text-xs text-dim">
            everything else lives in the shell below — try <span className="text-cyan">help</span>
          </span>
        </motion.div>
      </div>
    </section>
  );
});

export default About;
