/**
 * Alternative B · Collectible Identity.
 *
 * One object carries the identity: a printed trading card. It sits beside
 * the name when the page opens and stays beside the writing all the way down
 * (it is one sticky column, so "travelling" from the hero to the content is
 * just the page scrolling past it). Everything around it is plain type on a
 * dark page, in one warm off-white and two greys.
 *
 * On a phone the card sits beside the links under the introduction, small
 * enough that the work starts on the second screen.
 */
import { Suspense, lazy, useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Card from "./Card";
import Peek from "./Peek";
import { ABOUT, AMAZON, CONTACT, EARLIER, INTRO, PROJECTS, type Run, type Work } from "../../content/copy";
import { PERSON } from "../../content/profile";

const PokerTable = lazy(() => import("../../components/PokerTable"));

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Figures inside a sentence carry a little weight, so the eye finds them. */
function Figures({ text }: { text: string }) {
  const parts = text.split(/(\d{1,3}(?:,\d{3})*\+|\b\d+(?:st|nd|rd|th)\b)/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}
    </>
  );
}

function Entry({ w, showDates = true }: { w: Work; showDates?: boolean }) {
  return (
    <article className="b-entry" id={`work-${w.id}`}>
      <header className="b-entry-head">
        <h4>
          {w.name}
          {w.team && <span className="team">{w.team}</span>}
        </h4>
        {showDates && <span className="b-date">{w.period}</span>}
      </header>
      <p className="b-what">{w.what}</p>
      {/* What he did, as prose: a short paragraph reads as an account, a
          stack of bullets as a résumé. */}
      <p className="b-did">
        <Figures text={w.did.join(" ")} />
      </p>
      <p className="b-tools">{w.tools.join(", ")}</p>
    </article>
  );
}

export default function App() {
  const [poker, setPoker] = useState(false);
  const [copied, setCopied] = useState(false);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: smooth(), block: "start" });
  };

  /** A figure on the card's back: to the work it came from, marked briefly. */
  const onFigure = useCallback((id: string) => {
    const el = document.getElementById(`work-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: smooth(), block: "center" });
    el.classList.remove("b-mark");
    void el.offsetWidth;
    el.classList.add("b-mark");
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is selectable */
    }
  };

  const run = (r: Run, i: number) => {
    if (typeof r === "string") return r;
    let inner: React.ReactNode = <span className="b-w">{r.text}</span>;
    if (r.poker) {
      inner = (
        <button type="button" className="b-w b-link" onClick={() => setPoker(true)}>
          {r.text}
        </button>
      );
    } else if (r.href) {
      inner = (
        <a className="b-w b-link" href={r.href} target="_blank" rel="noreferrer">
          {r.text}
        </a>
      );
    }
    if (!r.photo) return <span key={i}>{inner}</span>;
    return (
      <Peek key={i} name={r.photo} tapToShow={!r.poker && !r.href}>
        {inner}
      </Peek>
    );
  };

  const [featured, ...more] = PROJECTS;

  return (
    <div className="b">
      <a className="b-skip" href="#work">
        Skip to work
      </a>
      <nav className="b-nav" aria-label="Site">
        <a href="#work" onClick={go("work")}>
          Work
        </a>
        <a href="#projects" onClick={go("projects")}>
          Projects
        </a>
        <a href="#contact" onClick={go("contact")}>
          Contact
        </a>
      </nav>

      <div className="b-grid">
        <aside className="b-cardcol" aria-label="Trading card">
          <div className="b-hold">
            <Card onFigure={onFigure} />
          </div>
        </aside>

        <header className="b-hero">
          <h1>{PERSON.name}</h1>
          <p className="b-intro">{INTRO}</p>
        </header>

        <div className="b-links">
          <a className="b-resume" href={PERSON.links.resume} target="_blank" rel="noreferrer">
            Résumé
          </a>
          <a className="b-link" href={PERSON.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="b-link" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>

        <section className="b-section b-about" id="about" aria-labelledby="b-about-h">
          <h2 id="b-about-h" className="b-vh">
            About
          </h2>
          {ABOUT.map((p, i) => (
            <p key={i}>{p.map(run)}</p>
          ))}
        </section>

        <section className="b-section" id="work" aria-labelledby="b-work-h">
          <h2 id="b-work-h">Work</h2>

          <div className="b-employer">
            <h3>{AMAZON.employer}</h3>
            <p className="b-emp-meta">
              {AMAZON.role} · {AMAZON.place} · {AMAZON.span}
            </p>
            {AMAZON.work.map((w) => (
              <Entry key={w.id} w={w} />
            ))}
          </div>

          <div className="b-employer">
            <h3>{EARLIER.employer}</h3>
            <p className="b-emp-meta">
              {EARLIER.role} · {EARLIER.place} · {EARLIER.span}
            </p>
            <Entry w={EARLIER.work} showDates={false} />
          </div>
        </section>

        <section className="b-section" id="projects" aria-labelledby="b-proj-h">
          <h2 id="b-proj-h">Projects</h2>

          <article className="b-feature">
            <h3>
              <a href={featured.source} target="_blank" rel="noreferrer">
                {featured.name}
              </a>
            </h3>
            <p className="b-feature-what">{featured.what}</p>
            {featured.why && <p className="b-what">{featured.why}</p>}
            <p className="b-tools">
              {featured.tools.join(", ")} ·{" "}
              <a className="b-link" href={featured.source} target="_blank" rel="noreferrer">
                Source on GitHub
              </a>
              {featured.live && (
                <>
                  {" "}
                  ·{" "}
                  <a className="b-link" href={featured.live} target="_blank" rel="noreferrer">
                    Live
                  </a>
                </>
              )}
            </p>
          </article>

          {more.map((p) => (
            <article className="b-project" key={p.id}>
              <h3>
                <a href={p.source} target="_blank" rel="noreferrer">
                  {p.name}
                </a>
              </h3>
              <p className="b-what">{p.what}</p>
              {p.id === "hemosoo" ? (
                <p className="b-did">
                  {/* True of this version: no WebGL here, so no fold. */}
                  The trading card is built in HTML and CSS; it tilts toward your pointer and turns over to its stats.{" "}
                  {p.notes[1]} Fonts are self-hosted, and nothing moves unless you move it.
                </p>
              ) : (
                p.notes.length > 0 && <p className="b-did">{p.notes.join(" ")}</p>
              )}
              <p className="b-tools">
                {/* This version has no WebGL, so no three.js. */}
                {p.tools.filter((t) => !(p.id === "hemosoo" && t === "three.js")).join(", ")} ·{" "}
                <a className="b-link" href={p.source} target="_blank" rel="noreferrer">
                  Source on GitHub
                </a>
              </p>
            </article>
          ))}
        </section>

        <footer className="b-section b-contact" id="contact" aria-labelledby="b-contact-h">
          <h2 id="b-contact-h">Contact</h2>
          <p className="b-contact-lead">{CONTACT.lead}</p>
          <p className="b-mailrow">
            <a className="b-mail b-link" href={`mailto:${PERSON.email}`}>
              {PERSON.email}
            </a>
            <button type="button" className="b-copy" onClick={copy} aria-live="polite">
              {copied ? "Copied" : "Copy"}
            </button>
          </p>
          <p className="b-elsewhere">
            <a className="b-link" href={PERSON.links.resume} target="_blank" rel="noreferrer">
              Résumé
            </a>
            <a className="b-link" href={PERSON.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="b-link" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="b-link" href={PERSON.links.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {poker && (
          <Suspense fallback={null}>
            <PokerTable key="poker" onClose={() => setPoker(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
