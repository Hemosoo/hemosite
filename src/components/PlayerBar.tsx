import { motion } from "framer-motion";

interface Track {
  id: number;
  title: string;
  album: string;
  duration: string;
}

interface Props {
  track: Track;
  isPlaying: boolean;
  progress: number;
  totalSeconds: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (pct: number) => void;
}

function fmt(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
}

export default function PlayerBar({
  track,
  isPlaying,
  progress,
  totalSeconds,
  hasPrev,
  hasNext,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
}: Props) {
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 h-[90px] bg-[#181818] border-t border-white/10 z-50 flex items-center px-4 gap-4"
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Track info */}
      <div className="flex items-center gap-3 w-[30%] min-w-0">
        <img
          src={`${import.meta.env.BASE_URL}me.JPG`}
          alt="cover"
          className="w-14 h-14 object-cover rounded flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{track.title}</p>
          <p className="text-xs text-[#A7A7A7] truncate">Hemosoo</p>
        </div>
      </div>

      {/* Controls + progress */}
      <div className="flex flex-col items-center gap-2 flex-1">
        <div className="flex items-center gap-6">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="text-[#A7A7A7] enabled:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label="Previous track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <motion.button
            onClick={onPlayPause}
            className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="text-[#A7A7A7] enabled:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label="Next track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-[11px] text-[#A7A7A7] w-9 text-right tabular-nums">
            {fmt((progress / 100) * totalSeconds)}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onSeek(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") onSeek(Math.min(100, progress + 5));
              if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 5));
            }}
            className="group relative flex-1 h-1 rounded-full bg-white/20 cursor-pointer"
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white group-hover:bg-[#1DB954] transition-colors"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-[11px] text-[#A7A7A7] w-9 tabular-nums">{fmt(totalSeconds)}</span>
        </div>
      </div>

      {/* Volume — decorative */}
      <div className="hidden lg:flex items-center gap-2 w-[30%] justify-end">
        <svg className="w-4 h-4 text-[#A7A7A7]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
        <div className="w-24 h-1 rounded-full bg-white/20">
          <div className="h-full w-3/4 rounded-full bg-white" />
        </div>
      </div>
    </motion.div>
  );
}
