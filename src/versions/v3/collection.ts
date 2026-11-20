/**
 * The collection: every card in the set, built from the shared facts in
 * content/profile.ts. Nothing here is new information; it is the same facts
 * arranged as cards, so the layout and the text view always agree.
 *
 * The set numbers (001/011 and so on) are the reading order of the page: the
 * player card first, then experience, projects, education, personal.
 */
import {
  EARLIER,
  EDUCATION,
  EXPERIENCE,
  INTERESTS,
  PROJECTS,
  type Interest,
  type Metric,
  type Project,
  type Role,
} from "../../content/profile";

export type SetId = "experience" | "projects" | "education" | "personal";

/** What a card's art window shows. Never a fabricated screenshot. */
export type Art =
  | { kind: "metric"; value: string; label: string }
  | { kind: "photo"; src: string; alt: string; caption: string }
  | { kind: "word"; text: string; sub: string };

export interface CardData {
  id: string;
  set: SetId;
  no: string;
  /** Sentence-case line above the title: where and when. */
  line: string;
  title: string;
  sub: string;
  summary: string;
  art: Art;
  /** Bottom of the front: the period, or the state of it. */
  foot: string;
  inProgress?: boolean;
  source:
    | { kind: "role"; role: Role }
    | { kind: "project"; project: Project }
    | { kind: "education" }
    | { kind: "interest"; interest: Interest };
}

export interface SetData {
  id: SetId;
  title: string;
  /** One honest sentence: what the set is. */
  blurb: string;
  cards: CardData[];
}

const lead = (m: Metric[]) => m[0];

const roleCard = (r: Role): Omit<CardData, "no"> => {
  const m = lead(r.metrics);
  return {
    id: r.id,
    set: "experience",
    line: `${r.org} · ${r.year}`,
    title: r.service,
    sub: r.team ? `${r.team} · ${r.place}` : r.place,
    summary: r.summary,
    art: { kind: "metric", value: m.value, label: m.label },
    foot: r.period,
    source: { kind: "role", role: r },
  };
};

const projectCard = (p: Project): Omit<CardData, "no"> => ({
  id: p.id,
  set: "projects",
  line: `Project · ${p.stack[0]}`,
  title: p.name,
  sub: "Built in my own time",
  summary: p.what,
  // The thing each is built around, stated in its own description.
  art:
    p.id === "holdem"
      ? { kind: "word", text: "CFR", sub: "self-play trainer" }
      : { kind: "word", text: "MCP", sub: "server · no LLM inside" },
  foot: "On GitHub",
  source: { kind: "project", project: p },
});

const educationCard = (): Omit<CardData, "no"> => ({
  id: "penn",
  set: "education",
  line: "Penn · 2023 – 2027",
  title: "BSE + MSE",
  sub: EDUCATION.school,
  summary: "Computer science, with a minor in math, and a master's in Computer and Information Science.",
  art: { kind: "photo", ...EDUCATION.photo },
  foot: "BSE May 2027 · MSE Dec 2027",
  source: { kind: "education" },
});

const interestCard = (i: Interest): Omit<CardData, "no"> => ({
  id: i.id,
  set: "personal",
  line: i.inProgress ? "Personal · in progress" : "Personal",
  title: i.name,
  sub: i.photo.caption,
  summary: i.line,
  art: { kind: "photo", ...i.photo },
  foot: i.inProgress ? "Not finished yet" : i.photo.caption,
  inProgress: i.inProgress,
  source: { kind: "interest", interest: i },
});

const raw: { id: SetId; title: string; blurb: string; cards: Omit<CardData, "no">[] }[] = [
  {
    id: "experience",
    title: "Experience",
    blurb: "Three summers as an SDE intern at Amazon, and research before Penn.",
    cards: [...EXPERIENCE.map(roleCard), roleCard(EARLIER)],
  },
  {
    id: "projects",
    title: "Projects",
    blurb: "Things I've built in my own time.",
    cards: PROJECTS.map(projectCard),
  },
  {
    id: "education",
    title: "Education",
    blurb: "A BSE in computer science and an MSE in CIS, both at Penn.",
    cards: [educationCard()],
  },
  {
    id: "personal",
    title: "Personal",
    blurb: "Away from the keyboard. One of these isn't finished.",
    cards: INTERESTS.map(interestCard),
  },
];

/** Total cards in the set, the player card included. */
export const TOTAL = 1 + raw.reduce((n, s) => n + s.cards.length, 0);
const pad = (n: number) => String(n).padStart(3, "0");
export const PLAYER_NO = `${pad(1)}/${pad(TOTAL)}`;

let n = 1;
export const SETS: SetData[] = raw.map((s) => ({
  ...s,
  cards: s.cards.map((c) => ({ ...c, no: `${pad(++n)}/${pad(TOTAL)}` })),
}));

export const ALL_CARDS: CardData[] = SETS.flatMap((s) => s.cards);

/** Semantic colour per set: experience gold, projects blue, education purple,
 *  personal green. */
export const SET_VAR: Record<SetId, string> = {
  experience: "var(--c-exp)",
  projects: "var(--c-eng)",
  education: "var(--c-edu)",
  personal: "var(--c-per)",
};

/** Where a stat on the player card leads: a card, or a whole set. */
export function targetOfNode(node: string): { card?: string; set?: SetId } {
  if (node === "amazon") return { set: "experience" };
  if (ALL_CARDS.some((c) => c.id === node)) return { card: node };
  return {};
}
