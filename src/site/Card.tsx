/**
 * The player card: a foil collectible that tilts toward the pointer and turns
 * over to its stats.
 *
 * The front is laid out from the same numbers as the hero's 3D card face
 * (three/playerFace.ts, FACE), so the plane lands on its exact double. Its
 * bottom-right corner is turned down: the flip affordance, which lifts a
 * little further under the pointer.
 *
 * The back is the same object's reverse: the same frame and hairline, the
 * accomplishments first (one lead figure, then the rest as a grid of values
 * that read at a glance), then a compact toolkit. Every figure points at the
 * role it comes from: hovering lights the row, clicking goes there.
 *
 * Tilt runs on its own requestAnimationFrame loop writing CSS variables and
 * stops when it settles: no React state per frame.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PERSON, STATS, TOOLKIT, ACCENT } from "../content/profile";
import { TYPE_LINE, FOOT_LINE } from "../three/playerFace";

export interface CardHandle {
  card: HTMLDivElement | null;
  setFlipped: (on: boolean) => void;
}

interface Props {
  onStat: (node: string, value: string, from: HTMLElement) => void;
  onLight: (node: string, value: string) => void;
}

const Card = forwardRef<CardHandle, Props>(function Card({ onStat, onLight }, ref) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);
  flippedRef.current = flipped;

  useImperativeHandle(ref, () => ({ card: cardRef.current, setFlipped }), []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, th: 0, raf: 0 };
    let down: { x: number; y: number; moved: boolean } | null = null;

    const frame = () => {
      st.x += (st.tx - st.x) * 0.12;
      st.y += (st.ty - st.y) * 0.12;
      st.h += (st.th - st.h) * 0.1;
      // Gentler than the original: a card in a hand, not a sign in the wind.
      el.style.setProperty("--rx", `${((0.5 - st.y) * 18).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((st.x - 0.5) * 22).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(st.x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(st.y * 100).toFixed(1)}%`);
      el.style.setProperty("--hyp", st.h.toFixed(3));
      const settled = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) + Math.abs(st.th - st.h) < 0.002;
      st.raf = settled ? 0 : requestAnimationFrame(frame);
    };
    const kick = () => {
      if (reduced) {
        st.x = st.tx;
        st.y = st.ty;
        st.h = st.th;
        frame();
      } else if (!st.raf) st.raf = requestAnimationFrame(frame);
    };
    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      st.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      st.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      st.th = 1;
      kick();
    };
    const rest = () => {
      st.tx = 0.5;
      st.ty = 0.5;
      st.th = 0;
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (flippedRef.current) return;
      if (e.pointerType === "mouse" || down) aim(e);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") rest();
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, moved: false };
      const t = e.target as HTMLElement;
      if (e.pointerType !== "mouse" && !t.closest("button, a") && !flippedRef.current) aim(e);
    };
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
      if (e.pointerType !== "mouse") rest();
    };
    const onCancel = () => {
      down = null;
      rest();
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a, .v1c-stat")) return;
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
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    el.addEventListener("blur", rest);
    return () => {
      cancelAnimationFrame(st.raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", rest);
    };
  }, []);

  const tab = flipped ? 0 : -1;
  const [lead, ...rest] = STATS;
  const statProps = (node: string, value: string) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") onLight(node, value);
    },
    onFocus: () => onLight(node, value),
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onStat(node, value, e.currentTarget);
    },
  });

  return (
    <div
      ref={cardRef}
      className={`v1c${flipped ? " flipped" : ""}`}
      tabIndex={0}
      role="group"
      aria-roledescription="player card"
      aria-label={flipped ? "Player card, stats side. Press Enter to turn it back over." : "Player card. Press Enter to turn it over for the stats."}
    >
      <div className="v1c-tilt">
        <div className="v1c-flip">
          <div className="v1c-face v1c-front" aria-hidden={flipped}>
            <span className="v1c-name">{PERSON.name}</span>
            <span className="v1c-no">No. 001</span>
            <div className="v1c-art">
              <img src={PERSON.portrait} alt={PERSON.name} draggable={false} />
            </div>
            <div className="v1c-type">
              <b>{TYPE_LINE[0]}</b>
              {"  "}
              {TYPE_LINE[1]}
            </div>
            <span className="v1c-foot">{FOOT_LINE[0]}</span>
            <span className="v1c-foot r">{FOOT_LINE[1]}</span>
            <div className="v1c-foil" />
            <div className="v1c-glare" />
            <span className="v1c-ear" aria-hidden />
          </div>

          <div className="v1c-face v1c-back" aria-hidden={!flipped}>
            <div className="v1c-bh">
              <span className="v1c-bname">{PERSON.name}</span>
              <span className="v1c-no b">No. 001</span>
            </div>

            <button
              type="button"
              className="v1c-stat lead"
              tabIndex={tab}
              style={{ ["--c" as string]: ACCENT[lead.category] }}
              {...statProps(lead.node, lead.value)}
            >
              <span className="v">{lead.value}</span>
              <span className="l">{lead.label}, 2024 – 2026</span>
            </button>

            <ul className="v1c-grid">
              {rest.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className="v1c-stat"
                    tabIndex={tab}
                    style={{ ["--c" as string]: ACCENT[s.category] }}
                    {...statProps(s.node, s.value)}
                  >
                    <span className="v">{s.value}</span>
                    <span className="l">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <dl className="v1c-kit">
              {TOOLKIT.map((g) => (
                <div key={g.group}>
                  <dt>{g.group}</dt>
                  <dd>{g.items.join(" · ")}</dd>
                </div>
              ))}
            </dl>

            <div className="v1c-bf">
              <a href={PERSON.links.resume} target="_blank" rel="noreferrer" tabIndex={tab}>
                Résumé
              </a>
              <a href={PERSON.links.github} target="_blank" rel="noreferrer" tabIndex={tab}>
                GitHub
              </a>
              <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer" tabIndex={tab}>
                LinkedIn
              </a>
              <span className="turn">turn over ↺</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Card;
