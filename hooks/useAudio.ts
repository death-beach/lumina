import { useEffect, useRef, useState, useCallback } from "react";
import { Howl } from "howler";
import { usePlayerStore } from "@/store/playerStore";

interface UseAudioReturn {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  mute: (muted: boolean) => void;
  duration: number;
  currentTime: number;
  analyserNode: AnalyserNode | null;
  isLoaded: boolean;
  error: string | null;
  onEnd: (callback: () => void) => void;
}

export function useAudio(src: string): UseAudioReturn {
  const howlRef = useRef<Howl | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const { volume, isMuted, setProgress, setAudioContext, setAnalyserNode: setStoreAnalyser } = usePlayerStore();

  // Initialize Howler instance
  useEffect(() => {
    if (!src) return;

    // Clean up previous instance
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Reset state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setError(null);
    setIsLoaded(false);
    setAnalyserNode(null);
    setStoreAnalyser(null);

    const howl = new Howl({
      src: [src],
      format: ['wav', 'mp3', 'ogg'], // Explicitly support WAV
      html5: false, // Use Web Audio API
      volume: isMuted ? 0 : volume,
      onload: () => {
        setDuration(howl.duration());
        setIsLoaded(true);

        // Set up Web Audio API analyser using Howler's public APIs
        try {
          // Use Howler's shared Web Audio context and master gain
          const ctx = Howler.ctx;
          if (ctx && ctx.state === 'suspended') {
            ctx.resume(); // Resume if suspended (required for autoplay policies)
          }

          if (ctx) {
            setAudioContext(ctx);

            // Create analyser node
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512; // 256 bins
            analyser.smoothingTimeConstant = 0.8;

            // Connect to Howler's master gain node (all sounds route through this)
            if (Howler.masterGain) {
              Howler.masterGain.connect(analyser);
              // AnalyserNode is just a tap - no need to connect to destination
              setAnalyserNode(analyser);
              setStoreAnalyser(analyser);
            }
          }
        } catch (err) {
          console.warn("Web Audio API setup failed:", err);
        }
      },
      onloaderror: (id, err) => {
        setError(`Failed to load audio: ${err}`);
      },
      onplay: () => {
        // Start progress polling
        const pollProgress = () => {
          if (howl.playing()) {
            const time = howl.seek() as number;
            setCurrentTime(time);
            setProgress(time / howl.duration());
            requestAnimationFrame(pollProgress);
          }
        };
        pollProgress();
      },
      onend: () => {
        // Handle track end (will be enhanced with playlist logic)
      },
    });

    howlRef.current = howl;

    return () => {
      howl.unload();
      setAnalyserNode(null);
      setStoreAnalyser(null);
    };
  }, [src]);

  // Update volume when store changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const play = useCallback(() => {
    if (howlRef.current && isLoaded) {
      howlRef.current.play();
    }
  }, [isLoaded]);

  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setCurrentTime(time);
      setProgress(time / duration);
    }
  }, [duration, setProgress]);

  const setVolumeLevel = useCallback((vol: number) => {
    if (howlRef.current) {
      howlRef.current.volume(vol);
    }
  }, []);

  const muteAudio = useCallback((muted: boolean) => {
    if (howlRef.current) {
      howlRef.current.mute(muted);
    }
  }, []);

  const onEnd = useCallback((callback: () => void) => {
    if (howlRef.current) {
      howlRef.current.on('end', callback);
    }
  }, []);

  return {
    play,
    pause,
    seek,
    setVolume: setVolumeLevel,
    mute: muteAudio,
    duration,
    currentTime,
    analyserNode,
    isLoaded,
    error,
    onEnd,
  };
}