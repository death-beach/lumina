"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useVideo } from "@/hooks/useVideo";

export function VideoEngine() {
  const { isPlaying, currentTrackIndex, setIsPlaying } = usePlayerStore();
  const { currentTrack } = usePlaylist();

  // Only render if current track is video type
  const isVideoTrack = currentTrack?.visual.type === "video";
  const videoSrc = isVideoTrack ? (currentTrack.visual as { type: "video"; src: string; loop?: boolean }).src : "";

  const { videoRef, play, pause, isLoaded, error } = useVideo(videoSrc);

  // Sync playback state
  useEffect(() => {
    if (!isVideoTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isVideoTrack, isLoaded, play, pause]);

  // Handle track changes - pause when switching to audio track
  useEffect(() => {
    if (!isVideoTrack && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, isVideoTrack]); // Removed isPlaying from deps - only run on track changes

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
      muted={false} // Video has baked-in audio
      loop={(currentTrack.visual as { type: "video"; src: string; loop?: boolean }).loop || false}
      preload="metadata"
    />
  );
}