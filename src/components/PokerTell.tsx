import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMagnetic } from "../hooks/useMagnetic";

const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];

/** The suits come along with the word, but at a third of the distance. */
const PARALLAX = 0.32;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The word "poker" in the bio, which is also the way into the game.
 *
 * At rest it is just the coloured word everyone else's eye slides over. It
 * notices a cursor before the cursor arrives: the magnetism is the shared one
 * every live word in the bio uses. What is this word's own is the four suits
 * that drift up out of it — the tell that there is a game behind it, which a
 * plain link has no business having.
 */
export default function PokerTell({ onOpen }: { onOpen: () => void }) {
  const reduced = !!useReducedMotion();
  const suits = useRef<HTMLSpanElement>(null);
  const suitRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const { box, word, line } = useMagnetic(reduced, (near, x, y) => {
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
  });

  return (
    <button
      ref={box as React.RefObject<HTMLButtonElement>}
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

      <span ref={word as React.RefObject<HTMLSpanElement>} className="relative inline-block will-change-transform">
        poker
        {/* Underline sweeps in from the left rather than just appearing. */}
        <span
          ref={line as React.RefObject<HTMLSpanElement>}
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-yellow"
          style={{ transform: "scaleX(0)", opacity: 0 }}
        />
      </span>
    </button>
  );
}
