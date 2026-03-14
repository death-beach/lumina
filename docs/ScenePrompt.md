Act as a Creative Computational Artist & High-Performance WebGL Shader Expert.

YOUR GOAL:
Create a single, self-contained React component that renders an audio-reactive 3D visualizer for Lumina. The component must be a complete, standalone file that can be dropped into `components/visualizer/YourSceneName.tsx`.

CONTEXT & REQUIREMENTS:

1. Use React Three Fiber (@react-three/fiber) and Drei for 3D rendering
2. Use @react-three/drei for optimized primitives (Line, Sphere, Torus, etc.)
3. Import audio data via `useAudioData()` hook from "@/hooks/useAudioData"
4. Map audio bands to visual parameters using `getThreeBands()` from "@/lib/audioAnalysis"
5. Component must be exported as default export
6. Use absolute imports (no relative paths)
7. Optimize for performance: avoid allocations in render loops, use useMemo/useRef
8. Handle mobile gracefully: reduce particle counts, simplify effects
9. Include proper TypeScript types and JSDoc comments
10. Add "use no memo" directive at the top of the file to opt out of React Compiler

AUDIO BAND MAPPING RULES (CRITICAL):

- Each visual element must use ONE frequency range only
- Bass (0-275Hz): Pulsing, expansion, impact, weight
- Mids (320Hz-3.5kHz): Flow, rotation, intensity, movement
- Highs (3.5kHz-20kHz): Sparkle, chaos, detail, speed

GOOD EXAMPLES:

- Bass makes sphere expand/contract
- Mids controls rotation speed of rings
- Highs drives particle velocity/sparkle

BAD EXAMPLES:

- Bass and Mids both controlling the same element's speed
- Multiple elements responding to the same frequency band
- Cross-contamination of audio bands

PERFORMANCE REQUIREMENTS:

- Use @react-three/drei Line for wireframes (not raw Three.js Line)
- Avoid manual geometry creation when possible
- Use instanced meshes for repeated elements
- Implement mobile optimizations (reduce counts, simplify shaders)
- No console.log in production code
- Use useMemo for static data, useRef for mutable state

REACT HOOKS BEST PRACTICES (CRITICAL):

- NEVER call Math.random() or other impure functions during render
- Use seeded random function within useMemo for any randomness to ensure purity
- Use useRef for mutable state that doesn't trigger re-renders
- NEVER modify values returned from hooks (like camera.position)
- Use proper React Three Fiber patterns for camera control
- All render functions must be pure (same input = same output)

SEeded Random Pattern (REQUIRED):

When generating random values, use this exact pattern to ensure purity and prevent React Compiler errors:

```typescript
const seededRandom = useMemo(() => {
  let seed = 12345;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}, []);
```

Use `seededRandom()` instead of `Math.random()` throughout the component.

COMMON ERROR PREVENTION:

- Static geometry: Generate once with useMemo, not on every render
- Random values: Use seeded random functions within useMemo
- Camera control: Use useFrame with proper patterns, don't modify hook returns
- State updates: Use useState/useRef appropriately, avoid direct mutations
- Component purity: Ensure render functions have no side effects

VISUAL QUALITY REQUIREMENTS:

- Professional, polished appearance
- Smooth 60fps animation
- Creative use of color, lighting, and form
- Audio reactivity that feels musical and intuitive
- Depth and dimensionality
- Avoid pixelated or aliased rendering

SECURITY REQUIREMENTS:

- No external network requests
- No localStorage/sessionStorage
- No eval or dynamic imports
- No document/window manipulation
- Pure client-side rendering only

COMPONENT STRUCTURE REQUIREMENTS (FOLLOW EXACTLY):

The component MUST follow this exact 2-component pattern:

```typescript
"use no memo";
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  useFrame((state) => {
    const { bass, mids, highs } = getThreeBands(audioData);
    // bass  → low-end energy [0, 1]  — kicks, subs
    // mids  → mid energy    [0, 1]  — vocals, snare
    // highs → high energy   [0, 1]  — cymbals, air
  });

  return (
    <>
      {/* ALL VISUAL ELEMENTS GO HERE */}
      {/* - 3D objects, lighting, camera controllers */}
      {/* - Audio-reactive animations */}
      {/* - Post-processing effects */}
    </>
  );
}

export default function YourVisualizer() {
  const audioData = useAudioData();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: "#000",
        overflow: "hidden",
      }}
    >
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}
```

NAMING REQUIREMENTS:

- The default export function name MUST match the filename exactly
- If filename is "Pillar.tsx", export must be `export default function Pillar()`
- If filename is "Nebula.tsx", export must be `export default function Nebula()`
- The Scene component must be internal and not exported
- No other components should be exported from the file

INTEGRATION REQUIREMENTS:

- The component name (from export) MUST match the import name in VisualizerManager.tsx
- The component name MUST match the scene key in lumina.config.ts
- The component name MUST be added to the enum in lib/config.ts
- The component MUST be imported and added to SCENE_MAP in VisualizerManager.tsx

STRICT OUTPUT FORMAT:
Return ONLY the complete React component code.
Start with the imports.
End with the default export.
No markdown formatting, no explanations, no additional text.
