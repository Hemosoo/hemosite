import { makeDeck, shuffle, type Card } from "./cards";
import { scoreBest, compareScores, describeScore, type Score } from "./evaluate";

export type Street = "idle" | "preflop" | "flop" | "turn" | "river" | "showdown";

export interface Player {
  id: number;
  name: string;
  chips: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  /** Chips put in on the current street. */
  committed: number;
  /** Chips put in across the whole hand — the basis for side pots. */
  totalCommitted: number;
  /** Has acted since the last aggressive action. */
  hasActed: boolean;
  isHuman: boolean;
  /** Busted out of the game. */
  out: boolean;
}

export interface Pot {
  amount: number;
  eligible: number[];
}

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  /** `to` is the total this player will have committed on this street. */
  | { type: "raise"; to: number };

export interface Table {
  players: Player[];
  button: number;
  street: Street;
  board: Card[];
  deck: Card[];
  /** Highest total committed by anyone on this street. */
  currentBet: number;
  /** Smallest legal raise increment right now. */
  minRaise: number;
  bigBlind: number;
  toAct: number;
  handNo: number;
  log: string[];
  /** Set once the hand is over. */
  result: string[] | null;
  /** True when the hand ended at showdown, so hole cards may be shown. */
  revealed: boolean;
}

export const SEAT_NAMES = [
  "you",
  "brick",
  "nit",
  "maniac",
  "rock",
  "fish",
  "shark",
  "donk",
];

export function createTable(seats = 6, stack = 10000, bigBlind = 100): Table {
  return {
    players: Array.from({ length: seats }, (_, i) => ({
      id: i,
      name: SEAT_NAMES[i] ?? `seat${i}`,
      chips: stack,
      hole: [],
      folded: false,
      allIn: false,
      committed: 0,
      totalCommitted: 0,
      hasActed: false,
      isHuman: i === 0,
      out: false,
    })),
    button: 0,
    street: "idle",
    board: [],
    deck: [],
    currentBet: 0,
    minRaise: bigBlind,
    bigBlind,
    toAct: 0,
    handNo: 0,
    log: [],
    result: null,
    revealed: false,
  };
}

const clone = (t: Table): Table => ({
  ...t,
  players: t.players.map((p) => ({ ...p, hole: [...p.hole] })),
  board: [...t.board],
  deck: [...t.deck],
  log: [...t.log],
  result: t.result ? [...t.result] : null,
});

/** Seats still in the game (have chips or are all-in this hand). */
const liveSeats = (t: Table) => t.players.filter((p) => !p.out);
/** Able to make a decision. */
const canAct = (p: Player) => !p.out && !p.folded && !p.allIn && p.chips > 0;

/** The human seat is named "you", so third-person verbs read wrong:
 *  "you calls 100". Drop the -s for that seat only. */
const conj = (p: Player, phrase: string) =>
  p.isHuman ? phrase.replace(/^(\w+?)s(\b|$)/, "$1$2") : phrase;

function nextSeat(t: Table, from: number, pred: (p: Player) => boolean): number {
  const n = t.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (pred(t.players[idx])) return idx;
  }
  return -1;
}

// ── starting a hand ───────────────────────────────────────────────────────────

export function startHand(t: Table, rng: () => number = Math.random): Table {
  const s = clone(t);
  s.handNo += 1;
  s.result = null;
  s.revealed = false;
  s.log = [];
  s.board = [];
  s.deck = shuffle(makeDeck(), rng);
  s.currentBet = 0;
  s.minRaise = s.bigBlind;

  for (const p of s.players) {
    p.hole = [];
    p.folded = p.out;
    p.allIn = false;
    p.committed = 0;
    p.totalCommitted = 0;
    p.hasActed = false;
  }

  const live = liveSeats(s);
  if (live.length < 2) {
    s.street = "idle";
    s.result = ["not enough players"];
    return s;
  }

  // Move the button to the next live seat.
  s.button = nextSeat(s, s.button, (p) => !p.out);

  const heads = live.length === 2;
  const sb = heads ? s.button : nextSeat(s, s.button, (p) => !p.out);
  const bb = nextSeat(s, sb, (p) => !p.out);

  post(s, sb, Math.floor(s.bigBlind / 2), "small blind");
  post(s, bb, s.bigBlind, "big blind");
  // A blind posted short (stack smaller than the blind) must not leave a bet
  // standing that nobody actually put up.
  s.currentBet = Math.max(...s.players.map((p) => p.committed));

  for (const p of s.players) {
    if (!p.out) p.hole = [s.deck.pop()!, s.deck.pop()!];
  }

  s.street = "preflop";
  // Preflop the blinds have money in but haven't acted voluntarily. Heads up
  // the small blind acts first; otherwise action starts left of the big blind.
  let seat = heads
    ? canAct(s.players[sb])
      ? sb
      : nextSeat(s, sb, canAct)
    : nextSeat(s, bb, canAct);
  if (seat === -1) seat = bb;
  s.toAct = seat;
  // A short all-in blind can leave nobody with a decision to make, in which
  // case the hand has to run out immediately rather than wait forever.
  return roundComplete(s) ? settle(s) : s;
}

/** A bet nobody could or would match isn't won — it comes back. Without this
 *  a shove that everyone folds to reports "you win <your own stack>". */
function returnUncalled(t: Table) {
  const live = t.players.filter((p) => !p.out || p.totalCommitted > 0);
  if (live.length < 2) return;
  const sorted = [...live].sort((a, b) => b.totalCommitted - a.totalCommitted);
  const excess = sorted[0].totalCommitted - sorted[1].totalCommitted;
  if (excess <= 0) return;
  sorted[0].chips += excess;
  sorted[0].totalCommitted -= excess;
  t.log.push(`${excess} returned to ${sorted[0].name}`);
}

function post(t: Table, idx: number, amount: number, label: string) {
  const p = t.players[idx];
  const paid = Math.min(amount, p.chips);
  p.chips -= paid;
  p.committed += paid;
  p.totalCommitted += paid;
  if (p.chips === 0) p.allIn = true;
  t.log.push(`${p.name} ${conj(p, "posts")} ${label} ${paid}`);
}

// ── legality ──────────────────────────────────────────────────────────────────

export interface Legal {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  /** Total-to amounts, not increments. */
  minRaiseTo: number;
  maxRaiseTo: number;
}

export function legalActions(t: Table): Legal {
  const p = t.players[t.toAct];
  if (!p || !canAct(p)) {
    return {
      canFold: false, canCheck: false, canCall: false, callAmount: 0,
      canRaise: false, minRaiseTo: 0, maxRaiseTo: 0,
    };
  }
  const toCall = Math.max(0, t.currentBet - p.committed);
  const maxTo = p.committed + p.chips;
  // A raise must reach currentBet + minRaise, unless the player is shoving
  // for less, which is always allowed.
  const minTo = Math.min(maxTo, t.currentBet + t.minRaise);
  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount: Math.min(toCall, p.chips),
    canRaise: maxTo > t.currentBet,
    minRaiseTo: minTo,
    maxRaiseTo: maxTo,
  };
}

// ── applying an action ────────────────────────────────────────────────────────

export function applyAction(t: Table, action: Action): Table {
  const s = clone(t);
  const p = s.players[s.toAct];
  if (!p || !canAct(p)) return s;
  const legal = legalActions(s);

  if (action.type === "fold") {
    p.folded = true;
    p.hasActed = true;
    s.log.push(`${p.name} ${conj(p, "folds")}`);
  } else if (action.type === "check") {
    if (!legal.canCheck) return s;
    p.hasActed = true;
    s.log.push(`${p.name} ${conj(p, "checks")}`);
  } else if (action.type === "call") {
    const pay = Math.min(Math.max(0, s.currentBet - p.committed), p.chips);
    p.chips -= pay;
    p.committed += pay;
    p.totalCommitted += pay;
    if (p.chips === 0) p.allIn = true;
    p.hasActed = true;
    s.log.push(pay === 0 ? `${p.name} ${conj(p, "checks")}` : `${p.name} ${conj(p, "calls")} ${pay}`);
  } else {
    if (!legal.canRaise) return s;
    const to = Math.max(legal.minRaiseTo, Math.min(action.to, legal.maxRaiseTo));
    const pay = to - p.committed;
    if (pay <= 0) return s;
    const increment = to - s.currentBet;
    const opening = s.currentBet === 0;
    p.chips -= pay;
    p.committed = to;
    p.totalCommitted += pay;
    if (p.chips === 0) p.allIn = true;
    // A short all-in doesn't reopen betting, so minRaise only grows on a
    // full-sized raise.
    if (increment >= s.minRaise) {
      s.minRaise = increment;
      for (const other of s.players) if (other.id !== p.id) other.hasActed = false;
    }
    s.currentBet = Math.max(s.currentBet, to);
    p.hasActed = true;
    s.log.push(`${p.name} ${conj(p, opening ? "bets" : "raises to")} ${to}${p.allIn ? " (all in)" : ""}`);
  }

  return advance(s);
}

/** True once nobody left can or needs to act on this street. */
function roundComplete(t: Table): boolean {
  const contenders = t.players.filter((p) => !p.out && !p.folded);
  if (contenders.length <= 1) return true;
  const actors = contenders.filter(canAct);
  if (actors.length === 0) return true;
  // One live player against nothing but all-ins: no betting left to do.
  if (actors.length === 1 && actors[0].committed >= t.currentBet) {
    const others = contenders.filter((p) => p.id !== actors[0].id);
    if (others.every((p) => p.allIn)) return true;
  }
  return actors.every((p) => p.hasActed && p.committed === t.currentBet);
}

function advance(t: Table): Table {
  if (!roundComplete(t)) {
    const next = nextSeat(t, t.toAct, canAct);
    if (next !== -1) t.toAct = next;
    return t;
  }
  return settle(t);
}

/** The street (or the hand) is over: move money and deal on. */
function settle(t: Table): Table {
  const s = t;

  // Everyone folded to one player.
  const contenders = s.players.filter((p) => !p.out && !p.folded);
  if (contenders.length === 1) {
    collect(s);
    returnUncalled(s);
    return award(s, [{ amount: potTotal(s), eligible: [contenders[0].id] }], false);
  }

  collect(s);

  const noMoreBetting = contenders.filter(canAct).length <= 1;
  let street = s.street;
  while (street !== "river" && street !== "showdown") {
    street = street === "preflop" ? "flop" : street === "flop" ? "turn" : "river";
    dealStreet(s, street);
    if (!noMoreBetting) break;
  }

  if (street === "river" && (noMoreBetting || s.street === "river")) {
    if (noMoreBetting) return showdown(s);
  }

  if (s.street === "river") return showdown(s);

  s.street = street;
  for (const p of s.players) {
    p.committed = 0;
    p.hasActed = false;
  }
  s.currentBet = 0;
  s.minRaise = s.bigBlind;
  const first = nextSeat(s, s.button, canAct);
  s.toAct = first === -1 ? s.button : first;
  return s;
}

function dealStreet(t: Table, street: Street) {
  if (street === "flop") t.board.push(t.deck.pop()!, t.deck.pop()!, t.deck.pop()!);
  else t.board.push(t.deck.pop()!);
  t.log.push(`— ${street} —`);
}

/** Money committed this street is already in totalCommitted; this just resets
 *  the per-street counters once the street closes. */
function collect(t: Table) {
  for (const p of t.players) p.committed = 0;
  t.currentBet = 0;
}

const potTotal = (t: Table) => t.players.reduce((n, p) => n + p.totalCommitted, 0);

/** Split the money into a main pot plus one side pot per all-in level. */
export function buildPots(players: Player[]): Pot[] {
  const levels = [...new Set(players.filter((p) => p.totalCommitted > 0).map((p) => p.totalCommitted))].sort(
    (a, b) => a - b
  );
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const p of players) amount += Math.min(Math.max(p.totalCommitted - prev, 0), level - prev);
    const eligible = players.filter((p) => !p.folded && p.totalCommitted >= level).map((p) => p.id);
    if (amount > 0 && eligible.length) pots.push({ amount, eligible });
    else if (amount > 0 && pots.length) pots[pots.length - 1].amount += amount;
    prev = level;
  }
  return pots;
}

function showdown(t: Table): Table {
  const s = t;
  s.street = "showdown";
  returnUncalled(s);
  const pots = buildPots(s.players);
  return award(s, pots, true);
}

function award(t: Table, pots: Pot[], reveal: boolean): Table {
  const s = t;
  const lines: string[] = [];
  const scores = new Map<number, Score>();
  if (reveal) {
    for (const p of s.players) {
      if (!p.folded && !p.out) scores.set(p.id, scoreBest([...p.hole, ...s.board]));
    }
  }

  for (const pot of pots) {
    const eligible = pot.eligible.filter((id) => !s.players[id].folded);
    if (!eligible.length) continue;
    let winners: number[];
    if (!reveal || eligible.length === 1) {
      winners = [eligible[0]];
    } else {
      let best: Score | null = null;
      winners = [];
      for (const id of eligible) {
        const sc = scores.get(id)!;
        const cmp = best ? compareScores(sc, best) : 1;
        if (cmp > 0) {
          best = sc;
          winners = [id];
        } else if (cmp === 0) winners.push(id);
      }
    }
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    // Odd chips go to the first winner left of the button.
    const ordered = [...winners].sort(
      (a, b) =>
        ((a - s.button + s.players.length) % s.players.length) -
        ((b - s.button + s.players.length) % s.players.length)
    );
    for (const id of ordered) {
      let take = share;
      if (remainder > 0) {
        take += 1;
        remainder -= 1;
      }
      s.players[id].chips += take;
    }
    const names = ordered.map((id) => s.players[id].name).join(" and ");
    const how = reveal && eligible.length > 1 ? ` with ${describeScore(scores.get(ordered[0])!)}` : "";
    const soloHuman = ordered.length === 1 && s.players[ordered[0]].isHuman;
    lines.push(`${names} win${ordered.length > 1 || soloHuman ? "" : "s"} ${pot.amount}${how}`);
  }

  for (const p of s.players) {
    p.totalCommitted = 0;
    p.committed = 0;
    if (p.chips === 0 && !p.out) p.out = true;
  }

  s.street = "showdown";
  s.revealed = reveal;
  s.result = lines;
  s.log.push(...lines);
  return s;
}

export const potSize = (t: Table) => potTotal(t);
export const activePlayer = (t: Table) => t.players[t.toAct];
export const handIsOver = (t: Table) => t.result !== null;
