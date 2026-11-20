import { LINKS } from "../data";

/**
 * The bio, as one paragraph that opens in place.
 *
 * Markup inside the strings:
 *   [[id|label]]      a phrase that opens into NODES[id]
 *   {{img|alt|tall}}  a photograph set into the line
 *   <<text|href>>     a link out (MAIL alone is the email, as selectable text)
 *   @@id|text@@       a phrase that opens NODES[id] elsewhere and goes there
 *   ((action|label))  a button that does something on the page
 *   ¶                 a paragraph break
 *
 * `kick` is the passage's name in the margin; `color` is a theme token, and
 * means "this opens" wherever it appears.
 */
export interface BioNode {
  text: string;
  color?: string;
  kick?: [string] | [string, string];
}

export const NODES: Record<string, BioNode> = {
  root: {
    text:
      "I build backend services and the infrastructure around them. I've spent three summers doing it at [[amazon|Amazon]]. I study computer science at [[penn|Penn]].¶" +
      "Outside of that I sing [[acapella|acapella]], play [[poker|poker]], and am on the journey to [[dunking|dunking]]. In my own time I've built [[projects|two projects]].¶" +
      `You can reach me at <<MAIL>>, on <<GitHub|${LINKS.github}>> or <<LinkedIn|${LINKS.linkedin}>>, or through my <<résumé|${LINKS.resume}>>.`,
  },
  amazon: {
    color: "--color-yellow",
    kick: ["Amazon", "2024 – 2026"],
    text:
      " as an SDE intern in Seattle {{amazon|At the Spheres in Seattle|tall}}, in 2024, 2025 and 2026. Two of those summers were on Customer Service Aqua, part of Customer Service Journey Management. In 2026 I worked on the [[entryid|EntryID Platform]]. In 2025 I worked on the [[nhs|Network Health Service]]. The first summer was on Fashion Fitness Tech, working on [[gateway|Gateway & Bedrock]]",
  },
  entryid: {
    color: "--color-yellow",
    kick: ["2026", "EntryID Platform"],
    text:
      ", building the EntryID plugin for Amazon Customer Service's centralized configuration platform. It replaced unvalidated legacy write paths for 5,200+ routing configurations read at runtime by Amazon Connect. I developed and launched full-stack CRUD and audit tooling that gave 70+ operations users self-service access, and designed a bulk CSV upload system by evaluating 5 architectures and implementing merge-based writes that prevent silent attribute deletion. It was built with React, API Gateway, Lambda, DynamoDB and Smithy",
  },
  nhs: {
    color: "--color-yellow",
    kick: ["2025", "Network Health"],
    text:
      ", as the first developer on the service. I built the AWS infrastructure and the Missed Call Module, which identifies customer calls affected by poor agent network quality, and an end-to-end pipeline including a reusable internal package for metric calculation and data processing. It integrates with Amazon Customer Service systems for real-time visibility into agent connectivity issues. The stack was AWS CDK, TypeScript, Lambda, API Gateway and SNS",
  },
  gateway: {
    color: "--color-yellow",
    kick: ["2024", "Gateway & Bedrock"],
    text:
      ": an LLM-powered widget title generator, generating optimized titles for 10,000+ customer queries on the Amazon.com Gateway. I developed Spark SQL data pipelines, contributed to widget architecture spanning backend processing and frontend integration, and won 3rd place in an internal operational excellence hackathon for IMReady, an LLM tool recommending cost-effective EC2 configurations from service metrics. The stack was SageMaker, Amazon Bedrock and Spark SQL",
  },
  penn: {
    color: "--color-accent",
    kick: ["Penn", "class of 2027"],
    text:
      " as a senior, submatriculating into a master's in Computer and Information Science, for a BSE and an MSE, class of 2027. That's [[heyday|Hey Day]] {{heyday|Hey Day at Penn}}",
  },
  heyday: {
    color: "--color-accent",
    kick: ["Hey Day"],
    text: ", the one afternoon of the year the whole junior class is in red with a cane and a hat",
  },
  acapella: {
    color: "--color-green",
    kick: ["Acapella"],
    text: " on stage {{acapella|Singing acapella on stage}}",
  },
  poker: {
    color: "--color-yellow",
    kick: ["Poker"],
    text:
      " {{poker|At the poker table}} (and wrote @@projects|holdem-bot@@, a Hold'em simulator). There's a table on this site: ((poker|deal me in))",
  },
  dunking: {
    color: "--color-orange",
    kick: ["Dunking", "in progress"],
    text: ` {{dunking|A dunk attempt|tall}}. The attempts are on <<Instagram|${LINKS.dunks}>>`,
  },
  projects: {
    color: "--color-primary",
    kick: ["Projects", "2 repos"],
    text:
      ": <<holdem-bot|https://github.com/Hemosoo/holdem-bot>>, a Texas Hold'em simulator with full betting rounds, position-aware strategy bots with GTO big-blind defence ranges, a CFR self-play trainer, and an OpenCV screen reader; and <<learning-tool-mcp|https://github.com/Hemosoo/learning-tool-mcp>>, an MCP server that turns PDFs into flashcards and quizzes, with session tracking. It runs locally for a single user, with no LLM inside the server itself",
  },
};

/** Every passage that can be opened (everything but the root). */
export const TOTAL_NODES = Object.keys(NODES).length - 1;

/**
 * The back of the player card. Each stat names the passage it comes from and,
 * where there is one, the figure inside it: hovering lights that place,
 * clicking opens it.
 */
export const STATS: [label: string, value: string, node: string][] = [
  ["Summers at Amazon", "3", "amazon"],
  ["Routing configurations", "5,200+", "entryid"],
  ["Operations users served", "70+", "entryid"],
  ["Customer queries titled", "10,000+", "gateway"],
  ["Upload architectures weighed", "5", "entryid"],
  ["Hackathon finish", "3rd", "gateway"],
  ["BSE CS, MSE CIS", "2027", "penn"],
];

const asset = (name: string) => `${import.meta.env.BASE_URL}about/${name}.jpg`;
export const photoUrl = asset;
export const PORTRAIT = asset("portrait");
