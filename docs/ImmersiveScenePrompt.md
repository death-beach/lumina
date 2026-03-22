# Immersive Scene Prompt

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

**User Required Information:**

1. **Component Name:** [YourVisualizerName] (must be unique)
2. **IMMERSIVE IDEA:**
   [YOUR CREATIVE IDEA HERE]

3. **AUDIO MAPPING (User-Defined):**
   - Bass (0-275Hz) controls: [User specifies what bass controls]
   - Mids (320Hz-3.5kHz) controls: [User specifies what mids controls]
   - Highs (3.5kHz-20kHz) controls: [User specifies what highs controls]

   **Examples:**
   - Bass controls: Camera rotation speed, element scale, particle density
   - Mids controls: Camera tilt, element complexity, color intensity
   - Highs controls: Particle velocity, detail level, spark effects

4. **COLOR SYSTEM (Optional):**
   - Time-based color transitions at specific intervals (e.g., 30s, 45s, 60s)
   - Audio-reactive coloring: [User defines color mapping for frequency bands]
   - Distance-based color variation (center vs outer particles)
   - Smooth color interpolation with no hard cuts

   **IMPORTANT:** Each frequency band should control DIFFERENT aspects of the scene to avoid conflicts.

IMMERSIVE SCENE REQUIREMENTS:

- **Interactive Camera**: Must include OrbitControls for user interaction
- **Single Focus Element**: One main visual element (particle system, nebula, structure, etc.)
- **Audio-Driven Camera**: Camera movement/rotation controlled by audio
- **Explorable Space**: Designed for 360-degree viewing and exploration
- **Performance**: Particle count should not exceed ~12,000 to maintain smooth performance
- **Mobile Optimization**: Reduce complexity on mobile devices

AUDIO BAND MAPPING RULES (CRITICAL):

- Each visual element must use ONE frequency range only
- Bass (0-275Hz): Pulsing, expansion, impact, weight, camera rotation speed
- Mids (320Hz-3.5kHz): Flow, rotation, intensity, movement, camera tilt
- Highs (3.5kHz-20kHz): Sparkle, chaos, detail, speed, particle velocity

GOOD EXAMPLES:

- Bass makes camera rotate faster and element expand
- Mids controls camera tilt and element complexity
- Highs drives particle velocity and detail level

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
- **Mouse Interaction**: Add mouse/touch responsiveness using `useThree()` hook to access `state.pointer` for interactive scenes
- **Particle Limit**: Can support higher particle counts (tested up to 12,000+ particles)
- **Color System**: Use vertex colors with proper color attribute initialization in useMemo
- **Mouse Interaction**: Add mouse/touch responsiveness using `useThree()` hook to access `state.pointer` for interactive scenes
- **Particle Limit**: Can support higher particle counts (tested up to 12,000+ particles)
- **Color System**: Optional vertex colors with time-based and audio-reactive coloring

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

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { pointer } = useThree(); // For mouse interaction

  useFrame((state) => {
    const { bass, mids, highs } = getThreeBands(audioData);
    // bass  → low-end energy [0, 1]  — kicks, subs
    // mids  → mid energy    [0, 1]  — vocals, snare
    // highs → high energy   [0, 1]  — cymbals, air

    // User-defined audio mappings here
    // Example: const cameraSpeed = bass * 0.5;
    // Example: const particleVelocity = highs * 2.0;
    // Example: const elementScale = 1.0 + (mids * 0.3);

    // Mouse interaction example:
    // const mouseX = pointer.x;
    // const mouseY = pointer.y;
  });

  return (
    <>
      {/* ALL VISUAL ELEMENTS GO HERE */}
      {/* - 3D objects, lighting, camera controllers */}
      {/* - Audio-reactive animations */}
      {/* - Mouse/touch interactive elements */}
      {/* - Post-processing effects */}
      {/* - OrbitControls for camera interaction */}
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
- If filename is "Nebula.tsx", export must be `export default function Nebula()`
- If filename is "CosmicDance.tsx", export must be `export default function CosmicDance()`
- The Scene component must be internal and not exported
- No other components should be exported from the file

INTEGRATION REQUIREMENTS:

- The component name (from export) MUST match the import name in VisualizerManager.tsx
- The component name MUST match the scene key in lumina.config.ts
- The component name MUST be added to the enum in lib/config.ts
- The component MUST be imported and added to SCENE_MAP in VisualizerManager.tsx

WHAT TO DO:

- Create immersive, explorable 3D scenes
- Use OrbitControls for interactive camera movement
- Design single, compelling visual elements
- Implement user-defined audio mappings
- Optimize for smooth performance (can support 12k+ particles)
- Handle mobile devices gracefully
- Use seeded random for consistent results
- Follow React Three Fiber best practices
- Create professional, polished visuals
- Implement color systems with vertex colors and proper initialization
- Use time-based color transitions and audio-reactive coloring

WHAT NOT TO DO:

- Don't create multiple complex visual elements
- Don't exceed reasonable particle counts for target devices
- Don't use Math.random() - always use seeded random
- Don't modify hook returns directly
- Don't create state in visualizer components
- Don't use relative imports
- Don't ignore mobile performance
- Don't make audio mappings conflict (same band controlling multiple things)
- Don't forget to include OrbitControls
- Don't create static scenes without camera interaction
- Don't initialize color refs in useEffect (use useMemo to avoid race conditions)
- Don't forget to initialize color attributes in geometry setup

STRICT OUTPUT FORMAT:
Return ONLY the complete React component code.
Start with the imports.
End with the default export.
No markdown formatting, no explanations, no additional text.

# task_progress List (Optional - Plan Mode)

While in PLAN MODE, if you've outlined concrete steps or requirements for the user, you may include a preliminary todo list using the task_progress parameter.

Reminder on how to use the task_progress parameter:

1. To create or update a todo list, include the task_progress parameter in the next tool call
2. Review each item and update its status:
   - Mark completed items with: - [x]
   - Keep incomplete items as: - [ ]
   - Add new items if you discover additional steps
3. Modify the list as needed: - Add any new steps you've discovered - Reorder if the sequence has changed
4. Ensure the list accurately reflects the current state

**Remember:** Keeping the task_progress list updated helps track progress and ensures nothing is missed. <environment_details>

# Visual Studio Code Visible Files

lumina.config.ts

# Visual Studio Code Open Tabs

scripts/reset-test.mjs
docs/Use_New_Visualizer_Inst.md
components/visualizer/VisualizerManager.tsx
hooks/useAudioData.ts
hooks/useAudio.ts
components/visualizer/SlowOrbit.tsx
docs/scenetepompt.md.backup
docs/ScenePrompt.md
lumina.config.ts
lib/config.ts

# Current Time

3/22/2026, 11:12:34 AM (America/Los_Angeles, UTC-7:00)

# Context Window Usage

30,469 / 256K tokens used (12%)

# Current Mode

ACT MODE
</environment_details>
