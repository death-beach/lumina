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
  // Single slot for end callback — replaces rather than stacking listeners
  const endCallbackRef = useRef<(() => void) | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const isSeekingRef = useRef(false);
  const fallbackModeRef = useRef(false);

  const { volume, isMuted, setProgress, setAudioContext, setAnalyserNode: setStoreAnalyser } = usePlayerStore();

  // Helper function to check if Web Audio API is ready
  const isWebAudioReady = (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      if (!window.AudioContext && !(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) return false;
      
      const AudioContextType: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextType();
      
      // Check if context is suspended and try to resume
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      return ctx.state === 'running';
    } catch (err) {
      console.warn('Web Audio API not available:', err);
      return false;
    }
  };

  // Helper function to create Howl instance with retry logic
  const createHowlWithRetry = (source: string, retryCount: number = 0): Howl => {
    const howl = new Howl({
      src: [source],
      format: ['wav', 'mp3', 'ogg'], // Explicitly support WAV
      html5: false, // Use Web Audio API
      volume: isMuted ? 0 : volume,
      onload: () => {
        setDuration(howl.duration());
        setIsLoaded(true);
        retryCountRef.current = 0; // Reset retry count on success

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
            analyser.smoothingTimeConstant = 0.7;

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
        console.error(`Audio load error (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
        
        if (retryCount < maxRetries && isWebAudioReady()) {
          console.log(`Retrying audio load in 500ms...`);
          setTimeout(() => {
            retryCountRef.current = retryCount + 1;
            // Clean up current instance and retry
            howl.unload();
            const newHowl = createHowlWithRetry(source, retryCount + 1);
            howlRef.current = newHowl;
          }, 500);
        } else {
          setError(`Failed to load audio after ${retryCount + 1} attempts: ${err}`);
        }
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
        // Fire the single registered end callback (if any)
        endCallbackRef.current?.();
      },
    });

    return howl;
  };

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

    // Create Howl instance with retry logic
    const newHowl = createHowlWithRetry(src, 0);
    howlRef.current = newHowl;

    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
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

  const seek = useCallback(async (time: number): Promise<boolean> => {
    if (!howlRef.current || !isLoaded) {
      return false;
    }

    // Prevent concurrent seeking operations
    if (isSeekingRef.current) {
      console.warn('Audio seek already in progress, skipping');
      return false;
    }

    isSeekingRef.current = true;
    
    try {
      // Try Web Audio API seeking first
      const howl = howlRef.current;
      howl.seek(time);
      setCurrentTime(time);
      setProgress(time / duration);

      // Wait a brief moment to ensure the seek completed successfully
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the seek was successful
      const actualTime = howl.seek() as number;
      const timeDiff = Math.abs(actualTime - time);
      
      if (timeDiff > 0.1) { // Allow small tolerance
        console.warn(`Audio seek verification failed: requested ${time}, got ${actualTime}`);
        throw new Error('Seek verification failed');
      }

      isSeekingRef.current = false;
      return true;

    } catch (error) {
      console.error('Audio seek failed:', error);
      
      // Increment retry count and check if we should switch to fallback mode
      retryCountRef.current++;
      
      if (retryCountRef.current >= maxRetries) {
        console.warn('Audio seek failed multiple times, switching to HTML5 fallback mode');
        fallbackModeRef.current = true;
        
        // Force reload with HTML5 mode by creating a new Howl instance
        if (howlRef.current) {
          howlRef.current.unload();
          const newHowl = createHowlWithRetry(src, 0);
          // Force HTML5 mode for the new instance
          (newHowl as unknown as { html5: boolean }).html5 = true;
          howlRef.current = newHowl;
        }
      }
      
      isSeekingRef.current = false;
      return false;
    }
  }, [duration, setProgress, isLoaded, src]);

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

  // Set the end callback — replaces any previous one, never stacks
  const onEnd = useCallback((callback: () => void) => {
    endCallbackRef.current = callback;
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