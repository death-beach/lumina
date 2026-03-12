"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import config from "@/lumina.config";

function formatDuration(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlaylistRail() {
  const isPlaylistOpen = usePlayerStore(s => s.isPlaylistOpen);
  const togglePlaylist = usePlayerStore(s => s.togglePlaylist);
  const currentTrackIndex = usePlayerStore(s => s.currentTrackIndex);
  const trackDurations = usePlayerStore(s => s.trackDurations);
  const setTrackDuration = usePlayerStore(s => s.setTrackDuration);
  const { tracks, goToTrack } = usePlaylist();

  // Probe durations for all tracks that don't have one yet via Audio metadata
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    for (const track of tracks) {
      if (trackDurations[track.id]) continue; // already known

      const audio = new Audio();
      audio.preload = "metadata";

      const onLoaded = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setTrackDuration(track.id, audio.duration);
        }
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.src = track.src;

      cleanups.push(() => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.src = "";
      });
    }

    return () => cleanups.forEach(fn => fn());
  // Run once on mount; trackDurations intentionally excluded to avoid re-running after each update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, setTrackDuration]);

  return (
    <AnimatePresence>
      {isPlaylistOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={togglePlaylist}
          />

          {/* Playlist Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-md z-50 shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-foreground/10">
                <h3 className="text-lg font-bold">Playlist</h3>
                <button
                  onClick={togglePlaylist}
                  className="p-2 rounded-full hover:bg-accent/20 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Track List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {tracks.map((track, index) => (
                    <motion.button
                      key={track.id}
                      onClick={() => goToTrack(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        index === currentTrackIndex
                          ? "bg-accent text-background shadow-lg"
                          : "hover:bg-accent/20"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index === currentTrackIndex
                            ? "bg-background/20"
                            : "bg-accent/20"
                        }`}>
                          {index === currentTrackIndex ? "▶" : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${
                            index === currentTrackIndex ? "text-background" : "text-foreground"
                          }`}>
                            {track.title}
                          </div>
                          <div className={`text-sm opacity-75 ${
                            index === currentTrackIndex ? "text-background/80" : "text-foreground/60"
                          }`}>
                            {formatDuration(trackDurations[track.id] ?? track.duration)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-foreground/10">
                <div className="text-sm text-foreground/60 text-center">
                  {tracks.length} track{tracks.length !== 1 ? "s" : ""} • {config.artist.name}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}