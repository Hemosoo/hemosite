/**
 * hemosoo.com.
 *
 * The name, the deck and the paper plane; the plane lands as the player card;
 * the card sits beside a short bio, the experience and the projects. The bar
 * is plain navigation to those sections and the links that matter.
 */
import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hero from "./Hero";
import Main, { type MainHandle } from "./Page";
import PokerTable from "../components/PokerTable";
import Cursor from "../components/Cursor";
import { PERSON } from "../content/profile";

type Where = "about" | "experience" | "projects" | "contact";

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

export default function App() {
  const main = useRef<MainHandle>(null);
  const [pokerOpen, setPokerOpen] = useState(false);
  const openPoker = useCallback(() => setPokerOpen(true), []);

  const go = useCallback((where: Where) => {
    main.current?.[where]?.scrollIntoView({ behavior: smooth(), block: "start" });
  }, []);

  return (
    <div className="v1">
      <Hero />

      <nav className="v1-bar" aria-label="Site">
        <div className="v1-bar-in">
          <button type="button" className="home" onClick={() => window.scrollTo({ top: 0, behavior: smooth() })}>
            Hemosoo Woo
          </button>
          <button type="button" onClick={() => go("about")}>
            About
          </button>
          <button type="button" onClick={() => go("experience")}>
            Experience
          </button>
          <button type="button" onClick={() => go("projects")}>
            Projects
          </button>
          <button type="button" onClick={() => go("contact")}>
            Contact
          </button>
          <span className="grow" />
          <a className="ext" href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé ↗
          </a>
          <a className="ext ext-opt" href={PERSON.links.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a className="ext ext-opt" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </div>
      </nav>

      <Main ref={main} onPoker={openPoker} />

      <AnimatePresence>{pokerOpen && <PokerTable key="poker" onClose={() => setPokerOpen(false)} />}</AnimatePresence>
      <Cursor />
    </div>
  );
}
