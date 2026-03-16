"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useVideo } from "@/hooks/useVideo";

export function VideoEngine() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const seekTarget = usePlayerStore(s => s.seekTarget);
  const setSeekTarget = usePlayerStore(s => s.setSeekTarget);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setTrackDuration = usePlayerStore(s => s.setTrackDuration);
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  // Only render if current track is video type
  const isVideoTrack = currentTrack?.visual.type === "video";
  const videoSrc = isVideoTrack ? (currentTrack.visual as { type: "video"; src: string; loop?: boolean }).src : "";

  const { videoRef, play, pause, seek, duration, isLoaded, error } = useVideo(videoSrc);

  // Report video duration to the store so controls can display it
  useEffect(() => {
    if (isLoaded && duration > 0 && currentTrack?.id) {
      setTrackDuration(currentTrack.id, duration);
    }
  }, [duration, isLoaded, currentTrack?.id, setTrackDuration]);

  // Sync playback state
  useEffect(() => {
    if (!isVideoTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isVideoTrack, isLoaded, play, pause]);

  // Handle user-initiated seeking
  useEffect(() => {
    if (!isVideoTrack || !isLoaded || !duration || seekTarget === null) return;

    const seekTime = seekTarget * duration;
    seek(seekTime);
    setSeekTarget(null);
  }, [seekTarget, duration, isVideoTrack, isLoaded, seek, setSeekTarget]);

  // Auto-advance to next track when video ends
  useEffect(() => {
    if (!isVideoTrack || !videoRef.current) return;

    const video = videoRef.current;
    const handleEnded = () => {
      if (hasNext) {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [isVideoTrack, hasNext, nextTrack, setIsPlaying, videoRef]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("Video error:", error);
    }
  }, [error]);

  // Don't render if not a video track
  if (!isVideoTrack) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      className="absolute inset-0 w-full h-full object-cover"
      playsInline
      muted={false}
      loop={(currentTrack.visual as { type: "video"; src: string; loop?: boolean }).loop || false}
      preload="metadata"
    />
  );
}
