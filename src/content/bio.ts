/**
 * The expandable bio for the design alternatives, in the Stretchtext markup
 * (see bio/stretch.ts):
 *
 *   [[id|label]]      a phrase that opens into BIO[id]
 *   {{img|alt|tall}}  a photograph set into the line (public/about/img.jpg)
 *   <<text|href>>     a link out (MAIL alone is the email, as selectable text)
 *   @@id|text@@       a phrase that opens BIO[id] elsewhere and goes there
 *   ((action|label))  a button that does something on the page
 *   ¶                 a paragraph break
 *
 * The default (nothing open) already says what a recruiter needs: what he
 * builds, three Amazon internships, Penn and the master's, the two projects
 * by name. Opening a phrase continues the sentence rather than inserting a
 * block, so each passage starts mid-thought, the way the original does.
 *
 * Colours are CSS custom properties each layout defines: --c-eng (engineering
 * and projects), --c-exp (experience), --c-edu (education), --c-per
 * (personal).
 *
 * Facts: src/content/profile.ts, which is sourced from the original site and
 * the résumé. Change a fact there and here together.
 */
import type { BioNode } from "../bio/content";
import { LINKS } from "../data";

export const BIO: Record<string, BioNode> = {
  root: {
    text:
      "I build backend systems, infrastructure, and tools that make AI useful in practice. I've spent three summers at [[amazon|Amazon]] building software for internal teams and real customers. I study computer science at [[penn|Penn]], where I'm also doing my master's in CIS.¶" +
      "Outside of engineering, I sing [[acapella|a cappella]], play [[poker|poker]], and am trying to [[dunking|dunk]]. I spend a lot of my free time building things, most recently [[holdem|holdem-bot]], a poker engine with bots trained by self-play, and [[mcp|learning-tool-mcp]], an MCP server that turns PDFs into flashcards.¶" +
      `You can reach me at <<MAIL>>, on <<GitHub|${LINKS.github}>> or <<LinkedIn|${LINKS.linkedin}>>, or through my <<résumé|${LINKS.resume}>>.`,
  },

  // ── experience ──────────────────────────────────────────────────────────
  amazon: {
    color: "--c-exp",
    kick: ["Amazon", "2024 – 2026"],
    text:
      ", as an SDE intern in Seattle {{amazon|With the team at the Spheres in Seattle|tall}}. The last two summers were on Customer Service, where I built the [[entryid|EntryID Platform]] and was the first developer on the [[nhs|Network Health Service]]. The first was on Fashion Fitness Tech, building an LLM title generator for the [[gateway|Amazon.com Gateway]]",
  },
  entryid: {
    color: "--c-exp",
    kick: ["2026", "EntryID Platform"],
    text:
      ": a plugin for Customer Service's centralized configuration platform that replaced unvalidated legacy write paths for 5,200+ routing configurations Amazon Connect reads at runtime. I launched full-stack CRUD and audit tooling that gave 70+ operations users self-service access, and designed bulk CSV upload with merge-based writes, chosen from 5 architectures, so an upload can't silently delete attributes. React, API Gateway, Lambda, DynamoDB and Smithy",
  },
  nhs: {
    color: "--c-exp",
    kick: ["2025", "Network Health"],
    text:
      ", which identifies customer calls affected by poor agent network quality. I built its AWS infrastructure, the Missed Call Module, and an end-to-end pipeline in AWS CDK with a reusable internal package for metric calculation and data processing, and integrated it with Customer Service systems for real-time visibility into agent connectivity. TypeScript, Lambda, API Gateway and SNS",
  },
  gateway: {
    color: "--c-exp",
    kick: ["2024", "Gateway & Bedrock"],
    text:
      ", which generated optimized titles for 10,000+ customer queries with SageMaker, Amazon Bedrock and prompt engineering. I also built Spark SQL data pipelines and worked on the widget architecture end to end, and placed 3rd in an internal operational excellence hackathon with IMReady, an LLM tool that recommends cost-effective EC2 configurations from service metrics",
  },

  // ── education ───────────────────────────────────────────────────────────
  penn: {
    color: "--c-edu",
    kick: ["Penn", "BSE 2027 · MSE 2027"],
    text:
      ": a BSE in computer science with a minor in math, finishing in May 2027, and an MSE in Computer and Information Science that I started in January 2026 and finish that December. That's [[heyday|Hey Day]] {{heyday|Hey Day at Penn}}",
  },
  heyday: {
    color: "--c-edu",
    kick: ["Hey Day"],
    text: ", the one afternoon of the year the whole junior class is in red with a cane and a hat",
  },

  // ── personal ────────────────────────────────────────────────────────────
  acapella: {
    color: "--c-per",
    kick: ["A cappella"],
    text: " {{acapella|Singing a cappella on stage}}",
  },
  poker: {
    color: "--c-per",
    kick: ["Poker"],
    text: " {{poker|At the poker table}}. I also wrote a Hold'em engine, @@holdem|holdem-bot@@. There's a table on this site if you want a hand: ((poker|deal me in))",
  },
  dunking: {
    color: "--c-per",
    kick: ["Dunking", "in progress"],
    text: ` {{dunking|A dunk attempt|tall}}. Not there yet; the attempts are on <<Instagram|${LINKS.dunks}>>`,
  },

  // ── projects ────────────────────────────────────────────────────────────
  holdem: {
    color: "--c-eng",
    kick: ["Project", "holdem-bot"],
    text:
      ". It plays full betting rounds, its bots play position-aware strategy with GTO big-blind defence ranges, a CFR trainer improves them by self-play, and an OpenCV screen reader can read a live table. Python. <<github.com/Hemosoo/holdem-bot|https://github.com/Hemosoo/holdem-bot>>",
  },
  mcp: {
    color: "--c-eng",
    kick: ["Project", "learning-tool-mcp"],
    text:
      ", with session tracking. It runs locally for a single user, and there's no LLM inside the server itself: the assistant that calls it does the thinking. Python. <<github.com/Hemosoo/learning-tool-mcp|https://github.com/Hemosoo/learning-tool-mcp>>",
  },
};
