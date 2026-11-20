/**
 * The expandable bio, set for the editorial page: the Stretchtext engine
 * (bio/stretch.ts) with the alternatives' copy (content/bio.ts), and a reading
 * depth control that says what it does.
 *
 * No paper planes here: in a page built to be read and scanned, a passage
 * should open the moment it's asked for.
 */
import { useEffect, useRef, useState } from "react";
import { Stretch, type StretchState } from "../../bio/stretch";
import { BIO } from "../../content/bio";
import { PERSON } from "../../content/profile";

const DEPTHS = [
  ["0", "Short"],
  ["1", "More"],
  ["9", "Everything"],
] as const;

export default function Bio({ onPoker }: { onPoker: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const bio = useRef<HTMLParagraphElement>(null);
  const margin = useRef<HTMLDivElement>(null);
  const engine = useRef<Stretch | null>(null);
  const [state, setState] = useState<StretchState>({ open: 0, total: 0, depth: "0" });
  const poker = useRef(onPoker);
  poker.current = onPoker;

  useEffect(() => {
    if (!sheet.current || !bio.current || !margin.current) return;
    const s = new Stretch({
      sheet: sheet.current,
      bio: bio.current,
      margin: margin.current,
      origin: () => null,
      onChange: setState,
      onAction: (name) => {
        if (name === "poker") poker.current();
      },
      onFirstUse: () => {},
      email: PERSON.email,
      nodes: BIO,
    });
    engine.current = s;
    return () => {
      s.destroy();
      engine.current = null;
    };
  }, []);

  return (
    <div className="v2-bio">
      <div className="v2-depth" role="group" aria-label="How much of the bio to show">
        <span>Reading depth</span>
        {DEPTHS.map(([d, label]) => (
          <button
            key={d}
            type="button"
            aria-pressed={state.depth === d}
            onClick={() => engine.current?.setDepth(Number(d))}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={sheet} className="st-sheet">
        <div ref={margin} className="st-margin" aria-hidden />
        <p ref={bio} className="st-bio" />
      </div>
    </div>
  );
}
