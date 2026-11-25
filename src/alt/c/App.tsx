/**
 * Alternative C, "Independent Developer".
 *
 * A personal site that reads like it has been kept up for a while: a small
 * header, a short introduction with the card beside it, the projects early,
 * then the work, then how to reach me. One reading column, one typeface, one
 * accent used twice. Nothing animates on its own; the card turns over when
 * asked and photos appear while you point at the words they belong to.
 */
import { Fragment, lazy, Suspense, useEffect, useState } from "react";
import Card from "./Card";
import Peek from "./Peek";
import { PERSON } from "../../content/profile";
import { ABOUT, AMAZON, CONTACT, EARLIER, INTRO, PROJECTS, type Run, type Work } from "../../content/copy";

const PokerTable = lazy(() => import("../../components/PokerTable"));

/** Figures that are results read a little heavier than the sentence around them. */
const FIGURE = /(\d[\d,]*\+|\b1st\b|\b3rd\b)/g;
function withFigures(text: string) {
  return text.split(FIGURE).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

/** What this version of the site actually does, for the hemosoo.com entry. */
const SITE_NOTES = [
  "The card at the top is HTML and CSS rather than an image, so it can turn over to show what's on the back.",
  PROJECTS[1].notes[1],
  "Fonts are self-hosted, and nothing on the page loads from a third party.",
];
const SITE_TOOLS = ["React", "TypeScript", "Vite"];

function Entry({ w }: { w: Work }) {
  return (
    <article className="c-entry" id={w.id}>
      <header>
        <h4>
          {w.name}
          {w.team && <span className="team">{w.team}</span>}
        </h4>
        <time>{w.period}</time>
      </header>
      <p className="what">{w.what}</p>
      <div className="did">
        {w.did.map((d) => (
          <p key={d}>{withFigures(d)}</p>
        ))}
      </div>
      <p className="tools">{w.tools.join(", ")}</p>
    </article>
  );
}

export default function App() {
  const [poker, setPoker] = useState(false);
  const [copied, setCopied] = useState(false);

  // While the poker table is open the page behind it shouldn't scroll.
  useEffect(() => {
    document.documentElement.style.overflow = poker ? "hidden" : "";
  }, [poker]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the address is there to select */
    }
  };

  const run = (r: Run, i: number) => {
    if (typeof r === "string") return <Fragment key={i}>{r}</Fragment>;
    // A word that only shows a photo still takes focus, so the photo can be
    // reached from the keyboard too.
    let inner: React.ReactNode = (
      <span className="word" tabIndex={0}>
        {r.text}
      </span>
    );
    if (r.poker)
      inner = (
        <button type="button" className="word link" onClick={() => setPoker(true)}>
          {r.text}
        </button>
      );
    else if (r.href)
      inner = (
        <a className="word link" href={r.href} target="_blank" rel="noreferrer">
          {r.text}
        </a>
      );
    if (!r.photo) return <Fragment key={i}>{inner}</Fragment>;
    return (
      <Peek key={i} name={r.photo} tapToShow={!r.poker && !r.href}>
        {inner}
      </Peek>
    );
  };

  const [featured, site] = PROJECTS;

  return (
    <div className="c">
      <a className="c-skip" href="#main">
        Skip to content
      </a>
      <header className="c-top">
        <a className="c-home" href="#top">
          hemosoo.com
        </a>
        <nav aria-label="Sections">
          <a href="#projects">Projects</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="main">
        <section className="c-intro" id="top" aria-labelledby="name">
          <div className="c-intro-text">
            <h1 id="name">{PERSON.name}</h1>
            <p className="c-lede">{INTRO}</p>
            <p className="c-links">
              <a className="primary" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                Résumé
              </a>
              <a href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href={`mailto:${PERSON.email}`}>Email</a>
            </p>
            <div className="c-prose">
              {ABOUT.map((p, i) => (
                <p key={i}>{p.map(run)}</p>
              ))}
            </div>
          </div>
          <Card />
        </section>

        <section className="c-section" id="projects" aria-labelledby="projects-h">
          <h2 id="projects-h">Projects</h2>

          <article className="c-project featured">
            <h3>
              <a href={featured.source} target="_blank" rel="noreferrer">
                {featured.name}
              </a>
            </h3>
            <p className="what">{featured.what}</p>
            <p className="tools">{featured.tools.join(", ")}</p>
          </article>

          <article className="c-project">
            <h3>
              <a href={site.source} target="_blank" rel="noreferrer">
                {site.name}
              </a>
            </h3>
            <p className="what">{site.what}</p>
            <ul className="notes">
              {SITE_NOTES.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <figure className="c-shot">
              <img
                src={`${import.meta.env.BASE_URL}projects/c-poker-table.jpg`}
                alt="The poker table on this site at the end of a hand: five board cards, and the hand won with a pair of tens"
                width={1600}
                height={1000}
                loading="lazy"
              />
              <figcaption>
                The poker table, at the end of a hand.{" "}
                <button type="button" className="link" onClick={() => setPoker(true)}>
                  Sit down
                </button>
              </figcaption>
            </figure>
            <p className="tools">{SITE_TOOLS.join(", ")}</p>
          </article>
        </section>

        <section className="c-section" id="work" aria-labelledby="work-h">
          <h2 id="work-h">Work</h2>

          <div className="c-employer">
            <header>
              <h3>{AMAZON.employer}</h3>
              <p>
                {AMAZON.role}, {AMAZON.place}. <time>{AMAZON.span}</time>
              </p>
            </header>
            {AMAZON.work.map((w) => (
              <Entry key={w.id} w={w} />
            ))}
          </div>

          <div className="c-employer">
            <header>
              <h3>{EARLIER.employer}</h3>
              <p>
                {EARLIER.role}, {EARLIER.place}
              </p>
            </header>
            <Entry w={EARLIER.work} />
          </div>
        </section>

        <section className="c-section c-contact" id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h">Contact</h2>
          <p>{CONTACT.lead}</p>
          <p className="c-mail">
            <a href={`mailto:${PERSON.email}`}>{PERSON.email}</a>
            <button type="button" className="c-copy" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </p>
          <p className="c-elsewhere">
            Also on{" "}
            <a href={PERSON.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>{" "}
            and{" "}
            <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            , and the dunk attempts are on{" "}
            <a href={PERSON.links.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="c-foot">
        <span>Hemosoo Woo</span>
        <a href={PERSON.links.resume} target="_blank" rel="noreferrer">
          Résumé (PDF)
        </a>
      </footer>

      {poker && (
        <Suspense fallback={null}>
          <PokerTable onClose={() => setPoker(false)} />
        </Suspense>
      )}
    </div>
  );
}
