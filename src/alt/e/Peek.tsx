/**
 * A word in the bio that shows its photograph while you point at it.
 *
 * The five words are Penn, Amazon, a cappella, poker and dunk. Hovering or
 * focusing one opens its photo beside the paragraph, in the empty margin to
 * the right of the text where there is one, so it covers nothing; on a
 * narrower screen it opens just above or below the word instead.
 *
 * Touch has no hover. Words that do something else when tapped (Amazon jumps
 * to the experience, poker opens the table, dunk goes to Instagram) keep doing
 * that; the two that don't (Penn, a cappella) show their photo on tap, and a
 * second tap or a tap elsewhere puts it away.
 *
 * Position is measured when it opens, not remembered, because the page can
 * scroll between one hover and the next.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { photo } from "../../content/profile";
import { PHOTO_ALT } from "../../content/copy";

type Name = "heyday" | "amazon" | "acapella" | "poker" | "dunking";

/** Each photo's shape, and where to keep it centred when it's cropped. */
const SHOTS: Record<Name, { ratio: number; focus: string }> = {
  heyday: { ratio: 900 / 1200, focus: "50% 30%" },
  amazon: { ratio: 1000 / 750, focus: "50% 38%" },
  acapella: { ratio: 668 / 1000, focus: "50% 40%" },
  poker: { ratio: 666 / 1000, focus: "18% 22%" },
  dunking: { ratio: 1000 / 711, focus: "50% 30%" },
};

/** As large as is comfortable to look at; it shrinks to the room there is. */
const IDEAL_W = 300;
const MIN_SIDE_W = 150;
const GAP = 24;

interface Spot {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Which way it grows from, so it opens out of the word. */
  dx: number;
  dy: number;
}

export default function Peek({
  name,
  tapToShow = false,
  children,
}: {
  name: Name;
  /** On touch, show the photo on tap (only for words that do nothing else). */
  tapToShow?: boolean;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>> | React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const reduced = useReducedMotion();
  const shot = SHOTS[name];

  const open = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const col = (el.closest(".c-prose") ?? el).getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampY = (y: number, h: number) => Math.min(Math.max(16, y), vh - h - 12);
    const fit = (w: number) => {
      // Never taller than the window allows.
      const width = Math.round(Math.min(w, IDEAL_W, (vh - 100) / shot.ratio));
      return { width, height: Math.round(width * shot.ratio) };
    };

    // The margin right of the paragraph, if there is one worth using.
    const room = vw - col.right - GAP * 2;
    if (room >= MIN_SIDE_W) {
      const { width, height } = fit(room);
      setSpot({ left: col.right + GAP, top: clampY(r.top + r.height / 2 - height / 2, height), width, height, dx: -12, dy: 0 });
      return;
    }
    // No margin (a phone, a narrow window): over the text, above the word if
    // it fits, otherwise below.
    const { width, height } = fit(Math.min(vw - 32, 260));
    const above = r.top - 12 - height >= 16;
    setSpot({
      left: Math.min(Math.max(16, r.left + r.width / 2 - width / 2), vw - width - 16),
      top: above ? r.top - 12 - height : Math.min(r.bottom + 12, vh - height - 12),
      width,
      height,
      dx: 0,
      dy: above ? 10 : -10,
    });
  };
  const close = () => setSpot(null);

  // A tap shows it; the next tap anywhere, or a scroll, puts it away.
  useEffect(() => {
    if (!spot) return;
    const away = (e: Event) => {
      if (e.type === "scroll" || !ref.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("scroll", away, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("scroll", away);
    };
  }, [spot]);

  return (
    <>
      <span
        ref={ref}
        className="c-peek"
        onPointerEnter={(e) => e.pointerType !== "touch" && open()}
        onPointerLeave={(e) => e.pointerType !== "touch" && close()}
        onFocus={open}
        onBlur={close}
        onPointerUp={(e) => {
          if (!tapToShow || e.pointerType !== "touch") return;
          if (spot) close();
          else open();
        }}
      >
        {children}
      </span>

      <AnimatePresence>
        {spot && (
          <motion.span
            aria-hidden
            className="c-peek-photo"
            style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: spot.dx, y: spot.dy, scale: 0.95, rotate: -1.5 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: spot.dx * 0.5, y: spot.dy * 0.5, scale: 0.97 }}
            transition={{ duration: reduced ? 0.12 : 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={photo(name)} alt={PHOTO_ALT[name]} style={{ objectPosition: shot.focus }} />
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
