import { useReducedMotion } from "framer-motion";

interface Flight {
  /** Lane height, % down the hero. */
  top: number;
  /** Seconds for one crossing. */
  dur: number;
  /** Negative, so flights are already under way on load. */
  delay: number;
  scale: number;
  rtl: boolean;
  tint: string;
}

// Deliberately ordered: even lanes fly right, odd fly left, and the middle of
// the hero is left clear so nothing crosses the wordmark's centre.
const FLIGHTS: Flight[] = [
  { top: 9, dur: 34, delay: -3, scale: 0.8, rtl: false, tint: "text-primary" },
  { top: 21, dur: 27, delay: -14, scale: 1, rtl: true, tint: "text-yellow" },
  { top: 33, dur: 40, delay: -24, scale: 0.7, rtl: false, tint: "text-subtle" },
  { top: 68, dur: 31, delay: -8, scale: 0.9, rtl: true, tint: "text-primary" },
  { top: 80, dur: 37, delay: -19, scale: 0.75, rtl: false, tint: "text-subtle" },
  { top: 91, dur: 24, delay: -30, scale: 1.05, rtl: true, tint: "text-yellow" },
];

function CardGlyph() {
  return (
    <svg viewBox="0 0 34 48" className="h-full w-full" fill="none" aria-hidden>
      <rect x="1" y="1" width="32" height="46" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M17 13c3 4 7 6 7 10a4.6 4.6 0 0 1-7 3.6A4.6 4.6 0 0 1 10 23c0-4 4-6 7-10Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

function PlaneGlyph() {
  return (
    <svg viewBox="0 0 52 34" className="h-full w-full" aria-hidden>
      <path d="M50 3 3 19l18 3z" fill="currentColor" opacity="0.75" />
      <path d="M50 3 21 22l5 10z" fill="currentColor" opacity="0.38" />
      <path d="M50 3 21 22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Cards crossing the hero that fold into paper planes partway over. */
export default function PaperPlanes() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {FLIGHTS.map((f, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            top: `${f.top}%`,
            animation: `${f.rtl ? "flight-rtl" : "flight-ltr"} ${f.dur}s linear ${f.delay}s infinite`,
          }}
        >
          <div
            style={{
              animation: `flight-bob ${f.dur / 5}s ease-in-out ${f.delay}s infinite`,
            }}
          >
            {/* One box, two faces cross-fading in place. */}
            <div
              className={`relative ${f.tint}`}
              style={{
                width: 52 * f.scale,
                height: 48 * f.scale,
                transform: f.rtl ? "scaleX(-1)" : undefined,
                opacity: 0.22,
              }}
            >
              <div
                className="absolute inset-y-0 left-1/2 -translate-x-1/2"
                style={{
                  width: 34 * f.scale,
                  animation: `flight-card ${f.dur}s linear ${f.delay}s infinite`,
                }}
              >
                <CardGlyph />
              </div>
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                style={{
                  height: 34 * f.scale,
                  animation: `flight-plane ${f.dur}s linear ${f.delay}s infinite`,
                }}
              >
                <PlaneGlyph />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
