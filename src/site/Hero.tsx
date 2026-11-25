/**
 * The opening: the name, and under it what it is.
 *
 * The name keeps its cursor rings (hooks/useCursorBands.ts); under it, one
 * line of what he does and the three links that matter before scrolling:
 * résumé, GitHub, LinkedIn. The deck sits to the left of the type: the card
 * leaves it, folds into a plane beside the name, and on scroll lands as the
 * player card.
 */
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useCursorBands, bandGradient } from "../hooks/useCursorBands";
import CardBackdrop from "../components/CardBackdrop";
import { PERSON } from "../content/profile";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  useCursorBands(nameRef);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Functions, not ranges: a range is handed to the browser's native scroll
  // timeline, which mapped these wrongly on the original site.
  const opacity = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.5));
  const y = useTransform(scrollYProgress, (v) => -60 * v);

  return (
    <header ref={ref} className="v1-hero">
      <CardBackdrop />
      <motion.div className="v1-hero-inner" style={reduced ? undefined : { opacity, y }}>
        <h1
          ref={nameRef}
          className="v1-name"
          aria-label={PERSON.name}
          style={{
            backgroundImage: bandGradient(),
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
        >
          <span aria-hidden>Hemosoo</span>
          <span aria-hidden>Woo</span>
        </h1>
        <p className="v1-tagline">Software engineer. {PERSON.tagline}.</p>
        <nav className="v1-access" aria-label="Quick links">
          <a className="resume" href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé
          </a>
          <a href={PERSON.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </nav>
      </motion.div>
    </header>
  );
}
