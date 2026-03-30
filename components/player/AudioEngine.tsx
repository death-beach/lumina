"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudio } from "@/hooks/useAudio";

export function AudioEngine() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const seekTarget = usePlayerStore(s => s.seekTarget);
  const setSeekTarget = usePlayerStore(s => s.setSeekTarget);
  const currentTrackIndex = usePlayerStore(s => s.currentTrackIndex);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setTrackDuration = usePlayerStore(s => s.setTrackDuration);
  const setIsTransitioning = usePlayerStore(s => s.setIsTransitioning);
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  // Safety net: if a transition somehow never resolves (e.g. network error),
  // clear it after 8 seconds so the UI doesn't stay locked forever.
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only use audio if current track is audio type
  const isAudioTrack = currentTrack?.visual.type === "reactive";
  let audioSrc = "";
  if (currentTrack && currentTrack.visual.type === "reactive") {
    audioSrc = currentTrack.src as string;
  }

  const { play, pause, seek, duration, isLoaded, error, onEnd } = useAudio(audioSrc);

  // ─── Transition management ─────────────────────────────────────────────────
  // When the track index changes, a transition starts (isTransitioning = true
  // is set by the store). Clear it once the new audio is confirmed loaded.
  useEffect(() => {
    // Clear any previous safety-net timer
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (isLoaded && isAudioTrack) {
      // Track is ready — allow skipping again
      setIsTransitioning(false);
    } else if (isAudioTrack) {
      // New track is loading — start a safety-net timer
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 8000);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [isLoaded, isAudioTrack, setIsTransitioning]);

  // For non-audio tracks (video), clear the transition immediately since
  // VideoEngine manages its own loading state.
  useEffect(() => {
    if (!isAudioTrack) {
      setIsTransitioning(false);
    }
  }, [isAudioTrack, setIsTransitioning]);

  // ─── Store actual Howler duration ──────────────────────────────────────────
  useEffect(() => {
    if (isLoaded && duration > 0 && currentTrack?.id) {
      setTrackDuration(currentTrack.id, duration);
    }
  }, [duration, isLoaded, currentTrack?.id, setTrackDuration]);

  // ─── Sync playback state ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAudioTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isAudioTrack, isLoaded, play, pause]);

  // ─── Handle user-initiated seeking ────────────────────────────────────────
  useEffect(() => {
    if (!isAudioTrack || !isLoaded || !duration || seekTarget === null) return;

    const seekTime = seekTarget * duration;
    seek(seekTime);
    setSeekTarget(null); // clear after seeking so it doesn't re-fire
  }, [seekTarget, duration, isAudioTrack, isLoaded, seek, setSeekTarget]);

  // ─── Auto-advance on track end ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAudioTrack || !isLoaded) return;

    const handleTrackEnd = () => {
      if (hasNext) {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    };

    onEnd(handleTrackEnd);
  }, [isAudioTrack, isLoaded, hasNext, nextTrack, setIsPlaying, onEnd]);

  // ─── Log errors ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      console.error("Audio error:", error);
      // If loading failed, don't leave the UI in a perpetual transitioning state
      setIsTransitioning(false);
    }
  }, [error, setIsTransitioning]);

  // This component doesn't render anything — it's pure audio management
  return null;
}
