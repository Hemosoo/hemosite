/**
 * Everything below the hero: the player card at the left, the bio beside it.
 *
 * The bio is the Stretchtext engine (bio/stretch.ts), mounted into elements
 * this component owns. Opening a passage is handed to the air mail courier
 * (airmail/post.ts) once it has loaded, so each passage is delivered by a
 * paper plane folded from a card behind the player card. The card is also
 * where the hero's plane lands (three/landing.ts).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import PlayerCard, { type PlayerCardHandle } from "./PlayerCard";
import { Stretch, type StretchState } from "../bio/stretch";
import { landing } from "../three/landing";
import { LINKS } from "../data";

interface Props {
  stretchRef: React.MutableRefObject<Stretch | null>;
  onState: (s: StretchState) => void;
  onPoker: () => void;
  bar: () => HTMLElement | null;
}

const canFly = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
};

export default function Showcase({ stretchRef, onState, onPoker, bar }: Props) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<PlayerCardHandle>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const [hintGone, setHintGone] = useState(false);
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  // Callbacks the engine holds on to: read through refs, so a re-render of
  // the parent never leaves it calling a stale one.
  const cb = useRef({ onState, onPoker });
  cb.current = { onState, onPoker };

  useEffect(() => {
    const sheet = sheetRef.current;
    const bio = bioRef.current;
    const margin = marginRef.current;
    if (!sheet || !bio || !margin) return;
    const s = new Stretch({
      sheet,
      bio,
      margin,
      origin: () => cardRef.current?.card ?? null,
      onChange: (st) => cb.current.onState(st),
      onAction: (name) => {
        if (name === "poker") cb.current.onPoker();
      },
      onFirstUse: () => setHintGone(true),
      email: LINKS.email,
    });
    stretchRef.current = s;

    // The planes are a second WebGL context and a chunk of three.js: only
    // fetched once the page is idle, and only where they can fly.
    let post: { dispose: () => void } | null = null;
    let cancelled = false;
    if (canFly()) {
      const load = () =>
        import("../airmail/post").then(({ startPost }) => {
          if (cancelled) return;
          const p = startPost({ bar });
          if (!p) return;
          post = p;
          s.setCourier(p.send);
        });
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => void load(), { timeout: 2500 });
      else setTimeout(() => void load(), 1200);
    }

    return () => {
      cancelled = true;
      post?.dispose();
      s.destroy();
      stretchRef.current = null;
    };
  }, [stretchRef, bar]);

  // Where the hero's plane lands.
  useEffect(() => {
    landing.slot = cardRef.current?.card ?? null;
    landing.hold = holdRef.current;
    landing.layout = layoutRef.current;
    landing.unflip = () => cardRef.current?.setFlipped(false);
    const measure = () => landing.measure();
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      landing.slot = landing.hold = landing.layout = null;
      landing.unflip = null;
    };
  }, []);

  const onStat = useCallback(
    (node: string, value: string, from: HTMLElement) => stretchRef.current?.go(node, value, from),
    [stretchRef]
  );
  const onLight = useCallback(
    (node: string, value: string) => stretchRef.current?.light(node, value),
    [stretchRef]
  );

  return (
    <section className="sc" aria-label="About Hemosoo">
      <div ref={layoutRef} className="sc-layout">
        <aside className="sc-cardcol" aria-label="Player card">
          <div ref={holdRef} className="sc-hold" data-card-slot>
            <PlayerCard ref={cardRef} onStat={onStat} onLight={onLight} />
            <p className="sc-cardhint">
              {coarse ? (
                <>
                  <b>Drag</b> the card to tilt it. <b>Tap</b> it for the stats.
                </>
              ) : (
                <>
                  <b>Tilt</b> the card with your pointer. <b>Click</b> it for the stats.
                </>
              )}{" "}
              Each stat points to its line in the bio.
            </p>
          </div>
        </aside>

        <div className="sc-content">
          <div ref={sheetRef} className="st-sheet">
            <div ref={marginRef} className="st-margin" aria-hidden />
            <p ref={bioRef} className="st-bio" />
          </div>
          <p className={`st-hint${hintGone ? " gone" : ""}`}>
            Click a coloured word to open it, and again to close it. <kbd>+</kbd> and <kbd>−</kbd> open or
            close a level at a time.
          </p>

          <footer className="sc-foot">
            <span>Hemosoo Woo · hemosoo.com</span>
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                })
              }
            >
              Back to the top
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}
