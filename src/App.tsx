import "./index.css";
import "./styles/player.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import PokerTable from "./components/PokerTable";
import Hero from "./components/Hero";
import Cursor from "./components/Cursor";
import Showcase from "./components/Showcase";
import NowPlaying from "./components/NowPlaying";
import { TRACKS } from "./data";
import type { Stretch, StretchState } from "./bio/stretch";
import { TOTAL_NODES } from "./bio/content";

// ─── Spotify iFrame API ───────────────────────────────────────────────────────

interface SpotifyPlaybackData {
  playingURI: string;
  isPaused: boolean;
  isBuffering: boolean;
  duration: number;
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

export default function App() {
  const [musicOpen, setMusicOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);

  useEffect(() => {
    let controller: SpotifyEmbedController | null = null;
    let cancelled = false;

    const init = (api: SpotifyIFrameAPI) => {
      if (cancelled || !embedRef.current) return;
      api.createController(
        embedRef.current,
        { uri: TRACKS[0].uri, width: "100%", height: 80 },
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

  useEffect(() => {
    controllerRef.current?.loadUri(TRACKS[trackIndex].uri);
  }, [trackIndex]);

  const [pokerOpen, setPokerOpen] = useState(false);
  const openPoker = useCallback(() => setPokerOpen(true), []);

  // The bio's engine, and what the bar shows of it.
  const stretchRef = useRef<Stretch | null>(null);
  const [bio, setBio] = useState<StretchState>({ open: 0, total: TOTAL_NODES, depth: "0" });
  const barRef = useRef<HTMLElement>(null);
  const getBar = useCallback(() => barRef.current, []);

  return (
    <div className="min-h-[100svh] bg-bg font-sans text-subtle">
      <Hero />

      <header
        ref={barRef}
        className="sticky top-0 z-20 flex items-center gap-3 border-y border-line bg-bg/90 px-4 py-2 font-mono text-xs text-dim backdrop-blur sm:gap-4 sm:px-8 sm:text-[12.5px]"
      >
        <span className="hidden sm:inline">hemosoo.com</span>
        <span className="flex-1" />
        {/* How much of the bio to show. */}
        <div className="sc-depth" role="group" aria-label="How much of the bio to show">
          <span className="count">
            {bio.open} of {bio.total} open
          </span>
          {(
            [
              ["0", "Short"],
              ["1", "More"],
              ["9", "Everything"],
            ] as const
          ).map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={bio.depth === d}
              onClick={() => stretchRef.current?.setDepth(Number(d))}
            >
              {label}
            </button>
          ))}
        </div>
        <span aria-hidden className="h-4 w-px bg-line" />
        <button
          onClick={() => setMusicOpen((o) => !o)}
          aria-pressed={musicOpen}
          className="flex items-center gap-2 transition-colors hover:text-text"
        >
          <span className={isPlaying ? "text-green" : "text-dim"}>{isPlaying ? "▶" : "■"}</span>
          music
        </button>
        {musicOpen && (
          <button
            onClick={() => setTrackIndex((i) => (i + 1) % TRACKS.length)}
            className="transition-colors hover:text-text"
            aria-label="Next track"
          >
            next
          </button>
        )}
      </header>

      <Showcase stretchRef={stretchRef} onState={setBio} onPoker={openPoker} bar={getBar} />

      <NowPlaying
        pinned
        open={musicOpen}
        title={TRACKS[trackIndex].title}
        isPlaying={isPlaying}
        embedRef={embedRef}
        onClose={() => setMusicOpen(false)}
      />

      {/* AnimatePresence so closing plays out instead of cutting. */}
      <AnimatePresence>
        {pokerOpen && <PokerTable key="poker" onClose={() => setPokerOpen(false)} />}
      </AnimatePresence>

      <Cursor />
    </div>
  );
}
