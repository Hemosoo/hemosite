/**
 * The words for the redesign alternatives (/a, /b, /c): one copy of them, so
 * three layouts can't drift apart on a fact.
 *
 * Every sentence here is sourced: the résumé (public/resume.pdf), the
 * existing site's copy, or a repository's own description on GitHub. Where
 * the sources say nothing (why mypokernow was built, what it changes, a live
 * link, a screenshot), the field is left empty and the layouts show nothing in
 * its place. Fill those in rather than writing around them.
 *
 * Facts that are shared with the current site (links, roles, stats) still
 * come from content/profile.ts.
 */
import { LINKS } from "../data";

/** Under the name. */
export const INTRO = "Software engineer interested in infrastructure and making AI useful in practice.";

/**
 * The About text, as runs. A run with `photo` is a word that shows that
 * photograph when pointed at or focused; `poker` opens the poker table;
 * `href` is an ordinary link.
 */
export type Run = string | { text: string; photo?: "heyday" | "amazon" | "acapella" | "poker" | "dunking"; poker?: true; href?: string };

export const ABOUT: Run[][] = [
  [
    "I'm studying computer science at ",
    { text: "Penn", photo: "heyday" },
    ", where I'm also working toward my master's in CIS. I've spent the past three summers at ",
    { text: "Amazon", photo: "amazon" },
    ", building everything from internal infrastructure to customer-facing AI systems.",
  ],
  [
    "Outside of work, I sing ",
    { text: "a cappella", photo: "acapella" },
    ", play ",
    { text: "poker", photo: "poker", poker: true },
    ", and spend an unreasonable amount of time trying to ",
    { text: "dunk", photo: "dunking", href: LINKS.dunks },
    ".",
  ],
];

/** What each photo is, for alt text and captions. */
export const PHOTO_ALT = {
  heyday: "Hey Day at Penn",
  amazon: "With the team at the Spheres in Seattle",
  acapella: "Singing a cappella on stage",
  poker: "At the poker table",
  dunking: "A dunk attempt",
} as const;

export interface Work {
  id: string;
  /** The system's name. */
  name: string;
  team: string;
  /** What the system does, or the problem it exists for. */
  what: string;
  /** What Hemosoo did, and what it achieved. Each item is a sentence. */
  did: string[];
  tools: string[];
  period: string;
  year: string;
}

export const AMAZON = {
  employer: "Amazon",
  role: "Software Development Engineer Intern",
  place: "Seattle",
  span: "Summers 2024 – 2026",
  /** Newest first. Each one says it differently on purpose. */
  work: [
    {
      id: "entryid",
      name: "EntryID Platform",
      team: "Customer Service",
      what: "Amazon Connect reads routing configurations at runtime, and they were being written through unvalidated legacy paths.",
      did: [
        "Built the EntryID plugin for Customer Service's centralized configuration platform, replacing those write paths for 5,200+ routing configurations.",
        "Launched CRUD and audit tooling that gave 70+ operations users self-service access.",
        "Designed bulk CSV upload: after weighing five architectures, merge-based writes, so an upload can't silently delete attributes.",
      ],
      tools: ["React", "API Gateway", "Lambda", "DynamoDB", "Smithy"],
      period: "May – Aug 2026",
      year: "2026",
    },
    {
      id: "nhs",
      name: "Network Health Service",
      team: "Customer Service",
      what: "Finds customer calls that were affected by poor agent network quality.",
      did: [
        "First developer on the service. I built its AWS infrastructure and the Missed Call Module, which identifies those calls.",
        "The pipeline runs end to end in AWS CDK, with a reusable internal package for metric calculation and data processing.",
        "Integrated with Customer Service systems, so agent connectivity problems are visible in real time.",
      ],
      tools: ["AWS CDK", "TypeScript", "Lambda", "API Gateway", "SNS"],
      period: "May – Aug 2025",
      year: "2025",
    },
    {
      id: "gateway",
      name: "Widget title generator",
      team: "Fashion Fitness Tech",
      what: "Generating optimized widget titles for customer queries on the Amazon.com Gateway.",
      did: [
        "Built it as an LLM-powered generator on SageMaker and Amazon Bedrock, with prompt engineering. It produced titles for 10,000+ customer queries.",
        "Developed Spark SQL data pipelines, and contributed to the widget architecture from backend processing to frontend integration.",
        "Placed 3rd in an internal operational-excellence hackathon with IMReady, an LLM tool that recommends cost-effective EC2 configurations from service metrics.",
      ],
      tools: ["SageMaker", "Amazon Bedrock", "Spark SQL"],
      period: "May – Aug 2024",
      year: "2024",
    },
  ] as Work[],
};

export const EARLIER = {
  employer: "Voice of Calling",
  role: "Research Assistant",
  place: "Northridge, CA",
  span: "May 2022 – Jun 2023",
  work: {
    id: "ataxiav",
    name: "AtaxiaV",
    team: "",
    what: "A 3D rehabilitation and evaluation platform that recreates physical therapy exercises for patients with ataxia.",
    did: [
      "Developed it in Unity with the Leap Motion Controller API, and designed its augmented-reality rehabilitation activities.",
      "Presented it at the International Congress for Ataxia Research, and it won 1st place in the CA-33 Congressional App Challenge.",
    ],
    tools: ["Unity", "Leap Motion"],
    period: "May 2022 – Jun 2023",
    year: "2022",
  } as Work,
};

export interface ProjectCopy {
  id: string;
  name: string;
  /** One line: what it is. */
  what: string;
  /** Why it exists. Empty: not known, show nothing. */
  why: string;
  /** Decisions worth pointing at. Empty: not known, show nothing. */
  notes: string[];
  tools: string[];
  source: string;
  /** A live version, if there is one. */
  live?: string;
  /** A real screenshot under public/. Absent: show no image at all. */
  image?: { src: string; alt: string; width: number; height: number };
}

export const PROJECTS: ProjectCopy[] = [
  {
    id: "mypokernow",
    name: "mypokernow",
    // Everything known: the repository describes itself as "Personal
    // customization of pokernow.com" and is TypeScript. What it changes, why,
    // whether it's live, and a screenshot are still to come from Hemosoo.
    what: "A personal customization of pokernow.com, the browser-based poker table.",
    why: "",
    notes: [],
    tools: ["TypeScript"],
    source: "https://github.com/Hemosoo/mypokernow",
  },
  {
    id: "hemosoo",
    name: "hemosoo.com",
    what: "This site, and the trading card in it.",
    why: "",
    // True of the current site; a layout that drops a feature drops its note.
    notes: [
      "The trading card is a real 3D model in three.js. It leaves a deck, folds into a paper plane along an actual folding pattern, and lands on the page as the card you can turn over.",
      "There's a working no-limit Hold'em table behind “poker”: five bots with their own playing styles.",
      "Fonts are self-hosted and the WebGL is loaded only when the device can run it, so the page reads fine without it.",
    ],
    tools: ["React", "TypeScript", "three.js", "Vite"],
    source: "https://github.com/Hemosoo/hemosite",
    // Each layout may show a real capture of its own card here (its card
    // differs), saved under public/projects/; never a mock-up.
  },
];

/** Contact, kept in the existing tone. */
export const CONTACT = {
  lead: "The fastest way to reach me is email.",
};
