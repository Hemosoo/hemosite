import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import type { Card } from "../poker/cards";
import { toFace } from "../poker/cardFace";
import { cardKey, highlightSet } from "../poker/highlight";
import { INK } from "./poker/cardTheme";
import { cardShadow } from "./poker/cardLayout";
import PokerCard from "./poker/PokerCard";

/** Cards carrying the hand wear the deck's violet, the ace of spades' colour. */
const TINT = INK.violet;

/**
 * Card sizes are heights only — the SVG carries a 2.5:3.5 viewBox, so the
 * width follows on its own and a card can never letterbox.
 *
 * They scale with viewport height. Fixed rem sizes fitted at 900px tall and
 * collided everywhere else: at 720 the player's cards ran 93px over the pot.
 * `you` is deliberately larger than the bots — those are the cards the
 * player actually reads.
 */
type CardSize = "sm" | "you" | "md";
const CARD_SIZE: Record<CardSize, string> = {
  sm: "h-[var(--card-bot)] w-auto",
  you: "h-[var(--card-you)] w-auto",
  md: "h-[var(--card-board)] w-auto",
};
/** Board slots are reserved whether or not a card is in them. */
const BOARD_SLOT = "h-[var(--card-board)] aspect-[5/7]";
/**
 * The player's name block under the cards, plus the gap above it: a seat is
 * exactly its card height plus this. The board hangs off that, so the pot
 * stays clear of the player's cards at every window height. It shrank when
 * the plate became type on the table instead of a bordered box.
 */
const PLATE_H = "2.5rem";
import type { Player, Table } from "../poker/engine";
import { usePoker } from "../poker/usePoker";
import BoardCard from "./BoardCard";
import { pickReveal, type RevealSpec } from "../poker/reveals";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Controls share one look: a 5px radius, a hairline border, uppercase label.
 * Nothing here is a filled call-to-action — the primary action is marked by
 * colour and a low-opacity wash, not by being the brightest object on screen.
 */
const ACTION =
  "inline-flex items-center justify-center gap-2 rounded-[5px] border " +
  "text-[13px] font-semibold tracking-[0.12em] transition-colors";
const ACTION_NEUTRAL = "border-line text-subtle hover:border-white/25 hover:text-text";
const ACTION_PRIMARY = "border-primary/55 bg-primary/[0.08] text-primary hover:bg-primary/[0.16]";

/** A keyboard hint: present, never competing with the label. */
const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-normal text-dim">[{children}]</span>
);

/** Seat 0 sits at the bottom; the rest run clockwise around the ellipse. */
function seatPos(i: number, n: number) {
  const angle = Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: 50 + 42 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
}

/**
 * The table's card slot.
 *
 * Sizing and layout stay here; the artwork is now PokerCard, so the same
 * element scales cleanly whether it is a 64px hole card or a turn card blown
 * up to several times that mid-reveal.
 */
function PlayingCard({
  card,
  hidden,
  size = "md",
  tint,
}: {
  card?: Card;
  hidden?: boolean;
  size?: CardSize;
  tint?: string;
}) {
  const dims = CARD_SIZE[size];
  const face = card ? toFace(card) : undefined;
  // A face-down card gives nothing away, tint included.
  const lit = !hidden && !!card ? tint : undefined;
  return (
    <PokerCard
      className={`${dims} block`}
      style={{ filter: cardShadow(lit) }}
      faceUp={!hidden && !!card}
      rank={face?.rank}
      suit={face?.suit}
      tint={lit}
    />
  );
}

/**
 * A seat: cards, then the player written straight onto the table.
 *
 * No plate, no pill. The hierarchy is typography — a small muted name over a
 * brighter stack — and the active player is marked with a hairline and a
 * colour shift rather than another container. Bets sit out of flow beside the
 * name, on the side facing the pot, as plain figures with a chip dot.
 */
function Seat({
  player,
  table,
  isTurn,
  badgeSide,
  lit,
}: {
  player: Player;
  table: Table;
  isTurn: boolean;
  /** Keys of the cards carrying the hand. */
  lit: Set<string>;
  /** Which side of the name the bet sits on: the one facing the pot. */
  badgeSide: "left" | "right";
}) {
  const show = player.isHuman || (table.revealed && !player.folded && player.hole.length > 0);
  const dimmed = player.folded || player.out;
  const stack = player.out ? "\u2014" : fmt(player.chips);

  const marks = (
    <>
      {player.id === table.button && (
        <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-yellow/60 text-[10px] font-semibold text-yellow">
          D
        </span>
      )}
      {player.allIn && !player.folded && (
        <span className="text-[11px] font-semibold tracking-[0.12em] text-orange">ALL IN</span>
      )}
      {player.committed > 0 && !player.allIn && (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-cyan">
          <span className="h-[3px] w-[3px] rounded-full bg-cyan/80" />
          {fmt(player.committed)}
        </span>
      )}
    </>
  );

  return (
    <div className={`flex flex-col items-center gap-2 ${dimmed ? "opacity-35" : ""}`}>
      <div className="flex gap-2">
        {player.hole.length > 0 && !player.out ? (
          player.hole.map((c, i) => (
            <PlayingCard
              key={i}
              card={show ? c : undefined}
              hidden={!show}
              size={player.isHuman ? "you" : "sm"}
              tint={lit.has(cardKey(c)) ? TINT : undefined}
            />
          ))
        ) : (
          <div className={player.isHuman ? "h-[var(--card-you)]" : "h-[var(--card-bot)]"} />
        )}
      </div>

      <div className="relative">
        {player.isHuman ? (
          // Your seat is marked by a single accent rule and a label, not a box.
          <div className="min-w-[8.5rem] pb-2">
            <div className={`h-px w-full ${isTurn ? "bg-primary" : "bg-primary/45"}`} />
            <div className="flex items-baseline justify-between gap-4 pt-1.5">
              <span className="text-[10px] font-semibold tracking-[0.22em] text-primary">YOU</span>
              <span className="text-[17px] leading-none tabular-nums text-text">{stack}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* The active seat gets a hairline above its name. It occupies the
                same space when inactive, so nothing shifts as the turn moves. */}
            <div className={`h-px w-7 ${isTurn ? "bg-primary" : "bg-transparent"}`} />
            <div
              className={`pt-1.5 text-[12px] leading-none tracking-[0.1em] ${
                isTurn ? "text-primary" : "text-dim"
              }`}
            >
              {player.name}
            </div>
            <div className="pt-1.5 text-[16px] leading-none tabular-nums text-subtle">{stack}</div>
          </div>
        )}

        <div
          className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-2 ${
            badgeSide === "right" ? "left-full ml-3" : "right-full mr-3"
          }`}
        >
          {marks}
        </div>
      </div>
    </div>
  );
}

export default function PokerTable({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();
  const { table, legal, myTurn, pot, runout, autoDeal, setAutoDeal, held, setHeld, deal, act, reset } =
    usePoker(6);
  /** No input reaches the engine while a reveal is playing. */
  const locked = held;

  // ── community card reveals ─────────────────────────────────────────────
  // The engine has already decided the card; this only chooses how it lands.
  const [reveal, setReveal] = useState<{ index: number; spec: RevealSpec } | null>(null);
  const [focus, setFocus] = useState(0);
  const [nudge, setNudge] = useState(0);
  /**
   * Held back until the card lands, so the tint is part of the impact.
   *
   * It has to gate the whole set, not just the arriving card: a river that
   * completes a flush lights the four cards already on the board, and if that
   * happened as the reveal began it would give the card away before it got
   * there. Until impact the table shows the hand as it stood without it.
   */
  const [tintReleased, setTintReleased] = useState(true);
  const boardFx = useAnimationControls();
  const lastBoard = useRef(0);

  useEffect(() => {
    const n = table.board.length;
    const prev = lastBoard.current;
    lastBoard.current = n;
    // 4 = turn, 5 = river. The flop (0 -> 3) and a new hand (5 -> 0) are not
    // special, and a re-render with no change must not retrigger anything.
    if (n === prev || (n !== 4 && n !== 5)) return;

    const spec = pickReveal(n === 4 ? "turn" : "river", !!reduced);
    setReveal({ index: n - 1, spec });
    setFocus(spec.dim);
    setHeld(true);
    setTintReleased(false);

    const impactMs = spec.totalMs * spec.impactAt;
    const timers: number[] = [];
    // Lands on the same frame as the card, the shake and the last locked piece.
    timers.push(window.setTimeout(() => setTintReleased(true), impactMs));
    if (spec.shake.px > 0) {
      timers.push(
        window.setTimeout(() => {
          // Table kick, and the neighbours shoved outward for a beat.
          boardFx.start({
            x: [0, -spec.shake.px, spec.shake.px * 0.7, -spec.shake.px * 0.35, 0],
            y: [0, spec.shake.px * 0.5, -spec.shake.px * 0.28, 0, 0],
            transition: { duration: spec.shake.ms / 1000, ease: "easeOut" },
          });
          setNudge(spec.nudgePx);
          timers.push(window.setTimeout(() => setNudge(0), spec.shake.ms));
        }, impactMs)
      );
    }
    timers.push(
      window.setTimeout(() => {
        setReveal(null);
        setFocus(0);
        setHeld(false);
        setTintReleased(true);
      }, spec.totalMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [table.board.length, reduced, setHeld, boardFx]);
  const [raiseTo, setRaiseTo] = useState(0);

  useEffect(() => {
    if (myTurn) setRaiseTo(legal.minRaiseTo);
  }, [myTurn, legal.minRaiseTo, table.handNo, table.street]);

  const seats = table.players.length;
  const positions = useMemo(
    () => table.players.map((_, i) => seatPos(i, seats)),
    [table.players, seats]
  );

  // Recomputed only when the cards actually change, not every render.
  const litNow = useMemo(
    () => highlightSet(table),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.board, table.players, table.revealed, table.result]
  );
  // The hand as it stood before the card being revealed: what stays lit while
  // it is still in the air. Cards already tinted keep their tint, so nothing
  // flickers off mid-reveal.
  const litBefore = useMemo(
    () => (reveal ? highlightSet({ ...table, board: table.board.slice(0, reveal.index) }) : litNow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reveal, litNow, table.board, table.players, table.revealed, table.result]
  );
  const lit = reveal && !tintReleased ? litBefore : litNow;

  const started = table.street !== "idle";
  const busted = table.players.filter((p) => !p.out).length < 2;
  const you = table.players[0];

  // Keyboard shortcuts, in keeping with the rest of the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (!myTurn || locked) return;
      const k = e.key.toLowerCase();
      if (k === "f" && legal.canFold) act({ type: "fold" });
      else if (k === "c") {
        if (legal.canCheck) act({ type: "check" });
        else if (legal.canCall) act({ type: "call" });
      } else if (k === "r" && legal.canRaise) act({ type: "raise", to: raiseTo });
      else if (k === "a" && legal.canRaise) act({ type: "raise", to: legal.maxRaiseTo });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [myTurn, locked, legal, act, raiseTo, onClose]);

  const quick = (frac: number) => {
    const target = Math.round(table.currentBet + pot * frac);
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target)));
  };

  return (
    <motion.div
      // The page doesn't switch to the table, it opens onto it: the backdrop
      // deepens while the felt rises from slightly behind and below.
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 26 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 14 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col bg-[#11151c]/97 backdrop-blur-sm isolate"
      style={
        {
          // The felt is the viewport less the fixed header and footer. Sizing
          // from that keeps the whole stack -- top seat, board, pot, your seat
          // -- inside it at every window height, which plain vh did not.
          "--felt": "calc(100vh - 12.5rem)",
          "--card-you": "clamp(4.5rem, calc(var(--felt) * 0.215), 10rem)",
          "--card-board": "clamp(4.5rem, calc(var(--felt) * 0.215), 10rem)",
          "--card-bot": "clamp(3rem, calc(var(--felt) * 0.15), 6rem)",
        } as React.CSSProperties
      }
    >
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-line px-4 py-3 text-sm sm:px-6">
        <span className="font-semibold text-text">no-limit hold&apos;em</span>
        <span className="text-dim">6-max · 100bb · play chips</span>
        <span className="flex-1" />
        <label className="flex cursor-pointer items-center gap-1.5 text-dim hover:text-subtle">
          <input
            type="checkbox"
            checked={autoDeal}
            onChange={(e) => setAutoDeal(e.target.checked)}
            className="accent-primary"
          />
          auto-deal
        </label>
        <button onClick={reset} className="text-dim transition-colors hover:text-text">
          reset
        </button>
        <button
          onClick={onClose}
          aria-label="Close table"
          className="text-dim transition-colors hover:text-text"
        >
          [esc]
        </button>
      </header>

      <motion.div
        className="relative min-h-0 flex-1"
        animate={{ filter: focus ? `brightness(${1 - focus * 0.55})` : "brightness(1)" }}
        transition={{ duration: 0.26 }}
      >
        {/* Felt */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[72%] w-[88%] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-white/[0.045]"
          // A few percent of luminance across the whole surface, no more. The
          // blue inset glow it used to carry read as a lit edge on a div.
          style={{
            background:
              "radial-gradient(ellipse at center, #141b24 0%, #111821 55%, #0e141b 100%)",
          }}
        />

        {/* Board + pot */}
        <div
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ bottom: `calc(var(--card-you) + ${PLATE_H} + 0.75rem)` }}
        >
          {/* Five slots, reserved from the start.
              The board used to be a flex row that grew as cards arrived, so
              every new card re-centred the row and shoved the previous ones
              sideways — worst exactly when the turn lands and the eye is on
              the board. Fixed slots mean a card only ever animates within
              its own position. */}
          <motion.div
            className="relative flex gap-2"
            animate={boardFx}
            style={{ filter: focus ? `brightness(${1 / (1 - focus * 0.55)})` : undefined }}
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const c = table.board[i];
              return (
                <div key={i} className={`${BOARD_SLOT} relative shrink-0`}>
                  <AnimatePresence initial={false}>
                    {c && (
                      <BoardCard
                        key={`${c.r}-${c.s}`}
                        card={c}
                        index={i}
                        reduced={reduced}
                        spec={reveal?.index === i ? reveal.spec : undefined}
                        nudge={
                          reveal && reveal.index !== i ? (i < reveal.index ? -nudge : nudge) : 0
                        }
                        dim={reveal && reveal.index !== i ? focus : 0}
                        tint={lit.has(cardKey(c)) ? TINT : undefined}
                        renderCard={(card, hidden) => (
                          <PlayingCard
                            card={card}
                            hidden={hidden}
                            tint={card && lit.has(cardKey(card)) ? TINT : undefined}
                          />
                        )}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {!started && (
              <span className="absolute inset-0 grid place-items-center text-[12px] tracking-[0.14em] text-dim">
                press deal to start
              </span>
            )}
          </motion.div>
          {/* Held even when empty: this row is below the board, and the
              column is centred on its own height, so letting it collapse
              slid every board card up the moment the first bet went in.

              The result lands here too, once the pot has been awarded and this
              row is free. It used to sit at the bottom of the frame, which is
              where the player's own seat is anchored, so the two overlapped.
              Both are positioned out of flow, so a two-line result from a real
              side pot still cannot move the board. */}
          <div className="relative flex h-10 items-center justify-center">
            <AnimatePresence mode="wait">
              {table.result ? (
                <motion.div
                  key="result"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute whitespace-nowrap text-center text-[13px] tracking-[0.06em] text-green"
                >
                  {table.result.map((r) => (
                    <div key={r}>{r}</div>
                  ))}
                </motion.div>
              ) : pot > 0 ? (
                <div className="absolute flex flex-col items-center whitespace-nowrap">
                  <span className="text-[10px] font-semibold tracking-[0.22em] text-dim">POT</span>
                  <span className="pt-1 text-[18px] leading-none tabular-nums text-yellow">
                    {fmt(pot)}
                  </span>
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Seats */}
        {/* The two centre seats are anchored to the frame's edges instead of
            to the ellipse. A percentage centre line makes a seat's footprint
            depend on its card size, so the bottom seat pushed through the
            floor as its cards grew, and the top seat drifted down onto the
            board as the window got shorter. The four side seats have room to
            spare and stay on the ellipse. */}
        {table.players.map((p, i) => {
          const atBottom = i === 0;
          const atTop = Math.abs(positions[i].x - 50) < 1 && positions[i].y < 50;
          return (
          <div
            key={p.id}
            className={`absolute -translate-x-1/2 ${atBottom || atTop ? "" : "-translate-y-1/2"}`}
            style={
              atBottom
                ? { left: "50%", bottom: 0 }
                : atTop
                  ? { left: "50%", top: 0 }
                  : { left: `${positions[i].x}%`, top: `${positions[i].y}%` }
            }
          >
            <Seat
              player={p}
              table={table}
              isTurn={table.toAct === p.id && !table.result}
              lit={lit}
              badgeSide={positions[i].x > 50 ? "left" : "right"}
            />
          </div>
          );
        })}

      </motion.div>

      {/* Controls.

          Two fixed bands, not a centred stack. Reserving the footer's height
          kept the felt still but not the buttons: the turn state and the
          waiting state are different sizes, so centring each one inside the
          reserved box put them at different heights and the controls slid
          every time the turn changed. Every state renders into the same
          action band, with the raise band held above it.

          A hairline, not a panel: the controls sit on the same ground as the
          table rather than in a tray beneath it. */}
      <div className="flex-shrink-0 border-t border-line/70 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {/* Raise band. Empty unless there is something to size. */}
          <div className="flex h-9 items-center gap-4">
            {started && myTurn && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo && (
              <>
                <span className="w-24 text-[18px] leading-none tabular-nums text-primary">
                  {fmt(raiseTo)}
                </span>
                <input
                  type="range"
                  min={legal.minRaiseTo}
                  max={legal.maxRaiseTo}
                  step={table.bigBlind / 2}
                  value={raiseTo}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                  aria-label="Raise amount"
                  className="poker-slider h-2.5 flex-1 cursor-pointer"
                />
                {/* Spelled out rather than ½ and ¾: in a monospaced face those
                    are single narrow glyphs and come out far too small to aim
                    at. Each carries a hairline, which gives the row a visible
                    tap target without turning three text controls into three
                    boxes. */}
                <div className="hidden items-stretch gap-1 sm:flex">
                  {([["1/2", 0.5], ["3/4", 0.75], ["POT", 1]] as const).map(([label, f]) => (
                    <button
                      key={label}
                      onClick={() => quick(f)}
                      className="min-w-[3.25rem] border-b border-line px-2 pb-1.5 pt-1 text-[14px] font-semibold tracking-[0.08em] text-subtle transition-colors hover:border-primary hover:text-primary"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action band. Fixed height, so a button never moves. */}
          <div className="flex h-11 items-stretch gap-2">
            {busted ? (
              <>
                <span className="flex flex-1 items-center text-[13px] text-dim">
                  {you.out ? "you busted." : "you took every chip."}
                </span>
                <button onClick={reset} className={`${ACTION} ${ACTION_PRIMARY} px-6`}>
                  NEW TABLE
                </button>
              </>
            ) : !started || (table.result && !autoDeal) ? (
              <button
                onClick={deal}
                disabled={locked}
                className={`${ACTION} ${ACTION_PRIMARY} mx-auto px-10`}
              >
                DEAL {table.handNo > 0 ? "NEXT HAND" : ""}
              </button>
            ) : myTurn ? (
              <>
                {legal.canFold && (
                  <button
                    onClick={() => act({ type: "fold" })}
                    className={`${ACTION} flex-1 border-red/35 text-red hover:border-red/60 hover:bg-red/[0.07]`}
                  >
                    FOLD <Key>F</Key>
                  </button>
                )}
                {legal.canCheck ? (
                  <button
                    onClick={() => act({ type: "check" })}
                    className={`${ACTION} ${ACTION_NEUTRAL} flex-1`}
                  >
                    CHECK <Key>C</Key>
                  </button>
                ) : (
                  legal.canCall && (
                    <button
                      onClick={() => act({ type: "call" })}
                      className={`${ACTION} ${ACTION_NEUTRAL} flex-1`}
                    >
                      CALL <span className="tabular-nums">{fmt(legal.callAmount)}</span> <Key>C</Key>
                    </button>
                  )
                )}
                {legal.canRaise && (
                  <button
                    onClick={() => act({ type: "raise", to: raiseTo })}
                    className={`${ACTION} ${ACTION_PRIMARY} flex-1`}
                  >
                    {table.currentBet === 0 ? "BET" : "RAISE"}{" "}
                    <span className="tabular-nums">{fmt(raiseTo)}</span> <Key>R</Key>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-[12px] tracking-[0.12em] text-dim">
                {runout
                  ? "all in — running it out"
                  : table.result
                    ? "…"
                    : `${table.players[table.toAct]?.name ?? ""} is thinking`}
              </div>
            )}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
