/**
 * The two faces of a collection card.
 *
 * The front is enough on its own: where and when, the name of the thing, the
 * one figure that matters (or the photograph), and one sentence. The back is
 * everything else, set to be read: bullets, the stack written out, links.
 *
 * Each set has its own print (styled in v3.css by data-set): experience is
 * engraved in fine diagonal lines, projects carry a dot grid, education
 * concentric rings, personal a woven grid. The one card that isn't finished
 * (dunking) is drawn in pencil hatching with a dashed edge.
 */
import { EDUCATION, PERSON } from "../../content/profile";
import type { CardData } from "./collection";

export function CardFront({ card }: { card: CardData }) {
  const { art } = card;
  return (
    <div className="v3-face v3-front">
      <div className="v3-front-top">
        <span>{card.line}</span>
        <span className="v3-no">{card.no}</span>
      </div>
      <div className={`v3-art v3-art-${art.kind}`}>
        {art.kind === "photo" && <img src={art.src} alt={art.alt} loading="lazy" draggable={false} />}
        {art.kind === "metric" && (
          <>
            <span className="v3-art-v">{art.value}</span>
            <span className="v3-art-l">{art.label}</span>
          </>
        )}
        {art.kind === "word" && (
          <>
            <span className="v3-art-v">{art.text}</span>
            <span className="v3-art-l">{art.sub}</span>
          </>
        )}
        {card.inProgress && <span className="v3-stamp">In progress</span>}
      </div>
      <div className="v3-front-body">
        <h3 className="v3-front-title">{card.title}</h3>
        <p className="v3-front-sub">{card.sub}</p>
        <p className="v3-front-sum">{card.summary}</p>
      </div>
      <div className="v3-front-foot">
        <span>{card.foot}</span>
        <span aria-hidden className="v3-turn">
          ↻
        </span>
      </div>
    </div>
  );
}

export function CardBack({
  card,
  tab,
  onPoker,
  onOpen,
}: {
  card: CardData;
  /** Focusable only while the back is the side showing. */
  tab: number;
  onPoker: () => void;
  onOpen: (id: string) => void;
}) {
  const s = card.source;
  return (
    <div className="v3-face v3-back">
      <div className="v3-back-top">
        <span>{card.line}</span>
        <span className="v3-no">{card.no}</span>
      </div>
      <h3 className="v3-back-title">{card.title}</h3>

      {s.kind === "role" && (
        <>
          <p className="v3-back-meta">
            {s.role.title}, {s.role.org}
            {s.role.team ? ` · ${s.role.team}` : ""} · {s.role.place} · {s.role.period}
          </p>
          {s.role.metrics.length > 0 && (
            <dl className="v3-back-metrics">
              {s.role.metrics.map((m) => (
                <div key={m.label}>
                  <dt>{m.value}</dt>
                  <dd>{m.label}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="v3-back-list">
            {s.role.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="v3-back-stack">
            <span>Built with</span> {s.role.stack.join(" · ")}
          </p>
        </>
      )}

      {s.kind === "project" && (
        <>
          <p className="v3-back-lede">{s.project.detail}</p>
          <p className="v3-back-h">How it's built</p>
          <ul className="v3-back-list">
            {s.project.decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="v3-back-stack">
            <span>Built with</span> {s.project.stack.join(" · ")}
          </p>
          <p className="v3-back-links">
            <a href={s.project.repo} target="_blank" rel="noreferrer" tabIndex={tab}>
              {s.project.repo.replace("https://", "")}
            </a>
          </p>
        </>
      )}

      {s.kind === "education" && (
        <>
          <p className="v3-back-meta">
            {EDUCATION.school} · {EDUCATION.place}
          </p>
          <dl className="v3-back-degrees">
            {EDUCATION.degrees.map((d) => (
              <div key={d.degree}>
                <dt>{d.degree}</dt>
                <dd>
                  {d.note} · {d.period}
                </dd>
              </div>
            ))}
          </dl>
          <p className="v3-back-lede">
            The photo is Hey Day: {EDUCATION.heyday}.
          </p>
        </>
      )}

      {s.kind === "interest" && (
        <>
          <p className="v3-back-lede">{s.interest.line}</p>
          {s.interest.id === "poker" && (
            <p className="v3-back-lede">
              The engine is a project in this collection:{" "}
              <button type="button" className="v3-inline" tabIndex={tab} onClick={() => onOpen("holdem")}>
                holdem-bot
              </button>
              . There's also a table on this site.{" "}
              <button type="button" className="v3-inline" tabIndex={tab} onClick={onPoker}>
                Deal me in
              </button>
            </p>
          )}
          {s.interest.link && (
            <p className="v3-back-links">
              <a href={s.interest.link.href} target="_blank" rel="noreferrer" tabIndex={tab}>
                The attempts, on {s.interest.link.label}
              </a>
            </p>
          )}
          <figure className="v3-back-photo">
            <img src={s.interest.photo.src} alt={s.interest.photo.alt} loading="lazy" />
            <figcaption>{s.interest.photo.caption}</figcaption>
          </figure>
        </>
      )}

      <div className="v3-back-foot">
        <span>{PERSON.name}</span>
        <span>hemosoo.com</span>
      </div>
    </div>
  );
}
