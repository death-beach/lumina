import { useRef, useState, useCallback, useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";

interface UseVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  mute: (muted: boolean) => void;
  duration: number;
  currentTime: number;
  isLoaded: boolean;
  error: string | null;
}

export function useVideo(src: string): UseVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { volume, isMuted, setProgress } = usePlayerStore();

  // Set up video element when src changes
  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setError(null);
    setIsLoaded(false);

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.currentTime / video.duration);
    };

    const handleError = () => {
      setError("Failed to load video");
    };

    const handleEnded = () => {
      // Handle video end (will be enhanced with playlist logic)
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    // Set initial volume
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  // Update volume when store changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const play = useCallback(async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
      } catch (err) {
        console.warn("Video play failed:", err);
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setProgress(time / duration);
    }
  }, [duration, setProgress]);

  const setVolumeLevel = useCallback((vol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  }, []);

  const muteVideo = useCallback((muted: boolean) => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, []);

  return {
    videoRef,
    play,
    pause,
    seek,
    setVolume: setVolumeLevel,
    mute: muteVideo,
    duration,
    currentTime,
    isLoaded,
    error,
  };
}