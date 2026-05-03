"use client";

import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useState } from "react";
import { Howler } from "howler";

export function Controls() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const progress = usePlayerStore(s => s.progress);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const seekTo = usePlayerStore(s => s.seekTo);
  const imperativePlay = usePlayerStore(s => s.imperativePlay);

  const { hasNext, hasPrev, nextTrack, prevTrack } = usePlaylist();

  // Local state for drag-to-seek
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);

  const handlePlayPause = () => {
    // ── iOS / Android audio unlock — must run inside the user gesture ───────
    // Mobile browsers start the AudioContext in "suspended" state and only
    // honour resume() when called SYNCHRONOUSLY inside a user gesture.
    // Any async hop (React state → effect → play) loses the gesture scope.

    // Step 1: Force Howler's AudioContext to exist + run.
    // On a fresh page, Howler.ctx may still be null until the first Howl is
    // created. Touching Howler.volume() lazy-initialises the context inside
    // Howler without producing any sound, so the resume() that follows is
    // guaranteed to have something to act on.
    if (!Howler.ctx) {
      try {
        Howler.volume(Howler.volume());
      } catch {
        // ignore — best-effort lazy init
      }
    }
    if (Howler.ctx && Howler.ctx.state !== "running") {
      // .resume() returns a promise but we DO NOT await it — the synchronous
      // call inside the gesture is what unlocks iOS. The promise resolves later.
      Howler.ctx.resume();
    }

    // Step 2: If starting playback, call howl.play() synchronously here.
    // imperativePlay is registered immediately on Howl construction (not inside
    // onload), so it is reliably available the moment the user can tap.
    // Howler queues plays made before decode completes and will start audio
    // as soon as the file is ready — within the unlocked AudioContext.
    if (!isPlaying && imperativePlay) {
      imperativePlay();
    }

    // Step 3: Sync React state so the rest of the app (UI, AudioEngine)
    // stays consistent. AudioEngine's effect will no-op the second play()
    // because useAudio's play() guards with !howl.playing().
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
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
      // Commit the seek only on pointer release to avoid hammering the decoder
      seekTo(dragProgress);
    }
  };

  // Skip buttons are disabled only when there are no more tracks.
  // The core audio system now handles rapid skipping safely without
  // needing the isTransitioning lock (thanks to .off() before .unload()
  // and the generation counter).
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
