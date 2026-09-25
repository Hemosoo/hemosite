import type { Card } from "./cards";

export const CATEGORY_NAMES = [
  "high card",
  "a pair",
  "two pair",
  "three of a kind",
  "a straight",
  "a flush",
  "a full house",
  "four of a kind",
  "a straight flush",
];

/** [category, ...tiebreakers], compared left to right. Higher wins. */
export type Score = number[];

export function compareScores(a: Score, b: Score): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Highest card of a straight in these ranks, or 0. Handles the wheel. */
function straightHigh(ranks: number[]): number {
  const set = new Set(ranks);
  // Ace plays low in A-2-3-4-5 only.
  if (set.has(14)) set.add(1);
  const sorted = [...set].sort((x, y) => y - x);
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] - 1) {
      run++;
      if (run >= 5) return sorted[i] + 4;
    } else {
      run = 1;
    }
  }
  return 0;
}

/** Score exactly five cards. */
export function score5(cards: Card[]): Score {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const flush = cards.every((c) => c.s === cards[0].s);
  const sHigh = straightHigh(ranks);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Group by count first, then by rank — that ordering is the tiebreak.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = groups.map((g) => g[1]).join("");
  const byGroup = groups.map((g) => g[0]);

  if (flush && sHigh) return [8, sHigh];
  if (shape.startsWith("4")) return [7, byGroup[0], byGroup[1]];
  if (shape === "32") return [6, byGroup[0], byGroup[1]];
  if (flush) return [5, ...ranks];
  if (sHigh) return [4, sHigh];
  if (shape.startsWith("3")) return [3, byGroup[0], byGroup[1], byGroup[2]];
  if (shape.startsWith("22")) return [2, byGroup[0], byGroup[1], byGroup[2]];
  if (shape.startsWith("2")) return [1, byGroup[0], byGroup[1], byGroup[2], byGroup[3]];
  return [0, ...ranks];
}

const COMBOS_7_5: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++)
      for (let c = b + 1; c < 7; c++)
        for (let d = c + 1; d < 7; d++)
          for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e]);
  return out;
})();

/** Best five-card score from any 5-7 cards. */
export function scoreBest(cards: Card[]): Score {
  if (cards.length < 5) return [-1];
  if (cards.length === 5) return score5(cards);
  let best: Score | null = null;
  const combos =
    cards.length === 7
      ? COMBOS_7_5
      : (() => {
          const out: number[][] = [];
          const n = cards.length;
          for (let a = 0; a < n; a++)
            for (let b = a + 1; b < n; b++)
              for (let c = b + 1; c < n; c++)
                for (let d = c + 1; d < n; d++)
                  for (let e = d + 1; e < n; e++) out.push([a, b, c, d, e]);
          return out;
        })();
  for (const combo of combos) {
    const s = score5(combo.map((i) => cards[i]));
    if (!best || compareScores(s, best) > 0) best = s;
  }
  return best!;
}

export const describeScore = (s: Score) => CATEGORY_NAMES[s[0]] ?? "nothing";
