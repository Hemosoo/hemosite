import "./index.css";
import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { AuroraText } from "./components/godui/aurora-text";
import NowPlaying from "./components/NowPlaying";
import SectionDock from "./components/SectionDock";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  title: string;
  album: string;
  duration: string;
  sectionId: string;
  /** Spotify track URI ("spotify:track:<id>") or a share URL. Empty means no
   *  embed for this section. */
  spotify: string;
  /** Glyph shown in the dock; the title is the hover label. */
  icon: string;
}

const TRACKS: Track[] = [
  { id: 1, title: "About Me",               icon: "1", duration: "3:24", album: "Introduction",  sectionId: "about",       spotify: "spotify:track:3BmaFHt6q91CmMrA7fLLRC" }, // Petals on the Moon
  { id: 2, title: "Hold'em Bot",            icon: "2", duration: "2:38", album: "Python · CFR",  sectionId: "holdem",      spotify: "spotify:track:7snQQk1zcKl8gZ92AnueZW" }, // Sweet Child O' Mine
  { id: 3, title: "Learning Tool MCP",      icon: "3", duration: "2:22", album: "Python · MCP",  sectionId: "mcp",         spotify: "spotify:track:7u0yW2XPSJozIGdUSRET19" }, // Suddenly
  { id: 4, title: "EntryID Platform",       icon: "4", duration: "3:05", album: "Amazon · 2026", sectionId: "amazon-2026", spotify: "spotify:track:1a19jsjG2DvbN1fVJonKUU" }, // Beaches
  { id: 5, title: "Network Health Service", icon: "5", duration: "3:12", album: "Amazon · 2025", sectionId: "amazon-2025", spotify: "spotify:track:6FDzlEOK29XWew1qfnGhaU" }, // impossible
  { id: 6, title: "Gateway & Bedrock",      icon: "6", duration: "2:40", album: "Amazon · 2024", sectionId: "amazon-2024", spotify: "spotify:track:2mWfVxEo4xZYDaz0v7hYrN" }, // Juna
  { id: 7, title: "Let's Connect",          icon: "7", duration: "0:42", album: "Contact",       sectionId: "contact",     spotify: "spotify:track:7vgTNTaEz3CsBZ1N4YQalM" }, // Ghost Town
];

/** Any track wired up yet? Controls whether the embed renders at all. */
const HAS_SPOTIFY = TRACKS.some((t) => t.spotify !== "");

// ─── Spotify iFrame API ───────────────────────────────────────────────────────

interface SpotifyPlaybackData {
  playingURI: string;
  isPaused: boolean;
  isBuffering: boolean;
  /** milliseconds */
  duration: number;
  /** milliseconds */
  position: number;
}

interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(
    event: "ready" | "playback_started" | "playback_update",
    cb: (e: { data: SpotifyPlaybackData }) => void
  ): void;
}

interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: { uri: string; width: string | number; height: string | number },
    callback: (controller: SpotifyEmbedController) => void
  ): void;
}

declare global {
  interface Window {
    __spotifyIframeApi?: SpotifyIFrameAPI;
  }
}

interface Role {
  id: string;
  num: string;
  title: string;
  period: string;
  tech: string[];
  duration: string;
  bullets: string[];
}

const EXPERIENCE: Role[] = [
  {
    id: "amazon-2026",
    num: "04",
    title: "EntryID Platform",
    period: "May – Aug 2026",
    tech: ["React", "Lambda", "DynamoDB", "Smithy"],
    duration: "3:05",
    bullets: [
      "Built the EntryID plugin for Amazon Customer Service’s centralized configuration platform, replacing unvalidated legacy write paths for 5,200+ routing configurations read at runtime by Amazon Connect.",
      "Developed and launched full-stack CRUD and audit tooling using React, API Gateway, Lambda, DynamoDB, and Smithy, enabling self-service access for 70+ operations users.",
      "Designed a bulk CSV upload system by evaluating 5 architectures and implementing merge-based writes that prevent silent attribute deletion.",
    ],
  },
  {
    id: "amazon-2025",
    num: "05",
    title: "Network Health Service",
    period: "May – Aug 2025",
    tech: ["AWS CDK", "TypeScript", "Lambda", "SNS"],
    duration: "3:12",
    bullets: [
      "Served as the first developer on the Network Health Service, building the AWS infrastructure and the Missed Call Module to identify customer calls affected by poor agent network quality.",
      "Created an end-to-end pipeline in AWS CDK using TypeScript, Lambda, API Gateway, and SNS, including a reusable internal package for metric calculation and data processing.",
      "Integrated the service with Amazon Customer Service systems, enabling real-time visibility into agent connectivity issues.",
    ],
  },
  {
    id: "amazon-2024",
    num: "06",
    title: "Gateway & Bedrock",
    period: "May – Aug 2024",
    tech: ["SageMaker", "Amazon Bedrock", "Spark SQL"],
    duration: "2:40",
    bullets: [
      "Built an LLM-powered widget title generator using SageMaker, Amazon Bedrock, and prompt engineering, generating optimized titles for 10,000+ customer queries on the Amazon.com Gateway.",
      "Developed Spark SQL data pipelines and contributed to widget architecture spanning backend processing and frontend integration.",
      "Won 3rd place in an internal operational excellence hackathon for “IMReady,” an LLM-based tool that recommended cost-effective EC2 configurations from service metrics.",
    ],
  },
];


const PROJECTS = [
  {
    id: "holdem",
    num: "02",
    title: "Hold'em Bot",
    tech: ["Python", "CFR", "OpenCV"],
    duration: "2:38",
    repo: "https://github.com/Hemosoo/holdem-bot",
    blurb:
      "Texas Hold'em simulator with full betting rounds, position-aware strategy bots with GTO big-blind defence ranges, a CFR self-play trainer, and an OpenCV screen reader.",
  },
  {
    id: "mcp",
    num: "03",
    title: "Learning Tool MCP",
    tech: ["Python", "MCP"],
    duration: "2:22",
    repo: "https://github.com/Hemosoo/learning-tool-mcp",
    blurb:
      "An MCP server that turns PDFs into flashcards and quizzes, with session tracking. Runs locally for a single user, with no LLM inside the server itself.",
  },
];

const SKILLS = ["TypeScript", "React", "Python", "Java", "AWS", "SQL"];


// ─── Presentation ─────────────────────────────────────────────────────────────

const ACCENTS = ["text-primary", "text-accent", "text-cyan", "text-green", "text-yellow"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dim">
      {children}
    </span>
  );
}

function Chip({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`rounded-full border border-line bg-surface-2/60 px-2.5 py-1 text-xs font-medium ${
        tone || "text-subtle"
      }`}
    >
      {children}
    </span>
  );
}

/** Ambient wash behind the hero. Two soft radial glows in the two accent
 *  colours — the only place the palette is allowed to be loud. */
function Ambience() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/12 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,var(--color-bg)_78%)]" />
    </div>
  );
}

export default function App() {
  const [activeId, setActiveId] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const reduced = useReducedMotion();

  const activeTrack = TRACKS.find((t) => t.id === activeId) ?? TRACKS[0];

  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Honest scroll indicator — it reflects real page position, nothing more.
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.2 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const track = TRACKS.find((t) => t.sectionId === entry.target.id);
            if (track) setActiveId(track.id);
          }
        }
      },
      { threshold: 0.35 }
    );
    TRACKS.forEach((t) => {
      const el = document.getElementById(t.sectionId);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });

  useEffect(() => {
    if (!HAS_SPOTIFY) return;
    let controller: SpotifyEmbedController | null = null;
    let cancelled = false;

    const init = (api: SpotifyIFrameAPI) => {
      if (cancelled || !embedRef.current) return;
      api.createController(
        embedRef.current,
        { uri: TRACKS.find((t) => t.spotify)?.spotify ?? "", width: "100%", height: 80 },
        (c) => {
          if (cancelled) return c.destroy();
          controller = c;
          controllerRef.current = c;
          c.addListener("playback_update", (e) => setIsPlaying(!e.data.isPaused));
        }
      );
    };

    const onReady = () => window.__spotifyIframeApi && init(window.__spotifyIframeApi);
    if (window.__spotifyIframeApi) init(window.__spotifyIframeApi);
    else window.addEventListener("spotify-iframe-api-ready", onReady);

    return () => {
      cancelled = true;
      window.removeEventListener("spotify-iframe-api-ready", onReady);
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Scrolling into a section swaps the song.
  useEffect(() => {
    const c = controllerRef.current;
    if (!c || !activeTrack.spotify) return;
    c.loadUri(activeTrack.spotify);
    if (isPlayingRef.current) c.resume();
  }, [activeTrack]);

  const reveal = (delay = 0) => ({
    initial: reduced ? {} : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" } as const,
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-primary via-accent to-cyan"
      />

      {/* ── Hero ── */}
      <header className="relative flex min-h-[88vh] items-center overflow-hidden px-6">
        <Ambience />
        <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-10 py-24 md:flex-row md:items-center md:gap-14">
          <motion.div
            initial={reduced ? {} : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative order-first shrink-0 md:order-last"
          >
            <div
              aria-hidden
              className="absolute -inset-3 rounded-[2.25rem] bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl"
            />
            <img
              src={`${import.meta.env.BASE_URL}me.jpg`}
              alt="Hemosoo Woo"
              width={224}
              height={224}
              fetchPriority="high"
              className="relative h-32 w-32 rounded-3xl object-cover ring-1 ring-line md:h-56 md:w-56"
            />
          </motion.div>

          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-w-0 flex-1 flex-col gap-6"
          >
            <Eyebrow>CS @ Penn · 3× Amazon SDE Intern</Eyebrow>

            <h1 className="text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
              <AuroraText colors={["#61afef", "#c678dd", "#56b6c2", "#98c379"]}>
                Hemosoo Woo
              </AuroraText>
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-subtle">
              Full-stack developer building backend services and scalable systems that feel
              intentional and good to use. Three summers at Amazon on customer-service
              infrastructure. I also sing acapella, play poker, and am on the journey to dunking.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-[#0b0d10] transition-transform hover:scale-[1.03]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
                </svg>
                Resume
              </a>
              {[
                { label: "GitHub", href: "https://github.com/Hemosoo" },
                { label: "LinkedIn", href: "https://www.linkedin.com/in/hemosoowoo" },
                { label: "Email", href: "mailto:hemosoo.woo@gmail.com" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noreferrer"
                  className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-subtle transition-colors hover:border-primary/60 hover:text-text"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-6">
              {SKILLS.map((s, i) => (
                <Chip key={s} tone={ACCENTS[i % ACCENTS.length]}>
                  {s}
                </Chip>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-40">
        {/* ── About ── */}
        <motion.section id="about" {...reveal()} className="scroll-mt-24 border-t border-line py-20">
          <Eyebrow>About</Eyebrow>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Still learning, on purpose</h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-subtle">
            A CS senior at Penn, submatriculating into a master&apos;s in Computer and Information
            Science, focused on full-stack development, systems, and applied machine learning.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-subtle">
            Amazon Future Engineer scholar ($40,000). Before Penn I built AtaxiaV, a Unity and Leap
            Motion rehabilitation platform presented at the International Congress for Ataxia
            Research, which took 1st place in the CA-33 Congressional App Challenge.
          </p>
        </motion.section>

        {/* ── Projects ── */}
        <section className="border-t border-line py-20">
          <Eyebrow>Building</Eyebrow>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Side projects</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PROJECTS.map((proj, i) => (
              <motion.a
                key={proj.id}
                id={proj.id}
                href={proj.repo}
                target="_blank"
                rel="noreferrer"
                {...reveal(i * 0.06)}
                whileHover={reduced ? undefined : { y: -4 }}
                className="group scroll-mt-24 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-bold tracking-tight">{proj.title}</h3>
                  <span className="text-dim transition-colors group-hover:text-primary">↗</span>
                </div>
                <p className="mt-3 leading-relaxed text-subtle">{proj.blurb}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {proj.tech.map((t, j) => (
                    <Chip key={t} tone={ACCENTS[j % ACCENTS.length]}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* ── Experience ── */}
        <section className="border-t border-line py-20">
          <Eyebrow>Worked</Eyebrow>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Three summers at Amazon</h2>
          <div className="mt-10 flex flex-col gap-5">
            {EXPERIENCE.map((role, i) => (
              <motion.article
                key={role.id}
                id={role.id}
                {...reveal(i * 0.05)}
                className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40 sm:p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-2xl font-bold tracking-tight">{role.title}</h3>
                  <span className="font-mono text-sm text-dim">{role.period}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-accent">
                  SDE Intern · Amazon · Seattle, WA
                </p>
                <ul className="mt-5 flex flex-col gap-3">
                  {role.bullets.map((b) => (
                    <li key={b} className="flex gap-3 leading-relaxed text-subtle">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-2">
                  {role.tech.map((t, j) => (
                    <Chip key={t} tone={ACCENTS[j % ACCENTS.length]}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <motion.section id="contact" {...reveal()} className="scroll-mt-24 border-t border-line py-20">
          <Eyebrow>Contact</Eyebrow>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Let&apos;s connect</h2>
          <p className="mt-5 max-w-xl leading-relaxed text-subtle">
            Want to collaborate, chat about internships, or just see more work? Say hi.
          </p>
          <a
            href="mailto:hemosoo.woo@gmail.com"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-bold text-[#0b0d10] transition-transform hover:scale-[1.03]"
          >
            hemosoo.woo@gmail.com
          </a>
        </motion.section>

        <footer className="border-t border-line py-10 text-sm text-dim">
          © {new Date().getFullYear()} Hemosoo Woo · Built with React, Vite and Tailwind
        </footer>
      </main>

      <SectionDock items={TRACKS} activeId={activeId} onNavigate={scrollTo} />
      <NowPlaying title={activeTrack.title} isPlaying={isPlaying} embedRef={embedRef} />
    </div>
  );
}
