"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";

export function TrackInfo() {
  const { currentTrackIndex } = usePlayerStore();
  const { currentTrack, tracks } = usePlaylist();

  if (!currentTrack) return null;

  const trackNumber = currentTrackIndex + 1;
  const totalTracks = tracks.length;

  return (
    <div className="absolute top-8 left-8 z-20 text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentTrackIndex}-${currentTrack.title}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-1"
        >
          <div className="text-sm opacity-80">
            Track {trackNumber} / {totalTracks}
          </div>
          <div className="text-lg font-medium">
            {currentTrack.title}
          </div>
          <div className="text-sm opacity-60">
            Aurora Veil
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}