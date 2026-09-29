/**
 * A highlighted word in the bio, and the photograph that landed on it.
 *
 * The card flew in and dissolved into the word, so hovering is the word giving
 * the picture back — briefly, and only while the pointer is on it. It is the
 * same card that was dealt: same corner radius, same border, same crop.
 *
 * Position is read on enter rather than kept in state, because the page can
 * scroll between one hover and the next, and a remembered rect would put the
 * photograph somewhere the word no longer is.
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { registerAnchor } from "./anchors";
import { TOPICS } from "./topics";

const CARD_W = 168;
const CARD_H = Math.round(CARD_W * 1.4);
const GAP = 14;

interface Spot {
  left: number;
  top: number;
  /** Which way it opened, so it grows out of the word rather than at it. */
  dx: number;
  dy: number;
}

export default function WordPhoto({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const topic = TOPICS.find((t) => t.id === id);
  const ref = useRef<HTMLSpanElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const reduced = useReducedMotion();

  const open = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const col = (el.closest("p") ?? el).getBoundingClientRect();
    const fit = (v: number, size: number, max: number) => Math.min(Math.max(8, v), max - size - 8);
    const midY = fit(r.top + r.height / 2 - CARD_H / 2, CARD_H, window.innerHeight);

    // The bio is a narrow column in a wide page, so the photograph goes in the
    // margin beside it and covers nothing. Only when there is no margin — a
    // phone, a split window — does it fall back to sitting over the text.
    if (window.innerWidth - col.right >= CARD_W + GAP * 2) {
      setSpot({ left: col.right + GAP * 2, top: midY, dx: -12, dy: 0 });
    } else if (col.left >= CARD_W + GAP * 2) {
      setSpot({ left: col.left - GAP * 2 - CARD_W, top: midY, dx: 12, dy: 0 });
    } else {
      const above = r.top - GAP - CARD_H >= 8;
      setSpot({
        left: fit(r.left + r.width / 2 - CARD_W / 2, CARD_W, window.innerWidth),
        top: above ? r.top - GAP - CARD_H : r.bottom + GAP,
        dx: 0,
        dy: above ? 10 : -10,
      });
    }
  };

  return (
    <>
      <span
        ref={(el) => {
          ref.current = el;
          registerAnchor(id, el);
        }}
        className={className}
        onPointerEnter={(e) => {
          // Touch has no hover: tapping a word should not pin a card over the
          // sentence with no way to dismiss it.
          if (e.pointerType !== "touch") open();
        }}
        onPointerLeave={() => setSpot(null)}
        onFocus={open}
        onBlur={() => setSpot(null)}
      >
        {children}
      </span>

      <AnimatePresence>
        {topic && spot && (
          <motion.span
            aria-hidden
            className="pointer-events-none fixed z-[7] block overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
            style={{ left: spot.left, top: spot.top, width: CARD_W, height: CARD_H }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: spot.dx, y: spot.dy, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, x: spot.dx * 0.6, y: spot.dy * 0.6, scale: 0.97 }
            }
            transition={{ duration: reduced ? 0.12 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={topic.img}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: topic.focus }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
