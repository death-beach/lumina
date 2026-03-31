# Adding a New Visualizer to Lumina

Four steps. Do them in order.

---

## Step 1 — Generate the component

Use `docs/LuminaScenePrompt.md` to generate your scene with an AI (Claude, Gemini, Grok, ChatGPT).

Save the generated file to:

```
components/visualizer/YourSceneName.tsx
```

---

## Step 2 — Register it in VisualizerManager

**File:** `components/visualizer/VisualizerManager.tsx`

Add an import at the top with the other scene imports:

```ts
import YourSceneName from "./YourSceneName";
```

Then add your scene to `SCENE_MAP`:

```ts
const SCENE_MAP: Record<
  string,
  React.ComponentType<{ audioData: Uint8Array | null }>
> = {
  particles: SongSingularity,
  tesseract: BreathingTesseract,
  pillar: Pillar,
  sloworbit: SlowOrbit,
  animal: Animal,
  flower: Flower,
  mandala: Mandala,
  auroraplanet: AuroraPlanet,
  city: City,
  "your-key": YourSceneName, // ← add this line
};
```

Pick a short, lowercase key with no spaces. You'll use it in the next two steps.

---

## Step 3 — Add the key to the config enum

**File:** `lib/config.ts`

Find `ReactiveVisualSchema` and add your key to the enum:

```ts
// Before
scene: z.enum(["particles", "tesseract", "pillar", "sloworbit", "animal", "flower", "mandala", "auroraplanet", "city"]).optional(),

// After
scene: z.enum(["particles", "tesseract", "pillar", "sloworbit", "animal", "flower", "mandala", "auroraplanet", "city", "your-key"]).optional(),
```

---

## Step 4 — Assign it to a track

**File:** `lumina.config.ts`

Set `visual.scene` on whichever track should use your visualizer:

```ts
{
  id: "track-01",
  title: "My Track",
  src: "/tracks/mytrack.mp3",
  visual: {
    type: "reactive",
    scene: "your-key",  // ← matches the key from Steps 2 & 3
  },
},
```

---

## Done

Run `npm run dev` and play the track. Your scene should appear.

If the build throws a React Compiler error, check `docs/LuminaScenePrompt.md` — the two most common causes are `Math.random()` inside a component, or directly mutating a `uniforms` object instead of going through `materialRef.current`.

---

## Current scene keys

| Key            | File                   |
| -------------- | ---------------------- |
| `particles`    | SongSingularity.tsx    |
| `tesseract`    | BreathingTesseract.tsx |
| `pillar`       | Pillar.tsx             |
| `sloworbit`    | SlowOrbit.tsx          |
| `animal`       | Animal.tsx             |
| `flower`       | Flower.tsx             |
| `mandala`      | Mandala.tsx            |
| `auroraplanet` | AuroraPlanet.tsx       |
| `city`         | City.tsx               |
