"use client";

import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useState, useRef } from "react";

export function Controls() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const progress = usePlayerStore(s => s.progress);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const seekTo = usePlayerStore(s => s.seekTo);

  const { hasNext, hasPrev, nextTrack, prevTrack } = usePlaylist();
  
  // Local state for drag-to-seek
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);
  
  // Track skip cooldown
  const lastSkipRef = useRef(0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrev = () => {
    if (hasPrev) {
      prevTrack();
    }
  };

  const handleNext = () => {
    if (hasNext) {
      nextTrack();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Drag-to-seek handlers
  const handleSeekStart = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsDragging(true);
    const target = e.target as HTMLInputElement;
    const newProgress = parseFloat(target.value);
    setDragProgress(newProgress);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (isDragging) {
      const target = e.target as HTMLInputElement;
      const newProgress = parseFloat(target.value);
      setDragProgress(newProgress);
    }
  };

  const handleSeekEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      // Only seek on release to prevent rapid decode attempts
      seekTo(dragProgress);
    }
  };

  // Track skip handlers with cooldown
  const handlePrevWithCooldown = () => {
    const now = Date.now();
    if (now - lastSkipRef.current < 600) return; // 800ms cooldown
    lastSkipRef.current = now;
    if (hasPrev) {
      prevTrack();
    }
  };

  const handleNextWithCooldown = () => {
    const now = Date.now();
    if (now - lastSkipRef.current < 600) return; // 800ms cooldown
    lastSkipRef.current = now;
    if (hasNext) {
      nextTrack();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Main Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={handlePrevWithCooldown}
          className="p-3 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasPrev}
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
          onClick={handleNextWithCooldown}
          className="p-3 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasNext}
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