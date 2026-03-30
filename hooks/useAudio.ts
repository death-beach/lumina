import { useEffect, useRef, useState, useCallback } from "react";
import { Howl, Howler } from "howler";
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

  // Generation counter: incremented on every src change so stale async
  // callbacks (retries, onload from an old track) can detect they're obsolete
  // and bail out without touching the current howlRef.
  const generationRef = useRef(0);

  // Ensures we only wire the AnalyserNode tap once across the lifetime of
  // the hook — Howler.masterGain is a persistent node and we only need one
  // analyser connected to it.
  const analyserConnectedRef = useRef(false);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  const rafRef = useRef<number | null>(null);

  const { volume, isMuted, setProgress, setAudioContext, setAnalyserNode: setStoreAnalyser } = usePlayerStore();

  // ─── Analyser Setup ────────────────────────────────────────────────────────
  // Called once after the first successful load, when Howler.ctx exists.
  const ensureAnalyser = useCallback(() => {
    if (analyserConnectedRef.current) return; // already done

    try {
      const ctx = Howler.ctx as AudioContext | null;
      if (!ctx) return;

      // Resume the context if it was suspended by the browser autoplay policy
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => undefined);
      }

      setAudioContext(ctx);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; // 256 frequency bins
      analyser.smoothingTimeConstant = 0.7;

      // Connect through Howler's master gain (this is the original working approach)
      if (Howler.masterGain) {
        // Disconnect any previous connections to avoid duplicate analysers
        try {
          Howler.masterGain.disconnect();
        } catch {
          // Ignore if not connected
        }
        Howler.masterGain.connect(analyser);
        analyser.connect(ctx.destination);
      }

      analyserConnectedRef.current = true;
      analyserNodeRef.current = analyser;
      setAnalyserNode(analyser);
      setStoreAnalyser(analyser);
    } catch (err) {
      console.warn("Web Audio API analyser setup failed:", err);
    }
  }, [setAudioContext, setStoreAnalyser]);

  // ─── Progress Polling ──────────────────────────────────────────────────────
  const startProgressPoll = useCallback((howl: Howl) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const poll = () => {
      if (!howl.playing()) return; // stop when paused / ended
      const time = howl.seek() as number;
      setCurrentTime(time);
      setProgress(time / howl.duration());
      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
  }, [setProgress]);

  // ─── Track Loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;

    // Invalidate any in-flight callbacks from the previous track
    const gen = ++generationRef.current;

    // Stop any running progress poll
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // CRITICAL: Clean teardown of previous Howl
    // .off() MUST come BEFORE .unload() to prevent "Decoding audio data failed"
    // errors when skipping tracks mid-decode.
    if (howlRef.current) {
      howlRef.current.off(); // remove ALL event listeners first
      howlRef.current.unload(); // then unload (this may trigger decode cancellation)
      howlRef.current = null;
    }

    // Reset per-track state
    setError(null);
    setIsLoaded(false);
    setDuration(0);
    setCurrentTime(0);

    // ── Build the new Howl ──────────────────────────────────────────────────
    // html5: false (Web Audio API mode) is REQUIRED for analyser reactivity
    // This was the original working configuration.
    const howl = new Howl({
      src: [src],
      html5: false,          // ← restored for reactivity (critical)
      format: ["mp3", "wav", "ogg", "aac"],
      volume: isMuted ? 0 : volume,

      onload: () => {
        // Bail if the user has already skipped to a different track
        if (generationRef.current !== gen) return;

        setDuration(howl.duration());
        setIsLoaded(true);
        setError(null);

        // Wire up the analyser the first time we have a live AudioContext
        ensureAnalyser();
      },

      onloaderror: (_id, err) => {
        // Bail if this callback is stale (user skipped before this loaded)
        if (generationRef.current !== gen) return;

        console.error("Audio load error:", err);
        setError(`Failed to load audio: ${err}`);
      },

      onplay: () => {
        if (generationRef.current !== gen) return;
        startProgressPoll(howl);
      },

      onpause: () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      },

      onstop: () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      },

      onend: () => {
        if (generationRef.current !== gen) return;
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        endCallbackRef.current?.();
      },
    });

    howlRef.current = howl;

    return () => {
      // Cancel the RAF if the effect is re-running or unmounting
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Invalidate this generation so any pending callbacks are ignored
      generationRef.current++;

      if (howlRef.current) {
        howlRef.current.off();
        howlRef.current.unload();
        howlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ─── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    howlRef.current?.volume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // ─── Playback controls ─────────────────────────────────────────────────────
  const play = useCallback(() => {
    if (howlRef.current && isLoaded) {
      howlRef.current.play();
    }
  }, [isLoaded]);

  const pause = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  const seek = useCallback(
    (time: number) => {
      if (!howlRef.current || !isLoaded) return;
      howlRef.current.seek(time);
      setCurrentTime(time);
      if (duration > 0) setProgress(time / duration);
    },
    [isLoaded, duration, setProgress]
  );

  const setVolumeLevel = useCallback((vol: number) => {
    howlRef.current?.volume(vol);
  }, []);

  const muteAudio = useCallback((muted: boolean) => {
    howlRef.current?.mute(muted);
  }, []);

  // Set the end callback — replaces any previous one, never stacks
  const onEnd = useCallback((callback: () => void) => {
    endCallbackRef.current = callback;
  }, []);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      // Disconnect the analyser tap from masterGain
      if (analyserNodeRef.current && Howler.masterGain) {
        try {
          Howler.masterGain.disconnect(analyserNodeRef.current);
        } catch {
          // Ignore "node not connected" errors
        }
      }
      setAnalyserNode(null);
      setStoreAnalyser(null);
      analyserConnectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
