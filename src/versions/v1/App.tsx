/**
 * V1 · Refined Original.
 *
 * The current site's structure and interaction model, finished: the name,
 * the deck and the plane, the plane landing as the player card, the card
 * beside the expandable bio, passages arriving by paper plane, Short / More /
 * Everything. What changes is hierarchy and reach: the hero says what he does
 * and links straight to the résumé, experience and projects; the bar is
 * navigation that opens the right passages; the card's back is a stat sheet
 * worth turning over; and the roles and projects sit one glance below the bio
 * for anyone who won't open a thing.
 */
import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hero from "./Hero";
import Main, { type MainHandle } from "./Page";
import PokerTable from "../../components/PokerTable";
import Cursor from "../../components/Cursor";
import type { StretchState } from "./stretch";
import { PERSON } from "../../content/profile";

type Where = "about" | "experience" | "projects" | "contact";

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

export default function App() {
  const main = useRef<MainHandle>(null);
  const barRef = useRef<HTMLElement>(null);
  const getBar = useCallback(() => barRef.current, []);
  const [bio, setBio] = useState<StretchState>({ open: 0, total: 0, depth: "0" });
  const [pokerOpen, setPokerOpen] = useState(false);
  const openPoker = useCallback(() => setPokerOpen(true), []);

  /** Navigation opens what it names, in the bio, and goes there. */
  const go = useCallback((where: Where) => {
    const m = main.current;
    if (!m) return;
    if (where === "about") m.about?.scrollIntoView({ behavior: smooth(), block: "start" });
    if (where === "experience") m.stretch?.reveal(["entryid", "nhs", "gateway"], "amazon");
    if (where === "projects") m.stretch?.reveal(["holdem", "mcp"], "holdem");
    if (where === "contact") m.contact?.scrollIntoView({ behavior: smooth(), block: "start" });
  }, []);

  const depth = (inline: boolean) => (
    <div className={`v1-depth${inline ? " inline" : ""}`} role="group" aria-label="How much of the bio to show">
      <span className="lbl">Bio</span>
      {(
        [
          ["0", "Short"],
          ["1", "More"],
          ["9", "Everything"],
        ] as const
      ).map(([d, label]) => (
        <button key={d} type="button" aria-pressed={bio.depth === d} onClick={() => main.current?.stretch?.setDepth(Number(d))}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="v1">
      <Hero onGo={go} />

      <nav ref={barRef} className="v1-bar" aria-label="Site">
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
          <span className="depth">{depth(false)}</span>
          <span className="div" aria-hidden />
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

      <Main ref={main} onState={setBio} onPoker={openPoker} bar={getBar} depth={depth(true)} />

      <AnimatePresence>{pokerOpen && <PokerTable key="poker" onClose={() => setPokerOpen(false)} />}</AnimatePresence>
      <Cursor />
    </div>
  );
}
