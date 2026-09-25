import { motion, useReducedMotion } from "framer-motion";
import { SKILLS, LINKS } from "../data";

const reveal = (reduced: boolean | null, delay = 0) => ({
  initial: reduced ? {} : { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" } as const,
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export default function About() {
  const reduced = useReducedMotion();

  return (
    <section id="about" className="border-t border-line bg-bg px-6 py-24 sm:py-32">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <motion.div {...reveal(reduced)} className="flex flex-col gap-5">
          <span className="text-xs uppercase tracking-[0.22em] text-dim">about</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white">
            I build backend services and the infrastructure around them.
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-subtle">
            CS senior at <span className="text-accent">Penn</span>, submatriculating into a
            master&apos;s in Computer and Information Science. Three summers as an SDE intern at{" "}
            <span className="text-yellow">Amazon</span> in <span className="text-cyan">Seattle</span>,
            all on customer-service systems — routing configuration read at runtime by Amazon
            Connect, a network-health pipeline built from scratch, and LLM tooling on the
            Amazon.com gateway.
          </p>
          <p className="max-w-2xl leading-relaxed text-subtle">
            Outside of that I sing <span className="text-green">acapella</span>, play{" "}
            <span className="text-yellow">poker</span>, and am on the journey to{" "}
            <span className="text-orange">dunking</span>. Amazon Future Engineer scholar.
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
}
