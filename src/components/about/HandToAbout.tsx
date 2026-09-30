/**
 * One hand, dealt down the page.
 *
 * Two hole cards come up first and turn over — the introduction, in words.
 * Then the board is dealt above them the way a board is dealt: three together
 * as a flop, one with weight as a turn, and one that builds itself out of
 * pieces of itself as a river. Then the about section arrives, the five lift
 * off the table into one turning formation, and break out of it one at a time
 * toward the sentence below, turning from photographs into the words they
 * were standing in for as they go.
 *
 * The motion is the poker game's. The flop is the game's flop, the turn reads
 * the game's slam keyframes, the river is the game's crystallisation with the
 * card taken out of it, and the flight is built from the same formation and
 * peel primitives as the game's deal. None of the game's state is here: this
 * cannot be affected by a hand in progress and does not know what a rank is.
 *
 * Every card lives in one fixed layer for the whole sequence. That is what
 * makes the last part possible: a card can be dealt onto a table, held while
 * the page scrolls under it, and then land on a word in a section that had
 * not scrolled into view when it was dealt, without ever being re-parented.
 *
 * One requestAnimationFrame loop reads the two scroll progresses and writes
 * transforms to refs. No React state per frame, and the word positions are
 * read once per frame in a batch rather than per card.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReducedMotion, useScroll } from "framer-motion";
import { crystallize } from "../../poker/reveals";
import { anchorRect, setAnchorVisible, showAllAnchors } from "./anchors";
import {
  boardFrame,
  calmFlightFrame,
  feltFor,
  flightFrame,
  holeExit,
  holeFrame,
  metricsFor,
  riverProgress,
  type Frame,
} from "./handScene";
import PhotoCrystallize from "./PhotoCrystallize";
import { HOLE, TOPICS, svgAlign } from "./topics";
import { useViewport } from "../../hooks/useViewport";

/** The river's cut, fixed for the page rather than drawn per hand. */
const RIVER_SPEC = crystallize("river", 0xb0a4d);
/** The index of the card that crystallises. */
const RIVER = 4;

const apply = (
  el: HTMLElement | null,
  f: Frame,
  flipEl: HTMLElement | null,
  photoEl: HTMLElement | null,
  wordEl: HTMLElement | null
) => {
  if (!el) return;
  el.style.transform =
    `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) ` +
    `rotate(${f.rotate.toFixed(2)}deg) scale(${f.scaleX.toFixed(4)}, ${f.scaleY.toFixed(4)})`;
  el.style.opacity = f.opacity.toFixed(3);
  el.style.zIndex = String(10 + Math.round(f.depth * 8));
  if (flipEl) {
    flipEl.style.transform =
      `rotateY(${f.flip.toFixed(1)}deg) rotateX(${f.tiltX.toFixed(2)}deg) ` +
      `rotateZ(${f.tiltY.toFixed(2)}deg)`;
  }
  if (photoEl) {
    // The card's whole surface goes together — photograph, frame and shadow —
    // so what is left behind is the word rather than a word on a card.
    photoEl.style.opacity = (1 - f.morph).toFixed(3);
  }
  if (wordEl) {
    // Gone the moment the bio's own copy comes back. Two identical words in
    // the same place are not invisible: they double their own antialiasing,
    // and the word thickens and smears as the page keeps moving under it.
    // Exactly one of the two is ever drawn.
    wordEl.style.opacity = f.landed ? "0" : f.morph.toFixed(3);
    // The wrapper is being squashed toward the shape of a word, which is the
    // right thing to do to a photograph and the wrong thing to do to type.
    // The word undoes its share of that, so it is only ever at its own size,
    // and comes up to it as it arrives — the card resolving into the word
    // rather than a label laid over one.
    const k = 0.86 + 0.14 * f.morph;
    wordEl.style.transform =
      `translate(-50%, -50%) scale(${(k / f.scaleX).toFixed(4)}, ${(k / f.scaleY).toFixed(4)})`;
  }
};

export default function HandToAbout({ aboutRef }: { aboutRef: React.RefObject<HTMLElement | null> }) {
  const sceneRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const feltRef = useRef<HTMLDivElement>(null);
  const holeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const holeFlip = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardFlip = useRef<Array<HTMLDivElement | null>>([]);
  const photoRefs = useRef<Array<HTMLDivElement | null>>([]);
  const wordRefs = useRef<Array<HTMLDivElement | null>>([]);
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

  /**
   * The river's own progress, for the piece of it that animates inside its
   * element rather than in its position. A getter rather than a prop: this
   * changes every frame and must not be one.
   */
  const riverAt = useRef(0);
  const riverProgressGetter = useCallback(() => riverAt.current, []);

  useEffect(() => {
    if (!w) return;
    let raf = 0;
    const m = metricsFor(w, h);
    const styled = TOPICS.map(() => false);
    let hiding = false;

    const tick = () => {
      const t = scene.get();
      const f = reduced ? (t > 0.94 ? 1 : 0) : flight.get();

      // The layer is only worth drawing while the hand is on screen.
      const live = t > 0 && f < 1;
      if (layerRef.current) layerRef.current.style.visibility = live ? "visible" : "hidden";
      if (!live) {
        // Left by any route — scrolled past, jumped to by a link, or the
        // section reached before the hand ever played. The bio has to read
        // normally whatever happened, so nothing stays hidden.
        if (hiding) {
          hiding = false;
          showAllAnchors();
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      riverAt.current = riverProgress(t);

      // The table goes with the hand. Left up, it is a large dark ellipse
      // lying over the bio the cards are flying into.
      const fade = holeExit(f);
      if (feltRef.current) feltRef.current.style.opacity = fade.toFixed(3);
      for (let i = 0; i < 2; i++) {
        const fr = holeFrame(i, t, m);
        apply(holeRefs.current[i], { ...fr, opacity: fr.opacity * fade }, holeFlip.current[i], null, null);
      }

      // One batch of reads, then one batch of writes.
      const rects = TOPICS.map((tp) => (f > 0 ? anchorRect(tp.id) : null));
      for (let i = 0; i < TOPICS.length; i++) {
        // Taken from the live bio the first time it is there to take, so the
        // word a card turns into is the word it is turning into — same size,
        // same weight, same colour — and stays that way if the bio's type
        // ever changes.
        const a = rects[i];
        const word = wordRefs.current[i];
        if (a && word && !styled[i]) {
          styled[i] = true;
          word.style.fontSize = `${a.fontSize}px`;
          word.style.color = a.color;
          word.style.fontWeight = a.fontWeight;
        }
        const board = boardFrame(i, t, m);
        const fr = reduced
          ? calmFlightFrame(i, f, m, rects[i], board)
          : flightFrame(i, f, m, rects[i], board);
        apply(cardRefs.current[i], fr, cardFlip.current[i], photoRefs.current[i], wordRefs.current[i]);
        // The word in the sentence waits for the card that becomes it.
        setAnchorVisible(TOPICS[i].id, !(f > 0 && !fr.landed));
        if (f > 0) hiding = true;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      showAllAnchors();
    };
  }, [scene, flight, w, h, reduced]);

  const m = w ? metricsFor(w, h) : null;
  const felt = m ? feltFor(m) : null;
  // The card's corner radius in the river's own drawing space.
  const riverRadius = useMemo(() => 250 * 0.05, []);

  return (
    <>
      {/* A spacer: the hand is played out over this much scrolling. */}
      <section ref={sceneRef} aria-hidden className="h-[460vh] bg-bg" />

      {m && felt && (
        <div
          ref={layerRef}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[6] overflow-hidden"
          style={{ visibility: "hidden" }}
        >
          {/* Just enough surface to read as a table, sized to hold the hand
              rather than to a fraction of the window. */}
          <div
            ref={feltRef}
            className="absolute left-1/2 top-1/2 rounded-[45%]"
            style={{
              width: felt.width,
              height: felt.height,
              marginLeft: -felt.width / 2,
              marginTop: -felt.height / 2 + felt.y,
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
                // Everything on the face is in em, so the card can be any size
                // and the writing on it still fits.
                fontSize: m.holeW * 0.072,
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
                  className="absolute inset-0 flex flex-col justify-between rounded-xl border border-line bg-[#f2f4f8] text-[#11151b] shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    padding: "0.9em",
                  }}
                >
                  <div className={`font-bold leading-none ${face.tint}`} style={{ fontSize: "1.2em" }}>
                    {face.pip}
                  </div>
                  <div className="text-center">
                    <div className="font-bold leading-none tracking-tight" style={{ fontSize: "2.3em" }}>
                      {face.rank}
                    </div>
                    <div className="font-semibold leading-tight" style={{ fontSize: "0.8em", marginTop: "0.6em" }}>
                      {face.title}
                    </div>
                    {face.lines.map((l) => (
                      <div
                        key={l}
                        className="leading-tight text-[#5b616b]"
                        style={{ fontSize: "0.72em", marginTop: "0.2em" }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <div
                    className={`rotate-180 font-bold leading-none ${face.tint}`}
                    style={{ fontSize: "1.2em" }}
                  >
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
                {/* The card's surface: photograph, frame and shadow together,
                    so what the word replaces is the whole object rather than
                    a picture inside a frame that outlives it. No index on
                    these — they are photographs, and a rank in the corner
                    would only be a label competing with the picture. */}
                <div
                  ref={(el) => {
                    photoRefs.current[i] = el;
                  }}
                  className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {i === RIVER ? (
                    <PhotoCrystallize
                      photo={topic.img}
                      focus={svgAlign(topic.focus)}
                      spec={RIVER_SPEC}
                      progress={riverProgressGetter}
                      radius={riverRadius}
                    />
                  ) : (
                    <img
                      src={topic.img}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: topic.focus }}
                    />
                  )}
                </div>
              </div>

              {/* The word the card becomes. Outside the flip, because it is
                  not part of the card — it is what is left when the card is
                  gone — and set from the live bio, so it arrives already
                  looking like the word it is about to be. */}
              <div
                ref={(el) => {
                  wordRefs.current[i] = el;
                }}
                className="absolute left-1/2 top-1/2 whitespace-nowrap leading-none"
                style={{ opacity: 0, transform: "translate(-50%, -50%) scale(0.86)" }}
              >
                <span data-word={topic.id}>{topic.word}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
