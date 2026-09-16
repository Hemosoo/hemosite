import { motion, useReducedMotion } from "framer-motion";

const BARS = [
  { keyframes: ["4px", "16px", "8px", "14px", "6px"], duration: 0.9, delay: 0 },
  { keyframes: ["10px", "6px", "16px", "8px", "12px"], duration: 0.7, delay: 0.15 },
  { keyframes: ["7px", "14px", "4px", "16px", "9px"], duration: 0.8, delay: 0.3 },
];

export default function Equalizer() {
  const reduced = useReducedMotion();

  return (
    <div className="flex items-end gap-[2px] h-4 w-5" aria-label="Now playing">
      {BARS.map((bar, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-[#1DB954] rounded-sm"
          animate={reduced ? { height: "8px" } : { height: bar.keyframes }}
          transition={
            reduced
              ? {}
              : { duration: bar.duration, repeat: Infinity, ease: "easeInOut", delay: bar.delay }
          }
        />
      ))}
    </div>
  );
}
