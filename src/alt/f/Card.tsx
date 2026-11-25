/**
 * The card, as a printed object: cream card stock, the photograph as the
 * whole point of the front, one line of type under it, a small foil serial.
 * The back is the same stock: three things that happened, set large, and the
 * rest as a footnote.
 *
 * It's also a sheet of paper you can fold. Pull it (drag it with a mouse, or
 * sideways with a finger) and it folds into a paper plane as you pull; let go
 * and it's thrown, comes back and unfolds into place (three/fold.ts). The
 * score marks printed at its edges are where it creases.
 *
 * It tilts toward the pointer only while the pointer is over it, and comes to
 * rest when it leaves; nothing moves on its own. Click, tap, Enter or Space
 * turns it over. Each figure on the back points at the work it came from.
 *
 * Tilt runs on its own requestAnimationFrame loop writing CSS variables and
 * stops when it settles: no React state per frame.
 */
import { useEffect, useRef, useState } from "react";
import { PERSON } from "../../content/profile";
import { SCORE } from "./score";

interface Props {
  /** A figure on the back was chosen: go to the work it came from. */
  onFigure: (id: string) => void;
}

/** `short` is what fits on the card when it's phone-sized. */
const FIGURES = [
  { id: "entryid", value: "5,200+", label: "routing configurations moved off unvalidated write paths", short: "routing configurations" },
  { id: "gateway", value: "10,000+", label: "customer queries given LLM-generated titles", short: "queries titled by LLM" },
  { id: "nhs", value: "1st", label: "developer on Amazon's Network Health Service", short: "dev, Network Health" },
];

export default function Card({ onFigure }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);
  flippedRef.current = flipped;

  // The fold: only where it can run and motion is wanted. It's a few hundred
  // kilobytes of three.js, so it loads once the page has settled.
  useEffect(() => {
    const el = ref.current;
    if (!el || !canFold()) return;
    let handle: { dispose: () => void } | null = null;
    let cancelled = false;
    const img = el.querySelector<HTMLImageElement>(".bc-photo img");
    const ready = Promise.all([
      document.fonts?.ready,
      img && !img.complete ? new Promise((r) => img.addEventListener("load", r, { once: true })) : null,
    ]);
    const load = () =>
      ready
        .then(() => import("./three/fold"))
        .then(({ startFold }) => {
          if (cancelled) return;
          handle = startFold(el, {
            // Set on the element directly, the same frame the 3D double
            // appears or goes: React would be a frame late.
            onActive: (on) => el.toggleAttribute("data-folding", on),
          });
          if (handle) el.setAttribute("data-foldable", "");
        });
    const idle = "requestIdleCallback" in window;
    const id = idle ? window.requestIdleCallback(() => void load(), { timeout: 2000 }) : window.setTimeout(() => void load(), 600);
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      handle?.dispose();
      el.removeAttribute("data-foldable");
      el.removeAttribute("data-folding");
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, th: 0, raf: 0 };
    let down: { x: number; y: number; moved: boolean } | null = null;

    const frame = () => {
      st.x += (st.tx - st.x) * 0.14;
      st.y += (st.ty - st.y) * 0.14;
      st.h += (st.th - st.h) * 0.12;
      // A card held in the hand: a few degrees, no more.
      el.style.setProperty("--rx", `${((0.5 - st.y) * 10).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((st.x - 0.5) * 13).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(st.x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(st.y * 100).toFixed(1)}%`);
      el.style.setProperty("--lit", st.h.toFixed(3));
      const settled = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) + Math.abs(st.th - st.h) < 0.002;
      st.raf = settled ? 0 : requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    };
    const aim = (e: PointerEvent) => {
      if (reduced || flippedRef.current) return;
      const r = el.getBoundingClientRect();
      st.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      st.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      st.th = 1;
      kick();
    };
    const rest = () => {
      if (reduced) return;
      st.tx = 0.5;
      st.ty = 0.5;
      st.th = 0;
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || down) aim(e);
    };
    const onLeave = () => rest();
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
      if (e.pointerType !== "mouse") rest();
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a, button")) return;
      const moved = down?.moved;
      down = null;
      if (moved) return;
      rest();
      setFlipped((f) => !f);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== el) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onLeave);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(st.raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  const tab = flipped ? 0 : -1;

  return (
    <div
      ref={ref}
      className={`bc${flipped ? " flipped" : ""}`}
      tabIndex={0}
      role="button"
      aria-pressed={flipped}
      aria-label={flipped ? "Trading card, back. Press to turn it over." : "Trading card of Hemosoo Woo. Press to turn it over."}
    >
      <div className="bc-tilt">
        <div className="bc-flip">
          <div className="bc-face bc-front" aria-hidden={flipped}>
            <div className="bc-photo">
              <img src={PERSON.portrait} alt="Hemosoo Woo" draggable={false} />
            </div>
            <div className="bc-cap">
              <span className="bc-name">Hemosoo Woo</span>
              <span className="bc-serial" title="One of one">
                1/1
              </span>
            </div>
            <span className="bc-line">Penn ’27 · a cappella · poker</span>
            <Score />
            {/* Printed on the card like a rule-book mark: this side turns. */}
            <span className="bc-turn" aria-hidden>
              ↻
            </span>
            <span className="bc-sheen" aria-hidden />
          </div>

          <div className="bc-face bc-back" aria-hidden={!flipped}>
            <div className="bc-cap">
              <span className="bc-name sm">Hemosoo Woo</span>
              <span className="bc-serial">1/1</span>
            </div>
            <ol className="bc-figs">
              {FIGURES.map((f) => (
                <li key={f.id}>
                  <button type="button" tabIndex={tab} onClick={() => onFigure(f.id)}>
                    <span className="v">{f.value}</span>
                    <span className="l long">{f.label}</span>
                    <span className="l short">{f.short}</span>
                  </button>
                </li>
              ))}
            </ol>
            <Score />
            <p className="bc-also">
              Also: self-service tools for 70+ operations users; 3rd place in an internal Amazon hackathon; BSE and MSE at
              Penn, 2027.
            </p>
            <span className="bc-sheen" aria-hidden />
          </div>
        </div>
      </div>
      <span className="bc-ground" aria-hidden />
    </div>
  );
}

/** WebGL, and motion allowed. */
function canFold() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Score marks: short rules printed at the edge where each crease runs out,
 *  the way a die-cut sheet shows where it folds. Same places as the 3D fold. */
function Score() {
  const { noseY, wingX } = SCORE;
  const t = 2.6;
  const y = noseY * 140;
  return (
    <svg className="bc-score" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
      <line x1={50} y1={0} x2={50} y2={t} />
      <line x1={0} y1={y} x2={t} y2={y} />
      <line x1={100} y1={y} x2={100 - t} y2={y} />
      {[wingX, 0.5, 1 - wingX].map((x) => (
        <line key={x} x1={x * 100} y1={140} x2={x * 100} y2={140 - t} />
      ))}
    </svg>
  );
}
