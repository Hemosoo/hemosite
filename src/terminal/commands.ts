import { ROLES, PROJECTS, LINKS, SKILLS } from "../data";

/** A run of text with an optional colour class, and optionally a link. */
export interface Span {
  t: string;
  c?: string;
  href?: string;
}

export type Line = Span[];

export interface CommandResult {
  lines: Line[];
  /** Wipe the scrollback instead of appending. */
  clear?: boolean;
  /** Side effects the shell owns rather than the command. */
  effect?: { kind: "open"; href: string } | { kind: "music"; action: "toggle" | "next" };
}

export interface Command {
  name: string;
  args?: string;
  summary: string;
  run: (args: string[]) => CommandResult;
}

// ── span helpers ──────────────────────────────────────────────────────────────
const t = (s: string, c?: string): Span => ({ t: s, c });
const link = (s: string, href: string, c = "text-primary"): Span => ({ t: s, c, href });
const blank: Line = [];

const dim = "text-dim";
const key = "text-cyan";
const val = "text-text";
const num = "text-orange";
const ok = "text-green";
const warn = "text-yellow";

/** Wrap prose to a column so output reads like a terminal, not a paragraph.
 *  Continuation lines align under the first one rather than repeating its
 *  marker, so a "  · " bullet indents to "    ". */
function wrap(text: string, width = 76, indent = ""): Line[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length > width) {
      out.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) out.push(line);
  const hang = " ".repeat(indent.length);
  return out.map((l, i) => [t((i === 0 ? indent : hang) + l, "text-subtle")]);
}

// ── commands ──────────────────────────────────────────────────────────────────

const whoami: Command = {
  name: "whoami",
  summary: "who I am, briefly",
  run: () => ({
    lines: [
      [t("Hemosoo Woo", val), t(" — full-stack developer", "text-subtle")],
      blank,
      ...wrap(
        "CS senior at Penn, submatriculating into a master's in Computer and Information Science. I build backend services and the infrastructure around them. Three summers as an SDE intern at Amazon in Seattle, all on customer-service systems.",
      ),
      blank,
      ...wrap(
        "Outside of that: I sing acapella, play poker, and am on the journey to dunking.",
      ),
      blank,
      [t("education  ", dim), t("University of Pennsylvania — BSE Computer Science, MSE CIS (2027)", "text-subtle")],
      [t("awards     ", dim), t("Amazon Future Engineer Scholar ", "text-subtle"), t("$40,000", num)],
      [t("earlier    ", dim), t("AtaxiaV — Unity/Leap Motion rehab platform, 1st place CA-33 Congressional App Challenge", "text-subtle")],
    ],
  }),
};

const work: Command = {
  name: "work",
  args: "[year]",
  summary: "Amazon internships — pass a year for detail",
  run: (args) => {
    const year = args[0];
    if (year) {
      const role = ROLES.find((r) => r.year === year);
      if (!role) {
        return {
          lines: [
            [t(`work: no role for '${year}'. try: `, "text-red"), t(ROLES.map((r) => r.year).join(", "), warn)],
          ],
        };
      }
      return {
        lines: [
          [t(role.service, val), t("  ", dim), t(role.period, dim)],
          [t("SDE Intern · Amazon · Seattle, WA", "text-accent")],
          blank,
          ...role.bullets.flatMap((b) => [...wrap(b, 74, "  · "), blank]),
          [t("stack  ", dim), t(role.stack.join(" · "), key)],
        ],
      };
    }
    return {
      lines: [
        [t("PERIOD  ", dim), t("SERVICE                 ", dim), t("IMPACT", dim)],
        ...ROLES.map((r) => [
          t(r.year + "    ", warn),
          t(r.service.padEnd(24).slice(0, 24), val),
          t(r.bullets[0].length > 46 ? r.bullets[0].slice(0, 46) + "…" : r.bullets[0], "text-subtle"),
        ]),
        blank,
        [t("run ", dim), t("work 2026", key), t(" for the full entry", dim)],
      ],
    };
  },
};

const projects: Command = {
  name: "projects",
  summary: "things I built for myself",
  run: () => ({
    lines: PROJECTS.flatMap((p) => [
      [link(p.slug + "/", p.repo), t("  ", dim), t(p.stack.join(" · "), key)],
      ...wrap(p.blurb, 74, "  "),
      blank,
    ]).concat([[t("run ", dim), t("open holdem-bot", key), t(" to jump to a repo", dim)]]),
  }),
};

const skills: Command = {
  name: "skills",
  summary: "languages and tools",
  run: () => ({
    lines: [
      [t(SKILLS.slice(0, 5).join("  "), key)],
      [t(SKILLS.slice(5).join("  "), key)],
    ],
  }),
};

const contact: Command = {
  name: "contact",
  summary: "how to reach me",
  run: () => ({
    lines: [
      [t("email     ", dim), link(LINKS.email, `mailto:${LINKS.email}`)],
      [t("github    ", dim), link("github.com/Hemosoo", LINKS.github)],
      [t("linkedin  ", dim), link("linkedin.com/in/hemosoowoo", LINKS.linkedin)],
      [t("resume    ", dim), link("resume.pdf", LINKS.resume)],
    ],
  }),
};

const resume: Command = {
  name: "resume",
  summary: "open the PDF",
  run: () => ({
    lines: [[t("opening resume.pdf…", ok)]],
    effect: { kind: "open", href: LINKS.resume },
  }),
};

const open: Command = {
  name: "open",
  args: "<target>",
  summary: "open a repo or link in a new tab",
  run: (args) => {
    const targets: Record<string, string> = {
      github: LINKS.github,
      linkedin: LINKS.linkedin,
      resume: LINKS.resume,
      email: `mailto:${LINKS.email}`,
      ...Object.fromEntries(PROJECTS.map((p) => [p.slug, p.repo])),
    };
    const name = (args[0] ?? "").toLowerCase();
    const href = targets[name];
    if (!href) {
      return {
        lines: [
          [t("open: unknown target", "text-red")],
          [t("try: ", dim), t(Object.keys(targets).join(", "), warn)],
        ],
      };
    }
    return { lines: [[t(`opening ${name}…`, ok)]], effect: { kind: "open", href } };
  },
};

const music: Command = {
  name: "music",
  args: "[next]",
  summary: "toggle the player, or skip a track",
  run: (args) => {
    if (args[0] === "next") {
      return { lines: [[t("next track…", ok)]], effect: { kind: "music", action: "next" } };
    }
    return { lines: [[t("toggling player…", ok)]], effect: { kind: "music", action: "toggle" } };
  },
};

export const COMMANDS: Command[] = [
  whoami,
  work,
  projects,
  skills,
  contact,
  resume,
  open,
  music,
  { name: "clear", summary: "wipe the scrollback", run: () => ({ lines: [], clear: true }) },
  {
    name: "help",
    summary: "list commands",
    run: () => ({
      lines: [
        [t("available commands", dim)],
        blank,
        ...COMMANDS.map((c) => [
          t("  " + (c.name + (c.args ? " " + c.args : "")).padEnd(18), key),
          t(c.summary, "text-subtle"),
        ]),
        blank,
        [t("  ↑/↓", dim), t(" history    ", "text-subtle"), t("tab", dim), t(" complete    ", "text-subtle"), t("ctrl+l", dim), t(" clear", "text-subtle")],
      ],
    }),
  },
];

export function runCommand(input: string): CommandResult {
  const [name, ...args] = input.trim().split(/\s+/);
  if (!name) return { lines: [] };
  const cmd = COMMANDS.find((c) => c.name === name.toLowerCase());
  if (!cmd) {
    return {
      lines: [
        [t(`command not found: ${name}`, "text-red")],
        [t("type ", dim), t("help", warn), t(" to see what's here", dim)],
      ],
    };
  }
  return cmd.run(args);
}

export const COMMAND_NAMES = COMMANDS.map((c) => c.name);
