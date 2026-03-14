# Lumina Scene Creation Guide

## Quick Start

1. **Copy the prompt template from `ScenePrompt.md`**
2. **Replace `[YOUR CREATIVE IDEA]` with your scene concept**
3. **Generate the component code**
4. **Register your scene in `VisualizerManager.tsx`**
5. **Add to `lib/config.ts` enum**
6. **Use in `lumina.config.ts`**

## Scene Registration

### 1. Create Your Component

Save your generated code as `components/visualizer/YourSceneName.tsx`

### 2. Register in VisualizerManager

Add your scene to the SCENE_MAP in `components/visualizer/VisualizerManager.tsx`:

```typescript
const SCENE_MAP: Record<string, React.ComponentType> = {
  particles: SongSingularity,
  waveform: SongSingularity,
  nebula: SongSingularity,
  tesseract: BreathingTesseract,
  yourscene: YourSceneName, // Add this line
};
```

### 3. Add to Configuration Schema

Update the scene enum in `lib/config.ts`:

```typescript
const ReactiveVisualSchema = z.object({
  type: z.literal("reactive"),
  scene: z
    .enum(["particles", "waveform", "nebula", "tesseract", "yourscene"])
    .optional(),
  colorOverride: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
```

### 4. Use in Configuration

Reference your scene in `lumina.config.ts`:

```typescript
visual: {
  type: "reactive",
  scene: "yourscene"
}
```

## Best Practices

### Audio Reactivity

- Use `getThreeBands(audioData)` to get `{ bass, mids, highs }`
- Map each element to ONE frequency band only
- Use smooth interpolation for natural movement
- Consider attack/decay characteristics of different instruments

### Performance Optimization

- Use `useMemo` for static geometry and materials
- Use `useRef` for mutable state that doesn't trigger re-renders
- Implement level-of-detail for mobile devices
- Avoid creating new objects in render loops
- Use instanced rendering for repeated elements

### Visual Design

- Create depth with fog, lighting, and camera positioning
- Use additive blending for glow effects
- Implement smooth transitions between states
- Consider color theory and visual harmony
- Test with various music genres

### Mobile Considerations

- Reduce particle counts by 50-75% on mobile
- Simplify shader complexity
- Use lower polygon counts
- Implement touch-friendly interactions
- Consider battery life impact

## Troubleshooting

### Common Issues

**1. Line Width Issues (1px browser limitation)**

- Use @react-three/drei Line with `linewidth` prop
- Implement glow effects with multiple lines
- Use shader-based line rendering when needed

**2. Audio Band Cross-Contamination**

- Ensure each visual element uses only one frequency band
- Use clear naming: `bassReactivity`, `midsRotation`, `highsSparkle`
- Test with isolated frequency content

**3. Performance Problems**

- Profile with React DevTools and browser dev tools
- Reduce particle counts on mobile
- Simplify shader calculations
- Use instanced rendering for repeated elements

**4. Mobile Rendering Issues**

- Check viewport meta tags
- Implement proper DPR scaling
- Use mobile-optimized geometry
- Test on actual devices, not just emulators

**5. React Hooks Purity Errors**

- **Math.random() during render**: Generate random values with useMemo using seeded random
- **Modifying hook returns**: Never directly modify values returned from hooks (camera.position, etc.)
- **Impure render functions**: Ensure all render functions are pure (no side effects, consistent output)
- **State mutations**: Use proper state management patterns, avoid direct object mutations

**React Hooks Error Prevention Examples:**

```typescript
// ❌ BAD: Math.random() called during render
const positions = useMemo(() => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push([Math.random(), Math.random(), Math.random()]); // Error!
  }
  return arr;
}, []);

// ❌ BAD: Math.random() in useState initializer (still called during render)
const [positions] = useState(() => {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push([Math.random(), Math.random(), Math.random()]); // Error!
  }
  return arr;
});

// ✅ GOOD: Seeded random within useMemo
const positions = useMemo(() => {
  const arr = [];
  let seed = 12345;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    arr.push([seededRandom(), seededRandom(), seededRandom()]);
  }
  return arr;
}, []);

// ✅ GOOD: Seeded random in useState initializer (pure function)
const [positions] = useState(() => {
  const arr = [];
  let seed = 12345;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    arr.push([seededRandom(), seededRandom(), seededRandom()]);
  }
  return arr;
});

// ❌ BAD: Modifying hook return value
useFrame((state) => {
  state.camera.position.x = Math.sin(time) * 5; // Error!
});

// ❌ BAD: Direct camera.position mutation
useFrame((state) => {
  state.camera.position.set(Math.sin(time) * 5, Math.cos(time) * 3, 10); // Error!
});

// ✅ GOOD: Proper camera control patterns
const cameraRef = useRef<THREE.PerspectiveCamera>(null);
useFrame((state) => {
  if (cameraRef.current) {
    cameraRef.current.position.x = Math.sin(time) * 5; // OK
  }
});

// ✅ GOOD: Use useThree for camera access
const { camera } = useThree();
useFrame((state) => {
  camera.position.set(Math.sin(time) * 5, Math.cos(time) * 3, 10); // OK - useThree returns mutable ref
});
```

### Debugging Audio Reactivity

```typescript
// Add temporary debug logging (remove in production)
console.log("Audio bands:", { bass, mids, highs });
```

### Testing Your Scene

1. **Test with different music genres**
2. **Verify mobile performance**
3. **Check audio reactivity responsiveness**
4. **Ensure smooth 60fps rendering**
5. **Test configuration integration**

## Example Scene Concepts

### 1. Fractal Bloom

- Bass: Flower petals expand/contract
- Mids: Rotation speed of the bloom
- Highs: Sparkle particles emitted from center

### 2. Sonic Architecture

- Bass: Building height/structure expansion
- Mids: Rotation and flow of architectural elements
- Highs: Window lighting and detail animation

### 3. Fluid Dynamics

- Bass: Wave amplitude and surface displacement
- Mids: Flow direction and speed
- Highs: Surface detail and particle spray

### 4. Celestial Bodies

- Bass: Planet size and orbital distance
- Mids: Rotation speed and orbit velocity
- Highs: Star field density and comet trails

## Audio Frequency Mapping Reference

| Band  | Frequency Range | Musical Content                          | Visual Characteristics    |
| ----- | --------------- | ---------------------------------------- | ------------------------- |
| Bass  | 0-275Hz         | Kick drum, bass guitar, low synths       | Weight, impact, expansion |
| Mids  | 320Hz-3.5kHz    | Vocals, guitars, snare, most instruments | Movement, flow, intensity |
| Highs | 3.5kHz-20kHz    | Cymbals, hi-hats, vocal sibilance        | Detail, sparkle, speed    |

Use this mapping to create intuitive, musical visualizations that feel connected to the audio experience.
