# Adding a New Visualizer to Lumina

Follow these four steps in order. All paths are relative to the project root.

---

## Step 1 — Create the component file

**Location:** `components/visualizer/YourVisualizer.tsx`

Every visualizer follows the same contract:

```tsx
"use no memo";
// ↑ Required — opts this file out of the React Compiler.
// All visualizer files must include this. Without it, the compiler rejects
// standard Three.js imperative patterns (InstancedMesh mutations, etc.).

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

// Inner scene component — receives pre-fetched audioData as a prop.
// All Three.js / R3F work lives here. Do NOT call useAudioData() inside here.
function Scene({ audioData }: { audioData: Uint8Array | null }) {
  useFrame((state) => {
    const { bass, mids, highs } = getThreeBands(audioData);
    // bass  → low-end energy [0, 1]  — kicks, subs
    // mids  → mid energy    [0, 1]  — vocals, snare
    // highs → high energy   [0, 1]  — cymbals, air
  });

  return <>{/* your scene elements */}</>;
}

// Root export — fetches audio data and owns the Canvas.
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

### Rules to follow

- **No own `AudioContext` or `analyserNode`.** The project's shared Howler analyser is already wired — just call `useAudioData()`.
- **No `requestAnimationFrame` loop.** R3F's `useFrame` handles the render loop.
- **No `OrbitControls`** for background visualizers (camera should be fixed).
- **Seeded PRNG instead of `Math.random()`** inside `useMemo` (the React compiler flags `Math.random` as impure). Use the pattern below:
  ```ts
  let seed = 12345;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ```
- If you need bloom/post-processing, use `@react-three/postprocessing` (already installed):
  ```tsx
  import { EffectComposer, Bloom } from "@react-three/postprocessing";
  // Place <EffectComposer> inside <Canvas>, after your scene elements.
  ```

---

## Step 2 — Add the scene key to the config enum

**File:** `lib/config.ts`

Find the `ReactiveVisualSchema` and add your key to the enum:

```ts
// Before
scene: z.enum(["particles", "waveform", "nebula", "ronin"]).optional(),

// After — add your key
scene: z.enum(["particles", "waveform", "nebula", "ronin", "your-key"]).optional(),
```

---

## Step 3 — Register in VisualizerManager

**File:** `components/visualizer/VisualizerManager.tsx`

Import your component and add it to `SCENE_MAP`:

```ts
import YourVisualizer from "./YourVisualizer";

const SCENE_MAP: Record<string, React.ComponentType> = {
  particles: SongSingularity,
  waveform: WaveForm,
  ronin: RoninMaxilism,
  "your-key": YourVisualizer, // ← add this line
};
```

---

## Step 4 — Assign to a track in lumina.config.ts

**File:** `lumina.config.ts`

Set `visual.scene` on the track you want to use it:

```ts
{
  id: "track-03",
  title: "My Track",
  src: "/tracks/track3.mp3",
  visual: {
    type: "reactive",
    scene: "your-key",   // ← matches the key added in Steps 2 & 3
  },
},
```

---

## Audio band reference

All values come from `getThreeBands(audioData)` and are normalised to **[0, 1]**. They use crossover rolloff weighting so bands don't bleed into each other.

| Band    | Frequency range  | What it tracks         | Typical use              |
| ------- | ---------------- | ---------------------- | ------------------------ |
| `bass`  | 0 – 275 Hz       | Kick drum, sub-bass    | Scale pulse, chaos, beat |
| `mids`  | 320 Hz – 3.5 kHz | Vocals, snare, guitars | Amplitude, brightness    |
| `highs` | 3.5 – 20 kHz     | Cymbals, hi-hats, air  | Speed, glow, sparkle     |

Helper functions are also exported from `lib/audioAnalysis.ts` if you need finer control:

- `binPeak(data, lo, hi)` — peak bin value in a range
- `binAvg(data, lo, hi)` — average bin value in a range
- `weightedBandEnergy(data, ranges, noiseFloor)` — custom weighted energy with noise gate

---

## Checklist

- [ ] `components/visualizer/YourVisualizer.tsx` created
- [ ] Scene key added to enum in `lib/config.ts`
- [ ] Imported + added to `SCENE_MAP` in `VisualizerManager.tsx`
- [ ] Track assigned `scene: "your-key"` in `lumina.config.ts`
