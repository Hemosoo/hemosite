import { createTable, startHand, applyAction, legalActions, type Table } from "./engine";
import { botAction } from "./bots";
import { tableLines, promptLines, logLines } from "./render";
import type { Line, CommandResult } from "../terminal/commands";

const t = (s: string, c?: string) => ({ t: s, c });
const BOT_DELAY_MS = 550;

export interface SessionHandle {
  intercept: (input: string) => CommandResult | null;
  stop: () => void;
}

/** Owns the table and the bot timer. Output goes out through `print` rather
 *  than being returned, because bots act after the command has finished. */
export function createSession(
  print: (lines: Line[]) => void,
  onExit: () => void,
  seats = 6,
  stack = 10000,
  bigBlind = 100
) {
  let table: Table = createTable(seats, stack, bigBlind);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const showTable = () => print(tableLines(table));

  /** Advance until it's the human's turn, the hand ends, or we stop. */
  const pump = () => {
    if (stopped) return;
    if (table.result) {
      // The result is already in the log delta the caller printed; repeating
      // it here showed every win twice.
      print([[], [t("  ", "text-dim"), t("deal", "text-cyan"), t(" for the next hand, or ", "text-dim"), t("leave", "text-cyan"), t(" to stand up", "text-dim")]]);
      return;
    }
    const p = table.players[table.toAct];
    if (!p) return;
    if (p.isHuman) {
      print([...tableLines(table), [], ...promptLines(table)]);
      return;
    }
    const before = table.log.length;
    table = applyAction(table, botAction(table));
    print(logLines(table.log.slice(before)));
    timer = setTimeout(pump, BOT_DELAY_MS);
  };

  const deal = (): CommandResult => {
    if (table.players.filter((q) => !q.out).length < 2) {
      return {
        lines: [
          [t("  table's broken up — you busted everyone, or they busted you", "text-yellow")],
          [t("  ", "text-dim"), t("leave", "text-cyan"), t(" to stand up", "text-dim")],
        ],
      };
    }
    table = startHand(table);
    timer = setTimeout(pump, 260);
    return {
      lines: [
        [],
        [t(`  hand #${table.handNo}`, "text-dim"), t("   blinds ", "text-dim"), t(`${bigBlind / 2}/${bigBlind}`, "text-subtle")],
        ...logLines(table.log),
      ],
    };
  };

  const act = (input: string): CommandResult | null => {
    const [verb, arg] = input.trim().toLowerCase().split(/\s+/);
    const legal = legalActions(table);
    const mine = table.players[table.toAct]?.isHuman && !table.result;

    if (verb === "leave" || verb === "quit" || verb === "exit") {
      stopped = true;
      clearTimer();
      onExit();
      return { lines: [[t("  you stand up from the table", "text-subtle")]] };
    }
    if (verb === "table" || verb === "show") return { lines: tableLines(table) };
    if (verb === "deal" || verb === "next") {
      if (!table.result && table.street !== "idle") {
        return { lines: [[t("  hand's still live", "text-yellow")]] };
      }
      return deal();
    }

    if (!mine) return { lines: [[t("  not your turn", "text-dim")]] };

    const after = (): CommandResult => {
      timer = setTimeout(pump, 200);
      return { lines: logLines(table.log.slice(logBefore)) };
    };
    const logBefore = table.log.length;

    if (verb === "fold") {
      table = applyAction(table, { type: "fold" });
      return after();
    }
    if (verb === "check") {
      if (!legal.canCheck) return { lines: [[t("  can't check — there's a bet to you", "text-red")]] };
      table = applyAction(table, { type: "check" });
      return after();
    }
    if (verb === "call") {
      if (!legal.canCall) return { lines: [[t("  nothing to call — try check", "text-red")]] };
      table = applyAction(table, { type: "call" });
      return after();
    }
    if (verb === "raise" || verb === "bet" || verb === "allin" || verb === "shove") {
      if (!legal.canRaise) return { lines: [[t("  can't raise", "text-red")]] };
      const to =
        verb === "allin" || verb === "shove"
          ? legal.maxRaiseTo
          : Number(arg);
      if (!Number.isFinite(to)) {
        return {
          lines: [[t(`  raise to what? ${legal.minRaiseTo}–${legal.maxRaiseTo}`, "text-red")]],
        };
      }
      if (to < legal.minRaiseTo && to < legal.maxRaiseTo) {
        return { lines: [[t(`  minimum raise is ${legal.minRaiseTo}`, "text-red")]] };
      }
      table = applyAction(table, { type: "raise", to });
      return after();
    }

    return null;
  };

  const start = (): CommandResult => {
    const intro: Line[] = [
      [],
      [t("  no-limit hold'em", "text-text"), t(`  ·  ${seats}-max  ·  100bb  ·  play chips`, "text-dim")],
      [t("  the other seats are heuristic bots, each with its own style", "text-dim")],
      [],
      [t("  ", "text-dim"), t("fold  check  call  raise <n>  allin", "text-cyan"), t("   ·   ", "text-dim"), t("table  deal  leave", "text-cyan")],
    ];
    const first = deal();
    return { lines: [...intro, ...first.lines] };
  };

  return {
    start,
    intercept: act,
    stop: () => {
      stopped = true;
      clearTimer();
    },
    showTable,
  };
}
