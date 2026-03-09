"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { AudioEngine } from "./AudioEngine";
import { VideoEngine } from "./VideoEngine";
import { Controls } from "./Controls";
import { TrackInfo } from "./TrackInfo";
import { PlaylistRail } from "./PlaylistRail";
import { VisualizerManager } from "../visualizer/VisualizerManager";

export function PlayerShell() {
  const isPlaylistOpen = usePlayerStore(s => s.isPlaylistOpen);
  const isStoreOpen = usePlayerStore(s => s.isStoreOpen);
  const togglePlaylist = usePlayerStore(s => s.togglePlaylist);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // TODO: Implement keyboard shortcuts
      // Space: play/pause
      // Arrow Left/Right: seek
      // Arrow Up/Down: track navigation
      // Escape: close drawers
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Background Layer - Visualizer or Video */}
      <VisualizerManager />

      {/* Audio/Video Engines */}
      <AudioEngine />
      <VideoEngine />

      {/* UI Overlays */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {/* Top Bar - Logo, Artist Info, Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
          <div className="flex items-center justify-between">
            {/* Logo/Artist */}
            <div className="text-foreground">
              <h1 className="text-xl font-bold">Lumina</h1>
            </div>

            {/* Top Controls */}
            <div className="flex items-center gap-4">
              {/* TODO: Info button, Lyrics toggle, Store button */}
              <button className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
                ℹ️
              </button>
              <button
                onClick={togglePlaylist}
                className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors"
              >
                📋
              </button>
              <button className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
                🛍️
              </button>
            </div>
          </div>
        </div>

        {/* Track Info - Animated in/out */}
        <TrackInfo />

        {/* Lyrics Panel - Optional overlay */}
        <div className="absolute top-1/3 right-6 max-w-md pointer-events-auto">
          {/* TODO: LyricsPanel component */}
          {/* Only show if lyrics enabled and available */}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
          <Controls />
        </div>
      </div>

      {/* Playlist Rail - Outside UI overlays for proper z-index */}
      <PlaylistRail />

      {/* Store Drawer - Outside UI overlays for proper z-index */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-background/95 backdrop-blur-md transform transition-transform duration-300 ${
        isStoreOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* TODO: StoreDrawer component */}
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Store</h3>
          <div className="space-y-4">
            {/* Product cards */}
            <div className="p-4 rounded-lg bg-accent/10">
              <div className="text-sm font-medium">Vinyl LP</div>
              <div className="text-2xl font-bold">$38</div>
              <button className="mt-2 px-4 py-2 bg-accent text-background rounded">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
