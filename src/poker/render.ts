import { cardText, SUIT_IS_RED, type Card } from "./cards";
import { legalActions, potSize, type Table } from "./engine";
import type { Line, Span } from "../terminal/commands";

const t = (s: string, c?: string): Span => ({ t: s, c });

export const card = (c: Card): Span => ({
  t: cardText(c),
  c: SUIT_IS_RED[c.s] ? "text-red" : "text-text",
});

const cards = (cs: Card[], sep = " "): Span[] =>
  cs.flatMap((c, i) => (i ? [t(sep), card(c)] : [card(c)]));

const money = (n: number, bb: number) => `${n}` + (bb ? ` (${(n / bb).toFixed(1)}bb)` : "");

/** The seat rows, board and pot. */
export function tableLines(table: Table, revealAll = false): Line[] {
  const lines: Line[] = [];
  const pot = potSize(table);

  lines.push([
    t("  board  ", "text-dim"),
    ...(table.board.length ? cards(table.board) : [t("—", "text-dim")]),
    t("     pot ", "text-dim"),
    t(String(pot), "text-yellow"),
  ]);
  lines.push([]);

  for (const p of table.players) {
    if (p.out && p.chips === 0) continue;
    const marks: Span[] = [];
    if (p.id === table.button) marks.push(t(" D", "text-yellow"));
    if (p.id === table.toAct && !table.result) marks.push(t(" ←", "text-primary"));

    const hole: Span[] =
      p.folded && !p.out
        ? [t("--  --", "text-dim")]
        : p.isHuman || revealAll
          ? cards(p.hole, " ")
          : p.hole.length
            ? [t("██ ██", "text-dim")]
            : [t("     ", "text-dim")];

    const state = p.folded
      ? t("folded", "text-dim")
      : p.allIn
        ? t("all in", "text-orange")
        : p.committed > 0
          ? t(String(p.committed), "text-cyan")
          : t("", "text-dim");

    lines.push([
      t("  " + p.name.padEnd(8), p.isHuman ? "text-green" : "text-subtle"),
      t(String(p.chips).padStart(7) + "  ", p.chips === 0 ? "text-dim" : "text-text"),
      ...hole,
      t("  " + (state.t ? state.t : "").padEnd(7), state.c),
      ...marks,
    ]);
  }
  return lines;
}

/** What the human may do right now. */
export function promptLines(table: Table): Line[] {
  const legal = legalActions(table);
  const opts: string[] = [];
  if (legal.canCheck) opts.push("check");
  if (legal.canCall) opts.push(`call ${legal.callAmount}`);
  if (legal.canRaise)
    opts.push(
      legal.minRaiseTo === legal.maxRaiseTo
        ? `allin ${legal.maxRaiseTo}`
        : `raise <${legal.minRaiseTo}-${legal.maxRaiseTo}>`
    );
  if (legal.canFold) opts.push("fold");
  return [[t("  your move: ", "text-dim"), t(opts.join("  ·  "), "text-cyan")]];
}

export function logLines(entries: string[]): Line[] {
  return entries.map((e) =>
    e.startsWith("—")
      ? [t("  " + e, "text-dim")]
      : [t("  " + e, e.includes("win") ? "text-green" : "text-subtle")]
  );
}

export const potLine = (table: Table): Line => [
  t("  pot ", "text-dim"),
  t(String(potSize(table)), "text-yellow"),
  t("  " + money(0, 0), "text-dim"),
];
