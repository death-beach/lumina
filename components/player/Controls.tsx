"use client";

import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";

export function Controls() {
  const {
    isPlaying,
    volume,
    isMuted,
    progress,
    setIsPlaying,
    setVolume,
    toggleMute,
    seekTo,
  } = usePlayerStore();

  const { hasNext, hasPrev, nextTrack, prevTrack } = usePlaylist();

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    seekTo(newProgress);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Main Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={handlePrev}
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
          onClick={handleNext}
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
          value={progress}
          onChange={handleSeek}
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