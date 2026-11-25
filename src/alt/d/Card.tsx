/**
 * The card, as a printed object: a cream stock with the photograph set into
 * it and the name printed underneath, like a card you could hold.
 *
 * The back is the same stock turned over: three things that happened, large,
 * and everything else in one line of small print. Each of the three points at
 * the work entry it came from: pressing it goes there and marks the entry.
 *
 * It turns over on a click or tap anywhere on it, or with the button under
 * it (Enter or Space). While a mouse is on it, it
 * leans a few degrees toward the pointer and catches a little light; at rest,
 * and with reduced motion, it doesn't move at all.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PERSON } from "../../content/profile";

export interface CardHandle {
  el: HTMLDivElement | null;
  setFlipped: (on: boolean) => void;
}

/** The three that lead the back, and where each one is told in full. */
const LEADS = [
  { value: "5,200+", label: "routing configurations off unvalidated legacy writes", short: "routing configs off legacy writes", to: "entryid" },
  { value: "10,000+", label: "customer queries given generated titles", short: "queries given LLM titles", to: "gateway" },
  { value: "1st", label: "developer on the Network Health Service", short: "developer on Network Health", to: "nhs" },
];

const Card = forwardRef<CardHandle, { onStat: (to: string) => void }>(function Card({ onStat }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  useImperativeHandle(ref, () => ({ el: el.current, setFlipped }), []);

  // Lean toward a mouse while it's over the card; nothing otherwise.
  useEffect(() => {
    const card = el.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const set = (x: number, y: number, on: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
        card.style.setProperty("--lx", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--ly", `${(y * 100).toFixed(1)}%`);
        card.style.setProperty("--light", String(on));
      });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = card.getBoundingClientRect();
      set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 1);
    };
    const leave = () => set(0.5, 0.5, 0);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  const turn = () => setFlipped((f) => !f);

  return (
    <figure className="a-cardwrap">
      {/* The whole card turns on a click or tap; the button under it is the
          same action for the keyboard and screen readers. */}
      <div
        ref={el}
        className={`a-card${flipped ? " flipped" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          turn();
        }}
      >
        <div className="a-card-tilt">
          <div className="a-card-flip">
            <div className="a-face a-front" aria-hidden={flipped}>
              <div className="a-photo">
                <img src={PERSON.portrait} alt="Hemosoo Woo" draggable={false} />
              </div>
              <div className="a-print">
                <span className="a-print-name">{PERSON.name}</span>
                <span className="a-print-meta">Penn ’27</span>
              </div>
              <span className="a-light" aria-hidden />
            </div>

            <div className="a-face a-back" aria-hidden={!flipped}>
              <p className="a-back-head">Three summers at Amazon</p>
              <ul className="a-leads">
                {LEADS.map((s) => (
                  <li key={s.to}>
                    <button
                      type="button"
                      tabIndex={flipped ? 0 : -1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStat(s.to);
                      }}
                    >
                      <span className="v">{s.value}</span>
                      <span className="l">{s.label}</span>
                      <span className="l short" aria-hidden>
                        {s.short}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="a-small">
                Also: self-service tooling for 70+ operations users; 3rd in an internal hackathon; BSE and MSE at
                Penn, 2027.
              </p>
            </div>
          </div>
        </div>
      </div>
      <button type="button" className="a-turn" onClick={turn} aria-pressed={flipped}>
        <span aria-hidden>↻</span> {flipped ? "Turn back" : "Turn over"}
      </button>
    </figure>
  );
});

export default Card;
