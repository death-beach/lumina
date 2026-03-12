"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudio } from "@/hooks/useAudio";

export function AudioEngine() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const seekTarget = usePlayerStore(s => s.seekTarget);
  const setSeekTarget = usePlayerStore(s => s.setSeekTarget);
  const currentTrackIndex = usePlayerStore(s => s.currentTrackIndex);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  // Only use audio if current track is audio type
  const isAudioTrack = currentTrack?.visual.type === "reactive";
  const audioSrc = isAudioTrack ? currentTrack.src : "";

  const { play, pause, seek, duration, isLoaded, error, onEnd } = useAudio(audioSrc);

  // Sync playback state
  useEffect(() => {
    if (!isAudioTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isAudioTrack, isLoaded, play, pause]);

  // Handle user-initiated seeking only
  useEffect(() => {
    if (!isAudioTrack || !isLoaded || !duration || seekTarget === null) return;

    const seekTime = seekTarget * duration;
    seek(seekTime);
    setSeekTarget(null); // clear after seeking so it doesn't re-fire
  }, [seekTarget, duration, isAudioTrack, isLoaded, seek, setSeekTarget]);



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