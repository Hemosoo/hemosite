/**
 * One hand, dealt down the page.
 *
 * Two hole cards come up first and turn over — the introduction, in words.
 * Then the board is dealt above them, flop, turn and river, five photographs
 * of the five things this site is about. Then the about section arrives and
 * the photographs fly into the sentence and land on the words that were
 * already highlighted there.
 *
 * Every card lives in one fixed layer for the whole sequence. That is what
 * makes the last part possible: a card can be dealt onto a table, held while
 * the page scrolls under it, and then land on a word in a section that had not
 * scrolled into view when it was dealt, without ever being re-parented or
 * handed off to a different element.
 *
 * One requestAnimationFrame loop reads the two scroll progresses and writes
 * transforms to refs. No React state per frame, and the word positions are
 * read once per frame in a batch rather than per card.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion, useScroll } from "framer-motion";
import { anchorRect } from "./anchors";
import { boardFrame, holeExit, holeFrame, metricsFor, type Frame } from "./handScene";
import { HOLE, TOPICS } from "./topics";
import { useViewport } from "../../hooks/useViewport";

const apply = (el: HTMLElement | null, f: Frame, flipEl: HTMLElement | null) => {
  if (!el) return;
  el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) rotate(${f.rotate.toFixed(2)}deg) scale(${f.scaleX.toFixed(4)}, ${f.scaleY.toFixed(4)})`;
  el.style.opacity = f.opacity.toFixed(3);
  if (flipEl) flipEl.style.transform = `rotateY(${f.flip.toFixed(1)}deg)`;
};

export default function HandToAbout({ aboutRef }: { aboutRef: React.RefObject<HTMLElement | null> }) {
  const sceneRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const feltRef = useRef<HTMLDivElement>(null);
  const holeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const holeFlip = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardFlip = useRef<Array<HTMLDivElement | null>>([]);
  const reduced = !!useReducedMotion();
  const { w, h } = useViewport();

  // The hand plays out over this section...
  const { scrollYProgress: scene } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });
  // ...and the flight is driven by the about section arriving, so the cards
  // land on words that are on screen rather than on remembered coordinates.
  const { scrollYProgress: flight } = useScroll({
    target: aboutRef,
    offset: ["start end", "start start"],
  });

  useEffect(() => {
    if (!w) return;
    let raf = 0;
    const m = metricsFor(w, h);

    const tick = () => {
      const t = scene.get();
      const f = reduced ? (t > 0.9 ? 1 : 0) : flight.get();

      // The layer is only worth drawing while the hand is on screen.
      const live = t > 0 && f < 1;
      if (layerRef.current) layerRef.current.style.visibility = live ? "visible" : "hidden";

      if (live) {
        // The table goes with the hand. Left up, it is a large dark ellipse
        // lying over the bio the cards are flying into.
        const fade = holeExit(f);
        if (feltRef.current) feltRef.current.style.opacity = fade.toFixed(3);
        for (let i = 0; i < 2; i++) {
          const fr = holeFrame(i, t, m);
          apply(holeRefs.current[i], { ...fr, opacity: fr.opacity * fade }, holeFlip.current[i]);
        }
        // One batch of reads, then one batch of writes.
        const rects = TOPICS.map((tp) => (f > 0 ? anchorRect(tp.id) : null));
        for (let i = 0; i < TOPICS.length; i++) {
          apply(cardRefs.current[i], boardFrame(i, t, f, m, rects[i]), cardFlip.current[i]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, flight, w, h, reduced]);

  const m = w ? metricsFor(w, h) : null;

  return (
    <>
      {/* A spacer: the hand is played out over this much scrolling. */}
      <section ref={sceneRef} aria-hidden className="h-[420vh] bg-bg" />

      {m && (
        <div
          ref={layerRef}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[6] overflow-hidden"
          style={{ visibility: "hidden" }}
        >
          {/* Just enough surface to read as a table. */}
          <div
            ref={feltRef}
            className="absolute left-1/2 top-1/2 h-[46vh] w-[84vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[45%]"
            style={{
              background:
                "radial-gradient(ellipse at center, #121a23 0%, #0d131b 60%, transparent 100%)",
            }}
          />

          {HOLE.map((face, i) => (
            <div
              key={face.rank}
              ref={(el) => {
                holeRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-1/2"
              style={{
                width: m.holeW,
                height: m.holeH,
                marginLeft: -m.holeW / 2,
                marginTop: -m.holeH / 2,
                perspective: 1400,
                opacity: 0,
              }}
            >
              <div
                ref={(el) => {
                  holeFlip.current[i] = el;
                }}
                className="h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 rounded-xl border border-primary/25 bg-[repeating-linear-gradient(45deg,#111a24_0_8px,#0b1219_8px_16px)] shadow-2xl"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="absolute inset-3 rounded-lg border border-primary/15" />
                </div>
                <div
                  className="absolute inset-0 flex flex-col justify-between rounded-xl border border-line bg-[#f2f4f8] p-3 text-[#11151b] shadow-2xl sm:p-4"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className={`text-lg font-bold leading-none ${face.tint}`}>{face.pip}</div>
                  <div className="text-center">
                    <div className="text-[clamp(1.4rem,3.6vw,2.4rem)] font-bold leading-none tracking-tight">
                      {face.rank}
                    </div>
                    <div className="mt-2 text-[11px] font-semibold leading-tight">{face.title}</div>
                    {face.lines.map((l) => (
                      <div key={l} className="mt-0.5 text-[10px] leading-tight text-[#5b616b]">
                        {l}
                      </div>
                    ))}
                  </div>
                  <div className={`rotate-180 text-lg font-bold leading-none ${face.tint}`}>
                    {face.pip}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {TOPICS.map((topic, i) => (
            <div
              key={topic.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-1/2"
              style={{
                width: m.cardW,
                height: m.cardH,
                marginLeft: -m.cardW / 2,
                marginTop: -m.cardH / 2,
                perspective: 1400,
                opacity: 0,
              }}
            >
              <div
                ref={(el) => {
                  cardFlip.current[i] = el;
                }}
                className="h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 rounded-xl border border-primary/25 bg-[repeating-linear-gradient(45deg,#111a24_0_8px,#0b1219_8px_16px)] shadow-2xl"
                  style={{ backfaceVisibility: "hidden" }}
                />
                {/* No index on these: they are photographs, and a rank in the
                    corner only competes with the picture. */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <img
                    src={topic.img}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: topic.focus }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
