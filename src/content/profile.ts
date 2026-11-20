/**
 * Everything the design alternatives (/v1, /v2, /v3) say about Hemosoo, in one
 * place, so three layouts never mean three copies of the facts.
 *
 * Every fact here comes from the repository: the original site's data and
 * copy, and public/resume.pdf. Nothing is estimated or embellished. Where the
 * repository doesn't say something (why a project was built, say), the field
 * is absent rather than filled in, and a layout must leave that space out.
 *
 * Categories carry the semantic colours (see `ACCENT`): engineering and
 * projects blue, experience gold, education purple, personal green.
 */
import { LINKS, TRACKS } from "../data";

export type Category = "engineering" | "experience" | "education" | "personal";

/** The refined palette, as values; each layout maps these onto its tokens. */
export const PALETTE = {
  bg: "#050505",
  surface: "#151B24",
  text: "#F0F0F2",
  muted: "#A0A8B5",
  line: "#262c36",
  engineering: "#60ADEB",
  experience: "#E4BD78",
  education: "#CE83DE",
  personal: "#A2CE83",
} as const;

export const ACCENT: Record<Category, string> = {
  engineering: PALETTE.engineering,
  experience: PALETTE.experience,
  education: PALETTE.education,
  personal: PALETTE.personal,
};

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const photo = (name: "portrait" | "heyday" | "amazon" | "acapella" | "poker" | "dunking") =>
  asset(`about/${name}.jpg`);

export const PERSON = {
  name: "Hemosoo Woo",
  /** The one-line identity, in the order a recruiter reads it. */
  tagline: "Backend systems, infrastructure, and applied AI",
  facts: ["CS at Penn", "MSE in CIS", "3× Amazon SDE intern"],
  portrait: photo("portrait"),
  /** The address on the résumé. */
  email: LINKS.email,
  links: {
    github: LINKS.github,
    linkedin: LINKS.linkedin,
    instagram: LINKS.dunks,
    resume: LINKS.resume,
  },
};

export const EDUCATION = {
  school: "University of Pennsylvania",
  place: "Philadelphia, PA",
  degrees: [
    {
      degree: "BSE in Computer Science",
      note: "Minor in Mathematics",
      period: "Aug 2023 – May 2027",
    },
    {
      degree: "MSE in Computer and Information Science",
      note: "Submatriculated, alongside the BSE",
      period: "Jan 2026 – Dec 2027",
    },
  ],
  photo: { src: photo("heyday"), alt: "Hey Day at Penn", caption: "Hey Day" },
  /** From the original site: what Hey Day is. */
  heyday: "the one afternoon of the year the whole junior class is in red with a cane and a hat",
};

export interface Metric {
  value: string;
  label: string;
}

export interface Role {
  id: string;
  year: string;
  period: string;
  title: string;
  org: string;
  /** The org within Amazon: not the same one all three summers. */
  team: string;
  place: string;
  /** What was built: the name of the thing. */
  service: string;
  /** One sentence a recruiter can read in a glance. */
  summary: string;
  bullets: string[];
  stack: string[];
  metrics: Metric[];
  category: Category;
}

export const EXPERIENCE: Role[] = [
  {
    id: "entryid",
    year: "2026",
    period: "May – Aug 2026",
    title: "Software Development Engineer Intern",
    org: "Amazon",
    team: "Customer Service",
    place: "Seattle, WA",
    service: "EntryID Platform",
    summary:
      "Replaced unvalidated legacy write paths for 5,200+ routing configurations read at runtime by Amazon Connect.",
    bullets: [
      "Built the EntryID plugin for Amazon Customer Service's centralized configuration platform, replacing unvalidated legacy write paths for 5,200+ routing configurations read at runtime by Amazon Connect.",
      "Developed and launched full-stack CRUD and audit tooling, enabling self-service access for 70+ operations users.",
      "Designed a bulk CSV upload system by evaluating 5 architectures and implementing merge-based writes that prevent silent attribute deletion.",
    ],
    stack: ["React", "API Gateway", "Lambda", "DynamoDB", "Smithy"],
    metrics: [
      { value: "5,200+", label: "routing configurations behind validated writes" },
      { value: "70+", label: "operations users given self-service access" },
    ],
    category: "experience",
  },
  {
    id: "nhs",
    year: "2025",
    period: "May – Aug 2025",
    title: "Software Development Engineer Intern",
    org: "Amazon",
    team: "Customer Service",
    place: "Seattle, WA",
    service: "Network Health Service",
    summary:
      "First developer on a new service that finds customer calls affected by poor agent network quality.",
    bullets: [
      "Served as the first developer on the Network Health Service, building the AWS infrastructure and the Missed Call Module to identify customer calls affected by poor agent network quality.",
      "Created an end-to-end pipeline in AWS CDK, including a reusable internal package for metric calculation and data processing.",
      "Integrated the service with Amazon Customer Service systems, enabling real-time visibility into agent connectivity issues.",
    ],
    stack: ["AWS CDK", "TypeScript", "Lambda", "API Gateway", "SNS"],
    metrics: [{ value: "1st", label: "developer on the service" }],
    category: "experience",
  },
  {
    id: "gateway",
    year: "2024",
    period: "May – Aug 2024",
    title: "Software Development Engineer Intern",
    org: "Amazon",
    team: "Fashion Fitness Tech",
    place: "Seattle, WA",
    service: "Gateway & Bedrock",
    summary: "Built an LLM-powered title generator for 10,000+ customer queries on the Amazon.com Gateway.",
    bullets: [
      "Built an LLM-powered widget title generator using SageMaker, Amazon Bedrock and prompt engineering, generating optimized titles for 10,000+ customer queries on the Amazon.com Gateway.",
      "Developed Spark SQL data pipelines and contributed to widget architecture spanning backend processing and frontend integration.",
      "Won 3rd place in an internal operational excellence hackathon with IMReady, an LLM-based tool that recommends cost-effective EC2 configurations from service metrics.",
    ],
    stack: ["SageMaker", "Amazon Bedrock", "Spark SQL"],
    metrics: [
      { value: "10,000+", label: "customer queries given generated titles" },
      { value: "3rd", label: "place, internal operational excellence hackathon" },
    ],
    category: "experience",
  },
];

/** Before Penn: research, from the résumé. */
export const EARLIER: Role = {
  id: "ataxiav",
  year: "2022",
  period: "May 2022 – Jun 2023",
  title: "Research Assistant",
  org: "Voice of Calling NPO",
  team: "",
  place: "Northridge, CA",
  service: "AtaxiaV",
  summary: "A 3D rehabilitation and evaluation platform for patients with ataxia, built in Unity with Leap Motion.",
  bullets: [
    "Developed AtaxiaV, a 3D rehabilitation and evaluation platform using Unity and the Leap Motion Controller API to recreate physical therapy exercises for patients with ataxia.",
    "Designed augmented reality interactions for rehabilitation activities and presented the project at the International Congress for Ataxia Research.",
    "Won 1st place in the CA-33 Congressional App Challenge.",
  ],
  stack: ["Unity", "Leap Motion"],
  metrics: [{ value: "1st", label: "place, CA-33 Congressional App Challenge" }],
  category: "engineering",
};

export interface Project {
  id: string;
  name: string;
  repo: string;
  /** What it is, in one line. */
  what: string;
  /** The longer description, from the original site. */
  detail: string;
  /** The technical decisions worth pointing at, each stated in the repo
   *  (empty where the repo doesn't say). */
  decisions: string[];
  stack: string[];
  category: Category;
  /** Real screenshots: none exist in the repository yet. Leave empty rather
   *  than mock one up. */
  screenshots: string[];
}

export const PROJECTS: Project[] = [
  {
    // First on purpose: the one to look at. Everything said here is what the
    // repository says about itself ("Personal customization of pokernow.com",
    // TypeScript); its fuller story isn't in this repo yet.
    id: "mypokernow",
    name: "mypokernow",
    repo: "https://github.com/Hemosoo/mypokernow",
    what: "A personal customization of pokernow.com.",
    detail: "A personal customization of pokernow.com.",
    decisions: [],
    stack: ["TypeScript"],
    category: "engineering",
    screenshots: [],
  },
  {
    id: "holdem",
    name: "holdem-bot",
    repo: "https://github.com/Hemosoo/holdem-bot",
    what: "A Texas Hold'em simulator with bots that learn by playing themselves.",
    detail:
      "Texas Hold'em simulator with full betting rounds, position-aware strategy bots with GTO big-blind defence ranges, a CFR self-play trainer, and an OpenCV screen reader.",
    decisions: [
      "Counterfactual regret minimization (CFR) self-play to train strategy",
      "Position-aware bots with GTO big-blind defence ranges",
      "An OpenCV screen reader to read a live table",
      "Full betting rounds, not a simplified game",
    ],
    stack: ["Python", "CFR", "OpenCV"],
    category: "engineering",
    screenshots: [],
  },
  {
    id: "mcp",
    name: "learning-tool-mcp",
    repo: "https://github.com/Hemosoo/learning-tool-mcp",
    what: "An MCP server that turns PDFs into flashcards and quizzes.",
    detail:
      "An MCP server that turns PDFs into flashcards and quizzes, with session tracking. Runs locally for a single user, with no LLM inside the server itself.",
    decisions: [
      "Exposed as an MCP server, so an assistant drives it",
      "No LLM inside the server itself",
      "Runs locally, for a single user",
      "Session tracking across study sessions",
    ],
    stack: ["Python", "MCP"],
    category: "engineering",
    screenshots: [],
  },
];

export interface Interest {
  id: string;
  name: string;
  line: string;
  photo: { src: string; alt: string; caption: string };
  link?: { label: string; href: string };
  /** Dunking is the one that isn't done yet. */
  inProgress?: boolean;
}

export const INTERESTS: Interest[] = [
  {
    id: "acapella",
    name: "A cappella",
    line: "I sing a cappella.",
    photo: { src: photo("acapella"), alt: "Singing a cappella on stage", caption: "On stage" },
  },
  {
    id: "poker",
    name: "Poker",
    line: "I play poker, and wrote a Hold'em simulator.",
    photo: { src: photo("poker"), alt: "At the poker table", caption: "At the table" },
  },
  {
    id: "dunking",
    name: "Dunking",
    line: "I'm trying to dunk. The attempts are on Instagram.",
    photo: { src: photo("dunking"), alt: "A dunk attempt", caption: "In progress" },
    link: { label: "Instagram", href: LINKS.dunks },
    inProgress: true,
  },
];

/**
 * The player card's back. Accomplishments over counts: each one is a thing
 * that happened, and each points at where it is told in full (`node` is a
 * role id in EXPERIENCE, or "amazon"/"penn" for the section).
 *
 * "5 upload architectures weighed" is gone from the headline set: it is how a
 * decision was made, not an outcome. It stays in the role's detail.
 */
export interface Stat {
  value: string;
  label: string;
  node: string;
  category: Category;
}

export const STATS: Stat[] = [
  { value: "3", label: "Amazon SDE internships", node: "amazon", category: "experience" },
  { value: "5,200+", label: "Routing configs moved to validated writes", node: "entryid", category: "experience" },
  { value: "10,000+", label: "Customer queries given LLM titles", node: "gateway", category: "experience" },
  { value: "70+", label: "Ops users given self-service tools", node: "entryid", category: "experience" },
  { value: "1st", label: "Developer on Network Health Service", node: "nhs", category: "experience" },
  { value: "3rd", label: "Amazon internal hackathon", node: "gateway", category: "experience" },
  { value: "2027", label: "BSE CS + MSE CIS, Penn", node: "penn", category: "education" },
];

/** The résumé's skills, compacted: what a reader scans for. */
export const TOOLKIT: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "Python", "Java", "C", "SQL"] },
  { group: "AWS", items: ["Lambda", "API Gateway", "DynamoDB", "SNS", "CDK", "SageMaker", "Bedrock"] },
  { group: "Also", items: ["React", "Spark SQL", "Docker", "pandas", "TensorFlow"] },
];

export const CERTIFICATIONS = [{ name: "AWS Certified Cloud Practitioner", date: "Jan 2022" }];

export { TRACKS };
