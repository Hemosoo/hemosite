/**
 * Inspecting a card: it lifts out of the collection, grows to reading size,
 * and turns over to its back, where the full detail is.
 *
 * A dialog: focus moves into it and stays there, Escape closes it and returns
 * focus to the card that opened it, the arrow keys move through the
 * collection, and "Turn over" shows the other side. The lift plays once, from
 * where the card was; moving to the next card doesn't replay it. With reduced
 * motion the card simply appears, back up.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardBack, CardFront } from "./CardFaces";
import { ALL_CARDS, SET_VAR } from "./collection";

interface Props {
  id: string;
  from: DOMRect | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onPoker: () => void;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Inspect({ id, from, onClose, onNavigate, onPoker }: Props) {
  const idx = ALL_CARDS.findIndex((c) => c.id === id);
  const card = ALL_CARDS[idx];
  const prev = ALL_CARDS[idx - 1];
  const next = ALL_CARDS[idx + 1];
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(() => reducedMotion() || !from);
  const lifted = useRef(false);

  // The lift, once: from the card's place in the collection to here.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || lifted.current) return;
    lifted.current = true;
    if (!from || reducedMotion()) {
      setFlipped(true);
      return;
    }
    const to = el.getBoundingClientRect();
    const s = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    // The front is the top of the card; line its top up with the source.
    const dy = from.top - to.top;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: "50% 0" },
        { transform: "none", transformOrigin: "50% 0" },
      ],
      { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    const t = window.setTimeout(() => setFlipped(true), 260);
    return () => window.clearTimeout(t);
  }, [from]);

  // Moving through the collection: the next card arrives already turned over.
  useEffect(() => {
    if (lifted.current) setFlipped(true);
  }, [id]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
      // Keep focus inside the dialog.
      if (e.key === "Tab") {
        const f = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])].filter(
          (x) => x.tabIndex >= 0 && !x.hasAttribute("disabled")
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, onNavigate, prev, next]
  );

  if (!card) return null;
  const backTab = flipped ? 0 : -1;

  return (
    <div
      ref={dialogRef}
      className="v3-inspect"
      role="dialog"
      aria-modal="true"
      aria-labelledby="v3-inspect-title"
      onKeyDown={onKey}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="v3-inspect-col" style={{ ["--c" as string]: SET_VAR[card.set] }}>
        <div className="v3-inspect-bar">
          <span id="v3-inspect-title">
            {card.title} <span className="v3-dim">· {card.no}</span>
          </span>
          <button ref={closeRef} type="button" className="v3-x" onClick={onClose} aria-label="Close the card">
            Close
          </button>
        </div>

        <div
          ref={cardRef}
          className={`v3-big${flipped ? " is-flipped" : ""}`}
          data-set={card.set}
          data-progress={card.inProgress ? "" : undefined}
        >
          <div className="v3-big-flip">
            <div className="v3-big-side v3-big-front" aria-hidden={flipped}>
              <CardFront card={card} />
            </div>
            <div className="v3-big-side v3-big-back" aria-hidden={!flipped}>
              <CardBack card={card} tab={backTab} onPoker={onPoker} onOpen={onNavigate} />
            </div>
          </div>
        </div>

        <div className="v3-inspect-nav">
          <button type="button" onClick={() => prev && onNavigate(prev.id)} disabled={!prev}>
            ← <span className="v3-nav-l">{prev ? prev.title : "First card"}</span>
          </button>
          <button type="button" className="v3-turnbtn" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
            ↻ {flipped ? "Front" : "Back"}
          </button>
          <button type="button" onClick={() => next && onNavigate(next.id)} disabled={!next}>
            <span className="v3-nav-l">{next ? next.title : "Last card"}</span> →
          </button>
        </div>
      </div>
    </div>
  );
}
