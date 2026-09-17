import "./index.css";
import { useState, useEffect } from "react";
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
}

const TRACKS: Track[] = [
  { id: 1, title: "About Me",                   album: "Introduction",      duration: "3:24", sectionId: "about"   },
  { id: 2, title: "Roomies",                     album: "React · TypeScript", duration: "2:47", sectionId: "roomies" },
  { id: 3, title: "Network Health Service",      album: "AWS · CDK",          duration: "3:12", sectionId: "network" },
  { id: 4, title: "Book ↔ Movie Recommender",   album: "Python · ML",        duration: "2:55", sectionId: "books"   },
  { id: 5, title: "Let's Connect",              album: "Contact",            duration: "0:42", sectionId: "contact" },
];

const PROJECTS = [
  {
    id: "roomies",
    num: "02",
    title: "Roomies",
    tech: ["React", "TypeScript"],
    duration: "2:47",
    blurb: "Mobile app for shared tasks & schedules between roommates. Clean UI, realtime sync.",
  },
  {
    id: "network",
    num: "03",
    title: "Network Health Service",
    tech: ["AWS", "CDK"],
    duration: "3:12",
    blurb: "Serverless pipeline to monitor & alert on network events, built infrastructure-as-code.",
  },
  {
    id: "books",
    num: "04",
    title: "Book ↔ Movie Recommender",
    tech: ["Python", "ML"],
    duration: "2:55",
    blurb: "Pairs titles by themes & metadata using NLP-based ranking to bridge books and film.",
  },
];

const SKILLS = ["TypeScript", "React", "Python", "Node.js", "AWS", "SQL"];

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

  const seek = (pct: number) => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (pct / 100) * total, behavior: "smooth" });
  };

  const activeIndex = TRACKS.findIndex((t) => t.id === activeId);

  const inViewProps = (delay = 0) => ({
    initial: reduced ? {} : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" } as const,
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-[90px]">

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
              Full-stack developer · Musician · For fun Athlete · CS Student
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

              <a
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                target="_blank"
                rel="noreferrer"
                className="text-[#A7A7A7] hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                Resume ↗
              </a>
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
            I love learning new things. Currently a CS junior focused on
            full-stack development, systems, and applied machine learning. I work with TypeScript,
            React, and Python — building backend services and scalable systems that feel
            intentional and good to use. Outside of coding, I sing Acapella, play poker, and am on the
            journey to dunking. 
          </p>
          <p className="mt-5 text-sm text-[#6A6A6A] tracking-wide">
            {SKILLS.join(" · ")}
          </p>
        </motion.section>

        {/* Projects */}
        {PROJECTS.map((proj, i) => (
          <motion.section key={proj.id} id={proj.id} {...inViewProps(i * 0.04)}>
            <SectionMeta num={proj.num} duration={proj.duration} />
            <div className="bg-[#181818] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
              <h2 className="text-3xl font-black mb-1">{proj.title}</h2>
              <p className="text-sm text-[#6A6A6A] mb-4">{proj.tech.join(" · ")}</p>
              <p className="text-[#A7A7A7] leading-relaxed">{proj.blurb}</p>
            </div>
          </motion.section>
        ))}

        {/* Contact */}
        <motion.section id="contact" {...inViewProps()}>
          <SectionMeta num="05" duration="0:42" />
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
      <PlayerBar
        track={activeTrack}
        isPlaying={isPlaying}
        progress={progress}
        totalSeconds={TOTAL_SECONDS}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex < TRACKS.length - 1}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onSeek={seek}
      />
    </div>
  );
}
