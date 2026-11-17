/**
 * The five photographs, dealt once.
 *
 * The first time the strip comes into view the lights come up on it, a pile
 * drops onto the middle of the spread, and the cards are thrown out of it one
 * at a time, spinning, into their places. They land face down. Then they turn
 * over in a wave, left to right, a glint running across each face as it comes
 * round, and the captions come up under them.
 *
 * It runs on a clock rather than on the scroll, and only once per visit.
 * Nobody has to scroll at the right speed to see it, and nobody has to sit
 * through it twice. Then it is just a row of photographs to look at: point
 * at one and it lifts out of the spread, click it and it opens full size.
 *
 * The backs are the hero deck's backs, drawn in CSS, so these read as the
 * same deck as the cards in the opening scene and not a fourth design.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import { TOPICS, type Topic } from "./topics";
import { useLit } from "./lit";

/** Where each card comes to rest. A hand-dealt spread, not a grid. */
const TILT = [-5, 3, -2, 4, -3];
/** How each card sits in the pile before it is thrown. */
const PILE_TILT = [-2, 1.5, -1, 2.5, 0.5];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** The timeline, in seconds from the moment the strip comes into view. */
const T = {
  /** The pile drops onto the table. */
  pileDur: 0.5,
  /** The first card leaves the pile... */
  dealAt: 0.55,
  /** ...and each one after it this much later. */
  dealGap: 0.14,
  flyDur: 0.8,
  /** The beat between the last card landing and the first turning over. */
  hold: 0.2,
  flipGap: 0.12,
  flipDur: 0.7,
};
const flyAt = (i: number) => T.dealAt + i * T.dealGap;
const flipAt = (i: number) =>
  T.dealAt + (TOPICS.length - 1) * T.dealGap + T.flyDur + T.hold + i * T.flipGap;

interface Offset {
  dx: number;
  dy: number;
}

/** The hero deck's back: dark edge, cream border, navy lattice. */
function CardBack() {
  return (
    <div className="absolute inset-0 rounded-xl bg-[#1b2430] p-[3%] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
      <div className="h-full w-full rounded-[9px] bg-[#f4f2ee] p-[3.5%]">
        <div
          className="h-full w-full rounded-md bg-[#24405e]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(210,226,245,0.32) 0 1.5px, transparent 1.5px 12px)," +
              "repeating-linear-gradient(-45deg, rgba(210,226,245,0.32) 0 1.5px, transparent 1.5px 12px)",
          }}
        />
      </div>
    </div>
  );
}

interface Opened {
  i: number;
  /** Where the card was when it was picked up. */
  from: DOMRect;
  /** The photograph's own height over width, so it opens uncropped. */
  ratio: number;
}

export default function PhotoDeal() {
  const reduced = !!useReducedMotion();
  const { lit, setLit } = useLit();

  const stripRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flipRefs = useRef<Array<HTMLDivElement | null>>([]);
  const glintRefs = useRef<Array<HTMLDivElement | null>>([]);
  const capRefs = useRef<Array<HTMLElement | null>>([]);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);

  const [pile, setPile] = useState<Offset[] | null>(null);
  const [finished, setFinished] = useState(false);
  // Reduced motion has no deal to wait for. Read live rather than used as the
  // initial state, because it resolves after the first render.
  const dealt = finished || reduced;
  const [opened, setOpened] = useState<Opened | null>(null);
  const started = useRef(false);

  const inView = useInView(stripRef, { once: true, amount: 0.55 });

  // Where the pile is, from each card's point of view: the middle of the
  // spread. Measured from the static slots, never the moving cards, and only
  // until the deal starts — after that the cards are home and stay home.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || reduced) return;
    const measure = () => {
      if (started.current) return;
      const box = strip.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      setPile(
        slotRefs.current.map((el) => {
          const r = el?.getBoundingClientRect();
          return r ? { dx: cx - (r.left + r.width / 2), dy: cy - (r.top + r.height / 2) } : { dx: 0, dy: 0 };
        })
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    return () => ro.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!inView || reduced || !pile || started.current) return;
    started.current = true;
    const runs: Array<Promise<void>> = [];
    // Framer's animations are thenable but not typed as promises.
    const done = (a: { then: (r: () => void) => unknown }) => new Promise<void>((r) => void a.then(r));

    // The lights come up, and the camera eases in.
    if (spotRef.current) runs.push(done(animate(spotRef.current, { opacity: [0, 1] }, { duration: 1.4, ease: "easeOut" })));
    if (stripRef.current) {
      runs.push(done(animate(stripRef.current, { scale: [1.05, 1] }, { duration: 2.8, ease: EASE_OUT })));
    }

    TOPICS.forEach((_, i) => {
      const fly = flyRefs.current[i];
      const flip = flipRefs.current[i];
      const glint = glintRefs.current[i];
      const cap = capRefs.current[i];
      if (!fly || !flip) return;
      const { dx, dy } = pile[i];
      // Stacked a hair apart, so the pile reads as a pile.
      const py = dy - i * 1.5;
      // Thrown with a flick: spun the way it is travelling, a full turn and
      // a bit, so it lands at its own angle having gone round once.
      const dir = dx > 1 ? -1 : 1;

      runs.push(
        done(animate(
          fly,
          { opacity: [0, 1], x: [dx, dx], y: [py + 46, py], rotate: [PILE_TILT[i], PILE_TILT[i]] },
          { duration: T.pileDur, delay: i * 0.03, ease: EASE_OUT }
        )).then(() =>
          done(animate(
            fly,
            {
              x: [dx, dx * 0.42, 0],
              // Up and over: an arc, not a slide.
              y: [py, py * 0.4 - 80, 0],
              rotate: [PILE_TILT[i], PILE_TILT[i] + dir * 210, TILT[i] + dir * 360],
              // Toward the camera at the top of the arc, and back down.
              scale: [1, 1.12, 1],
            },
            {
              duration: T.flyDur,
              delay: flyAt(i) - T.pileDur - i * 0.03,
              ease: EASE_OUT,
              times: [0, 0.45, 1],
            }
          ))
        )
      );

      runs.push(
        done(animate(flip, { rotateY: [180, 0] }, { duration: T.flipDur, delay: flipAt(i), ease: [0.65, 0, 0.35, 1] }))
      );
      if (glint) {
        runs.push(
          done(animate(
            glint,
            { x: ["-60%", "330%"], opacity: [0, 0.9, 0] },
            { duration: 0.75, delay: flipAt(i) + T.flipDur * 0.45, ease: "easeInOut" }
          ))
        );
      }
      if (cap) {
        runs.push(
          done(animate(cap, { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, delay: flipAt(i) + T.flipDur * 0.6, ease: EASE_OUT }))
        );
      }
    });

    Promise.all(runs).then(() => setFinished(true));
  }, [inView, reduced, pile]);

  const open = useCallback((i: number) => {
    const slot = slotRefs.current[i];
    const img = imgRefs.current[i];
    if (!slot) return;
    const ratio = img?.naturalWidth ? img.naturalHeight / img.naturalWidth : 1.4;
    setLit(null);
    setOpened({ i, from: slot.getBoundingClientRect(), ratio });
  }, [setLit]);

  const close = useCallback(() => {
    setOpened((o) => {
      const slot = o && slotRefs.current[o.i];
      // Back to wherever the card is now, not where it was when it opened.
      return o && slot ? { ...o, from: slot.getBoundingClientRect() } : o;
    });
    // One frame for the new rect to reach the exit animation, then go.
    requestAnimationFrame(() => setOpened(null));
  }, []);

  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onScroll = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [opened, close]);

  // Before measurement and before the deal, the cards wait in the pile,
  // unseen. With reduced motion there is no pile: they are simply there.
  const waiting = !reduced;

  return (
    <div className="relative lg:-mx-12">
      {/* The light over the table. */}
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none absolute -inset-x-[15%] -inset-y-[35%]"
        style={{
          opacity: reduced ? 1 : 0,
          background:
            "radial-gradient(ellipse 50% 50% at 50% 48%, rgba(97,175,239,0.11), rgba(97,175,239,0.04) 55%, transparent 75%)",
        }}
      />

      <div
        ref={stripRef}
        className="relative flex flex-wrap justify-center gap-x-4 gap-y-7 sm:flex-nowrap sm:justify-between sm:gap-x-5"
      >
        {TOPICS.map((topic: Topic, i) => {
          const lifted = lit === topic.id;
          const dimmed = !!lit && !lifted;
          const p = pile?.[i];
          return (
            <figure
              key={topic.id}
              className="flex w-[calc((100%_-_2rem)/3)] flex-col items-center gap-3 sm:w-[calc((100%_-_5rem)/5)]"
            >
              <div
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className="relative aspect-[5/7] w-full"
              >
                <div
                  ref={(el) => {
                    flyRefs.current[i] = el;
                  }}
                  className="absolute inset-0"
                  style={{
                    zIndex: lifted ? 30 : 20 - i,
                    ...(waiting
                      ? {
                          opacity: 0,
                          transform: p
                            ? `translateX(${p.dx}px) translateY(${p.dy}px) rotate(${PILE_TILT[i]}deg)`
                            : undefined,
                        }
                      : { transform: `rotate(${TILT[i]}deg)` }),
                  }}
                >
                  <motion.button
                    type="button"
                    aria-label={`${topic.word}: ${topic.caption}. Open the photograph`}
                    disabled={!dealt}
                    onClick={() => open(i)}
                    onPointerEnter={(e) => e.pointerType !== "touch" && dealt && setLit(topic.id)}
                    onPointerLeave={() => setLit(null)}
                    onFocus={() => dealt && setLit(topic.id)}
                    onBlur={() => setLit(null)}
                    className="block h-full w-full cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
                    style={{ perspective: 1100, opacity: opened?.i === i ? 0 : undefined }}
                    animate={
                      lifted
                        ? { y: -14, rotate: -TILT[i], scale: 1.08, opacity: 1 }
                        : { y: 0, rotate: 0, scale: 1, opacity: dimmed ? 0.45 : 1 }
                    }
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  >
                    <div
                      ref={(el) => {
                        flipRefs.current[i] = el;
                      }}
                      className="relative h-full w-full [transform-style:preserve-3d]"
                      style={{ transform: waiting ? "rotateY(180deg)" : undefined }}
                    >
                      <div
                        className={`absolute inset-0 overflow-hidden rounded-xl border bg-surface shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] transition-colors [backface-visibility:hidden] ${
                          lifted ? "border-white/35" : "border-white/10"
                        }`}
                      >
                        <img
                          ref={(el) => {
                            imgRefs.current[i] = el;
                          }}
                          src={topic.img}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover"
                          style={{ objectPosition: topic.focus }}
                        />
                        <div
                          ref={(el) => {
                            glintRefs.current[i] = el;
                          }}
                          aria-hidden
                          className="pointer-events-none absolute inset-y-[-20%] left-0 w-[45%] -skew-x-[18deg] bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 mix-blend-overlay"
                        />
                      </div>
                      <CardBack />
                    </div>
                  </motion.button>
                </div>
              </div>

              <figcaption
                ref={(el) => {
                  capRefs.current[i] = el;
                }}
                className="text-center font-mono text-[11px] leading-snug sm:text-xs"
                style={{ opacity: waiting ? 0 : 1 }}
              >
                <span className={topic.tint}>{topic.word}</span>
                <span className="block text-dim">{topic.caption}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <AnimatePresence custom={opened?.from}>
        {opened && <Lightbox key={opened.i} opened={opened} reduced={reduced} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}

/** Where the photograph opens to: as big as fits, uncropped, a little high
 *  to leave room for its caption. */
function target(ratio: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(vw * 0.9, (vh * 0.78) / ratio, 960);
  const height = width * ratio;
  return { left: (vw - width) / 2, top: (vh - height) / 2 - 18, width, height };
}

const rectOf = (r: DOMRect, i: number) => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
  rotate: TILT[i],
});

/** The card, picked up off the table and held up to the light. */
function Lightbox({ opened, reduced, onClose }: { opened: Opened; reduced: boolean; onClose: () => void }) {
  const topic = TOPICS[opened.i];
  const to = target(opened.ratio);
  const move = reduced ? { duration: 0.15 } : { duration: 0.6, ease: EASE_OUT };

  return (
    <motion.div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal
      aria-label={`${topic.word}: ${topic.caption}`}
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      />
      <motion.div
        className="absolute overflow-hidden rounded-xl border border-white/15 bg-surface shadow-[0_40px_120px_-20px_rgba(0,0,0,1)]"
        custom={opened.from}
        variants={{
          from: () => rectOf(opened.from, opened.i),
          to: { ...to, rotate: 0 },
          back: (r: DOMRect | undefined) => rectOf(r ?? opened.from, opened.i),
        }}
        initial={reduced ? { ...to, rotate: 0, opacity: 0 } : "from"}
        animate={reduced ? { ...to, rotate: 0, opacity: 1 } : "to"}
        exit={reduced ? { opacity: 0 } : "back"}
        transition={move}
      >
        <img
          src={topic.img}
          alt={`${topic.word}: ${topic.caption}`}
          className="h-full w-full object-cover"
          style={{ objectPosition: topic.focus }}
        />
      </motion.div>
      <motion.p
        className="absolute inset-x-0 text-center text-sm"
        style={{ top: to.top + to.height + 16 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.35, duration: 0.4 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        <span className={topic.tint}>{topic.word}</span>
        <span className="text-dim"> · {topic.caption}</span>
      </motion.p>
    </motion.div>
  );
}
