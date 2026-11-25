/**
 * The card, small: a photograph with a name on it, that turns over.
 *
 * In this version the card is a personal detail beside the introduction, not
 * the centrepiece, so it is simple: the portrait fills the front, the name and
 * year sit on a strip under it, and the back holds three things that happened
 * at Amazon, with the rest in small print. No tilt, no foil, no folded corner;
 * it moves only when turned over, by click, tap, Enter or Space.
 */
import { useState } from "react";
import { PERSON } from "../../content/profile";

/** The three that matter most, then the rest in small print. */
const MAJOR = [
  { value: "5,200+", label: "routing configurations moved to validated writes", at: "EntryID Platform" },
  { value: "10,000+", label: "customer queries given LLM-generated titles", at: "Widget title generator" },
  { value: "1st", label: "developer on the Network Health Service", at: "Network Health Service" },
];
const MINOR = [
  "Three summers at Amazon",
  "70+ operations users given self-service tools",
  "3rd place, internal hackathon",
  "BSE CS + MSE CIS, Penn, 2027",
];

export default function Card() {
  const [back, setBack] = useState(false);
  const turn = () => setBack((b) => !b);

  return (
    <figure className="c-card-wrap">
      <div
        className={`c-card${back ? " is-back" : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={back}
        aria-label={back ? "Card, back. Press to turn it to the front." : "Card with my photo. Press to turn it over."}
        onClick={turn}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            turn();
          }
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
                  <span className="v">{m.value}</span>
                  <span className="l">{m.label}</span>
                </li>
              ))}
            </ol>
            <p className="c-minor">{MINOR.join(" · ")}</p>
          </div>
        </div>
      </div>
      <figcaption>
        <button type="button" className="c-turn" onClick={turn} tabIndex={-1} aria-hidden>
          {back ? "Turn back" : "Turn it over"}
        </button>
      </figcaption>
    </figure>
  );
}
