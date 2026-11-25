/**
 * Alternative D, "Landing": Alternative A's editorial page, with the paper
 * plane back.
 *
 * One grid for the whole page: a narrow side column and a reading column.
 * In the hero the side column is the stage: a card leaves the deck there,
 * folds into a paper plane along its creases and flies while the visitor's
 * pointer moves; when the pointer is still it glides back beside the name and
 * stops. Scrolling down, it flies to the card in the About section's side
 * column, unfolds and lands on it exactly.
 *
 * Where the scene doesn't run (a phone, no WebGL, reduced motion) the page
 * is Alternative A: the card sits in the hero beside the name.
 */
import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Card, { type CardHandle } from "./Card";
import Backdrop from "./Backdrop";
import { landing, sceneCanRun } from "./three/landing";
import Peek from "./Peek";
import { ABOUT, AMAZON, CONTACT, EARLIER, INTRO, PROJECTS, type Run, type Work } from "../../content/copy";
import { PERSON } from "../../content/profile";

const PokerTable = lazy(() => import("../../components/PokerTable"));

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** "A, B and C". */
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Results set a step heavier than the sentence around them. */
const RESULT = /(\d[\d,]*\+|\b1st\b|\b3rd\b|first developer)/gi;
function emph(text: string) {
  return text.split(RESULT).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

function Entry({ w }: { w: Work }) {
  return (
    <article className="a-entry" id={w.id} tabIndex={-1}>
      <header className="a-entry-head">
        <h4>
          {w.name}
          {w.team && <span className="team">{w.team}</span>}
        </h4>
        <span className="a-date">{w.period}</span>
      </header>
      <p className="a-what">{w.what}</p>
      <ul className="a-did">
        {w.did.map((d) => (
          <li key={d}>{emph(d)}</li>
        ))}
      </ul>
      <p className="a-tools">With {list(w.tools)}.</p>
    </article>
  );
}

export default function App() {
  const [poker, setPoker] = useState(false);
  const [copied, setCopied] = useState(false);
  const marked = useRef<HTMLElement | null>(null);
  // Decided once, on load: where the card lives depends on it.
  const [scene] = useState(sceneCanRun);
  const stageRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<CardHandle>(null);

  // While the poker table is open the page behind it doesn't scroll.
  useEffect(() => {
    document.documentElement.style.overflow = poker ? "hidden" : "";
  }, [poker]);

  // Where the plane starts, and where it lands.
  useEffect(() => {
    if (!scene) return;
    landing.stage = stageRef.current;
    landing.slot = cardRef.current?.el ?? null;
    landing.hold = holdRef.current;
    landing.unflip = () => cardRef.current?.setFlipped(false);
    const measure = () => landing.measure();
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    window.addEventListener("load", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      landing.stage = landing.slot = landing.hold = null;
      landing.unflip = null;
    };
  }, [scene]);

  /** A stat on the card's back: go to its entry and mark it for a moment. */
  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: smooth(), block: "center" });
    el.focus({ preventScroll: true });
    marked.current?.classList.remove("marked");
    void el.offsetWidth;
    el.classList.add("marked");
    marked.current = el;
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is selectable text */
    }
  };

  const run = (r: Run, i: number) => {
    if (typeof r === "string") return <Fragment key={i}>{r}</Fragment>;
    const tap = !r.poker && !r.href;
    const inner = r.poker ? (
      <button type="button" className="a-link" onClick={() => setPoker(true)}>
        {r.text}
      </button>
    ) : r.href ? (
      <a className="a-link" href={r.href} target="_blank" rel="noreferrer">
        {r.text}
      </a>
    ) : (
      <span className="a-word" tabIndex={0}>
        {r.text}
      </span>
    );
    return r.photo ? (
      <Peek key={i} name={r.photo} tap={tap}>
        {inner}
      </Peek>
    ) : (
      <Fragment key={i}>{inner}</Fragment>
    );
  };

  const [featured, ...others] = PROJECTS;

  return (
    <div className="a-site">
      {scene && <Backdrop />}
      <a className="a-skip" href="#about">
        Skip to content
      </a>
      <div className="a-page">
        <nav className="a-nav" aria-label="Sections">
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </nav>

        <header className="a-hero">
          <div className="a-side">
            {scene ? <div ref={stageRef} className="a-stage" aria-hidden /> : <Card onStat={goTo} />}
          </div>
          <div className="a-main a-hero-text">
            <h1 className="a-name">{PERSON.name}</h1>
            <p className="a-intro">{INTRO}</p>
            <p className="a-actions">
              <a className="a-resume" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                Résumé
              </a>
              <a className="a-link" href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a className="a-link" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a className="a-link" href={`mailto:${PERSON.email}`}>
                Email
              </a>
            </p>
          </div>
        </header>

        <main>
          <section className="a-section" id="about" aria-labelledby="h-about">
            <div className="a-side">
              <h2 className="a-h" id="h-about">
                About
              </h2>
              {scene && (
                <div ref={holdRef} className="a-hold">
                  <Card ref={cardRef} onStat={goTo} />
                </div>
              )}
            </div>
            <div className="a-main a-about" data-measure>
              {ABOUT.map((para, i) => (
                <p key={i}>{para.map(run)}</p>
              ))}
            </div>
          </section>

          <section className="a-section" id="work" aria-labelledby="h-work">
            <h2 className="a-side a-h" id="h-work">
              Work
            </h2>
            <div className="a-main">
              <div className="a-employer">
                <h3>{AMAZON.employer}</h3>
                <p className="a-role">
                  {AMAZON.role}, {AMAZON.place}. <span className="a-date">{AMAZON.span}</span>
                </p>
              </div>
              {AMAZON.work.map((w) => (
                <Entry key={w.id} w={w} />
              ))}

              <div className="a-employer a-later">
                <h3>{EARLIER.employer}</h3>
                <p className="a-role">
                  {EARLIER.role}, {EARLIER.place}.
                </p>
              </div>
              <Entry w={EARLIER.work} />
            </div>
          </section>

          <section className="a-section" id="projects" aria-labelledby="h-projects">
            <h2 className="a-side a-h" id="h-projects">
              Projects
            </h2>
            <div className="a-main">
              <article className="a-feature">
                <h3>
                  <a href={featured.live ?? featured.source} target="_blank" rel="noreferrer">
                    {featured.name}
                  </a>
                </h3>
                <p className="a-feature-what">{featured.what}</p>
                {featured.why && <p>{featured.why}</p>}
                {featured.image && (
                  <img
                    className="a-shot"
                    src={featured.image.src}
                    alt={featured.image.alt}
                    width={featured.image.width}
                    height={featured.image.height}
                    loading="lazy"
                  />
                )}
                <p className="a-tools">
                  In {list(featured.tools)}.{" "}
                  <a className="a-link" href={featured.source} target="_blank" rel="noreferrer">
                    Source on GitHub
                  </a>
                </p>
              </article>

              {others.map((p) => (
                <article className="a-project" key={p.id}>
                  <h3>
                    <a href={p.live ?? p.source} target="_blank" rel="noreferrer">
                      {p.name}
                    </a>
                  </h3>
                  <p className="a-what">{p.what}</p>
                  {p.notes.length > 0 && (
                    <ul className="a-did">
                      {p.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {p.id === "hemosoo" && (
                    <figure className="a-shot-fig">
                      <img
                        className="a-shot"
                        src={`${import.meta.env.BASE_URL}projects/c-poker-table.jpg`}
                        alt="The poker table on this site at the end of a hand: five board cards, and the hand won with a pair of tens"
                        width={1600}
                        height={1000}
                        loading="lazy"
                      />
                      <figcaption>
                        The poker table, at the end of a hand.{" "}
                        <button type="button" className="a-link" onClick={() => setPoker(true)}>
                          Sit down
                        </button>
                      </figcaption>
                    </figure>
                  )}
                  <p className="a-tools">
                    With {list(p.tools)}.{" "}
                    <a className="a-link" href={p.source} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className="a-section a-foot" id="contact" aria-labelledby="h-contact">
          <h2 className="a-side a-h" id="h-contact">
            Contact
          </h2>
          <div className="a-main">
            <p className="a-contact-lead">{CONTACT.lead}</p>
            <p className="a-mail">
              <a className="a-link" href={`mailto:${PERSON.email}`}>
                {PERSON.email}
              </a>
              <button type="button" className="a-copy" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </p>
            <p className="a-elsewhere">
              Also on{" "}
              <a className="a-link" href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              ,{" "}
              <a className="a-link" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>{" "}
              and{" "}
              <a className="a-link" href={PERSON.links.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
              , and there's a{" "}
              <a className="a-link" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                résumé
              </a>
              .
            </p>
            <p className="a-colophon">Set in Schibsted Grotesk. Built by hand in React and three.js.</p>
          </div>
        </footer>
      </div>

      {poker && (
        <Suspense fallback={null}>
          <PokerTable onClose={() => setPoker(false)} />
        </Suspense>
      )}
    </div>
  );
}
