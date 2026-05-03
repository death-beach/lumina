"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Howler } from "howler";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { AudioEngine } from "./AudioEngine";
import { VideoEngine } from "./VideoEngine";
import { Controls } from "./Controls";
import { TrackInfo } from "./TrackInfo";
import { LyricsPanel } from "./LyricsPanel";
import { PlaylistRail } from "./PlaylistRail";
import { VisualizerManager } from "../visualizer/VisualizerManager";
import { useLyrics } from "@/hooks/useLyrics";
import { useFullscreen } from "@/hooks/useFullscreen";
import config from "@/lumina.config";

const IDLE_TIMEOUT_MS = 3000;

export function PlayerShell() {
  const isPlaylistOpen = usePlayerStore(s => s.isPlaylistOpen);
  const isLyricsVisible = usePlayerStore(s => s.isLyricsVisible);
  const togglePlaylist = usePlayerStore(s => s.togglePlaylist);
  const toggleLyrics = usePlayerStore(s => s.toggleLyrics);
  const { hasLyrics } = useLyrics();
  const { nextTrack, prevTrack } = usePlaylist();
  const { isFullscreen, isSupported: isFullscreenSupported, toggle: toggleFullscreen } = useFullscreen();

  // ── Mobile viewport height ────────────────────────────────────────────────
  // iOS Safari changes the viewport height as the address bar shows/hides.
  // We track the actual visible height via visualViewport and set --app-height
  // so the shell always fits exactly without scrolling or clipping.
  useEffect(() => {
    const updateAppHeight = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
    };

    updateAppHeight(); // run immediately on mount

    window.visualViewport?.addEventListener("resize", updateAppHeight);
    window.visualViewport?.addEventListener("scroll", updateAppHeight);
    window.addEventListener("resize", updateAppHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateAppHeight);
      window.visualViewport?.removeEventListener("scroll", updateAppHeight);
      window.removeEventListener("resize", updateAppHeight);
    };
  }, []);

  // ── Mobile AudioContext unlock ────────────────────────────────────────────
  // Belt-and-suspenders: any touch or click anywhere on the page will attempt
  // to resume the AudioContext if it is still suspended. This covers cases
  // that don't go through the play button (e.g. autoplay after track change,
  // playlist tap, etc.). The listener is intentionally kept alive for the full
  // session because the context can re-suspend after a phone call or tab switch.
  useEffect(() => {
    const unlockAudio = () => {
      if (Howler.ctx && Howler.ctx.state !== "running") {
        Howler.ctx.resume();
      }
    };

    document.addEventListener("touchstart", unlockAudio, { passive: true });
    document.addEventListener("click", unlockAudio, { passive: true });

    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // ── Idle / auto-hide UI ───────────────────────────────────────────────────
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Kick off the initial idle timer without touching state
    idleTimer.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);

    const events = ["mousemove", "mousedown", "touchstart", "keydown"] as const;
    events.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI is visible when not idle, OR when a panel is open
  const uiVisible = !isIdle || isPlaylistOpen;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          const { isPlaying, setIsPlaying } = usePlayerStore.getState();
          setIsPlaying(!isPlaying);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          const { progress, seekTo } = usePlayerStore.getState();
          seekTo(Math.max(0, progress - 0.05)); // Seek back 5%
          break;

        case 'ArrowRight':
          e.preventDefault();
          const { progress: currentProgress, seekTo: seekToRight } = usePlayerStore.getState();
          seekToRight(Math.min(1, currentProgress + 0.05)); // Seek forward 5%
          break;

        case 'ArrowUp':
          e.preventDefault();
          nextTrack();
          break;

        case 'ArrowDown':
          e.preventDefault();
          prevTrack();
          break;

        case 'Escape':
          e.preventDefault();
          if (isPlaylistOpen) togglePlaylist();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaylistOpen, togglePlaylist, nextTrack, prevTrack]);

  return (
    <div
      className="relative w-full bg-background overflow-hidden"
      style={{
        height: "var(--app-height)",
        cursor: isIdle ? "none" : "default",
      }}
    >
      {/* Background Layer - Visualizer or Video */}
      <VisualizerManager />

      {/* Audio/Video Engines */}
      <AudioEngine />
      <VideoEngine />

      {/* UI Overlays */}
      <motion.div
        className="relative z-10 w-full h-full pointer-events-none"
        animate={{ opacity: uiVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {/* Top Bar - Logo, Artist Info, Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
          <div className="flex items-center justify-end">
            {/* Top Controls */}
            <div className="flex items-center gap-4">
              {/* Lyrics toggle — only show if current track has lyrics */}
              {hasLyrics && (
                <button
                  onClick={toggleLyrics}
                  title={isLyricsVisible ? "Hide lyrics" : "Show lyrics"}
                  className={`p-2 rounded-full transition-colors ${
                    isLyricsVisible
                      ? "bg-accent text-background"
                      : "bg-accent/20 hover:bg-accent/30"
                  }`}
                >
                  ♪
                </button>
              )}
              <button
                onClick={togglePlaylist}
                className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors"
              >
                📋
              </button>
              {/* Fullscreen button — shown when supported (desktop + Android).
                  iOS Safari doesn't support the Fullscreen API; users should
                  use "Add to Home Screen" for a true fullscreen experience. */}
              {isFullscreenSupported && (
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className={`p-2 rounded-full transition-colors ${
                    isFullscreen
                      ? "bg-accent text-background"
                      : "bg-accent/20 hover:bg-accent/30"
                  }`}
                >
                  {/* ⛶ = expand (enter fullscreen) — ⊡ = compress (exit) */}
                  {isFullscreen ? "⊡" : "⛶"}
                </button>
              )}
              <button
                onClick={config.storeUrl ? () => window.open(config.storeUrl, '_blank') : undefined}
                className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors"
              >
                🛍️
              </button>
            </div>
          </div>
        </div>

        {/* Track Info - Animated in/out */}
        <TrackInfo />

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
          <Controls />
        </div>
      </motion.div>

      {/* Lyrics Panel - outside idle-fade so it stays visible when UI hides */}
      <LyricsPanel />

      {/* Playlist Rail - Outside UI overlays for proper z-index */}
      <PlaylistRail />
    </div>
  );
}
