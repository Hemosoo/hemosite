export interface Role {
  year: string;
  period: string;
  service: string;
  bullets: string[];
  stack: string[];
}

export const ROLES: Role[] = [
  {
    year: "2026",
    period: "May – Aug 2026",
    service: "EntryID Platform",
    bullets: [
      "Built the EntryID plugin for Amazon Customer Service's centralized configuration platform, replacing unvalidated legacy write paths for 5,200+ routing configurations read at runtime by Amazon Connect.",
      "Developed and launched full-stack CRUD and audit tooling, enabling self-service access for 70+ operations users.",
      "Designed a bulk CSV upload system by evaluating 5 architectures and implementing merge-based writes that prevent silent attribute deletion.",
    ],
    stack: ["React", "API Gateway", "Lambda", "DynamoDB", "Smithy"],
  },
  {
    year: "2025",
    period: "May – Aug 2025",
    service: "Network Health Service",
    bullets: [
      "Served as the first developer on the service, building the AWS infrastructure and the Missed Call Module to identify customer calls affected by poor agent network quality.",
      "Created an end-to-end pipeline including a reusable internal package for metric calculation and data processing.",
      "Integrated with Amazon Customer Service systems, enabling real-time visibility into agent connectivity issues.",
    ],
    stack: ["AWS CDK", "TypeScript", "Lambda", "API Gateway", "SNS"],
  },
  {
    year: "2024",
    period: "May – Aug 2024",
    service: "Gateway & Bedrock",
    bullets: [
      "Built an LLM-powered widget title generator, generating optimized titles for 10,000+ customer queries on the Amazon.com Gateway.",
      "Developed Spark SQL data pipelines and contributed to widget architecture spanning backend processing and frontend integration.",
      "Won 3rd place in an internal operational excellence hackathon for “IMReady,” an LLM tool recommending cost-effective EC2 configurations from service metrics.",
    ],
    stack: ["SageMaker", "Amazon Bedrock", "Spark SQL"],
  },
];

export interface Project {
  slug: string;
  repo: string;
  blurb: string;
  stack: string[];
}

export const PROJECTS: Project[] = [
  {
    slug: "holdem-bot",
    repo: "https://github.com/Hemosoo/holdem-bot",
    blurb:
      "Texas Hold'em simulator with full betting rounds, position-aware strategy bots with GTO big-blind defence ranges, a CFR self-play trainer, and an OpenCV screen reader.",
    stack: ["python", "cfr", "opencv"],
  },
  {
    slug: "learning-tool-mcp",
    repo: "https://github.com/Hemosoo/learning-tool-mcp",
    blurb:
      "An MCP server that turns PDFs into flashcards and quizzes, with session tracking. Runs locally for a single user, with no LLM inside the server itself.",
    stack: ["python", "mcp"],
  },
];

export const LINKS = {
  github: "https://github.com/Hemosoo",
  linkedin: "https://www.linkedin.com/in/hemosoowoo",
  email: "hemosoo.woo@gmail.com",
  resume: `${import.meta.env.BASE_URL}resume.pdf`,
};

export const SKILLS = [
  "TypeScript",
  "React",
  "Python",
  "Java",
  "C",
  "SQL",
  "AWS CDK",
  "DynamoDB",
  "Spark SQL",
  "Docker",
];

/** One song per topic. Scrolling isn't a thing here, so the music command
 *  cycles them instead. */
export const TRACKS = [
  { title: "Petals on the Moon", uri: "spotify:track:3BmaFHt6q91CmMrA7fLLRC" },
  { title: "Sweet Child O' Mine", uri: "spotify:track:7snQQk1zcKl8gZ92AnueZW" },
  { title: "Suddenly", uri: "spotify:track:7u0yW2XPSJozIGdUSRET19" },
  { title: "Beaches", uri: "spotify:track:1a19jsjG2DvbN1fVJonKUU" },
  { title: "impossible", uri: "spotify:track:6FDzlEOK29XWew1qfnGhaU" },
  { title: "Juna", uri: "spotify:track:2mWfVxEo4xZYDaz0v7hYrN" },
  { title: "Ghost Town", uri: "spotify:track:7vgTNTaEz3CsBZ1N4YQalM" },
];
