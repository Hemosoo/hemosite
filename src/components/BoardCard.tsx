import { motion } from "framer-motion";
import type { Card } from "../poker/cards";
import { dealSpec, type RevealSpec } from "../poker/reveals";

interface Props {
  card: Card;
  index: number;
  reduced: boolean | null;
  /** Present only on the card currently being revealed. */
  spec?: RevealSpec;
  /** Sideways shove while a neighbour lands. */
  nudge: number;
  /** Dimmed while attention is on the revealing card. */
  dim: number;
  renderCard: (card: Card | undefined, hidden: boolean) => React.ReactNode;
}

/**
 * One community card.
 *
 * Flop cards slide in from the dealer's side; the turn and river run a
 * RevealSpec. Both are keyframes on transforms only, so nothing here triggers
 * a React render while animating.
 */
export default function BoardCard({
  card,
  index,
  reduced,
  spec,
  nudge,
  dim,
  renderCard,
}: Props) {
  if (spec) {
    return (
      <div className="relative" style={{ perspective: 1500 }}>
        {/* Shadow tracks the card and tightens as it falls: the cue that
            reads as height without needing a real light. */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-full h-3 -translate-x-1/2 rounded-[50%] bg-black/70 blur-md"
          initial={false}
          animate={{
            width: spec.outer.scale.map((s) => 26 + (s - 1) * 120),
            opacity: spec.outer.y.map((y) => 0.12 + Math.max(0, 1 + y / 120) * 0.5),
          }}
          transition={{
            duration: spec.totalMs / 1000,
            times: spec.outer.times,
            ease: "easeInOut",
          }}
        />
        <motion.div
          initial={false}
          animate={{
            scale: spec.outer.scale,
            y: spec.outer.y,
            x: spec.outer.x,
            rotate: spec.outer.rotate,
          }}
          transition={{
            duration: spec.totalMs / 1000,
            times: spec.outer.times,
            // Hangs, then drops hard: the fall is the fast part.
            ease: [0.5, 0, 0.75, 1],
          }}
          style={{ transformStyle: "preserve-3d", zIndex: 20 }}
        >
          <motion.div
            initial={false}
            animate={{ rotateY: spec.flip.rotateY }}
            transition={{
              duration: spec.totalMs / 1000,
              times: spec.flip.times,
              ease: "easeInOut",
            }}
            style={{ transformStyle: "preserve-3d", position: "relative" }}
          >
            {/* Two real faces. Backface culling swaps them at 90 degrees, so
                the rank never shows through mirrored. */}
            <div style={{ backfaceVisibility: "hidden" }}>{renderCard(card, false)}</div>
            <div
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                position: "absolute",
                inset: 0,
              }}
            >
              {renderCard(undefined, true)}
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const d = dealSpec(index);
  return (
    <motion.div
      initial={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, x: d.fromX, y: d.fromY, rotate: d.spin, scale: 1.08 }
      }
      animate={{
        opacity: dim ? 1 - dim : 1,
        x: nudge,
        y: 0,
        rotate: 0,
        scale: 1,
      }}
      transition={
        reduced
          ? { duration: 0.2 }
          : {
              // Weighty rather than springy: it slides, decelerates, settles.
              type: "spring",
              stiffness: 190,
              damping: 21,
              mass: 0.9,
              delay: d.delayMs / 1000,
              opacity: { duration: 0.18, delay: d.delayMs / 1000 },
              x: { type: "spring", stiffness: 320, damping: 26 },
            }
      }
    >
      {renderCard(card, false)}
    </motion.div>
  );
}
