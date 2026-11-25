/**
 * A word in the About text that shows its photograph while it's pointed at
 * or focused: beside the paragraph where there's margin, above or below the
 * word where there isn't. On touch, words that don't do anything else show
 * their photo on tap; a second tap, a tap elsewhere or a scroll puts it away.
 */
import { useEffect, useRef, useState } from "react";
import { photo } from "../../content/profile";
import { PHOTO_ALT } from "../../content/copy";

type Name = keyof typeof PHOTO_ALT;

/** Each photo's shape, and where to keep its subject when cropped. */
const SHOT: Record<Name, { ratio: number; focus: string }> = {
  heyday: { ratio: 900 / 1200, focus: "50% 30%" },
  amazon: { ratio: 1000 / 750, focus: "50% 38%" },
  acapella: { ratio: 668 / 1000, focus: "50% 40%" },
  poker: { ratio: 666 / 1000, focus: "18% 22%" },
  dunking: { ratio: 1000 / 711, focus: "50% 30%" },
};

interface Spot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function Peek({ name, tap, children }: { name: Name; tap: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const shot = SHOT[name];

  const open = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const col = (el.closest("[data-measure]") ?? el).getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = (w: number) => {
      const width = Math.round(Math.min(w, 280, (vh - 120) / shot.ratio));
      return { width, height: Math.round(width * shot.ratio) };
    };
    const room = vw - col.right - 40;
    if (room >= 160) {
      const { width, height } = size(room);
      const top = Math.min(Math.max(16, r.top + r.height / 2 - height / 2), vh - height - 16);
      setSpot({ left: col.right + 24, top, width, height });
      return;
    }
    const { width, height } = size(Math.min(vw - 32, 240));
    const above = r.top - 12 - height >= 16;
    setSpot({
      left: Math.min(Math.max(16, r.left + r.width / 2 - width / 2), vw - width - 16),
      top: above ? r.top - 12 - height : Math.min(r.bottom + 12, vh - height - 16),
      width,
      height,
    });
  };
  const close = () => setSpot(null);

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
    <span
      ref={ref}
      className="a-peek"
      onPointerEnter={(e) => e.pointerType !== "touch" && open()}
      onPointerLeave={(e) => e.pointerType !== "touch" && close()}
      onFocus={open}
      onBlur={close}
      onPointerUp={(e) => {
        if (!tap || e.pointerType !== "touch") return;
        if (spot) close();
        else open();
      }}
    >
      {children}
      {spot && (
        <span className="a-peek-photo" aria-hidden style={spot}>
          <img src={photo(name)} alt="" style={{ objectPosition: shot.focus }} />
        </span>
      )}
    </span>
  );
}
