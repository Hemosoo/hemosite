/**
 * The collection read as text: for anyone who would rather skim than handle
 * cards, and for screen readers it is simply the clearest version.
 *
 * At the top, the expandable bio (the same Stretchtext engine as the site,
 * with the alternatives' copy): coloured phrases open in place, and Short /
 * More / Everything set how much is open. Below it, every card's content as
 * plain lists, in the same order and under the same section ids, so the
 * navigation works the same in both views.
 */
import { useEffect, useRef, useState } from "react";
import { Stretch, type StretchState } from "../../bio/stretch";
import { BIO } from "../../content/bio";
import { EARLIER, EDUCATION, EXPERIENCE, INTERESTS, PERSON, PROJECTS } from "../../content/profile";

const DEPTHS = [
  ["0", "Short"],
  ["1", "More"],
  ["9", "Everything"],
] as const;

export default function TextView({ onPoker }: { onPoker: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const stretch = useRef<Stretch | null>(null);
  const [state, setState] = useState<StretchState>({ open: 0, total: 0, depth: "0" });
  const pokerRef = useRef(onPoker);
  pokerRef.current = onPoker;

  useEffect(() => {
    const sheet = sheetRef.current;
    const bio = bioRef.current;
    const margin = marginRef.current;
    if (!sheet || !bio || !margin) return;
    const s = new Stretch({
      sheet,
      bio,
      margin,
      nodes: BIO,
      origin: () => null,
      onChange: setState,
      onAction: (a) => {
        if (a === "poker") pokerRef.current();
      },
      onFirstUse: () => {},
      email: PERSON.email,
    });
    stretch.current = s;
    return () => {
      s.destroy();
      stretch.current = null;
    };
  }, []);

  const roles = [...EXPERIENCE, EARLIER];

  return (
    <div className="v3-text">
      <section className="v3-text-bio" aria-labelledby="v3-bio-h">
        <div className="v3-text-bio-head">
          <h2 id="v3-bio-h">In a paragraph</h2>
          <div className="v3-depth" role="group" aria-label="How much of the paragraph to open">
            {DEPTHS.map(([d, label]) => (
              <button
                key={d}
                type="button"
                aria-pressed={state.depth === d}
                onClick={() => stretch.current?.setDepth(Number(d))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="v3-text-help">
          Coloured words open in place. Short, More and Everything open a level at a time.
        </p>
        <div ref={sheetRef} className="st-sheet v3-sheet">
          <div ref={marginRef} className="st-margin" aria-hidden />
          <p ref={bioRef} className="st-bio" />
        </div>
      </section>

      <section id="experience" className="v3-text-sec" aria-labelledby="t-exp">
        <h2 id="t-exp">Experience</h2>
        {roles.map((r) => (
          <article key={r.id} className="v3-text-item">
            <h3>
              {r.service} <span className="v3-dim">· {r.org}{r.team ? `, ${r.team}` : ""}</span>
            </h3>
            <p className="v3-text-meta">
              {r.title} · {r.place} · {r.period}
            </p>
            <ul>
              {r.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="v3-text-meta">{r.stack.join(" · ")}</p>
          </article>
        ))}
      </section>

      <section id="projects" className="v3-text-sec" aria-labelledby="t-proj">
        <h2 id="t-proj">Projects</h2>
        {PROJECTS.map((p) => (
          <article key={p.id} className="v3-text-item">
            <h3>
              <a href={p.repo} target="_blank" rel="noreferrer">
                {p.name}
              </a>
            </h3>
            <p>{p.detail}</p>
            <p className="v3-text-meta">{p.stack.join(" · ")}</p>
          </article>
        ))}
      </section>

      <section id="education" className="v3-text-sec" aria-labelledby="t-edu">
        <h2 id="t-edu">Education</h2>
        <article className="v3-text-item">
          <h3>{EDUCATION.school}</h3>
          <ul>
            {EDUCATION.degrees.map((d) => (
              <li key={d.degree}>
                {d.degree}, {d.note.toLowerCase()} · {d.period}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section id="personal" className="v3-text-sec" aria-labelledby="t-per">
        <h2 id="t-per">Personal</h2>
        {INTERESTS.map((i) => (
          <article key={i.id} className="v3-text-item">
            <h3>{i.name}</h3>
            <p>
              {i.line}{" "}
              {i.link && (
                <a href={i.link.href} target="_blank" rel="noreferrer">
                  {i.link.label}
                </a>
              )}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
