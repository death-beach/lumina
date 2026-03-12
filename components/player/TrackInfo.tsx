"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import config from "@/lumina.config";

export function TrackInfo() {
  const currentTrackIndex = usePlayerStore(s => s.currentTrackIndex);
  const { currentTrack, tracks } = usePlaylist();

  if (!currentTrack) return null;

  const trackNumber = currentTrackIndex + 1;
  const totalTracks = tracks.length;
  const artistName = config.artist.name;
  const albumTitle = config.album?.title ?? null;

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
          <div className="text-xs opacity-60 uppercase tracking-widest">
            Track {trackNumber} / {totalTracks}
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {currentTrack.title}
          </div>
          {albumTitle && (
            <div className="text-sm opacity-70 italic">
              {albumTitle}
            </div>
          )}
          <div className="text-sm opacity-60">
            {artistName}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
