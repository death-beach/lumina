"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useVideo } from "@/hooks/useVideo";

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];
  
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];
  
  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

export function VideoEngine() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setTrackDuration = usePlayerStore(s => s.setTrackDuration);
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Only render if current track is video type
  const isVideoTrack = currentTrack?.visual.type === "video";
  const videoSrc = isVideoTrack ? (currentTrack.visual as { type: "video"; src: string; loop?: boolean }).src : "";
  
  const youtubeId = getYouTubeVideoId(videoSrc);
  const isYouTube = !!youtubeId;

  // For direct MP4 videos, use the existing video hook
  const seekTarget = usePlayerStore(s => s.seekTarget);
  const setSeekTarget = usePlayerStore(s => s.setSeekTarget);
  const { videoRef, play, pause, seek, duration, isLoaded, error } = useVideo(isYouTube ? "" : videoSrc);

  // Report video duration to the store (for direct MP4 only)
  useEffect(() => {
    if (!isYouTube && isLoaded && duration > 0 && currentTrack?.id) {
      setTrackDuration(currentTrack.id, duration);
    }
  }, [duration, isLoaded, currentTrack?.id, setTrackDuration, isYouTube]);

  // Sync playback state for direct MP4
  useEffect(() => {
    if (isYouTube || !isVideoTrack || !isLoaded) return;

    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isVideoTrack, isLoaded, play, pause, isYouTube]);

  // Handle seeking for direct MP4
  useEffect(() => {
    if (isYouTube || !isVideoTrack || !isLoaded || !duration || seekTarget === null) return;

    const seekTime = seekTarget * duration;
    seek(seekTime);
    setSeekTarget(null);
  }, [seekTarget, duration, isVideoTrack, isLoaded, seek, setSeekTarget, isYouTube]);

  // Auto-advance for direct MP4
  useEffect(() => {
    if (isYouTube || !isVideoTrack || !videoRef.current) return;

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
  }, [isVideoTrack, hasNext, nextTrack, setIsPlaying, videoRef, isYouTube]);

  // YouTube postMessage control
  useEffect(() => {
    if (!isYouTube || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    // Send play/pause commands via postMessage
    const command = isPlaying ? '{"event":"command","func":"playVideo","args":""}' : '{"event":"command","func":"pauseVideo","args":""}';
    iframe.contentWindow?.postMessage(command, '*');
  }, [isPlaying, isYouTube]);

  // Listen for YouTube player state changes
  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from YouTube
      if (!event.origin.includes('youtube.com')) return;

      try {
        const data = JSON.parse(event.data);
        
        // State 0 = ended
        if (data.event === 'onStateChange' && data.info === 0) {
          if (hasNext) {
            nextTrack();
          } else {
            setIsPlaying(false);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isYouTube, hasNext, nextTrack, setIsPlaying]);

  // Log errors for direct MP4
  useEffect(() => {
    if (error) {
      console.error("Video error:", error);
    }
  }, [error]);

  // Don't render if not a video track
  if (!isVideoTrack) {
    return null;
  }

  // Render YouTube iframe
  if (isYouTube) {
    return (
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1`}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  // Render direct MP4 video
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
