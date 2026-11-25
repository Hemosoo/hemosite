/**
 * The card, small: a photograph with a name on it, that turns over.
 *
 * A personal detail beside the introduction, not the centrepiece: the
 * portrait fills the front, the name and year sit on a strip under it, and
 * the back holds three things that happened at Amazon, with the rest in small
 * print. Each of the three goes to the work it came from.
 *
 * It's also the card that folds into a paper plane when you copy my address
 * at the bottom of the page (./three/send.ts), so it exposes its element and
 * a way to put it face up first.
 *
 * Turning it over: click or tap the card, or use "Turn it over" (the
 * keyboard control). No tilt, no foil, no folded corner.
 */
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { PERSON } from "../../content/profile";

/** The three that matter most, then the rest in small print. */
const MAJOR = [
  { value: "5,200+", label: "routing configurations moved to validated writes", id: "entryid" },
  { value: "10,000+", label: "customer queries given LLM-generated titles", id: "gateway" },
  { value: "1st", label: "developer on the Network Health Service", id: "nhs" },
];
const MINOR = [
  "Three summers at Amazon",
  "70+ operations users given self-service tools",
  "3rd place, internal hackathon",
  "BSE CS + MSE CIS, Penn, 2027",
];

export interface CardHandle {
  /** The card itself (the element the plane is drawn from). */
  el: HTMLDivElement | null;
  /** Put it face up, at once. */
  front(): void;
}

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Go to a piece of work and mark it for a moment. */
function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: smooth(), block: "center" });
  el.classList.remove("is-marked");
  void el.offsetWidth;
  el.classList.add("is-marked");
  el.querySelector<HTMLElement>("h4")?.focus({ preventScroll: true });
}

const Card = forwardRef<CardHandle>(function Card(_, ref) {
  const [back, setBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const turn = () => setBack((b) => !b);

  useImperativeHandle(ref, () => ({
    get el() {
      return cardRef.current;
    },
    front: () => setBack(false),
  }));

  return (
    <figure className="c-card-wrap">
      <div
        ref={cardRef}
        className={`c-card${back ? " is-back" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          turn();
        }}
      >
        <div className="c-card-turn">
          <div className="c-face c-front" aria-hidden={back}>
            <img src={PERSON.portrait} alt="Hemosoo Woo" draggable={false} />
            <div className="c-strip">
              <span className="nm">{PERSON.name}</span>
              <span className="no">Penn ’27</span>
            </div>
          </div>
          <div className="c-face c-back" aria-hidden={!back}>
            <ol className="c-major">
              {MAJOR.map((m) => (
                <li key={m.value}>
                  <button type="button" tabIndex={back ? 0 : -1} onClick={() => goTo(m.id)}>
                    <span className="v">{m.value}</span>
                    <span className="l">{m.label}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="c-minor">{MINOR.join(" · ")}</p>
          </div>
        </div>
      </div>
      <figcaption>
        <button type="button" className="c-turn" onClick={turn} aria-pressed={back}>
          {back ? "Turn back" : "Turn it over"}
        </button>
      </figcaption>
    </figure>
  );
});

export default Card;
