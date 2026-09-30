import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const SUITS = ["♠", "♥", "♦", "♣"];

/** Where the pull starts, measured from the centre of the word. */
const RADIUS = 120;
/** How far the word will ever leave its place. */
const MAX_PULL = 16;
/**
 * Inside this the pull eases back to nothing. Without it the direction from
 * the cursor to the centre flips about wildly as the two coincide, and the
 * word jitters exactly when someone is trying to click it.
 */
const CORE = 18;
/** The suits come along, but at a third of the distance. */
const PARALLAX = 0.32;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The word "poker" in the bio, which is also the way into the game.
 *
 * At rest it is just the coloured word everyone else's eye slides over. It
 * notices a cursor before the cursor arrives: inside a radius around it the
 * word leans toward the pointer, the underline draws itself and four suits
 * drift up out of it, all of it stronger the closer the pointer gets. Move
 * away and it eases back to exactly where it was.
 *
 * The button itself never moves — only its contents do. That keeps the hit
 * area still while the word slides around inside it, so the thing cannot lean
 * out from under the click it is inviting, and it keeps the measurement honest:
 * the centre the pull is calculated from is the untransformed wrapper, not the
 * element being transformed, which would otherwise be chasing itself.
 */
export default function PokerTell({ onOpen }: { onOpen: () => void }) {
  const reduced = !!useReducedMotion();
  const box = useRef<HTMLButtonElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const suits = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const suitRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    // Pointer position in viewport coordinates, or null when there is no
    // pointer worth listening to — before the first move, or on touch.
    let pointer: { x: number; y: number } | null = null;
    let hot = false;
    let x = 0;
    let y = 0;
    let reveal = 0;
    let raf = 0;
    let last = 0;
    let live = false;

    const write = () => {
      const near = clamp01(reveal);
      const eased = 1 - (1 - near) ** 3;

      if (word.current) {
        // Tips the way it is being pulled. The old standing tilt is still
        // there, but only in proportion to how little sideways pull there is,
        // so it shows up where it used to — cursor resting on the word — and
        // does not quietly cancel the lean on one side and double it on the
        // other.
        const dir = x / MAX_PULL;
        const lean = reduced ? 0 : 1.5 * dir - 0.9 * near * (1 - Math.min(1, Math.abs(dir)));
        const grow = reduced ? 1 : 1 + 0.035 * near;
        word.current.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${lean.toFixed(3)}deg) scale(${grow.toFixed(4)})`;
        word.current.style.filter = near > 0.01 ? `brightness(${(1 + 0.14 * near).toFixed(3)})` : "";
      }
      if (line.current) {
        // Reduced motion gets the underline, but arriving rather than sweeping.
        line.current.style.transform = `scaleX(${reduced ? 1 : eased.toFixed(4)})`;
        line.current.style.opacity = (0.9 * eased).toFixed(3);
      }
      if (suits.current) {
        suits.current.style.transform = `translate3d(${(x * PARALLAX).toFixed(2)}px, ${(y * PARALLAX).toFixed(2)}px, 0)`;
      }
      for (let i = 0; i < SUITS.length; i++) {
        const s = suitRefs.current[i];
        if (!s) continue;
        // Staggered, so they come up one after another rather than as a row.
        const r = clamp01((near - i * 0.07) / (1 - 3 * 0.07));
        const e = 1 - (1 - r) ** 3;
        s.style.opacity = (0.85 * e).toFixed(3);
        // Reduced motion keeps the suits — they are the tell — but has them
        // fade in where they belong instead of drifting up to it.
        s.style.transform = reduced
          ? `translateY(${-(18 + i * 3)}px)`
          : `translateY(${(2 - (18 + i * 3) * e).toFixed(2)}px) scale(${(0.7 + 0.3 * e).toFixed(3)})`;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(now - (last || now), 64);
      last = now;

      // Read the wrapper, which is never transformed, so the centre the pull
      // is measured from does not move when the word does.
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      let tx = 0;
      let ty = 0;
      let want = hot ? 1 : 0;

      if (pointer) {
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < RADIUS) {
          // Squared, so the word stays still until the cursor is genuinely
          // nearby and then commits, rather than drifting the whole way in.
          const strength = (1 - d / RADIUS) ** 2;
          want = Math.max(want, strength);
          if (!reduced && d > 0.01) {
            const pull = MAX_PULL * strength * Math.min(1, d / CORE);
            tx = (dx / d) * pull;
            ty = (dy / d) * pull;
          }
        }
      }

      // Time-corrected exponential easing: frame-rate independent, and no
      // spring, because a word in a sentence should not bounce. Letting go is
      // slower than being caught — that is the part that feels considered.
      const settling = tx === 0 && ty === 0;
      const k = 1 - Math.exp(-dt / (settling ? 110 : 70));
      x += (tx - x) * k;
      y += (ty - y) * k;
      reveal += (want - reveal) * (1 - Math.exp(-dt / 90));

      write();

      // Nothing to animate and nothing nearby: stop burning frames until the
      // next pointer move wakes it.
      if (want === 0 && Math.abs(x) < 0.02 && Math.abs(y) < 0.02 && reveal < 0.002) {
        x = 0;
        y = 0;
        reveal = 0;
        write();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf && live) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      // A finger has no hover, and following one around the page would only
      // move the word out from under the tap.
      if (e.pointerType === "touch") return;
      pointer = { x: e.clientX, y: e.clientY };
      wake();
    };
    // The last known pointer position is remembered, so it has to be forgotten
    // when the pointer stops existing — out of the window, or the window out of
    // focus — or the word sits there leaning at a cursor that has gone.
    const forget = () => {
      pointer = null;
      hot = false;
      wake();
    };
    const enter = () => {
      hot = true;
      wake();
    };
    const leave = () => {
      hot = false;
      wake();
    };

    document.addEventListener("pointerleave", forget);
    window.addEventListener("blur", forget);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focus", enter);
    el.addEventListener("blur", leave);

    // Only listen while the word is on screen; the rest of the page scrolls
    // past without a pointer handler attached at all.
    const io = new IntersectionObserver(
      ([entry]) => {
        live = entry.isIntersecting;
        if (live) {
          window.addEventListener("pointermove", onMove, { passive: true });
          wake();
        } else {
          window.removeEventListener("pointermove", onMove);
          pointer = null;
          hot = false;
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", forget);
      window.removeEventListener("blur", forget);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focus", enter);
      el.removeEventListener("blur", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <button
      ref={box}
      type="button"
      onClick={onOpen}
      // Inline so it reads as part of the sentence, not an element in it.
      className="relative inline-block cursor-pointer text-yellow outline-none"
      aria-label="poker — open the hidden table"
    >
      {/* A little more to aim at than the word itself. */}
      <span aria-hidden className="absolute -inset-2" />

      {/* Suits drift up out of the word, and come along with it at a third of
          the distance so they read as attached rather than welded. */}
      <span
        ref={suits}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-1 will-change-transform"
      >
        {SUITS.map((s, i) => (
          <span
            key={s}
            ref={(node) => {
              suitRefs.current[i] = node;
            }}
            className="absolute text-[0.6em]"
            style={{
              left: `${12 + i * 24}%`,
              color: i % 2 ? "#e06c75" : "#c3cad8",
              opacity: 0,
            }}
          >
            {s}
          </span>
        ))}
      </span>

      <span ref={word} className="relative inline-block will-change-transform">
        poker
        {/* Underline sweeps in from the left rather than just appearing. */}
        <span
          ref={line}
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-yellow"
          style={{ transform: "scaleX(0)", opacity: 0 }}
        />
      </span>
    </button>
  );
}
