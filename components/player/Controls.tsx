"use client";

import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useState } from "react";

export function Controls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const progress = usePlayerStore((s) => s.progress);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const seekTo = usePlayerStore((s) => s.seekTo);

  const { hasNext, hasPrev, nextTrack, prevTrack } = usePlaylist();

  // Fullscreen lives next to the skip-forward button. `isSupported` is true
  // on desktop (all major browsers) and Android; false on iOS Safari, where
  // the Fullscreen API is not exposed to web pages — so the button hides
  // itself there instead of mocking a feature that won't fire.
  const {
    isFullscreen,
    isSupported: isFullscreenSupported,
    toggle: toggleFullscreen,
  } = useFullscreen();

  // Local state for drag-to-seek
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);

  // ── Play / pause ──────────────────────────────────────────────────────────
  // Audio plays through an HTML <audio> element (Howler html5:true).  iOS
  // Safari is happy to honour audioElement.play() driven from a React state
  // change, as long as the originating event is a user gesture — which a
  // button onClick always is.  No AudioContext to unlock, no imperative
  // bridge, no synchronous-gesture acrobatics required.
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  // Drag-to-seek handlers
  const handleSeekStart = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsDragging(true);
    const target = e.target as HTMLInputElement;
    setDragProgress(parseFloat(target.value));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (isDragging) {
      const target = e.target as HTMLInputElement;
      setDragProgress(parseFloat(target.value));
    }
  };

  const handleSeekEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      // Commit the seek only on pointer release to avoid hammering the decoder.
      seekTo(dragProgress);
    }
  };

  // Skip buttons are disabled only when there are no more tracks.  The
  // generation counter inside useAudio handles rapid skipping safely.
  const prevDisabled = !hasPrev;
  const nextDisabled = !hasNext;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Main Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => { if (!prevDisabled) prevTrack(); }}
          className="p-3 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={prevDisabled}
        >
          ⏮
        </button>

        <button
          onClick={handlePlayPause}
          className="p-4 rounded-full bg-accent hover:bg-accent/80 transition-colors text-background"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button
          onClick={() => { if (!nextDisabled) nextTrack(); }}
          className="p-3 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={nextDisabled}
        >
          ⏭
        </button>

        {isFullscreenSupported && (
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className={`p-3 rounded-full transition-colors ${
              isFullscreen
                ? "bg-accent text-background"
                : "bg-accent/20 hover:bg-accent/30"
            }`}
          >
            {/* ⛶ = expand (enter fullscreen) — ⊡ = compress (exit) */}
            {isFullscreen ? "⊡" : "⛶"}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={isDragging ? dragProgress : progress}
          onMouseDown={handleSeekStart}
          onChange={handleSeekChange}
          onMouseUp={handleSeekEnd}
          onMouseLeave={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchMove={handleSeekChange}
          onTouchEnd={handleSeekEnd}
          className="w-full h-2 bg-foreground/20 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 h-1 bg-foreground/20 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  );
}
