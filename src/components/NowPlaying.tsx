import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { RefObject } from "react";
import Equalizer from "./Equalizer";

interface Props {
  title: string;
  isPlaying: boolean;
  /** Spotify mounts its player into this node. */
  embedRef: RefObject<HTMLDivElement | null>;
}

/** Spotify's embed can't be restyled and has to stay visible, so rather than
 *  bolting it to the layout it lives in a widget the visitor opens. Collapsed
 *  it's our chrome; expanded it hands the transport over to Spotify. */
export default function NowPlaying({ title, isPlaying, embedRef }: Props) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))]">
      <motion.div
        layout={!reduced}
        className="overflow-hidden rounded-2xl border border-line bg-surface/80 shadow-2xl backdrop-blur-xl"
      >
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="grid h-5 w-5 flex-shrink-0 place-items-center">
            {isPlaying ? (
              <Equalizer />
            ) : (
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
              </svg>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
              Now playing
            </span>
            <span className="block truncate text-sm font-medium text-text">{title}</span>
          </span>
          <motion.svg
            animate={reduced ? undefined : { rotate: open ? 180 : 0 }}
            className="h-4 w-4 flex-shrink-0 text-dim"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
          </motion.svg>
        </button>

        {/* Kept mounted so the controller survives collapsing. */}
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
            initial={false}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
            className="overflow-hidden"
            aria-hidden={!open}
          >
            <div className="px-3 pb-3">
              <div ref={embedRef} />
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
