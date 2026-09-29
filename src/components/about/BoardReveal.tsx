/**
 * The board, and what it turns into.
 *
 * Scroll deals five cards the way a hand is dealt — flop, turn, river — and
 * then flies them into the list of words the about section is built from. Each
 * card is one element the whole way: it is dealt, it lands, it shrinks into a
 * thumbnail and its word grows out of its edge. Nothing crossfades into
 * anything, because the thing that makes this read as a story rather than a
 * transition is being able to watch a particular card become a particular word.
 *
 * Driven by framer-motion's scroll values, which the rest of the site already
 * uses; every animated property is a transform or an opacity, so scrubbing
 * costs no React renders and no layout.
 */
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { BEAT, layoutFor } from "./boardLayout";
import { FLOP, RIVER, TOPICS, TURN, type Topic } from "./topics";
import { useViewport } from "../../hooks/useViewport";

/**
 * Piecewise-linear interpolation, deliberately written as a function.
 *
 * `useTransform(value, [inputs], [outputs])` can be handed off to a native
 * scroll-linked animation, and that timeline is not the one this section is
 * measured against: the felt read 0.69 where the section's own progress was
 * 0.95, and at the very bottom the words faded back out entirely. A function
 * transform cannot be compiled into keyframes, so it is evaluated in JS
 * against the progress this component actually has.
 */
function useRamp(p: MotionValue<number>, stops: number[], out: number[]) {
  return useTransform(p, (v) => {
    const last = stops.length - 1;
    if (v <= stops[0]) return out[0];
    if (v >= stops[last]) return out[last];
    let i = 0;
    while (i < last && v > stops[i + 1]) i++;
    const span = stops[i + 1] - stops[i];
    const t = span === 0 ? 0 : (v - stops[i]) / span;
    return out[i] + (out[i + 1] - out[i]) * t;
  });
}

/** The three streets, named while they are being dealt. */
const STREETS = [
  { label: "the flop", at: BEAT.flopIn },
  { label: "the turn", at: BEAT.turnIn },
  { label: "the river", at: BEAT.riverIn },
] as const;

/** One label, held through its street and faded out at the end of it. */
function StreetLabel({
  street,
  progress,
}: {
  street: (typeof STREETS)[number];
  progress: MotionValue<number>;
}) {
  const [a, b] = street.at;
  const opacity = useRamp(progress, [a - 0.04, a + 0.01, b, b + 0.05], [0, 1, 1, 0]);
  return (
    <motion.span
      className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap"
      style={{ opacity }}
    >
      {street.label}
    </motion.span>
  );
}

/** When card i is dealt, and from where. */
function dealWindow(i: number): readonly [number, number] {
  if (FLOP.includes(i)) return BEAT.flopIn;
  if (i === TURN) return BEAT.turnIn;
  return BEAT.riverIn;
}

function TopicCard({
  topic,
  i,
  progress,
  reduced,
  vw,
  vh,
}: {
  topic: Topic;
  i: number;
  progress: MotionValue<number>;
  reduced: boolean;
  vw: number;
  vh: number;
}) {
  const L = layoutFor({ w: vw, h: vh });
  const [dealFrom, dealTo] = dealWindow(i);
  // The flop's three overlap slightly rather than arriving together, which is
  // what gives it a rhythm instead of a thud.
  const stagger = FLOP.includes(i) ? i * 0.035 : 0;
  const inFrom = dealFrom + stagger;
  const inTo = dealTo + stagger;

  const [mFrom, mTo] = BEAT.morph;
  const bx = L.boardX(i);
  const ax = L.anchorX(i);
  const ay = L.anchorY(i);

  // Dealt in from the right, where a dealer would be, and a little above.
  const entryX = bx + vw * 0.62;
  const entryY = L.boardY - vh * 0.14;

  const x = useRamp(progress, [inFrom, inTo, mFrom, mTo], [entryX, bx, bx, ax]);
  const y = useRamp(progress, [inFrom, inTo, mFrom, mTo], [entryY, L.boardY, L.boardY, ay]);
  const scale = useRamp(progress, [inFrom, inTo, mFrom, mTo], [0.82, 1, 1, L.anchorScale]);
  // Cants on the way in and unwinds; the river gets a touch more than the rest.
  const rotate = useRamp(progress, [inFrom, inTo, mFrom, mTo], [i === RIVER ? -14 : -9, 0, 0, 0]);
  // The face is mounted at rotateY(180), so turning over means going to 180.
  const flip = useRamp(progress, [inFrom + 0.04, inTo], [0, 180]);
  const opacity = useRamp(progress, [inFrom - 0.02, inFrom + 0.03], [0, 1]);

  // As the card becomes an anchor its photo steps back and its frame thins,
  // so the word can carry the row.
  const photoDim = useRamp(progress, [mFrom, mTo], [1, 0.9]);
  const wordIn = useRamp(progress, [mFrom + 0.12, mTo - 0.02], [0, 1]);
  // Starts tucked against the card and settles out to its reading position.
  const wordX = useRamp(progress, [mFrom + 0.12, mTo], [ax + L.wordOffset - 26, ax + L.wordOffset]);
  const indexOut = useRamp(progress, [mFrom, mFrom + 0.12], [1, 0]);

  const still = reduced;

  return (
    <>
      <motion.div
      className="absolute left-1/2 top-1/2"
      style={
        still
          ? { x: ax, y: ay, marginLeft: -L.cardW / 2, marginTop: -L.cardH / 2 }
          : { x, y, scale, rotate, opacity, marginLeft: -L.cardW / 2, marginTop: -L.cardH / 2 }
      }
    >
      <div className="relative" style={{ width: L.cardW, height: L.cardH }}>
        {/* The card. Flipped face-down until it is dealt. */}
        <motion.div
          className="h-full w-full"
          style={
            still
              ? { transformStyle: "preserve-3d", rotateY: 180 }
              : { transformStyle: "preserve-3d", rotateY: flip }
          }
        >
          {/* Back, in the same language as the hole cards two sections up. */}
          <div
            className="absolute inset-0 rounded-xl border border-primary/25 bg-[repeating-linear-gradient(45deg,#111a24_0_8px,#0b1219_8px_16px)] shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          />
          {/* Face: the photograph, with a corner index so it still reads as a
              playing card rather than a tile with a picture on it. */}
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              opacity: still ? 1 : photoDim,
            }}
          >
            <img
              src={topic.img}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              style={{ objectPosition: topic.focus }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f14]/85 via-transparent to-[#0b0f14]/35" />
            <motion.div
              className={`absolute left-1.5 top-1 text-[11px] font-bold leading-none ${topic.tint}`}
              style={still ? undefined : { opacity: indexOut }}
            >
              {topic.rank}
              <span className="block">{topic.pip}</span>
            </motion.div>
          </motion.div>
        </motion.div>

      </div>
      </motion.div>

      {/* The word, arriving at the card's edge as it lands in the list. A
          sibling rather than a child: inside the card it would inherit the
          shrink and the type would scale down with the photograph. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-y-1/2 flex-col justify-center whitespace-nowrap"
        style={
          still
            ? { x: ax + L.wordOffset, y: ay, opacity: 1 }
            : { x: wordX, y: ay, opacity: wordIn }
        }
      >
        <span className="font-bold leading-none text-white" style={{ fontSize: L.wordSize }}>
          {topic.word}
        </span>
        <span className="mt-1 leading-tight text-dim" style={{ fontSize: L.noteSize }}>
          {topic.note}
        </span>
      </motion.div>
    </>
  );
}

export default function BoardReveal() {
  const ref = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();
  const { w, h } = useViewport();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const heading = useRamp(scrollYProgress, [BEAT.morph[0] + 0.12, BEAT.morph[1]], [0, 1]);
  // The table goes once the cards stop being cards.
  const felt = useRamp(scrollYProgress, [BEAT.morph[0], BEAT.morph[1] - 0.06], [1, 0]);

  return (
    <section ref={ref} className="relative h-[520vh] bg-bg">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Enough of a surface to read as a table without being one. */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[38%] h-[52vh] w-[86vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-[45%]"
          style={{
            background:
              "radial-gradient(ellipse at center, #121a23 0%, #0d131b 62%, transparent 100%)",
            opacity: reduced ? 0 : felt,
          }}
        />

        <div className="absolute left-1/2 top-[13%] -translate-x-1/2 text-center text-[11px] uppercase tracking-[0.3em] text-dim">
          {!reduced &&
            STREETS.map((s) => (
              <StreetLabel key={s.label} street={s} progress={scrollYProgress} />
            ))}
        </div>

        {/* The heading the list belongs to, arriving as the cards become it. */}
        <motion.div
          className="absolute left-1/2 top-[16%] w-[86vw] max-w-3xl -translate-x-1/2 text-center"
          style={reduced ? { opacity: 1 } : { opacity: heading }}
        >
          <span className="text-[11px] uppercase tracking-[0.3em] text-dim">who I am</span>
        </motion.div>

        {w > 0 &&
          TOPICS.map((t, i) => (
            <TopicCard
              key={t.id}
              topic={t}
              i={i}
              progress={scrollYProgress}
              reduced={reduced}
              vw={w}
              vh={h}
            />
          ))}
      </div>
    </section>
  );
}
