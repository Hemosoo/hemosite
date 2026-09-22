import { motion } from "framer-motion";
import type { RefObject } from "react";

interface Props {
  /** Spotify mounts its player here — the only transport on the page. */
  embedRef: RefObject<HTMLDivElement | null>;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const navButton =
  "w-10 h-10 flex-shrink-0 grid place-items-center rounded-full text-[#A7A7A7] " +
  "enabled:hover:text-white enabled:hover:bg-white/10 transition-colors " +
  "disabled:opacity-25 disabled:cursor-default";

export default function PlayerBar({ embedRef, hasPrev, hasNext, onPrev, onNext }: Props) {
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-50 bg-[#181818] border-t border-white/10"
      initial={{ y: 120 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-4">
        <button onClick={onPrev} disabled={!hasPrev} className={navButton} aria-label="Previous section">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div ref={embedRef} />
        </div>

        <button onClick={onNext} disabled={!hasNext} className={navButton} aria-label="Next section">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
