/**
 * The player card, for the editorial layout.
 *
 * Both sides are cut from the same stock: ink ground, a gold keyline at the
 * same inset, the same margins, so turning it over reads as one object. The
 * foil lives on the frame only, beneath the portrait and the type, so it
 * catches the light without washing over the face.
 *
 * The back is the stat block. The stats are accomplishments, and each points
 * to where it is told in full; the one belonging to whatever the page is
 * showing lights up as you read.
 *
 * Tilt runs on its own rAF loop writing CSS variables and stops when settled:
 * no React state per frame. Mouse: hover tilts, click flips. Touch: drag
 * tilts, tap flips. Keyboard: Enter or Space flips, arrows tilt.
 */
import { useEffect, useRef } from "react";
import { PERSON, STATS, TOOLKIT } from "../../content/profile";

const CAT_VAR: Record<string, string> = {
  experience: "var(--c-exp)",
  education: "var(--c-edu)",
  engineering: "var(--c-eng)",
  personal: "var(--c-per)",
};

interface Props {
  flipped: boolean;
  onFlip: (next: boolean) => void;
  /** The stat nodes to light: what the page is showing right now. */
  lit: string[];
  onStat: (node: string) => void;
  /** The card is decorative copy of what's on the page when hidden. */
  id?: string;
}

export default function Card({ flipped, onFlip, lit, onStat, id }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, th: 0, raf: 0 };
    let down: { x: number; y: number; moved: boolean } | null = null;

    const frame = () => {
      st.x += (st.tx - st.x) * 0.12;
      st.y += (st.ty - st.y) * 0.12;
      st.h += (st.th - st.h) * 0.1;
      // Restrained: ±9° is enough to read as a card in the hand.
      el.style.setProperty("--rx", `${((0.5 - st.y) * 16).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((st.x - 0.5) * 18).toFixed(2)}deg`);
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
      if ((e.target as HTMLElement).closest("a, .v2-stat")) return;
      const moved = down?.moved;
      down = null;
      if (moved) return;
      rest();
      onFlipRef.current(!flippedRef.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== el) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onFlipRef.current(!flippedRef.current);
        return;
      }
      const d = (
        { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25] } as Record<
          string,
          [number, number]
        >
      )[e.key];
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

  const backTab = flipped ? 0 : -1;

  return (
    <div
      ref={ref}
      id={id}
      className={`v2-card${flipped ? " flipped" : ""}`}
      tabIndex={0}
      role="group"
      aria-roledescription="player card"
      aria-label={`${PERSON.name}, player card. ${flipped ? "Showing stats." : "Press Enter to turn it over for stats."}`}
    >
      <div className="v2-tilt">
        <div className="v2-flip">
          <div className="v2-face v2-front" aria-hidden={flipped}>
            <div className="v2-foil" />
            <div className="v2-cf-head">
              <span className="v2-cf-name">{PERSON.name}</span>
              <span className="v2-cf-no">001</span>
            </div>
            <div className="v2-cf-art">
              <img src={PERSON.portrait} alt={PERSON.name} draggable={false} />
            </div>
            <div className="v2-cf-type">
              <span className="v2-cf-role">
                <b>Backend</b> · Infrastructure · Applied AI
              </span>
              <span className="v2-cf-foot">
                <span>Penn ’27 · Amazon ×3</span>
                <span className="v2-cf-flip" aria-hidden>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 8a5 5 0 0 1 8.6-3.5M13 8a5 5 0 0 1-8.6 3.5" />
                    <path d="M11.8 1.8v2.9H8.9M4.2 14.2v-2.9h2.9" />
                  </svg>
                  stats
                </span>
              </span>
            </div>
            <div className="v2-glare" />
          </div>

          <div className="v2-face v2-back" aria-hidden={!flipped}>
            <div className="v2-foil" />
            <div className="v2-cb-head">
              <b>{PERSON.name}</b>
              <span>001 · stats</span>
            </div>
            <ul className="v2-stats">
              {STATS.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    tabIndex={backTab}
                    className={`v2-stat${lit.includes(s.node) ? " lit" : ""}`}
                    style={{ ["--c" as string]: CAT_VAR[s.category] }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStat(s.node);
                    }}
                    aria-label={`${s.value} ${s.label}. Go to it.`}
                  >
                    <span className="n">{s.value}</span>
                    <span className="l">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="v2-kit" aria-label="Toolkit">
              {TOOLKIT.map((g) => (
                <div key={g.group}>
                  <b>{g.group}</b>
                  <span>{g.items.join(" · ")}</span>
                </div>
              ))}
            </div>
            <div className="v2-cb-foot">
              <span>hemosoo.com</span>
              <span>
                <a href={PERSON.links.github} target="_blank" rel="noreferrer" tabIndex={backTab}>
                  GitHub
                </a>
                {" · "}
                <a href={PERSON.links.resume} target="_blank" rel="noreferrer" tabIndex={backTab}>
                  Résumé
                </a>
              </span>
            </div>
            <div className="v2-glare" />
          </div>
        </div>
      </div>
    </div>
  );
}
