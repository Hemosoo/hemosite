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

/** Big enough to actually look at. It shrinks to whatever room there is. */
const IDEAL_W = 300;
/**
 * Below this there is no real margin left and the card goes over the text.
 * Set low deliberately: a small photograph beside the sentence beats a large
 * one lying across it.
 */
const MIN_SIDE_W = 128;
const GAP = 14;

interface Spot {
  left: number;
  top: number;
  width: number;
  height: number;
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
    // Measured against the whole bio block, not the paragraph the word is in:
    // the heading runs wider than the prose, and a card placed off the
    // paragraph's edge would sit on top of it.
    const col = (el.closest("[data-bio]") ?? el.closest("p") ?? el).getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit = (v: number, size: number, max: number) => Math.min(Math.max(8, v), max - size - 8);
    // As large as it can be without being taller than the window.
    const cap = (w: number) => Math.round(Math.min(w, IDEAL_W, (vh - 16) / 1.4));
    const place = (width: number, left: number, dx: number) => {
      const height = Math.round(width * 1.4);
      setSpot({ left, top: fit(r.top + r.height / 2 - height / 2, height, vh), width, height, dx, dy: 0 });
    };

    // The bio is a narrow column in a wide page, so the photograph goes in the
    // margin beside it and covers nothing — and it takes as much of that margin
    // as it can get, because the point of the hover is to look at the picture.
    // The standing portrait has first claim on its side; where it is, the right
    // margin ends at its edge, which on a wide window sends these to the left.
    const portrait = document.querySelector("[data-portrait]")?.getBoundingClientRect();
    const rightEdge = portrait && portrait.width ? portrait.left - GAP : vw;
    const right = cap(rightEdge - col.right - GAP * 2 - 8);
    const left = cap(col.left - GAP * 2 - 8);
    if (right >= MIN_SIDE_W) {
      place(right, col.right + GAP * 2, -14);
    } else if (left >= MIN_SIDE_W) {
      place(left, col.left - GAP * 2 - left, 14);
    } else {
      // No margin — a phone, a split window. Over the text, as big as fits.
      const width = cap(vw - 16);
      const height = Math.round(width * 1.4);
      const above = r.top - GAP - height >= 8;
      setSpot({
        left: fit(r.left + r.width / 2 - width / 2, width, vw),
        top: fit(above ? r.top - GAP - height : r.bottom + GAP, height, vh),
        width,
        height,
        dx: 0,
        dy: above ? 12 : -12,
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
            style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}
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
