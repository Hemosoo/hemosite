import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { RANK_CHARS, type Card } from "../poker/cards";
import PokerCard from "./poker/PokerCard";
import type { Rank, Suit } from "./poker/cardTheme";

/** Engine suit indices are 0=spades 1=hearts 2=diamonds 3=clubs. */
const SUIT_NAME: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

/**
 * Card sizes, all at exactly 2.5:3.5 so the SVG never letterboxes in its box.
 * `you` is deliberately larger than the bots — they are the cards the player
 * actually reads, and the bottom seat has the room for them.
 */
type CardSize = "sm" | "you" | "md";
const CARD_SIZE: Record<CardSize, string> = {
  sm: "h-[5.5rem] w-[3.93rem]",
  you: "h-[11.5rem] w-[8.21rem]",
  md: "h-40 w-[7.15rem]",
};
/** Board slots are reserved at this width whether or not a card is in them. */
const BOARD_SLOT = "h-40 w-[7.15rem]";
import type { Player, Table } from "../poker/engine";
import { usePoker } from "../poker/usePoker";
import BoardCard from "./BoardCard";
import { pickReveal, type RevealSpec } from "../poker/reveals";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Seat 0 sits at the bottom; the rest run clockwise around the ellipse. */
function seatPos(i: number, n: number) {
  const angle = Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: 50 + 42 * Math.cos(angle), y: 50 + 34 * Math.sin(angle) };
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
}: {
  card?: Card;
  hidden?: boolean;
  size?: CardSize;
}) {
  const dims = CARD_SIZE[size];
  return (
    <PokerCard
      className={`${dims} block drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]`}
      faceUp={!hidden && !!card}
      rank={card ? (RANK_CHARS[card.r].trim() as Rank) : undefined}
      suit={card ? SUIT_NAME[card.s] : undefined}
    />
  );
}

function Seat({
  player,
  table,
  isTurn,
  reduced,
}: {
  player: Player;
  table: Table;
  isTurn: boolean;
  reduced: boolean | null;
}) {
  const show = player.isHuman || (table.revealed && !player.folded && player.hole.length > 0);
  const dimmed = player.folded || player.out;

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
            />
          ))
        ) : (
          <div className={player.isHuman ? "h-[11.5rem]" : "h-[5.5rem]"} />
        )}
      </div>

      <div
        className={`relative min-w-[132px] rounded-xl border px-4 py-2.5 text-center transition-colors ${
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

      <div className="flex h-7 items-center gap-1.5">
        {player.id === table.button && (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-yellow text-xs font-bold text-[#0b0d10]">
            D
          </span>
        )}
        {player.allIn && !player.folded && (
          <span className="rounded bg-orange/20 px-2 py-0.5 text-xs font-semibold text-orange">
            all in
          </span>
        )}
        {player.committed > 0 && !player.allIn && (
          <span className="rounded bg-cyan/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-cyan">
            {fmt(player.committed)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PokerTable({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();
  const { table, legal, myTurn, pot, autoDeal, setAutoDeal, held, setHeld, deal, act, reset } =
    usePoker(6);
  /** No input reaches the engine while a reveal is playing. */
  const locked = held;

  // ── community card reveals ─────────────────────────────────────────────
  // The engine has already decided the card; this only chooses how it lands.
  const [reveal, setReveal] = useState<{ index: number; spec: RevealSpec } | null>(null);
  const [focus, setFocus] = useState(0);
  const [nudge, setNudge] = useState(0);
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

    const impactMs = spec.totalMs * spec.impactAt;
    const timers: number[] = [];
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
        <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
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
                        renderCard={(card, hidden) => (
                          <PlayingCard card={card} hidden={hidden} />
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
              slid every board card up the moment the first bet went in. */}
          <div className="flex h-[2.4rem] items-center">
            {pot > 0 && (
              <div className="rounded-full border border-yellow/30 bg-yellow/10 px-5 py-1.5 text-lg font-semibold tabular-nums text-yellow">
                pot {fmt(pot)}
              </div>
            )}
          </div>
        </div>

        {/* Seats */}
        {/* Seat 0 is anchored to the bottom edge rather than to the ellipse.
            Its cards are much larger than the bots', so a percentage centre
            line made the whole stack's height depend on the card size — grow
            the cards and the seat pushed through the bottom of the frame. */}
        {table.players.map((p, i) => (
          <div
            key={p.id}
            className={`absolute -translate-x-1/2 ${i === 0 ? "" : "-translate-y-1/2"}`}
            style={
              i === 0
                ? { left: "50%", bottom: 0 }
                : { left: `${positions[i].x}%`, top: `${positions[i].y}%` }
            }
          >
            <Seat player={p} table={table} isTurn={table.toAct === p.id && !table.result} reduced={reduced} />
          </div>
        ))}

        {/* Result banner */}
        <AnimatePresence>
          {table.result && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-green/30 bg-green/10 px-5 py-2.5 text-center text-sm text-green"
            >
              {table.result.map((r) => (
                <div key={r}>{r}</div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
                {table.result ? "…" : `${table.players[table.toAct]?.name ?? ""} is thinking`}
              </div>
            )}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
