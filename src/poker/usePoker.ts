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

export function usePoker(seats = 6, stack = 10000, bigBlind = 100) {
  const [table, setTable] = useState<Table>(() => createTable(seats, stack, bigBlind));
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
  }, [seats, stack, bigBlind]);

  // One driver for both bot turns and the gap between hands, so there's never
  // more than one timer in flight.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    if (held) return;
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
  }, [table, autoDeal, held]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const legal = legalActions(table);
  const myTurn = !held && !table.result && !!table.players[table.toAct]?.isHuman;

  return {
    table,
    legal,
    myTurn,
    pot: potSize(table),
    autoDeal,
    setAutoDeal,
    held,
    setHeld,
    deal,
    act,
    reset,
  };
}
