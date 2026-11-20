/**
 * V2: Interactive Engineering Editorial.
 *
 * A publication's grid. The first screen says who, what and where (name,
 * one sentence of what he builds, three facts, the links) and the rest reads
 * top to bottom: the bio, then the work told as entries, the projects as
 * short case studies, school, life outside, contact.
 *
 * The player card rides along in its own column on a wide screen, and lights
 * the stat that belongs to whatever you're reading. On a narrower screen it
 * sits in the hero instead, where it can still be turned over.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Card from "./Card";
import Bio from "./Bio";
import { EARLIER, EDUCATION, EXPERIENCE, INTERESTS, PERSON, PROJECTS, type Role } from "../../content/profile";
import { useCursorBands } from "../../hooks/useCursorBands";

const PokerTable = lazy(() => import("../../components/PokerTable"));

const SECTIONS = [
  { id: "about", label: "About", color: "var(--text)" },
  { id: "experience", label: "Experience", color: "var(--c-exp)" },
  { id: "projects", label: "Projects", color: "var(--c-eng)" },
  { id: "contact", label: "Contact", color: "var(--text)" },
] as const;

/** The name's cursor rings, in the experience and engineering colours, over
 *  the primary text colour: never a grey wordmark waiting for a pointer. */
const BANDS: [number, string][] = [
  [70, "#e4bd78"],
  [150, "#60adeb"],
];
const BASE = "#eceef2";
const nameGradient = () => {
  const stops = BANDS.map(([edge, c], i) => `${c} ${i ? BANDS[i - 1][0] : 0}px, ${c} ${edge}px`).join(", ");
  return (
    `radial-gradient(circle at var(--mx, -9999px) var(--my, -9999px), ${stops}, transparent ${BANDS[BANDS.length - 1][0]}px), ` +
    `linear-gradient(${BASE}, ${BASE})`
  );
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const go = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
};

/** Mono for the figures in a sentence, the way the bio sets them. */
function Figures({ text }: { text: string }) {
  const parts = text.split(/(\b\d{1,3}(?:,\d{3})*\+|\b3rd\b|\b1st\b)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="num">
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  );
}

function RoleEntry({ role, open, onToggle, earlier }: { role: Role; open: boolean; onToggle: () => void; earlier?: boolean }) {
  const detailId = `${role.id}-detail`;
  return (
    <article id={`role-${role.id}`} data-node={role.id} className={`v2-role${earlier ? " earlier" : ""}`}>
      <div className="v2-role-top">
        <div className="v2-year">{role.year}</div>
        <div>
          <h3>{role.service}</h3>
          <p className="v2-meta">
            {role.org}
            {role.team ? ` · ${role.team}` : ""} · {role.place} · {role.period}
          </p>
          <p className="v2-summary">{role.summary}</p>
          <ul className="v2-metrics">
            {role.metrics.map((m) => (
              <li key={m.label}>
                <span className="n">{m.value}</span>
                <span className="l">{m.label}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="v2-more" aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
            <span className="pm" aria-hidden>
              +
            </span>
            {open ? "Less" : "What I built"}
          </button>
          <div id={detailId} className={`v2-detail${open ? " open" : ""}`}>
            <div aria-hidden={!open}>
              <ul>
                {role.bullets.map((b) => (
                  <li key={b}>
                    <Figures text={b} />
                  </li>
                ))}
              </ul>
              <p className="v2-stack">
                <b>Built with</b> {role.stack.join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Flow({ id }: { id: string }) {
  if (id === "holdem") {
    return (
      <figure className="v2-flow">
        <ol aria-label="How holdem-bot fits together">
          <li>
            <span className="node">
              CFR trainer<small>self-play</small>
            </span>
          </li>
          <li>
            <span className="edge">improves</span>
          </li>
          <li>
            <span className="node hi">
              Strategy bots<small>position-aware, GTO BB defence</small>
            </span>
          </li>
          <li>
            <span className="edge">play in</span>
          </li>
          <li>
            <span className="node">
              Simulator<small>full betting rounds</small>
            </span>
          </li>
        </ol>
        <figcaption>Alongside: an OpenCV screen reader that reads a live table.</figcaption>
      </figure>
    );
  }
  return (
    <figure className="v2-flow">
      <ol aria-label="How learning-tool-mcp fits together">
        <li>
          <span className="node">
            Assistant<small>MCP client</small>
          </span>
        </li>
        <li>
          <span className="edge">calls</span>
        </li>
        <li>
          <span className="node hi">
            learning-tool-mcp<small>local · no LLM inside</small>
          </span>
        </li>
        <li>
          <span className="edge">turns PDFs into</span>
        </li>
        <li>
          <span className="node">
            Flashcards, quizzes<small>with session tracking</small>
          </span>
        </li>
      </ol>
    </figure>
  );
}

export default function App() {
  const nameRef = useRef<HTMLHeadingElement>(null);
  useCursorBands(nameRef);

  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1100px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const [flipped, setFlipped] = useState(false);
  const [openRoles, setOpenRoles] = useState<Set<string>>(new Set());
  const [section, setSection] = useState<string>("top");
  const [node, setNode] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const [poker, setPoker] = useState(false);
  const [copied, setCopied] = useState(false);

  // Where the reader is: the section, and within experience, the role.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (el.dataset.node) setNode(el.dataset.node);
          else {
            setSection(el.id);
            if (el.id !== "experience") setNode(null);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    document.querySelectorAll("[data-sec], [data-node]").forEach((el) => io.observe(el));
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const toggleRole = useCallback((id: string) => {
    setOpenRoles((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // A stat on the card goes to where it is told in full.
  const onStat = useCallback((n: string) => {
    if (n === "amazon") return go("experience");
    if (n === "penn") return go("education");
    if (EXPERIENCE.some((r) => r.id === n)) {
      setOpenRoles((s) => new Set(s).add(n));
      requestAnimationFrame(() => go(`role-${n}`));
    }
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address stays selectable */
    }
  };

  const lit =
    section === "experience" ? (node ? [node] : ["amazon"]) : section === "education" ? ["penn"] : [];
  const reading = (() => {
    const role = EXPERIENCE.find((r) => r.id === node);
    if (section === "experience" && role)
      return { c: "var(--c-exp)", t: `${role.year} · ${role.service}`, s: flipped ? "lit on the back" : "turn it over for the numbers" };
    if (section === "projects") return { c: "var(--c-eng)", t: "Projects", s: "holdem-bot, learning-tool-mcp" };
    if (section === "education") return { c: "var(--c-edu)", t: "Penn", s: "BSE CS and MSE CIS, 2027" };
    return null;
  })();

  const card = (
    <div className="v2-cardbox" data-card-slot>
      <Card flipped={flipped} onFlip={setFlipped} lit={lit} onStat={onStat} />
      <button type="button" className="v2-turn" onClick={() => setFlipped((f) => !f)}>
        {flipped ? "Turn back to the front" : "Turn over for stats"} <kbd>Enter</kbd>
      </button>
      {wide && (
        <p className="v2-caption" aria-live="polite" style={{ ["--cap" as string]: reading?.c }}>
          {reading ? (
            <>
              Reading along: <b>{reading.t}</b>
              <br />
              {reading.s}
            </>
          ) : (
            "Each stat on the back links to where it's told in full."
          )}
        </p>
      )}
    </div>
  );

  return (
    <div className="v2">
      <header className={`v2-bar${stuck ? " stuck" : ""}`}>
        <div className="v2-wrap">
          <a className="v2-mark" href="#top" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }))}>
            {PERSON.name}
          </a>
          <nav className="v2-nav" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={section === s.id ? "true" : undefined}
                style={{ ["--sec" as string]: s.color }}
                onClick={(e) => {
                  e.preventDefault();
                  go(s.id);
                }}
              >
                {s.label}
              </a>
            ))}
            <span className="sep" aria-hidden />
            <a className="ext" href={PERSON.links.resume} target="_blank" rel="noreferrer">
              Résumé ↗
            </a>
            <a className="ext" href={PERSON.links.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
            <a className="ext" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
          </nav>
        </div>
      </header>

      <div className="v2-wrap">
        <div className="v2-page">
          {wide && (
            <aside className="v2-side" aria-label="Player card">
              <div className="v2-side-inner">{card}</div>
            </aside>
          )}

          <main className="v2-main" id="top">
            <section className="v2-hero" aria-label="Introduction">
              <div className="v2-hero-grid">
                <div>
                  <h1
                    ref={nameRef}
                    className="v2-name v2-rise"
                    style={{ backgroundImage: nameGradient() }}
                    aria-label={PERSON.name}
                  >
                    <span className="ln">Hemosoo</span> <span className="ln">Woo</span>
                  </h1>
                  <p className="v2-statement v2-rise" style={{ animationDelay: "160ms" }}>
                    I build backend systems, infrastructure, and tools that make <em>AI useful in practice</em>.
                  </p>
                  <ul className="v2-facts v2-rise" style={{ animationDelay: "240ms" }}>
                    <li style={{ ["--fc" as string]: "var(--c-exp)" }}>
                      <span className="k">Amazon</span>
                      <span className="v">
                        Three summers as an SDE intern
                        <small>2024 · 2025 · 2026, Seattle</small>
                      </span>
                    </li>
                    <li style={{ ["--fc" as string]: "var(--c-edu)" }}>
                      <span className="k">Penn</span>
                      <span className="v">
                        BSE in Computer Science
                        <small>and an MSE in CIS, both 2027</small>
                      </span>
                    </li>
                    <li style={{ ["--fc" as string]: "var(--c-eng)" }}>
                      <span className="k">Building</span>
                      <span className="v">
                        <a href="#case-holdem" onClick={(e) => (e.preventDefault(), go("case-holdem"))}>
                          holdem-bot
                        </a>
                        {", "}
                        <a href="#case-mcp" onClick={(e) => (e.preventDefault(), go("case-mcp"))}>
                          learning-tool-mcp
                        </a>
                        <small>a poker engine; an MCP server</small>
                      </span>
                    </li>
                  </ul>
                  <div className="v2-links v2-rise" style={{ animationDelay: "320ms" }}>
                    <a className="v2-btn" href={PERSON.links.resume} target="_blank" rel="noreferrer">
                      Résumé (PDF)
                    </a>
                    <a className="v2-link" href={PERSON.links.github} target="_blank" rel="noreferrer">
                      GitHub<span className="arr">↗</span>
                    </a>
                    <a className="v2-link" href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn<span className="arr">↗</span>
                    </a>
                    <button type="button" className="v2-copy" onClick={copyEmail}>
                      {copied ? <span className="ok">Email copied</span> : "Copy email"}
                    </button>
                  </div>
                </div>
                {!wide && <div className="v2-hero-card">{card}</div>}
              </div>
            </section>

            <section id="about" data-sec className="v2-sec" aria-labelledby="about-h">
              <div className="v2-label" id="about-h">
                About
                <span>the short version</span>
              </div>
              <div className="v2-body">
                <Bio onPoker={() => setPoker(true)} />
              </div>
            </section>

            <section id="experience" data-sec className="v2-sec" style={{ ["--sec" as string]: "var(--c-exp)" }} aria-labelledby="exp-h">
              <div className="v2-label" id="exp-h">
                Experience
                <span>2022 – 2026</span>
              </div>
              <div className="v2-body">
                <div className="v2-roles">
                  {EXPERIENCE.map((r) => (
                    <RoleEntry key={r.id} role={r} open={openRoles.has(r.id)} onToggle={() => toggleRole(r.id)} />
                  ))}
                </div>
                <p className="v2-earlier-h">Before Penn</p>
                <RoleEntry role={EARLIER} earlier open={openRoles.has(EARLIER.id)} onToggle={() => toggleRole(EARLIER.id)} />
              </div>
            </section>

            <section id="projects" data-sec className="v2-sec" style={{ ["--sec" as string]: "var(--c-eng)" }} aria-labelledby="proj-h">
              <div className="v2-label" id="proj-h">
                Projects
                <span>on my own time</span>
              </div>
              <div className="v2-body">
                {PROJECTS.map((p) => (
                  <article key={p.id} id={`case-${p.id}`} className="v2-case">
                    <div className="v2-case-h">
                      <h3>{p.name}</h3>
                      <a className="v2-link" href={p.repo} target="_blank" rel="noreferrer">
                        Source on GitHub<span className="arr">↗</span>
                      </a>
                    </div>
                    <p className="what">{p.what}</p>
                    <Flow id={p.id} />
                    <dl>
                      <dt>What it does</dt>
                      <dd>{p.detail}</dd>
                      <dt>How it's built</dt>
                      <dd>
                        <ul>
                          {p.decisions.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </dd>
                      <dt>Stack</dt>
                      <dd className="mono">{p.stack.join(" · ")}</dd>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section id="education" data-sec className="v2-sec" style={{ ["--sec" as string]: "var(--c-edu)" }} aria-labelledby="edu-h">
              <div className="v2-label" id="edu-h">
                Education
                <span>{EDUCATION.place}</span>
              </div>
              <div className="v2-body v2-edu">
                <div>
                  <h2 className="v2-h2">{EDUCATION.school}</h2>
                  <ul className="v2-degrees">
                    {EDUCATION.degrees.map((d) => (
                      <li key={d.degree}>
                        <b>{d.degree}</b>
                        <span>{d.note}</span>
                        <small>{d.period}</small>
                      </li>
                    ))}
                  </ul>
                </div>
                <figure className="v2-fig">
                  <img src={EDUCATION.photo.src} alt={EDUCATION.photo.alt} loading="lazy" />
                  <figcaption>
                    <b>Hey Day</b>, {EDUCATION.heyday}.
                  </figcaption>
                </figure>
              </div>
            </section>

            <section id="outside" data-sec className="v2-sec" style={{ ["--sec" as string]: "var(--c-per)" }} aria-labelledby="life-h">
              <div className="v2-label" id="life-h">
                Outside work
              </div>
              <div className="v2-body">
                <div className="v2-life">
                  {INTERESTS.map((it) => (
                    <figure key={it.id} className={it.inProgress ? "wip" : undefined}>
                      <div className="ph">
                        <img src={it.photo.src} alt={it.photo.alt} loading="lazy" />
                      </div>
                      <figcaption>
                        <b>{it.name}</b>
                        <span>{it.line}</span>
                        {it.inProgress && <span className="wip-tag">In progress</span>}
                        {it.id === "poker" && (
                          <button type="button" className="act" onClick={() => setPoker(true)}>
                            Play a hand here →
                          </button>
                        )}
                        {it.link && (
                          <a className="act" href={it.link.href} target="_blank" rel="noreferrer">
                            {it.link.label} ↗
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>

            <section id="contact" data-sec className="v2-sec" aria-labelledby="contact-h">
              <div className="v2-label" id="contact-h">
                Contact
              </div>
              <div className="v2-body">
                <p className="v2-contact-line">
                  You can reach me at any of these.
                </p>
                <ul className="v2-contact">
                  <li>
                    <span className="k">Email</span>
                    <span>
                      <span className="mail">{PERSON.email}</span>{" "}
                      <button type="button" className="v2-copy" onClick={copyEmail} style={{ minHeight: 44 }}>
                        {copied ? <span className="ok">copied</span> : "copy"}
                      </button>
                    </span>
                  </li>
                  <li>
                    <span className="k">Résumé</span>
                    <a href={PERSON.links.resume} target="_blank" rel="noreferrer">
                      resume.pdf ↗
                    </a>
                  </li>
                  <li>
                    <span className="k">GitHub</span>
                    <a href={PERSON.links.github} target="_blank" rel="noreferrer">
                      github.com/Hemosoo ↗
                    </a>
                  </li>
                  <li>
                    <span className="k">LinkedIn</span>
                    <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                      linkedin.com/in/hemosoowoo ↗
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <footer className="v2-foot">
              <span>{PERSON.name} · hemosoo.com</span>
              <span>Set in Schibsted Grotesk and JetBrains Mono</span>
            </footer>
          </main>
        </div>
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
