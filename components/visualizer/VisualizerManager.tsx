"use client";

import { usePlaylist } from "@/hooks/usePlaylist";
import SongSingularity from "./SongSingularity";
import BreathingTesseract from "./BreathingTesseract";
import Pillar from "./Pillar";
import SlowOrbit from "./SlowOrbit"

const SCENE_MAP: Record<string, React.ComponentType> = {
  particles: SongSingularity,
  waveform: SongSingularity,
  nebula: SongSingularity,
  tesseract: BreathingTesseract,
  pillar: Pillar,
  sloworbit: SlowOrbit,
};

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

  // Get the visualizer component based on the scene type
  const sceneType = currentTrack?.visual.type === "reactive" ? currentTrack.visual.scene : "particles";
  const VisualizerComponent = SCENE_MAP[sceneType || "particles"] || SongSingularity;

  // Show the reactive visualizer
  return <VisualizerComponent />;
}
