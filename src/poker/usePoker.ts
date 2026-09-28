import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTable,
  startHand,
  applyAction,
  legalActions,
  potSize,
  type Action,
  type Table,
} from "./engine";
import { botAction } from "./bots";

/**
 * Bot pacing.
 *
 * 650ms flat read as the table playing itself: by the time you noticed a bet
 * chip the next player had already covered it. A bot now takes a real beat to
 * act, and holds afterwards whenever chips actually moved, so the number has
 * time to land before the action passes on.
 */
const BOT_THINK_MS = 1050;
const BOT_CHIPS_MS = 750;
/** A little scatter, so six bots don't act on a metronome. */
const BOT_JITTER_MS = 320;

function botDelay(t: Table) {
  const last = t.log[t.log.length - 1] ?? "";
  const chipsMoved = /\b(bets|calls|raises to|posts)\b/.test(last);
  return (
    BOT_THINK_MS + (chipsMoved ? BOT_CHIPS_MS : 0) + Math.random() * BOT_JITTER_MS
  );
}
/** Pause on a finished hand so the showdown is readable before the next deal. */
const HAND_END_MS = 2600;

/**
 * Run-out pacing.
 *
 * When everyone is all in the engine settles the whole hand in one step: it
 * deals every remaining street at once and goes straight to showdown. That is
 * correct as poker and wrong as television — the board appeared complete and
 * the turn's reveal played over cards that were already lying there. The board
 * is therefore walked out here, one street at a time, and the reveals hang off
 * that instead of off the engine.
 */
const RUNOUT_FLOP_MS = 420;
const RUNOUT_STREET_MS = 850;
/**
 * How long the last card sits before its result is announced. It only has to
 * outlast the gap between a card being shown and its reveal starting, which is
 * one render; a quarter second also simply reads better.
 */
const RESULT_SETTLE_MS = 260;

export function usePoker(seats = 6, stack = 10000, bigBlind = 100) {
  const [table, setTable] = useState<Table>(() => createTable(seats, stack, bigBlind));
  /** How much of the board has actually been shown. */
  const [shown, setShown] = useState(0);
  const [autoDeal, setAutoDeal] = useState(true);
  /** Set while a reveal plays: freezes bots and dealing so the animation
   *  cannot race the engine into a duplicate street. */
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deal = useCallback(() => {
    setTable((t) => (t.players.filter((p) => !p.out).length < 2 ? t : startHand(t)));
  }, []);

  const act = useCallback((action: Action) => {
    setTable((t) => {
      const p = t.players[t.toAct];
      if (!p?.isHuman || t.result) return t;
      return applyAction(t, action);
    });
  }, []);

  const reset = useCallback(() => {
    setTable(createTable(seats, stack, bigBlind));
    setShown(0);
  }, [seats, stack, bigBlind]);

  // Walk the board out. Nothing moves while a reveal is on screen, so the turn
  // gets its full animation before the river is dealt on top of it.
  const pending = shown < table.board.length;
  useEffect(() => {
    if (shown > table.board.length) {
      setShown(table.board.length); // a new hand
      return;
    }
    if (!pending || held) return;
    // A decided hand with cards still to come is a run-out, and it gets beats.
    // Ordinary play has its own pauses already, so it just catches up.
    const runout = table.result !== null;
    const gap = shown === 0 ? (runout ? RUNOUT_FLOP_MS : 0) : runout ? RUNOUT_STREET_MS : 0;
    const id = window.setTimeout(
      () => setShown((k) => Math.min(k === 0 ? 3 : k + 1, table.board.length)),
      gap
    );
    return () => window.clearTimeout(id);
  }, [table.board.length, table.result, shown, pending, held]);

  /**
   * The result waits for the last card to be down, out of the air, and still.
   *
   * This used to key off `held`, which PokerTable sets from an effect once a
   * reveal starts — a render too late. On the frame the final card was shown
   * the board was complete and no reveal had begun yet, so the winner was
   * announced at the same millisecond the river landed, every time. A short
   * settle cannot race: any reveal raises `held` well inside it and holds the
   * result until the card has finished arriving.
   */
  const [resultReady, setResultReady] = useState(false);
  useEffect(() => {
    if (pending || !table.result) {
      setResultReady(false);
      return;
    }
    if (held) return; // a reveal is on screen; the card is still arriving
    const id = window.setTimeout(() => setResultReady(true), RESULT_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [pending, table.result, held]);

  // The pot is awarded the moment an all-in resolves, so the real figure is
  // already zero while the board is still coming. Hold the last one.
  const lastPot = useRef(0);
  useEffect(() => {
    const n = potSize(table);
    if (n > 0) lastPot.current = n;
  }, [table]);

  // One driver for both bot turns and the gap between hands, so there's never
  // more than one timer in flight.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    if (held) return;
    if (pending) return; // still walking the board out
    if (table.street === "idle") return;

    if (table.result) {
      if (!autoDeal) return;
      if (table.players.filter((p) => !p.out).length < 2) return;
      timer.current = setTimeout(() => setTable((t) => startHand(t)), HAND_END_MS);
      return;
    }

    const p = table.players[table.toAct];
    if (!p || p.isHuman) return;

    timer.current = setTimeout(() => {
      setTable((t) => {
        const cur = t.players[t.toAct];
        if (!cur || cur.isHuman || t.result) return t;
        return applyAction(t, botAction(t));
      });
    }, botDelay(table));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [table, autoDeal, held, pending]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const legal = legalActions(table);
  const myTurn = !held && !table.result && !!table.players[table.toAct]?.isHuman;

  /**
   * What the table looks like on screen: the board only as far as it has been
   * shown, and no result until the last card is down and settled. Hole cards
   * stay face up through a run-out, the way they are when everyone is all in.
   */
  const holdingBoard = pending;
  const holdingResult = table.result !== null && !resultReady;
  const view: Table =
    holdingBoard || holdingResult
      ? { ...table, board: table.board.slice(0, shown), result: holdingResult ? null : table.result }
      : table;

  return {
    table: view,
    legal,
    myTurn,
    // "Running it out" is only true of a decided hand with cards still to
    // come. Keyed on `pending` alone it also fired for the frame an ordinary
    // flop took to catch up, which flashed the wrong status on every hand.
    runout: pending && table.result !== null,
    /** The last card is down; its result is a beat away. */
    settling: holdingResult && !pending,
    pot: holdingBoard || holdingResult ? lastPot.current : potSize(table),
    autoDeal,
    setAutoDeal,
    held,
    setHeld,
    deal,
    act,
    reset,
  };
}
