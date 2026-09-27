import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const SUITS = ["♠", "♥", "♦", "♣"];

/**
 * The word "poker" in the bio, which is also the way into the game.
 *
 * Deliberately understated: at rest it is just the coloured word everyone
 * else's eye slides over. Hovering tips it a degree, draws an underline and
 * lets four suits drift up — enough that someone who pauses notices it is
 * alive, not enough to read as a button.
 */
export default function PokerTell({ onOpen }: { onOpen: () => void }) {
  const [hot, setHot] = useState(false);
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onHoverStart={() => setHot(true)}
      onHoverEnd={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      animate={reduced ? undefined : { rotate: hot ? -1.4 : 0, y: hot ? -1 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      // Inline so it reads as part of the sentence, not an element in it.
      className="relative inline-block cursor-pointer text-yellow outline-none"
      aria-label="poker — open the hidden table"
    >
      {/* Suits drift up out of the word. */}
      <AnimatePresence>
        {hot && !reduced && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-1">
            {SUITS.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, y: 2, scale: 0.7 }}
                animate={{ opacity: 0.85, y: -14 - i * 3, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
                className="absolute text-[0.6em]"
                style={{ left: `${12 + i * 24}%`, color: i % 2 ? "#e06c75" : "#c3cad8" }}
              >
                {s}
              </motion.span>
            ))}
          </span>
        )}
      </AnimatePresence>

      poker

      {/* Underline sweeps in from the left rather than just appearing. */}
      <motion.span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-px bg-yellow"
        initial={false}
        animate={{ width: hot ? "100%" : "0%", opacity: hot ? 0.9 : 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.button>
  );
}
