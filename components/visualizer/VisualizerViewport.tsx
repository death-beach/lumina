"use client";

import { Canvas } from "@react-three/fiber";
import { ReactNode } from "react";

/**
 * Permanent Canvas wrapper for all reactive visualizers.
 * This ensures consistent z-indexing, camera defaults, and performance settings.
 * Generated scenes should NEVER include their own <Canvas> or wrapper div.
 */
export function VisualizerViewport({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 z-0 bg-black overflow-hidden"
      style={{ pointerEvents: "none" }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        style={{ background: "#000000" }}
      >
        {children}
      </Canvas>
    </div>
  );
}
