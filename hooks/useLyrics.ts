import { useState, useEffect, useMemo, useRef } from "react";
import { parseLrc, getActiveLrcIndex, type LrcLine } from "@/lib/parseLrc";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";

interface UseLyricsReturn {
  lines: LrcLine[];
  activeIndex: number;
  hasLyrics: boolean;
  isLoading: boolean;
  isStatic: boolean;
}

export function useLyrics(): UseLyricsReturn {
  const { currentTrack } = usePlaylist();
  const progress = usePlayerStore(s => s.progress);
  const trackDurations = usePlayerStore(s => s.trackDurations);

  const [lines, setLines] = useState<LrcLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedTrackId = useRef<string | null>(null);

  // Use Howler's actual duration (most accurate), fall back to config duration
  const howlerDuration = currentTrack?.id ? (trackDurations[currentTrack.id] ?? 0) : 0;
  const durationSeconds = howlerDuration > 0 ? howlerDuration : (currentTrack?.duration ?? 0);
  const currentSeconds = durationSeconds > 0 ? progress * durationSeconds : 0;

  // Derive the lyrics src from the current track
  const lyricsSrc = useMemo(() => {
    const lyrics = currentTrack?.lyrics;
    if (!lyrics || lyrics.type !== "timed") return null;
    return lyrics.src;
  }, [currentTrack?.id, currentTrack?.lyrics]);

  // Check if lyrics are static
  const isStatic = useMemo(() => {
    return currentTrack?.lyrics?.type === "static";
  }, [currentTrack?.lyrics]);

  // Load LRC file when track changes
  useEffect(() => {
    if (!lyricsSrc || fetchedTrackId.current === currentTrack?.id) return;

    fetchedTrackId.current = currentTrack?.id ?? null;
    let cancelled = false;

    setIsLoading(true);

    fetch(lyricsSrc)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load lyrics: ${res.status}`);
        return res.text();
      })
      .then(text => {
        if (!cancelled) {
          setLines(parseLrc(text));
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn("Lyrics load failed:", err);
          setLines([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lyricsSrc, currentTrack?.id]);

  // Handle static lyrics
  useEffect(() => {
    if (isStatic) {
      const lyrics = currentTrack?.lyrics;
      if (lyrics?.type === "static") {
        setLines(lyrics.text.split('\n').map(line => ({ time: 0, text: line.trim() })));
        setIsLoading(false);
        fetchedTrackId.current = currentTrack?.id ?? null;
      }
    }
  }, [isStatic, currentTrack?.id, currentTrack?.lyrics]);

  // Clear lyrics when track changes to one without lyrics
  useEffect(() => {
    if (!lyricsSrc && !isStatic) {
      fetchedTrackId.current = null;
      setLines([]);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyricsSrc, isStatic]);

  const activeIndex = getActiveLrcIndex(lines, currentSeconds);

  return {
    lines,
    activeIndex,
    hasLyrics: lines.length > 0 || isLoading,
    isLoading,
    isStatic,
  };
}
