/**
 * The player card: a foil trading card that tilts toward the pointer and
 * flips to a stat block.
 *
 * Every stat on the back is a pointer into the bio beside it: hovering one
 * lights the place it comes from, clicking opens that passage (by paper
 * plane, when planes are flying) and goes there.
 *
 * Tilt runs on its own requestAnimationFrame loop writing CSS variables, and
 * stops when it settles: no React state per frame. Mouse: hover tilts, click
 * flips. Touch: drag tilts, tap flips. On the back the card holds still, so
 * the stats can be read and pointed at.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PORTRAIT, STATS, NODES } from "../bio/content";
import { LINKS } from "../data";

export interface PlayerCardHandle {
  card: HTMLDivElement | null;
  setFlipped: (on: boolean) => void;
}

interface Props {
  onStat: (node: string, value: string, from: HTMLElement) => void;
  onLight: (node: string, value: string) => void;
}

const STAR = "M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.4l-4.2 2.4 1-4.6L1.3 6l4.7-.5z";

const PlayerCard = forwardRef<PlayerCardHandle, Props>(function PlayerCard({ onStat, onLight }, ref) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);
  flippedRef.current = flipped;

  useImperativeHandle(ref, () => ({ card: cardRef.current, setFlipped }), []);

  // ── tilt and foil ───────────────────────────────────────────────────────
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
      el.style.setProperty("--rx", `${((0.5 - st.y) * 26).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((st.x - 0.5) * 30).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(st.x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(st.y * 100).toFixed(1)}%`);
      el.style.setProperty("--hyp", st.h.toFixed(3));
      const settled = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) + Math.abs(st.th - st.h) < 0.002;
      st.raf = settled ? 0 : requestAnimationFrame(frame);
    };
    const snap = () => {
      st.x = st.tx;
      st.y = st.ty;
      st.h = st.th;
      frame();
    };
    const kick = () => {
      if (reduced) snap();
      else if (!st.raf) st.raf = requestAnimationFrame(frame);
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
      if (e.pointerType !== "mouse" && !t.closest(".pc-stat, a") && !flippedRef.current) {
        el.setPointerCapture?.(e.pointerId);
        aim(e);
      }
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
      if ((e.target as HTMLElement).closest("a, .pc-stat")) return;
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
        return;
      }
      const d = ({ ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25] } as Record<
        string,
        [number, number]
      >)[e.key];
      if (!d) return;
      e.preventDefault();
      st.tx = Math.min(1, Math.max(0, st.tx + d[0]));
      st.ty = Math.min(1, Math.max(0, st.ty + d[1]));
      st.th = 1;
      kick();
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

  const stat = useCallback(
    (node: string, value: string) => ({
      onPointerEnter: (e: React.PointerEvent) => {
        if (e.pointerType === "mouse") onLight(node, value);
      },
      onFocus: () => onLight(node, value),
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onStat(node, value, e.currentTarget);
      },
    }),
    [onLight, onStat]
  );

  const backTab = flipped ? 0 : -1;

  return (
    <div
      ref={cardRef}
      className={`pc-card${flipped ? " flipped" : ""}`}
      tabIndex={0}
      role="group"
      aria-roledescription="player card"
      aria-label="Hemosoo Woo, player card. Press Enter to flip it."
    >
      <div className="pc-tilt">
        <div className="pc-flip">
          <div className="pc-face pc-front" aria-hidden={flipped}>
            <div className="pc-head">
              <span className="pc-nm">Hemosoo Woo</span>
              <svg viewBox="0 0 16 16" aria-hidden>
                <path d={STAR} fill="currentColor" />
              </svg>
            </div>
            <div className="pc-art">
              <img src={PORTRAIT} alt="Hemosoo Woo" draggable={false} />
            </div>
            <div className="pc-type">
              <span>
                <span className="pc-k">Player</span> — Backend developer
              </span>
            </div>
            <div className="pc-foot">
              <span>001/001 · Penn · Amazon</span>
              <span>hemosoo.com · 2026</span>
            </div>
            <div className="pc-sheen" />
            <div className="pc-glare" />
            <div className="pc-grain" />
          </div>

          <div className="pc-face pc-back" aria-hidden={!flipped}>
            <div className="pc-bh">
              <b>Hemosoo Woo</b>
              <span>001/001</span>
            </div>
            <div className="pc-sub">Backend developer</div>
            <ul className="pc-stats">
              {STATS.map(([label, value, node]) => (
                <li key={label}>
                  <button
                    type="button"
                    className="pc-stat"
                    tabIndex={backTab}
                    style={{ ["--c" as string]: `var(${NODES[node].color})` }}
                    {...stat(node, value)}
                  >
                    <span>{label}</span>
                    <span className="pc-v">{value}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="pc-bf">
              <span>hemosoo.com set</span>
              <span>
                <a href={LINKS.github} target="_blank" rel="noreferrer" tabIndex={backTab}>
                  GitHub
                </a>{" "}
                ·{" "}
                <a href={LINKS.linkedin} target="_blank" rel="noreferrer" tabIndex={backTab}>
                  LinkedIn
                </a>
              </span>
            </div>
            <div className="pc-glare" />
            <div className="pc-grain" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PlayerCard;
