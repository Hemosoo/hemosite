import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RANK_CHARS, SUIT_CHARS, SUIT_IS_RED, type Card } from "../poker/cards";
import type { Player, Table } from "../poker/engine";
import { usePoker } from "../poker/usePoker";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Seat 0 sits at the bottom; the rest run clockwise around the ellipse. */
function seatPos(i: number, n: number) {
  const angle = Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: 50 + 42 * Math.cos(angle), y: 50 + 39 * Math.sin(angle) };
}

function PlayingCard({
  card,
  hidden,
  size = "md",
}: {
  card?: Card;
  hidden?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-11 w-8 text-[13px]" : "h-16 w-12 text-lg";
  if (hidden || !card) {
    return (
      <div
        className={`${dims} flex items-center justify-center rounded-md border border-primary/25 bg-[repeating-linear-gradient(45deg,#1b2430_0_4px,#131a23_4px_8px)]`}
        aria-hidden
      />
    );
  }
  const red = SUIT_IS_RED[card.s];
  return (
    <div
      className={`${dims} flex flex-col items-center justify-center rounded-md border border-line bg-[#f2f4f8] font-bold leading-none ${
        red ? "text-[#d4383f]" : "text-[#11151b]"
      }`}
      aria-label={`${RANK_CHARS[card.r].trim()}${SUIT_CHARS[card.s]}`}
    >
      <span>{RANK_CHARS[card.r].trim()}</span>
      <span className={size === "sm" ? "text-[11px]" : "text-sm"}>{SUIT_CHARS[card.s]}</span>
    </div>
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
      <div className="flex gap-1">
        {player.hole.length > 0 && !player.out ? (
          player.hole.map((c, i) => (
            <PlayingCard key={i} card={show ? c : undefined} hidden={!show} size="sm" />
          ))
        ) : (
          <div className="h-11" />
        )}
      </div>

      <div
        className={`relative min-w-[92px] rounded-lg border px-2.5 py-1.5 text-center transition-colors ${
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
        <div className={`text-[11px] font-semibold ${player.isHuman ? "text-green" : "text-subtle"}`}>
          {player.name}
        </div>
        <div className="text-xs tabular-nums text-text">
          {player.out ? "—" : fmt(player.chips)}
        </div>
      </div>

      <div className="flex h-5 items-center gap-1">
        {player.id === table.button && (
          <span className="grid h-4 w-4 place-items-center rounded-full bg-yellow text-[9px] font-bold text-[#0b0d10]">
            D
          </span>
        )}
        {player.allIn && !player.folded && (
          <span className="rounded bg-orange/20 px-1.5 text-[10px] font-semibold text-orange">
            all in
          </span>
        )}
        {player.committed > 0 && !player.allIn && (
          <span className="rounded bg-cyan/15 px-1.5 text-[10px] font-semibold tabular-nums text-cyan">
            {fmt(player.committed)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PokerTable({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();
  const { table, legal, myTurn, pot, autoDeal, setAutoDeal, deal, act, reset } = usePoker(6);
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
      if (!myTurn) return;
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
  }, [myTurn, legal, act, raiseTo, onClose]);

  const quick = (frac: number) => {
    const target = Math.round(table.currentBet + pot * frac);
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/97 backdrop-blur-sm">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-line px-4 py-2.5 text-xs sm:px-6">
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

      <div className="relative min-h-0 flex-1">
        {/* Felt */}
        <div className="absolute left-1/2 top-1/2 h-[68%] w-[86%] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-primary/15 bg-[radial-gradient(ellipse_at_center,#16202b_0%,#0f161d_70%)] shadow-[inset_0_0_80px_rgba(97,175,239,0.06)]" />

        {/* Board + pot */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <AnimatePresence initial={false}>
              {table.board.map((c, i) => (
                <motion.div
                  key={`${c.r}-${c.s}`}
                  initial={reduced ? false : { opacity: 0, y: -12, rotateY: 90 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0 }}
                  transition={{ duration: 0.28, delay: reduced ? 0 : i * 0.06 }}
                >
                  <PlayingCard card={c} />
                </motion.div>
              ))}
            </AnimatePresence>
            {!started && (
              <span className="text-sm text-dim">press deal to start</span>
            )}
          </div>
          {pot > 0 && (
            <div className="rounded-full border border-yellow/30 bg-yellow/10 px-3 py-1 text-xs font-semibold tabular-nums text-yellow">
              pot {fmt(pot)}
            </div>
          )}
        </div>

        {/* Seats */}
        {table.players.map((p, i) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
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
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-green/30 bg-green/10 px-4 py-2 text-center text-xs text-green"
            >
              {table.result.map((r) => (
                <div key={r}>{r}</div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 border-t border-line bg-surface/50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {busted ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-subtle">
                {you.out ? "you busted." : "you took every chip."}
              </span>
              <button
                onClick={reset}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-[#0b0d10]"
              >
                new table
              </button>
            </div>
          ) : !started || (table.result && !autoDeal) ? (
            <button
              onClick={deal}
              className="mx-auto rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-[#0b0d10] transition-transform hover:scale-[1.02]"
            >
              deal {table.handNo > 0 ? "next hand" : ""}
            </button>
          ) : myTurn ? (
            <>
              {legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={legal.minRaiseTo}
                    max={legal.maxRaiseTo}
                    step={table.bigBlind / 2}
                    value={raiseTo}
                    onChange={(e) => setRaiseTo(Number(e.target.value))}
                    aria-label="Raise amount"
                    className="h-1 flex-1 cursor-pointer accent-primary"
                  />
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-primary">
                    {fmt(raiseTo)}
                  </span>
                  <div className="hidden gap-1 sm:flex">
                    {([["½", 0.5], ["¾", 0.75], ["pot", 1]] as const).map(([label, f]) => (
                      <button
                        key={label}
                        onClick={() => quick(f)}
                        className="rounded border border-line px-2 py-1 text-[11px] text-subtle hover:border-primary/60 hover:text-primary"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {legal.canFold && (
                  <button
                    onClick={() => act({ type: "fold" })}
                    className="flex-1 rounded-md border border-red/40 py-2.5 text-sm font-semibold text-red transition-colors hover:bg-red/10"
                  >
                    fold <span className="text-dim">f</span>
                  </button>
                )}
                {legal.canCheck ? (
                  <button
                    onClick={() => act({ type: "check" })}
                    className="flex-1 rounded-md border border-line py-2.5 text-sm font-semibold text-text transition-colors hover:border-primary/60"
                  >
                    check <span className="text-dim">c</span>
                  </button>
                ) : (
                  legal.canCall && (
                    <button
                      onClick={() => act({ type: "call" })}
                      className="flex-1 rounded-md border border-line py-2.5 text-sm font-semibold text-text transition-colors hover:border-primary/60"
                    >
                      call {fmt(legal.callAmount)} <span className="text-dim">c</span>
                    </button>
                  )
                )}
                {legal.canRaise && (
                  <button
                    onClick={() => act({ type: "raise", to: raiseTo })}
                    className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-[#0b0d10] transition-transform hover:scale-[1.02]"
                  >
                    {table.currentBet === 0 ? "bet" : "raise"} {fmt(raiseTo)}{" "}
                    <span className="opacity-50">r</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="py-2.5 text-center text-sm text-dim">
              {table.result ? "…" : `${table.players[table.toAct]?.name ?? ""} is thinking`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
