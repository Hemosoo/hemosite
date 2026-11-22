/**
 * Everything below the hero: the player card at the left, and beside it a
 * short bio, the experience and the projects, then contact.
 *
 * The bio is three plain paragraphs. Colour means a word does something:
 * Amazon goes to the experience, "building things" to the projects, poker
 * opens the table, dunk goes to the attempts. The card is where the hero's plane lands (three/landing.ts), and
 * each stat on its back points at the row it comes from.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Card, { type CardHandle } from "./Card";
import { landing } from "../three/landing";
import { EARLIER, EXPERIENCE, PERSON, PROJECTS, type Role } from "../content/profile";

export interface MainHandle {
  about: HTMLElement | null;
  experience: HTMLElement | null;
  projects: HTMLElement | null;
  contact: HTMLElement | null;
}

interface Props {
  onPoker: () => void;
}

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Light an element for a moment, to show where a stat or a link came to. */
function flash(el: Element | null) {
  if (!el) return;
  el.classList.remove("flash");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("flash");
}

/**
 * Amazon, once: the employer, the role and the span of years as one heading,
 * then each summer as its own entry underneath. The three internships read as
 * one relationship rather than three repeats of the same name.
 */
function AmazonGroup({ roles }: { roles: Role[] }) {
  const years = roles.map((r) => Number(r.year));
  return (
    <li className="v1-role v1-group">
      <div className="head">
        <span className="org">{roles[0].org}</span>
        <span className="when">
          {Math.min(...years)} – {Math.max(...years)}
        </span>
      </div>
      <p className="meta">
        {roles[0].title} · {roles[0].place} · {roles.length} summers
      </p>
      <ol className="v1-stints">
        {roles.map((r) => (
          <li key={r.id} className="v1-stint" data-row={r.id}>
            <p className="sub">
              <span className="yr">{r.year}</span>
              <span className="team">{r.team}</span>
              <span className="when">{r.period}</span>
            </p>
            <p className="what">
              <span className="svc">{r.service}.</span> {r.summary}
            </p>
            <p className="stk">{r.stack.join(" · ")}</p>
          </li>
        ))}
      </ol>
    </li>
  );
}

/** One role: the employer first and strongest, everything else quieter. */
function RoleRow({ r }: { r: Role }) {
  return (
    <li className="v1-role" data-row={r.id} style={{ ["--c" as string]: `var(${r.category === "experience" ? "--c-exp" : "--c-eng"})` }}>
      <div className="head">
        <span className="org">{r.org}</span>
        <span className="when">{r.period}</span>
      </div>
      <p className="meta">
        {r.title}
        {r.team && <> · {r.team}</>} · {r.place}
      </p>
      <p className="what">
        <span className="svc">{r.service}.</span> {r.summary}
      </p>
      <p className="stk">{r.stack.join(" · ")}</p>
    </li>
  );
}

const Main = forwardRef<MainHandle, Props>(function Main({ onPoker }, ref) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<CardHandle>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const expRef = useRef<HTMLElement>(null);
  const projRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  useImperativeHandle(ref, () => ({
    get about() {
      return aboutRef.current;
    },
    get experience() {
      return expRef.current;
    },
    get projects() {
      return projRef.current;
    },
    get contact() {
      return contactRef.current;
    },
  }));

  // Where the hero's plane lands.
  useEffect(() => {
    landing.slot = cardRef.current?.card ?? null;
    landing.hold = holdRef.current;
    landing.layout = layoutRef.current;
    landing.unflip = () => cardRef.current?.setFlipped(false);
    const measure = () => landing.measure();
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      landing.slot = landing.hold = landing.layout = null;
      landing.unflip = null;
    };
  }, []);

  /** Where a stat on the card's back was earned: its role, or the section. */
  const targetFor = useCallback((node: string): Element | null => {
    const row = document.querySelector(`[data-row="${node}"]`);
    if (row) return row;
    if (node === "penn") return aboutRef.current;
    return expRef.current;
  }, []);
  const onStat = useCallback(
    (node: string) => {
      const t = targetFor(node);
      t?.scrollIntoView({ behavior: smooth(), block: "center" });
      flash(t);
    },
    [targetFor]
  );
  const onLight = useCallback((node: string) => flash(targetFor(node)), [targetFor]);

  const goExperience = (e: React.MouseEvent) => {
    e.preventDefault();
    expRef.current?.scrollIntoView({ behavior: smooth(), block: "start" });
  };

  const goProjects = (e: React.MouseEvent) => {
    e.preventDefault();
    projRef.current?.scrollIntoView({ behavior: smooth(), block: "start" });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is selectable as text */
    }
  };

  const [featured, ...others] = PROJECTS;

  return (
    <section className="v1-main" aria-label="About Hemosoo">
      <div ref={layoutRef} className="v1-layout">
        <aside className="v1-cardcol" aria-label="Player card">
          <div ref={holdRef} className="v1-hold" data-card-slot>
            <Card ref={cardRef} onStat={onStat} onLight={onLight} />
            <p className="v1-cardhint">
              <b>{coarse ? "Tap" : "Click"} the card</b> to turn it over. Each stat on the back points to where it
              happened.
            </p>
          </div>
        </aside>

        <div className="v1-bioarea" ref={aboutRef} id="about">
          <div className="v1-bio">
            <p>
              I build backend systems, infrastructure, and tools that make AI useful in practice. I've spent three
              summers building software for internal teams and real customers at{" "}
              <a className="w exp" href="#experience" onClick={goExperience}>
                Amazon
              </a>
              . I study computer science at <span className="w strong">Penn</span>, where I'm also doing my master's in
              CIS.
            </p>
            <p>
              Outside of engineering, I sing a cappella, play{" "}
              <button type="button" className="w per" onClick={onPoker}>
                poker
              </button>
              , and am trying to{" "}
              <a className="w per" href={PERSON.links.instagram} target="_blank" rel="noreferrer">
                dunk
              </a>
              . I also spend a lot of my free time{" "}
              <a className="w eng" href="#projects" onClick={goProjects}>
                building things
              </a>
              .
            </p>
            <p>
              You can reach me at <span className="mail">{PERSON.email}</span>, on{" "}
              <a className="w eng" href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub
              </a>{" "}
              or{" "}
              <a className="w eng" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              , or through my{" "}
              <a className="w eng" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                résumé
              </a>
              .
            </p>
          </div>
        </div>

        <div className="v1-index">
          <section ref={expRef} aria-labelledby="v1-exp" id="experience">
            <h2 className="v1-h" id="v1-exp">
              Experience
            </h2>
            <ol className="v1-roles">
              <AmazonGroup roles={EXPERIENCE} />
              <RoleRow r={EARLIER} />
            </ol>
          </section>

          <section ref={projRef} aria-labelledby="v1-proj" id="projects">
            <h2 className="v1-h" id="v1-proj">
              Projects
            </h2>
            <article className="v1-feature">
              <h3>
                <a href={featured.href} target="_blank" rel="noreferrer">
                  {featured.name} ↗
                </a>
              </h3>
              <p className="what">{featured.what}</p>
              <p className="stk">{featured.stack.join(" · ")}</p>
              {featured.preview ? (
                <img className="v1-preview" src={featured.preview} alt={`${featured.name}, a screenshot`} loading="lazy" />
              ) : (
                <div className="v1-preview empty" role="img" aria-label={`A preview of ${featured.name} is coming`}>
                  <span>Preview coming soon</span>
                </div>
              )}
            </article>
            <ol className="v1-projects">
              {others.map((p) => (
                <li key={p.id} className="v1-project">
                  <div className="head">
                    <a href={p.href} target="_blank" rel="noreferrer">
                      {p.name} ↗
                    </a>
                  </div>
                  <p className="what">{p.what}</p>
                  <p className="stk">{p.stack.join(" · ")}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer ref={contactRef} className="v1-foot" id="contact">
          <div className="v1-contact">
            <p className="lead">The fastest way to reach me is email.</p>
            <div className="row">
              <span className="mail">{PERSON.email}</span>
              <button type="button" className="copy" onClick={copy}>
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <div className="row">
              <a href={PERSON.links.resume} target="_blank" rel="noreferrer">
                Résumé ↗
              </a>
              <a href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
              <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
              <a href={PERSON.links.instagram} target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
            </div>
          </div>
          <div className="v1-small">
            <span>Hemosoo Woo · hemosoo.com</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: smooth() })}>
              Back to the top
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
});

export default Main;
