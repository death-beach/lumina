import { useMemo, useCallback } from "react";
import { usePlayerStore } from "@/store/playerStore";
import config from "@/lumina.config";

interface UsePlaylistReturn {
  tracks: typeof config.tracks;
  currentTrack: typeof config.tracks[0] | null;
  hasNext: boolean;
  hasPrev: boolean;
  nextTrack: () => void;
  prevTrack: () => void;
  goToTrack: (index: number) => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeat: "none" | "all" | "one";
  setRepeat: (mode: "none" | "all" | "one") => void;
  shuffledIndices: number[];
}

export function usePlaylist(): UsePlaylistReturn {
  const { currentTrackIndex, setCurrentTrackIndex } = usePlayerStore();

  // For now, no shuffle or repeat implemented yet
  // This is a placeholder structure
  const shuffle = false;
  const repeat: "none" | "all" | "one" = "none";

  const tracks = config.tracks;
  const currentTrack = tracks[currentTrackIndex] || null;

  const hasNext = currentTrackIndex < tracks.length - 1;
  const hasPrev = currentTrackIndex > 0;

  const nextTrack = useCallback(() => {
    if (hasNext) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    }
    // TODO: Handle end of playlist with repeat logic
  }, [hasNext, currentTrackIndex, setCurrentTrackIndex]);

  const prevTrack = useCallback(() => {
    if (hasPrev) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
    // TODO: Handle beginning of playlist with repeat logic
  }, [hasPrev, currentTrackIndex, setCurrentTrackIndex]);

  const goToTrack = useCallback((index: number) => {
    console.log("🎵 USEPLAYLIST: goToTrack called with index:", index, "valid range: 0-", tracks.length - 1);
    if (index >= 0 && index < tracks.length) {
      console.log("🎵 USEPLAYLIST: Setting currentTrackIndex to:", index);
      setCurrentTrackIndex(index);
    } else {
      console.log("🎵 USEPLAYLIST: Invalid index, not setting");
    }
  }, [tracks.length, setCurrentTrackIndex]);

  const toggleShuffle = useCallback(() => {
    // TODO: Implement shuffle toggle
    console.log("Shuffle toggle not implemented yet");
  }, []);

  const setRepeat = useCallback((mode: "none" | "all" | "one") => {
    // TODO: Implement repeat mode
    console.log("Repeat mode not implemented yet:", mode);
  }, []);

  // Placeholder for shuffled indices
  const shuffledIndices = useMemo(() => {
    return tracks.map((_, index) => index);
  }, [tracks]);

  return {
    tracks,
    currentTrack,
    hasNext,
    hasPrev,
    nextTrack,
    prevTrack,
    goToTrack,
    shuffle,
    toggleShuffle,
    repeat,
    setRepeat,
    shuffledIndices,
  };
}