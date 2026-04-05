"use client";

import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudioData } from "@/hooks/useAudioData";
import { VisualizerViewport } from "./VisualizerViewport";

// Import all visualizer scenes
import SongSingularity from "./SongSingularity";
import BreathingTesseract from "./BreathingTesseract";
import Pillar from "./Pillar";
import SlowOrbit from "./SlowOrbit";
import Animal from "./Animal";
import Flower from "./Flower";
import Mandala from "./Mandala";
import AuroraPlanet from "./AuroraPlanet";
import Prism from "./PrismBurst";
import Translation from "./Translation";
import Dimensional from "./dimensional";


const SCENE_MAP: Record<string, React.ComponentType<{ audioData: Uint8Array | null }>> = {
  particles: SongSingularity,
  tesseract: BreathingTesseract,
  pillar: Pillar,

  // Raw heavy scenes
  sloworbit: SlowOrbit,
  animal: Animal,
  flower: Flower,
  mandala: Mandala,
  auroraplanet: AuroraPlanet,
  prism: Prism,
  translation: Translation,
  dimensional: Dimensional,
};

export function VisualizerManager() {
  const { currentTrack } = usePlaylist();
  const audioData = useAudioData();

  // Show visualizer for reactive tracks (audio with visualizer)
  // Hide for video tracks (they have their own visuals)
  const shouldShowVisualizer = currentTrack?.visual?.type === "reactive";

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
  const sceneType = visual?.type === "reactive" ? visual.scene : "translation";

  const VisualizerComponent = SCENE_MAP[sceneType || "translation"] || Translation;

  // Wrap the scene in the permanent Viewport and pass audioData
  return (
    <VisualizerViewport key={sceneType}>
      <VisualizerComponent audioData={audioData} />
    </VisualizerViewport>
  );
}
