import "./index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Terminal from "./components/Terminal";
import PokerTable from "./components/PokerTable";
import NowPlaying from "./components/NowPlaying";
import { TRACKS } from "./data";
import type { CommandResult } from "./terminal/commands";

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

  const onEffect = useCallback((effect: NonNullable<CommandResult["effect"]>) => {
    if (effect.kind === "open") {
      window.open(effect.href, effect.href.startsWith("mailto:") ? "_self" : "_blank", "noopener");
      return;
    }
    if (effect.kind === "poker") {
      setPokerOpen(true);
      return;
    }
    if (effect.action === "toggle") setMusicOpen((o) => !o);
    else {
      setMusicOpen(true);
      setTrackIndex((i) => (i + 1) % TRACKS.length);
    }
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-bg font-mono text-subtle">
      <header className="flex items-center gap-4 border-b border-line px-4 py-3 text-xs sm:px-8 sm:text-[13px]">
        <span className="text-dim">hemosoo.dev</span>
        <span className="flex-1" />
        <button
          onClick={() => setMusicOpen((o) => !o)}
          aria-pressed={musicOpen}
          className="flex items-center gap-2 text-dim transition-colors hover:text-text"
        >
          <span className={isPlaying ? "text-green" : "text-dim"}>{isPlaying ? "▶" : "■"}</span>
          music
        </button>
      </header>

      <Terminal onEffect={onEffect} />

      <NowPlaying
        open={musicOpen}
        title={TRACKS[trackIndex].title}
        isPlaying={isPlaying}
        embedRef={embedRef}
        onClose={() => setMusicOpen(false)}
      />

      {pokerOpen && <PokerTable onClose={() => setPokerOpen(false)} />}
    </div>
  );
}
