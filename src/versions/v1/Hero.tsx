/**
 * The opening: the name, and under it what it is.
 *
 * The name keeps its cursor rings (hooks/useCursorBands.ts) but is about a
 * sixth smaller than the original, which leaves room for a hierarchy the
 * original lacked: what he builds, the three facts a recruiter scans for, and
 * a row that goes straight to the résumé, the experience, the projects and
 * the contacts. The deck sits to the left of the type: the card leaves it,
 * folds into a plane beside the name, and on scroll lands as the player card.
 */
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useCursorBands, bandGradient } from "../../hooks/useCursorBands";
import CardBackdrop from "./CardBackdrop";
import { PERSON } from "../../content/profile";

interface Props {
  onGo: (where: "experience" | "projects" | "contact") => void;
}

export default function Hero({ onGo }: Props) {
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
        <p className="v1-facts">
          <span className="k1">CS at Penn</span>
          <i>·</i>
          <span className="k1">MSE in CIS</span>
          <i>·</i>
          <span className="k3">3× Amazon SDE intern</span>
        </p>
        <nav className="v1-access" aria-label="Quick links">
          <a className="resume" href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé <span className="arrow">↗</span>
          </a>
          <button type="button" onClick={() => onGo("experience")}>
            Experience <span className="arrow">↓</span>
          </button>
          <button type="button" onClick={() => onGo("projects")}>
            Projects <span className="arrow">↓</span>
          </button>
          <span className="sep" aria-hidden />
          <a href={PERSON.links.github} target="_blank" rel="noreferrer">
            GitHub <span className="arrow">↗</span>
          </a>
          <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn <span className="arrow">↗</span>
          </a>
          <button type="button" onClick={() => onGo("contact")}>
            Email
          </button>
        </nav>
      </motion.div>
    </header>
  );
}
