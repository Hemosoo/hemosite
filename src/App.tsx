import "./index.css";
import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Equalizer from "./components/Equalizer";
import PlayerBar from "./components/PlayerBar";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  title: string;
  album: string;
  duration: string;
  sectionId: string;
  /** Spotify track URI ("spotify:track:<id>") or a share URL. Empty means no
   *  embed for this section, and the player keeps its scroll-driven fallback. */
  spotify: string;
}

const TRACKS: Track[] = [
  { id: 1, title: "About Me",               album: "Introduction",   duration: "3:24", sectionId: "about",       spotify: "spotify:track:3BmaFHt6q91CmMrA7fLLRC" }, // Petals on the Moon
  { id: 2, title: "Hold'em Bot",            album: "Python · CFR",   duration: "2:38", sectionId: "holdem",      spotify: "spotify:track:7snQQk1zcKl8gZ92AnueZW" }, // Sweet Child O' Mine
  { id: 3, title: "Learning Tool MCP",      album: "Python · MCP",   duration: "2:22", sectionId: "mcp",         spotify: "spotify:track:7u0yW2XPSJozIGdUSRET19" }, // Suddenly
  { id: 4, title: "EntryID Platform",       album: "Amazon · 2026",  duration: "3:05", sectionId: "amazon-2026", spotify: "spotify:track:1a19jsjG2DvbN1fVJonKUU" }, // Beaches
  { id: 5, title: "Network Health Service", album: "Amazon · 2025",  duration: "3:12", sectionId: "amazon-2025", spotify: "spotify:track:6FDzlEOK29XWew1qfnGhaU" }, // impossible
  { id: 6, title: "Gateway & Bedrock",      album: "Amazon · 2024",  duration: "2:40", sectionId: "amazon-2024", spotify: "spotify:track:2mWfVxEo4xZYDaz0v7hYrN" }, // Juna
  { id: 7, title: "Let's Connect",          album: "Contact",        duration: "0:42", sectionId: "contact",     spotify: "spotify:track:7vgTNTaEz3CsBZ1N4YQalM" }, // Ghost Town
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

/** "3:24" → 204 */
function toSeconds(d: string): number {
  const [m, s] = d.split(":").map(Number);
  return m * 60 + s;
}

const TOTAL_SECONDS = TRACKS.reduce((sum, t) => sum + toSeconds(t.duration), 0);
const TOTAL_LABEL = `${Math.round(TOTAL_SECONDS / 60)} min`;

// ─── Small components ─────────────────────────────────────────────────────────


function SectionMeta({ num, duration }: { num: string; duration: string }) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
      <span className="text-xs text-[#6A6A6A] uppercase tracking-[0.15em]">Track {num}</span>
      <span className="text-xs text-[#6A6A6A] tabular-nums">{duration}</span>
    </div>
  );
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onClick,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Jump to ${track.title}`}
      className={`grid items-center px-4 py-3 rounded-md cursor-pointer select-none transition-colors duration-100 ${
        hovered || isActive ? "bg-white/5" : ""
      }`}
      style={{ gridTemplateColumns: "2rem 1fr 1fr 3.5rem", gap: "1rem" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // Space would otherwise scroll the page
          onClick();
        }
      }}
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={reduced ? false : { opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      {/* Number / Equalizer / Play icon */}
      <div className="flex items-center justify-center w-8">
        {isActive && isPlaying ? (
          <Equalizer />
        ) : hovered ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <span
            className={`text-sm tabular-nums ${isActive ? "text-[#1DB954]" : "text-[#A7A7A7]"}`}
          >
            {index}
          </span>
        )}
      </div>

      {/* Title + subtitle */}
      <div className="min-w-0">
        <p className={`font-medium truncate ${isActive ? "text-[#1DB954]" : "text-white"}`}>
          {track.title}
        </p>
        <p className="text-sm text-[#A7A7A7] truncate">Hemosoo</p>
      </div>

      {/* Album */}
      <div className="hidden md:block min-w-0">
        <p className="text-sm text-[#A7A7A7] truncate">{track.album}</p>
      </div>

      {/* Duration */}
      <div className="text-sm text-[#A7A7A7] text-right tabular-nums">{track.duration}</div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeId, setActiveId] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  // ── Spotify ──
  // embedReady stays false until a controller exists, so with no URIs wired up
  // the player keeps its original scroll-driven behaviour.
  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const [embedReady, setEmbedReady] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(0);
  const [embedDuration, setEmbedDuration] = useState(0);
  // Read inside the track-change effect without making it re-run on play/pause.
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const activeTrack = TRACKS.find((t) => t.id === activeId) ?? TRACKS[0];

  // Sync scroll → progress bar
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync scroll → active track (IntersectionObserver)
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
      { threshold: 0.4 }
    );
    TRACKS.forEach((t) => {
      const el = document.getElementById(t.sectionId);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsPlaying(true);
  };

  const step = (delta: number) => {
    const i = TRACKS.findIndex((t) => t.id === activeId);
    const next = TRACKS[i + delta];
    if (next) scrollTo(next.sectionId);
  };

  // With an embed loaded the bar scrubs the song; without it, it scrubs the page.
  const seek = (pct: number) => {
    const c = controllerRef.current;
    if (embedReady && c && embedDuration > 0) {
      c.seek((pct / 100) * embedDuration);
      setEmbedProgress(pct);
      return;
    }
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (pct / 100) * total, behavior: "smooth" });
  };

  const activeIndex = TRACKS.findIndex((t) => t.id === activeId);

  // Create the embed controller once the iFrame API is available. index.html
  // stashes the API on window, so this works whether the script resolves
  // before or after React mounts.
  useEffect(() => {
    if (!HAS_SPOTIFY) return;
    let controller: SpotifyEmbedController | null = null;
    let cancelled = false;

    const init = (api: SpotifyIFrameAPI) => {
      if (cancelled || !embedRef.current) return;
      const first = TRACKS.find((t) => t.spotify)?.spotify ?? "";
      api.createController(
        embedRef.current,
        { uri: first, width: "100%", height: 80 },
        (c) => {
          if (cancelled) {
            c.destroy();
            return;
          }
          controller = c;
          controllerRef.current = c;
          setEmbedReady(true);
          // Spotify owns the transport, so mirror its state rather than
          // tracking our own and drifting out of sync.
          c.addListener("playback_update", (e) => {
            const { duration, position, isPaused } = e.data;
            setEmbedDuration(duration / 1000);
            setEmbedProgress(duration > 0 ? (position / duration) * 100 : 0);
            setIsPlaying(!isPaused);
          });
        }
      );
    };

    const onReady = () => {
      if (window.__spotifyIframeApi) init(window.__spotifyIframeApi);
    };
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
    // Autoplay is blocked until the visitor interacts; Spotify reports the
    // real state back through playback_update either way.
    if (isPlayingRef.current) c.resume();
  }, [activeTrack]);

  const inViewProps = (delay = 0) => ({
    initial: reduced ? {} : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" } as const,
    transition: { duration: 0.6, delay },
  });

  return (
    <div className={`min-h-screen bg-[#121212] text-white ${HAS_SPOTIFY ? "pb-[190px]" : "pb-[90px]"}`}>

      {/* ── Playlist header ── */}
      <div className="bg-gradient-to-b from-[#1a3d2a] via-[#1a1a1a] to-[#121212]">
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-8 flex flex-col sm:flex-row items-end gap-6">

          {/* Cover art */}
          <motion.div
            className="w-44 h-44 sm:w-52 sm:h-52 flex-shrink-0"
            initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}me.JPG`}
              alt="Hemosoo"
              className="w-full h-full object-cover rounded shadow-2xl"
              fetchPriority="high"
              width={208}
              height={208}
            />
          </motion.div>

          {/* Playlist info */}
          <motion.div
            className="flex flex-col gap-1.5"
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">
              Public Playlist
            </span>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none">
              Hemosoo
            </h1>
            <p className="text-sm text-[#A7A7A7] mt-1 leading-relaxed">
              Full-stack developer · 3× Amazon SDE Intern · Musician · CS @ Penn
              <br />
              <span className="text-white font-medium">{TRACKS.length} tracks</span>
              <span className="mx-2 opacity-30">·</span>
              <span>{TOTAL_LABEL}</span>
            </p>

            <div className="flex items-center gap-5 mt-4">
              <motion.button
                onClick={() => scrollTo("about")}
                className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                whileHover={{ scale: 1.06, backgroundColor: "#1ed760" }}
                whileTap={{ scale: 0.95 }}
                aria-label="Play"
              >
                <svg className="w-6 h-6 text-black translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.button>

              <motion.a
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
                </svg>
                Resume
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>

      {/* ── Track table ── */}
      <section className="max-w-5xl mx-auto px-6 pt-4 pb-2">
        {/* Column headers */}
        <div
          className="grid px-4 py-2 mb-1 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-[#6A6A6A]"
          style={{ gridTemplateColumns: "2rem 1fr 1fr 3.5rem", gap: "1rem" }}
        >
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          {/* clock icon */}
          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
          </svg>
        </div>

        {TRACKS.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i + 1}
            isActive={activeId === track.id}
            isPlaying={isPlaying}
            onClick={() => scrollTo(track.sectionId)}
          />
        ))}
      </section>

      {/* ── Content sections ── */}
      <div className="max-w-5xl mx-auto px-6 space-y-20">

        {/* About */}
        <motion.section id="about" {...inViewProps()}>
          <SectionMeta num="01" duration="3:24" />
          <h2 className="text-4xl font-black mb-5">About Me</h2>
          <p className="text-[#A7A7A7] leading-relaxed text-lg max-w-2xl">
            I love learning new things. Currently a CS senior at Penn, submatriculating
            into a master&apos;s in Computer and Information Science, focused on full-stack
            development, systems, and applied machine learning. I work with TypeScript,
            React, and Python — building backend services and scalable systems that feel
            intentional and good to use. Outside of coding, I sing Acapella, play poker, and am on the
            journey to dunking.
          </p>
          <p className="mt-4 text-[#A7A7A7] leading-relaxed max-w-2xl">
            Three summers as an SDE intern at Amazon in Seattle. Amazon Future Engineer
            scholar ($40,000). Before Penn I built AtaxiaV, a Unity and Leap Motion
            rehabilitation platform presented at the International Congress for Ataxia
            Research, which took 1st place in the CA-33 Congressional App Challenge.
          </p>
          <p className="mt-5 text-sm text-[#6A6A6A] tracking-wide">
            {SKILLS.join(" · ")}
          </p>
        </motion.section>

        {/* Side projects */}
        {PROJECTS.map((proj, i) => (
          <motion.section key={proj.id} id={proj.id} {...inViewProps(i * 0.04)}>
            <SectionMeta num={proj.num} duration={proj.duration} />
            <div className="bg-[#181818] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                <h2 className="text-3xl font-black">{proj.title}</h2>
                <a
                  href={proj.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#A7A7A7] hover:text-[#1DB954] transition-colors"
                >
                  View on GitHub ↗
                </a>
              </div>
              <p className="text-sm text-[#6A6A6A] mb-4">{proj.tech.join(" · ")}</p>
              <p className="text-[#A7A7A7] leading-relaxed">{proj.blurb}</p>
            </div>
          </motion.section>
        ))}

        {/* Experience — three summers at Amazon */}
        {EXPERIENCE.map((role, i) => (
          <motion.section key={role.id} id={role.id} {...inViewProps(i * 0.04)}>
            <SectionMeta num={role.num} duration={role.duration} />
            <div className="bg-[#181818] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
                <h2 className="text-3xl font-black">{role.title}</h2>
                <span className="text-sm text-[#6A6A6A] tabular-nums">{role.period}</span>
              </div>
              <p className="text-sm text-[#1DB954] font-semibold mb-4">
                Software Development Engineer Intern · Amazon · Seattle, WA
              </p>
              <ul className="space-y-3">
                {role.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[#A7A7A7] leading-relaxed">
                    <span aria-hidden className="text-[#1DB954] flex-shrink-0">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-[#6A6A6A]">{role.tech.join(" · ")}</p>
            </div>
          </motion.section>
        ))}

        {/* Contact */}
        <motion.section id="contact" {...inViewProps()}>
          <SectionMeta num="07" duration="0:42" />
          <h2 className="text-4xl font-black mb-3">Let&apos;s Connect</h2>
          <p className="text-[#A7A7A7] mb-6 leading-relaxed max-w-xl">
            Want to collaborate, chat about internships, or just see more work? Say hi.
          </p>
          <div className="flex flex-wrap gap-3">
            <motion.a
              href="mailto:hemosoo.woo@gmail.com"
              className="inline-flex items-center gap-2 bg-[#1DB954] text-black font-bold px-5 py-3 rounded-full text-sm"
              whileHover={{ scale: 1.04, backgroundColor: "#1ed760" }}
              whileTap={{ scale: 0.97 }}
            >
              Email Me
            </motion.a>
            <motion.a
              href="https://github.com/hemosoo"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-5 py-3 rounded-full text-sm hover:border-white/40 transition-colors"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              GitHub ↗
            </motion.a>
            <motion.a
              href="https://www.linkedin.com/in/hemosoowoo"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-5 py-3 rounded-full text-sm hover:border-white/40 transition-colors"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              LinkedIn ↗
            </motion.a>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10 text-sm text-[#6A6A6A]">
          © {new Date().getFullYear()} Hemosoo Woo · Built with React + Vite + Tailwind
        </footer>
      </div>

      {/* ── Player bar ── */}
      {/* Spotify requires its player stay visible; it docks above the bar. */}
      {HAS_SPOTIFY && (
        <div className="fixed inset-x-0 bottom-[90px] z-40 bg-[#181818] border-t border-white/10 px-4 py-2">
          <div className="max-w-5xl mx-auto">
            <div ref={embedRef} />
          </div>
        </div>
      )}

      <PlayerBar
        track={activeTrack}
        isPlaying={isPlaying}
        progress={embedReady ? embedProgress : progress}
        totalSeconds={embedReady ? embedDuration : TOTAL_SECONDS}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex < TRACKS.length - 1}
        onPlayPause={() => {
          const c = controllerRef.current;
          if (embedReady && c) c.togglePlay();
          else setIsPlaying((p) => !p);
        }}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onSeek={seek}
      />
    </div>
  );
}
