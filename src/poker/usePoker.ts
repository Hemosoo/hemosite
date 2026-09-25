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

const BOT_DELAY_MS = 650;
/** Pause on a finished hand so the showdown is readable before the next deal. */
const HAND_END_MS = 2600;

export function usePoker(seats = 6, stack = 10000, bigBlind = 100) {
  const [table, setTable] = useState<Table>(() => createTable(seats, stack, bigBlind));
  const [autoDeal, setAutoDeal] = useState(true);
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
    }, BOT_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [table, autoDeal]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const legal = legalActions(table);
  const myTurn = !table.result && !!table.players[table.toAct]?.isHuman;

  return {
    table,
    legal,
    myTurn,
    pot: potSize(table),
    autoDeal,
    setAutoDeal,
    deal,
    act,
    reset,
  };
}
