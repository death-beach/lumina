// hooks/useAudioData.ts
// Shared hook that taps the store's AnalyserNode and returns a throttled
// Uint8Array of frequency-bin data (~30 fps).  All visualizers should use
// this instead of managing their own AudioContext / analyser.

import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";

/**
 * Returns the latest frequency-bin snapshot from the shared Howler analyser,
 * or `null` when no audio is playing / analyser is not ready.
 */
export function useAudioData(): Uint8Array | null {
  const analyserNode = usePlayerStore(s => s.analyserNode);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const rafRef = useRef<number>(0);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!analyserNode) {
      // Clear stale data when the analyser disappears
      setTimeout(() => setAudioData(null), 0);
      return;
    }

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const tick = () => {
      const now = Date.now();
      // Throttle to ~30 fps to avoid unnecessary React re-renders
      if (now - lastUpdateRef.current > 33) {
        analyserNode.getByteFrequencyData(dataArray);
        setAudioData(new Uint8Array(dataArray));
        lastUpdateRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode]);

  return audioData;
}
