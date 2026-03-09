"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudio } from "@/hooks/useAudio";

export function AudioEngine() {
  console.log("🎵 AUDIOENGINE: Component rendered");

  const { isPlaying, currentTrackIndex, setIsPlaying } = usePlayerStore();
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  console.log("🎵 AUDIOENGINE: Store state - isPlaying:", isPlaying, "currentTrackIndex:", currentTrackIndex);

  // Only use audio if current track is audio type
  const isAudioTrack = currentTrack?.visual.type === "reactive";
  const audioSrc = isAudioTrack ? currentTrack.src : "";

  console.log("🎵 AUDIOENGINE: isAudioTrack:", isAudioTrack, "audioSrc:", audioSrc);

  const { play, pause, isLoaded, error, onEnd } = useAudio(audioSrc);

  console.log("🎵 AUDIOENGINE: useAudio returned - isLoaded:", isLoaded, "error:", error);

  // Sync playback state
  useEffect(() => {
    console.log("🎵 AUDIOENGINE: Sync playback effect - isAudioTrack:", isAudioTrack, "isLoaded:", isLoaded, "isPlaying:", isPlaying);
    if (!isAudioTrack || !isLoaded) {
      console.log("🎵 AUDIOENGINE: Skipping playback sync - conditions not met");
      return;
    }

    if (isPlaying) {
      console.log("🎵 AUDIOENGINE: Calling play()");
      play();
    } else {
      console.log("🎵 AUDIOENGINE: Calling pause()");
      pause();
    }
  }, [isPlaying, isAudioTrack, isLoaded, play, pause]);

  // Handle track changes - pause when switching to video track
  useEffect(() => {
    if (!isAudioTrack && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, isAudioTrack]); // Removed isPlaying from deps - only run on track changes

  // Set up auto-advance on track end
  useEffect(() => {
    if (!isAudioTrack || !isLoaded) return;

    const handleTrackEnd = () => {
      if (hasNext) {
        nextTrack();
      } else {
        // End of playlist - pause
        setIsPlaying(false);
      }
    };

    onEnd(handleTrackEnd);

    return () => {
      // Clean up the callback when component unmounts or track changes
    };
  }, [isAudioTrack, isLoaded, hasNext, nextTrack, setIsPlaying, onEnd]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("Audio error:", error);
    }
  }, [error]);

  // This component doesn't render anything - it's just for audio management
  return null;
}