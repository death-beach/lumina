"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudio } from "@/hooks/useAudio";

export function AudioEngine() {
  const { isPlaying, currentTrackIndex, setIsPlaying } = usePlayerStore();
  const { currentTrack } = usePlaylist();

  // Only use audio if current track is audio type
  const isAudioTrack = currentTrack?.visual.type === "reactive";
  const audioSrc = isAudioTrack ? currentTrack.src : "";

  const { play, pause, isLoaded, error } = useAudio(audioSrc);

  // Sync playback state
  useEffect(() => {
    if (!isAudioTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isAudioTrack, isLoaded, play, pause]);

  // Handle track changes - pause when switching to video track
  useEffect(() => {
    if (!isAudioTrack && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, isAudioTrack, isPlaying, setIsPlaying]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("Audio error:", error);
    }
  }, [error]);

  // This component doesn't render anything - it's just for audio management
  return null;
}