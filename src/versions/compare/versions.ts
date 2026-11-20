/**
 * The four versions of the site, as the comparison page describes them.
 * Screenshots live in public/compare/ (captured at 1440x900 and 390x844).
 */
export interface Version {
  id: string;
  href: string;
  name: string;
  direction: string;
  gains: string[];
  costs: string[];
  audience: string;
}

export const VERSIONS: Version[] = [
  {
    id: "original",
    href: "/",
    name: "Original",
    direction:
      "The site as it stands: the oversized name over a deck whose card folds into a paper plane, lands as the player card, and delivers an expandable bio.",
    gains: ["The most distinctive first moment", "The plane is the transition, not decoration"],
    costs: [
      "The first screen says little about the work",
      "Projects and experience sit behind several expansions",
      "Large body type, and the shell-era controls in the bar",
    ],
    audience: "People who already know who Hemosoo is.",
  },
  {
    id: "v1",
    href: "/v1/",
    name: "Refined Original",
    direction:
      "The same site and interaction model, executed carefully: a smaller name with a real hierarchy beneath it, links in the first screen, navigation that opens the bio where you ask, a better card, and project previews.",
    gains: ["Keeps everything distinctive about the original", "A recruiter gets the basics without opening anything"],
    costs: ["Still bio-first: experience is prose, not a list", "The most motion of the four"],
    audience: "Anyone; the safest upgrade.",
  },
  {
    id: "v2",
    href: "/v2/",
    name: "Engineering Editorial",
    direction:
      "An editorial layout on a strict grid: a compact hero that states the work, experience and projects as readable entries with detail on demand, and the trading card as a sticky companion that follows what you are reading.",
    gains: ["Fastest to evaluate", "Projects get real technical prominence", "Reads well on a phone"],
    costs: ["Less of a single memorable moment", "Closer to a conventional portfolio structure"],
    audience: "Recruiters and engineers hiring for SWE, infrastructure and applied AI.",
  },
  {
    id: "v3",
    href: "/v3/",
    name: "The Collection",
    direction:
      "The trading card taken all the way: the player card at the centre, and everything else as a set of cards by category, each with its own print, dealt, flipped and inspected, with a plain-text reading for skimmers.",
    gains: ["The most memorable", "Accomplishments read as player statistics"],
    costs: ["More interaction to reach detail", "The concept has to stay restrained to avoid gimmick"],
    audience: "Visitors with a few minutes, and anyone it should stick with.",
  },
];

/** Scored against the brief's criteria after building and reviewing each
 *  version at 1440, 1280, 1024, 768, 390 and 320 px. 1–5. */
export const CRITERIA = [
  "Originality",
  "Visual cohesion",
  "Typography & spacing",
  "First impression",
  "Engineering credibility",
  "Recruiter usability",
  "Discoverability",
  "Interaction quality",
  "Mobile",
  "Accessibility",
  "Performance",
  "Maintainability",
] as const;

export const SCORES: Record<string, number[] | null> = {
  original: null,
  v1: null,
  v2: null,
  v3: null,
};
