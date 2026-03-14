# Lumina Scene Prompt

> Use this prompt with any LLM to generate a new audio-reactive 3D visualizer for Lumina.
> The output drops directly into `components/visualizer/scenes/yourSceneName.ts`.

---

## The Prompt

```
Act as a Creative Computational Artist & High-Performance WebGL Shader Expert.

YOUR GOAL:
Write a single, highly optimized JavaScript function body that defines the movement
behavior and visual appearance of particles in a massive 3D particles swarm simulation
(20,000+ units).

CONTEXT & API VARIABLES (Read-Only unless specified):
1. `i` (Integer): Index of the current particle (0 to count-1).
2. `count` (Integer): Total number of particles.
3. `time` (Float): Global simulation time in seconds. Use this for animation.
4. `THREE`: The full Three.js library reference (available but avoid allocations).
5. `bass` (Float 0-1): Real-time bass/kick energy from audio analysis.
6. `mids` (Float 0-1): Real-time mid/vocal energy from audio analysis.
7. `highs` (Float 0-1): Real-time high/cymbal energy from audio analysis.
8. `target` (THREE.Vector3): WRITE-ONLY. Call `target.set(x, y, z)` to position the particle.
9. `color` (THREE.Color): WRITE-ONLY. Call `color.setHSL(h, s, l)` or `color.set(hex)` to paint the particle.

AUDIO MAPPING RULE:
Every interactive parameter maps to an audio band. Use this pattern:
  - Things that should PULSE with beats (size, radius, amplitude) → use `bass`
  - Things that should SWELL with melody/vocals (speed, flow, intensity) → use `mids`
  - Things that should SHIMMER/scatter on hi-hats (chaos, noise, color shift) → use `highs`

Mapping formula (replaces addControl):
  const amplitude = <default_value> + bass * <max_addition>;
  const speed     = <default_value> + mids * <max_addition>;
  const chaos     = <default_value> + highs * <max_addition>;

CRITICAL PERFORMANCE RULES (STRICT COMPLIANCE REQUIRED):
1. ZERO GARBAGE COLLECTION: This runs 20,000 times per frame at 60fps.
   - NEVER use `new THREE.Vector3()` or `new THREE.Color()` inside the function.
   - NEVER allocate arrays or objects inside the function.
   - Use `target` and `color` — they are pre-allocated for you.
2. MATH OVER LOGIC: Avoid heavy branching. Use Math.sin, Math.cos, Math.abs for shaping.
3. OUTPUT ONLY: Do not return any value. Just call target.set() and color.setHSL().
4. NO CONFLICTING NAMES: Never redefine `THREE`, `Math`, `target`, `color`, `time`, `i`, `count`, `bass`, `mids`, `highs`.
5. ALL VARIABLES DECLARED: Use `let` or `const` for every variable before use.

SECURITY RULES (STRICT):
FORBIDDEN: document, window, fetch, XMLHttpRequest, WebSocket,
           eval, Function(, import(, require(, process,
           __proto__, .prototype, globalThis, self, location, navigator,
           localStorage, sessionStorage, crypto,
           setTimeout, setInterval, alert(), confirm(), prompt()

VISUALIZATION GUIDELINES:
- Create complex, organic, or mathematical structures (Fractals, Attractors, Fields, interference patterns).
- Use `time` for smooth, flowing animation.
- Map `i / count` (range 0-1) to spatial coordinates to create continuous forms.
- Use `bass`, `mids`, `highs` to make every beat and note physically visible.

REQUEST:
[INSERT YOUR CREATIVE IDEA HERE]
Examples:
  - "A double helix DNA strand that pulses with music"
  - "A toroidal vortex that spins faster on bass hits"
  - "A galaxy spiral arm formation with star birth on high notes"
  - "A fluid soap bubble surface that ripples with each beat"

STRICT RESPONSE FORMAT:
Return ONLY the JavaScript code for the function body.
Do not include markdown formatting, backticks, or explanations.
Start directly with the first const/let declaration.

EXAMPLE OUTPUT:
const amp   = 12 + bass  * 25;
const spd   = 2.0 + mids * 3;
const angle = (i / count) * Math.PI * 2 + time * spd;
const z     = (i / count - 0.5) * 100;
target.set(Math.cos(angle) * amp, Math.sin(angle) * amp, z);
color.setHSL((i / count + time * 0.05) % 1, 1.0, 0.5 + bass * 0.3);
```

---

## How to Add the Scene to Lumina

1. **Create the compute file** — `components/visualizer/scenes/mySceneCompute.ts`:

```ts
import type { ComputeFn } from "../SwarmScene";

export const mySceneCompute: ComputeFn = (
  i,
  time,
  count,
  bass,
  mids,
  highs,
  target,
  color,
) => {
  // ← paste the LLM output here
};
```

2. **Create the scene wrapper** — `components/visualizer/scenes/MyScene.tsx`:

```tsx
"use client";
import { SwarmScene } from "../SwarmScene";
import { mySceneCompute } from "./mySceneCompute";
import type { SceneProps } from "../ReactiveCanvas";

export default function MyScene({ bands }: SceneProps) {
  return <SwarmScene bands={bands} compute={mySceneCompute} count={20000} />;
}
```

3. **Register the scene** — add one line to `components/visualizer/VisualizerManager.tsx`:

```ts
const SCENES = {
  waveform: WaveFormScene,
  blackhole: BlackHole,
  myscene: MyScene, // ← add this line
};
```

4. **Add to config schema** — `lib/config.ts`, add `"myscene"` to the enum:

```ts
scene: z.enum(["particles", "waveform", "nebula", "blackhole", "myscene"]);
```

5. **Use it in `lumina.config.ts`**:

```ts
visual: { type: "reactive", scene: "myscene" }
```

**Total: ~5 minutes from LLM output to live audio-reactive scene.**

---

## Naming Convention

| File             | Pattern                            |
| ---------------- | ---------------------------------- |
| Compute function | `scenes/mySceneCompute.ts`         |
| Scene wrapper    | `scenes/MyScene.tsx`               |
| Registry key     | `"myscene"` (lowercase, no spaces) |
| Config enum      | `"myscene"`                        |
