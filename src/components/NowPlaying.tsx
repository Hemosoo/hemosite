import { motion, useReducedMotion } from "framer-motion";
import type { RefObject } from "react";

interface Props {
  /** Fixed to the bottom of the viewport rather than sitting in flow. */
  pinned?: boolean;
  open: boolean;
  title: string;
  isPlaying: boolean;
  embedRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

/** Spotify's embed can't be restyled and must stay visible, so it lives behind
 *  the `music` command rather than sitting in the layout. Kept mounted when
 *  closed so the controller survives. */
export default function NowPlaying({ pinned, open, title, isPlaying, embedRef, onClose }: Props) {
  const reduced = useReducedMotion();

  return (
    <motion.aside
      aria-hidden={!open}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      initial={false}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }}
      className={`overflow-hidden border-t border-line bg-surface/95 backdrop-blur ${pinned ? "fixed inset-x-0 bottom-0 z-30" : ""}`}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 text-xs">
          <span className={isPlaying ? "text-green" : "text-dim"}>{isPlaying ? "▶" : "■"}</span>
          <span className="text-dim">now playing</span>
          <span className="min-w-0 flex-1 truncate text-subtle">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close player"
            className="text-dim transition-colors hover:text-text"
          >
            [x]
          </button>
        </div>
        <div ref={embedRef} />
      </div>
    </motion.aside>
  );
}
