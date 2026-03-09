"use client";

import { usePlaylist } from "@/hooks/usePlaylist";
import SongSingularity from "./SongSingularity";

export function VisualizerManager() {
  const { currentTrack } = usePlaylist();

  // Show visualizer for reactive tracks (audio with visualizer)
  // Hide for video tracks (they have their own visuals)
  const shouldShowVisualizer = currentTrack?.visual.type === "reactive";

  if (!shouldShowVisualizer) {
    // Return gradient background for video tracks or when no track
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-accent/20 to-background"
        style={{ zIndex: 0 }}
      />
    );
  }

  // Show the reactive visualizer
  return <SongSingularity />;
}