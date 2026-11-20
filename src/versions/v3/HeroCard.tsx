/**
 * The player card: card 001 of the set, and the first thing on the page.
 *
 * Front: the portrait under a quiet foil that only wakes up when the card is
 * handled. Back: the stat line, then the toolkit, then the links, sized to
 * fill the card rather than float in it. Every stat is a pointer into the
 * collection: clicking one opens the card it comes from.
 *
 * The two faces share one frame colour, one corner radius and one footer, so
 * they read as two sides of one object. Click, Enter or the button under the
 * card flips it; a folded corner on the front says that it can.
 */
import { useCallback, useRef, useState } from "react";
import { PERSON, STATS, TOOLKIT } from "../../content/profile";
import { PLAYER_NO } from "./collection";
import { useTilt } from "./useTilt";

const STAR = "M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.4l-4.2 2.4 1-4.6L1.3 6l4.7-.5z";
const VAR: Record<string, string> = {
  experience: "var(--c-exp)",
  education: "var(--c-edu)",
  engineering: "var(--c-eng)",
  personal: "var(--c-per)",
};

export default function HeroCard({ onStat }: { onStat: (node: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);
  flippedRef.current = flipped;
  // On the back the card holds still, so the stats can be read and pointed at.
  const paused = useCallback(() => flippedRef.current, []);
  useTilt(ref, { max: 16, paused });

  const tab = flipped ? 0 : -1;

  return (
    <div className="v3-hold">
      <div
        ref={ref}
        className={`v3-pc${flipped ? " is-flipped" : ""}`}
        role="group"
        aria-roledescription="player card"
        aria-label={`${PERSON.name}, player card ${PLAYER_NO}. ${flipped ? "Showing the stat line." : "Showing the front."}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          setFlipped((f) => !f);
        }}
      >
        <div className="v3-pc-tilt">
          <div className="v3-pc-flip">
            <div className="v3-pc-face v3-pc-front" aria-hidden={flipped}>
              <div className="v3-pc-head">
                <span className="v3-pc-name">{PERSON.name}</span>
                <svg viewBox="0 0 16 16" aria-hidden>
                  <path d={STAR} fill="currentColor" />
                </svg>
              </div>
              <div className="v3-pc-art">
                <img src={PERSON.portrait} alt={PERSON.name} draggable={false} />
              </div>
              <div className="v3-pc-type">
                <span className="v3-pc-k">Player</span>
                <span>Backend · infrastructure · applied AI</span>
              </div>
              <div className="v3-pc-foot">
                <span>{PLAYER_NO}</span>
                <span>Penn · Amazon</span>
              </div>
              <div className="v3-pc-foil" />
              <div className="v3-pc-glare" />
              <span className="v3-pc-corner" aria-hidden />
            </div>

            <div className="v3-pc-face v3-pc-back" aria-hidden={!flipped}>
              <div className="v3-pc-bhead">
                <b>{PERSON.name}</b>
                <span>{PLAYER_NO}</span>
              </div>
              <p className="v3-pc-sub">Stat line</p>
              <ul className="v3-pc-stats">
                {STATS.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      tabIndex={tab}
                      className="v3-pc-stat"
                      style={{ ["--c" as string]: VAR[s.category] }}
                      onClick={() => onStat(s.node)}
                    >
                      <span className="v">{s.value}</span>
                      <span className="l">{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="v3-pc-sub">Toolkit</p>
              <dl className="v3-pc-kit">
                {TOOLKIT.map((t) => (
                  <div key={t.group}>
                    <dt>{t.group}</dt>
                    <dd>{t.items.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
              <div className="v3-pc-foot v3-pc-bfoot">
                <a href={PERSON.links.github} target="_blank" rel="noreferrer" tabIndex={tab}>
                  GitHub
                </a>
                <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer" tabIndex={tab}>
                  LinkedIn
                </a>
                <a href={PERSON.links.resume} target="_blank" rel="noreferrer" tabIndex={tab}>
                  Résumé
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="v3-flipbtn"
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
      >
        <span aria-hidden className="v3-flipbtn-g">
          ↻
        </span>
        {flipped ? "Turn back to the front" : "Turn over for the stat line"}
      </button>
    </div>
  );
}
