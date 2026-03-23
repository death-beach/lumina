"use client";

import { usePlaylist } from "@/hooks/usePlaylist";
import SongSingularity from "./SongSingularity";
import BreathingTesseract from "./BreathingTesseract";
import Pillar from "./Pillar";

// Raw heavy particle scenes (these use pure Three.js)
import SlowOrbit from "./SlowOrbit";
import Animal from "./Animal";
import Flower from "./Flower"
import Mandala from "./Mandala"


const SCENE_MAP: Record<string, React.ComponentType> = {
  particles: SongSingularity,
  tesseract: BreathingTesseract,
  pillar: Pillar,

  // Raw heavy scenes (bypass mode)
  sloworbit: SlowOrbit,
  animal: Animal,
  flower: Flower,
  mandala: Mandala,
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

  const visual = currentTrack?.visual;
  const sceneType = visual?.type === "reactive" ? visual.scene : "particles";

  const VisualizerComponent = SCENE_MAP[sceneType || "particles"] || SongSingularity;

  // Show the reactive visualizer
  return <VisualizerComponent />;
}
