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
 * The name plate under the cards, plus the gap above it: a seat is exactly its
 * card height plus this. The board hangs off that, so the pot stays clear of
 * the player's cards at every window height.
 */
const PLATE_H = "4.375rem";
import type { Player, Table } from "../poker/engine";
import { usePoker } from "../poker/usePoker";
import BoardCard from "./BoardCard";
import { pickReveal, type RevealSpec } from "../poker/reveals";

const fmt = (n: number) => n.toLocaleString("en-US");

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

function Seat({
  player,
  table,
  isTurn,
  reduced,
  badgeSide,
  lit,
}: {
  player: Player;
  table: Table;
  isTurn: boolean;
  reduced: boolean | null;
  /** Keys of the cards carrying the hand. */
  lit: Set<string>;
  /** Which side of the name plate the bet sits on: the one facing the pot. */
  badgeSide: "left" | "right";
}) {
  const show = player.isHuman || (table.revealed && !player.folded && player.hole.length > 0);
  const dimmed = player.folded || player.out;

  // Dealer button, all-in flag and the chips this player has pushed out. The
  // bet was a text-xs pill, which is unreadable at the far seats — it is the
  // one number you have to track, so it is now the loudest thing on the seat
  // and pops when it changes.
  const badges = (
    <>
      {player.id === table.button && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-yellow text-xs font-bold text-[#0b0d10]">
          D
        </span>
      )}
      {player.allIn && !player.folded && (
        <span className="inline-flex items-center rounded-full border border-orange/50 bg-orange/20 px-2.5 py-1 text-sm font-bold text-orange">
          all in
        </span>
      )}
      {player.committed > 0 && !player.allIn && (
        <motion.span
          key={player.committed}
          initial={reduced ? false : { scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 22 }}
          className="inline-flex items-center rounded-full border border-cyan/50 bg-cyan/20 px-2.5 py-1 text-sm font-bold tabular-nums text-cyan"
        >
          {fmt(player.committed)}
        </motion.span>
      )}
    </>
  );

  const plate = (
    <div
      className={`relative min-w-[132px] rounded-xl border px-4 py-2 text-center transition-colors ${
        isTurn ? "border-primary bg-primary/10" : "border-line bg-surface/90"
      }`}
    >
      {isTurn && !reduced && (
        <motion.span
          className="absolute inset-0 rounded-lg ring-1 ring-primary"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className={`text-sm font-semibold ${player.isHuman ? "text-green" : "text-subtle"}`}>
        {player.name}
      </div>
      <div className="text-lg tabular-nums text-text">
        {player.out ? "—" : fmt(player.chips)}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col items-center gap-1 ${dimmed ? "opacity-40" : ""}`}>
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

      {/* Badges sit beside the plate, on the side facing the pot, and out of
          flow. As a row underneath they cost every seat 32px of height: at the
          bottom that pushed your cards up over the pot, and at the top it put
          the bet chip down on the board. Beside the plate they cost nothing
          and land where a real bet would — between the player and the pot. */}
      <div className="relative">
        {plate}
        <div
          className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 ${
            badgeSide === "right" ? "left-full ml-2" : "right-full mr-2"
          }`}
        >
          {badges}
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
        <div className="absolute left-1/2 top-1/2 h-[72%] w-[88%] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-primary/15 bg-[radial-gradient(ellipse_at_center,#131a24_0%,#0d131b_70%)] shadow-[inset_0_0_80px_rgba(97,175,239,0.06)]" />

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
                  {/* A slot with nothing in it still shows where a card goes. */}
                  <div className="absolute inset-0 rounded-xl border border-white/5" />
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
              <span className="absolute inset-0 grid place-items-center text-base text-dim">
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
          <div className="relative flex h-9 items-center justify-center">
            <AnimatePresence mode="wait">
              {table.result ? (
                <motion.div
                  key="result"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute whitespace-nowrap rounded-full border border-green/40 bg-green/10 px-5 py-1.5 text-center text-base text-green"
                >
                  {table.result.map((r) => (
                    <div key={r}>{r}</div>
                  ))}
                </motion.div>
              ) : pot > 0 ? (
                <motion.div
                  key="pot"
                  initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute whitespace-nowrap rounded-full border border-yellow/30 bg-yellow/10 px-5 py-1.5 text-lg font-semibold tabular-nums text-yellow"
                >
                  pot {fmt(pot)}
                </motion.div>
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
              reduced={reduced}
              lit={lit}
              badgeSide={positions[i].x > 50 ? "left" : "right"}
            />
          </div>
          );
        })}

      </motion.div>

      {/* Controls.

          Two fixed bands, not a centred stack. Reserving the footer's height
          kept the felt still but not the buttons: the turn state is ~122px
          and "thinking" is ~56px, so centring each one inside the reserved
          box put them at different heights and the controls slid every time
          the turn changed. Every state now renders into the same action band,
          with the raise band held above it. */}
      <div className="flex-shrink-0 border-t border-line bg-surface/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {/* Raise band. Empty unless there is something to size. */}
          <div className="flex h-11 items-center gap-3">
            {myTurn && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo && (
              <>
                <input
                  type="range"
                  min={legal.minRaiseTo}
                  max={legal.maxRaiseTo}
                  step={table.bigBlind / 2}
                  value={raiseTo}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                  aria-label="Raise amount"
                  className="h-2 flex-1 cursor-pointer accent-primary"
                />
                <span className="w-28 text-right text-xl font-semibold tabular-nums text-primary">
                  {fmt(raiseTo)}
                </span>
                <div className="hidden gap-1 sm:flex">
                  {([["½", 0.5], ["¾", 0.75], ["pot", 1]] as const).map(([label, f]) => (
                    <button
                      key={label}
                      onClick={() => quick(f)}
                      className="rounded border border-line px-3 py-1.5 text-sm text-subtle hover:border-primary/60 hover:text-primary"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action band. Fixed height, so a button never moves. */}
          <div className="flex h-[3.875rem] items-stretch gap-2">
            {busted ? (
              <>
                <span className="flex flex-1 items-center text-sm text-subtle">
                  {you.out ? "you busted." : "you took every chip."}
                </span>
                <button
                  onClick={reset}
                  className="rounded-lg bg-primary px-6 text-base font-bold text-[#0b0d10]"
                >
                  new table
                </button>
              </>
            ) : !started || (table.result && !autoDeal) ? (
              <button
                onClick={deal}
                disabled={locked}
                className="mx-auto rounded-lg bg-primary px-10 text-lg font-bold text-[#0b0d10] transition-transform hover:scale-[1.02]"
              >
                deal {table.handNo > 0 ? "next hand" : ""}
              </button>
            ) : myTurn ? (
              <>
                {legal.canFold && (
                  <button
                    onClick={() => act({ type: "fold" })}
                    className="flex-1 rounded-lg border border-red/40 text-lg font-semibold text-red transition-colors hover:bg-red/10"
                  >
                    fold <span className="text-dim">f</span>
                  </button>
                )}
                {legal.canCheck ? (
                  <button
                    onClick={() => act({ type: "check" })}
                    className="flex-1 rounded-lg border border-line text-lg font-semibold text-text transition-colors hover:border-primary/60"
                  >
                    check <span className="text-dim">c</span>
                  </button>
                ) : (
                  legal.canCall && (
                    <button
                      onClick={() => act({ type: "call" })}
                      className="flex-1 rounded-lg border border-line text-lg font-semibold text-text transition-colors hover:border-primary/60"
                    >
                      call {fmt(legal.callAmount)} <span className="text-dim">c</span>
                    </button>
                  )
                )}
                {legal.canRaise && (
                  <button
                    onClick={() => act({ type: "raise", to: raiseTo })}
                    className="flex-1 rounded-lg bg-primary text-lg font-bold text-[#0b0d10] transition-transform hover:scale-[1.02]"
                  >
                    {table.currentBet === 0 ? "bet" : "raise"} {fmt(raiseTo)}{" "}
                    <span className="opacity-50">r</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-dim">
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
