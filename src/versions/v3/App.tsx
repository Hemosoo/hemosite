/**
 * Alternative 3: The Collection.
 *
 * The site as a set of cards. The player card is card 001 and the first thing
 * you see, with the facts a recruiter needs set beside it in plain type, so
 * nothing waits on a card being handled. Below it the rest of the set:
 * experience, projects, education, personal, each dealt once as it arrives,
 * each card opening into a full back. A stat line and a toolkit follow.
 *
 * Everything is also available as text ("Read as text" in the bar), which is
 * the same content as plain lists and the expandable paragraph.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { EDUCATION, EXPERIENCE, PERSON, PROJECTS } from "../../content/profile";
import HeroCard from "./HeroCard";
import Collection, { type OpenRequest } from "./Collection";
import Inspect from "./Inspect";
import StatLine from "./StatLine";
import TextView from "./TextView";
import { TOTAL, targetOfNode } from "./collection";

const PokerTable = lazy(() => import("../../components/PokerTable"));

type Mode = "cards" | "text";

const SECTIONS = [
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["education", "Education"],
  ["personal", "Personal"],
] as const;

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function CopyEmail() {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span className="v3-email">
      <span ref={ref} className="v3-email-a">
        {PERSON.email}
      </span>
      <button
        type="button"
        onClick={() => {
          const select = () => {
            const r = document.createRange();
            if (ref.current) r.selectNodeContents(ref.current);
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(r);
          };
          if (!navigator.clipboard) {
            select();
            return;
          }
          navigator.clipboard
            .writeText(PERSON.email)
            .then(() => {
              setDone(true);
              window.setTimeout(() => setDone(false), 1800);
            })
            .catch(select);
        }}
      >
        {done ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>(() => (location.hash === "#text" ? "text" : "cards"));
  const [open, setOpen] = useState<OpenRequest | null>(null);
  const [poker, setPoker] = useState(false);

  useEffect(() => {
    const onHash = () => setMode(location.hash === "#text" ? "text" : "cards");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    history.replaceState(null, "", m === "text" ? "#text" : location.pathname);
    document.getElementById("main")?.scrollIntoView({ behavior: "auto" });
  };

  const close = useCallback(() => {
    setOpen((o) => {
      // Back to where the card was opened from.
      requestAnimationFrame(() => o?.returnTo?.focus({ preventScroll: true }));
      return null;
    });
  }, []);

  /** A stat (on the player card or the stat line) opens what it comes from. */
  const onStat = useCallback(
    (node: string) => {
      const t = targetOfNode(node);
      if (mode === "text") {
        document.getElementById(t.set ?? (node === "penn" ? "education" : "experience"))?.scrollIntoView({ behavior: smooth() });
        return;
      }
      if (t.card) {
        const btn = document.querySelector<HTMLButtonElement>(`[data-card="${t.card}"]`);
        const face = btn?.querySelector(".v3-card-inner");
        setOpen({ id: t.card, from: face?.getBoundingClientRect() ?? null, returnTo: (document.activeElement as HTMLElement) ?? null });
      } else if (t.set) {
        document.getElementById(t.set)?.scrollIntoView({ behavior: smooth(), block: "start" });
      }
    },
    [mode]
  );

  const latest = EXPERIENCE[0];

  return (
    <div className="v3" data-mode={mode}>
      <a className="v3-skip" href="#main">
        Skip to the content
      </a>
      <header className="v3-bar">
        <a href="#top" className="v3-mark">
          {PERSON.name}
        </a>
        <nav className="v3-nav" aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          {mode === "cards" && <a href="#stats">Stats</a>}
        </nav>
        <div className="v3-bar-end">
          <button
            type="button"
            className="v3-modebtn"
            aria-pressed={mode === "text"}
            onClick={() => switchMode(mode === "text" ? "cards" : "text")}
          >
            {mode === "text" ? "View as cards" : "Read as text"}
          </button>
          <a className="v3-resume" href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé
          </a>
        </div>
      </header>

      <main id="main">
        <section id="top" className="v3-hero" aria-label="Introduction">
          <HeroCard onStat={onStat} />
          <div className="v3-hero-head">
            <h1 className="v3-name">{PERSON.name}</h1>
            <p className="v3-tagline">{PERSON.tagline}</p>
          </div>
          <div className="v3-hero-text">
            <p className="v3-intro">
              I build backend systems, infrastructure, and tools that make AI useful in practice. I've spent three
              summers at Amazon building software for internal teams and real customers, and I study computer
              science at Penn, where I'm also doing my master's in CIS.
            </p>
            <dl className="v3-facts">
              <div style={{ ["--c" as string]: "var(--c-exp)" }}>
                <dt>Amazon</dt>
                <dd>
                  SDE intern, 2024, 2025, 2026 · most recently the{" "}
                  <a href="#experience">{latest.service}</a>
                </dd>
              </div>
              <div style={{ ["--c" as string]: "var(--c-edu)" }}>
                <dt>Penn</dt>
                <dd>
                  {EDUCATION.degrees[0].degree}, May 2027 · {EDUCATION.degrees[1].degree.replace("Computer and Information Science", "CIS")}, Dec 2027
                </dd>
              </div>
              <div style={{ ["--c" as string]: "var(--c-eng)" }}>
                <dt>Projects</dt>
                <dd>
                  {PROJECTS.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <a href={p.repo} target="_blank" rel="noreferrer">
                        {p.name}
                      </a>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="v3-actions">
              <a className="v3-primary" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                Résumé <span aria-hidden>↗</span>
              </a>
              <a href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <CopyEmail />
            </div>
            <p className="v3-hint">
              {mode === "cards" ? (
                <>
                  The rest of the set is below: {TOTAL - 1} more cards in four sets. Or{" "}
                  <button type="button" className="v3-inline" onClick={() => switchMode("text")}>
                    read it all as text
                  </button>
                  .
                </>
              ) : (
                <>
                  Reading as text.{" "}
                  <button type="button" className="v3-inline" onClick={() => switchMode("cards")}>
                    Back to the cards
                  </button>
                  .
                </>
              )}
            </p>
          </div>
        </section>

        {mode === "cards" ? (
          <>
            <Collection onOpen={setOpen} />
            <StatLine onStat={onStat} />
          </>
        ) : (
          <TextView onPoker={() => setPoker(true)} />
        )}
      </main>

      <footer className="v3-foot">
        <p>
          {PERSON.name} · <span className="v3-dim">{PERSON.email}</span>
        </p>
        <p className="v3-foot-links">
          <a href={PERSON.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé
          </a>
          <a href="#top">Back to the top</a>
        </p>
      </footer>

      {open && (
        <Inspect
          key="inspect"
          id={open.id}
          from={open.from}
          onClose={close}
          onNavigate={(id) => setOpen((o) => (o ? { ...o, id } : o))}
          onPoker={() => {
            setOpen(null);
            setPoker(true);
          }}
        />
      )}

      <Suspense fallback={null}>
        <AnimatePresence>{poker && <PokerTable key="poker" onClose={() => setPoker(false)} />}</AnimatePresence>
      </Suspense>
    </div>
  );
}
