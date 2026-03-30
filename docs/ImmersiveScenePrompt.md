# THE LUMINA SHADER-ENGINE PROMPT (NEW ARCHITECTURE)

---

## ⚠️ STOP — READ THIS BEFORE WRITING A SINGLE LINE OF CODE ⚠️

### THIS PROJECT HAS `reactCompiler: true` IN `next.config.ts`

```ts
// next.config.ts
const nextConfig = {
  reactCompiler: true, // ← THIS IS ACTIVE. IT WILL BREAK YOUR CODE.
};
```

The React Compiler is **NOT optional**, **NOT ignorable**, and **NOT a warning**. It is **a build-breaking ESLint error (severity 8)** that will prevent the app from compiling.

### THE TWO ERRORS THAT WILL DESTROY YOUR SCENE:

**ERROR 1 — `react-hooks/purity` — THE MATH.RANDOM KILLER:**

```
Error: Cannot call impure function during render
`Math.random` is an impure function.
```

This fires when `Math.random()` is called **anywhere inside a component** — including inside `useMemo`. The React Compiler considers `Math.random()` impure in ALL contexts.

**❌ THIS WILL BREAK. DO NOT DO THIS:**

```tsx
const positions = useMemo(() => {
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 80; // COMPILER ERROR
  }
}, []);
```

**✅ THE ONLY CORRECT WAY — SEEDED RANDOM INSIDE useMemo:**

```tsx
const seededRandom = useMemo(() => {
  let seed = 12345;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}, []);

const positions = useMemo(() => {
  const rnd = seededRandom;
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 80; // CORRECT
  }
}, [seededRandom]);
```

---

**ERROR 2 — `react-hooks/immutability` — THE UNIFORMS KILLER:**

```
Error: This value cannot be modified
Modifying a value previously passed as an argument to a hook is not allowed.
```

This fires when you mutate a `uniforms` object returned from or passed into a hook.

**❌ THIS WILL BREAK. DO NOT DO THIS:**

```tsx
const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

useFrame(() => {
  uniforms.uTime.value = time; // COMPILER ERROR — cannot mutate hook argument
});
```

**✅ THE ONLY CORRECT WAY — MUTATE VIA REF:**

```tsx
const materialRef = useRef<THREE.ShaderMaterial>(null!);

const uniforms = useMemo(
  () => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
  }),
  [],
);

useFrame((state) => {
  if (materialRef.current) {
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime; // CORRECT
    materialRef.current.uniforms.uBass.value = bass; // CORRECT
  }
});
```

---

**These two patterns are the #1 cause of broken Lumina scenes. Every scene you generate MUST use seeded random and ref-based uniform mutation. No exceptions.**

---

## ARCHITECTURAL CHANGE: INNER COMPONENTS ONLY

Scenes are **inner components only**. The `<Canvas>` and wrapper `<div>` are handled by `VisualizerViewport.tsx`.

- **DO NOT** import `Canvas` or `useAudioData`
- **DO NOT** return any HTML elements or wrapper divs
- **MUST** accept `audioData` as a prop: `{ audioData: Uint8Array | null }`
- **MUST** return only R3F elements: `<points>`, `<group>`, `<mesh>`, lights, etc.

---

### PHASE 1: THE MANDATORY INTERVIEW

**STOP.** Before writing any code, ask the user these 4 questions:

1. **THE VIBE:** What is the emotional state? (e.g., "Dark Techno Warehouse," "Ethereal Dreamscape," "Cyberpunk Horizon")
2. **THE FOCAL POINT:** What is the central structure? (e.g., "A pulsing geometric core," "15,000 floating light-spires," "A liquid-mercury river")
3. **THE ATMOSPHERE:** What layers the background? (e.g., "Reactive Nebula," "Strobe-heavy Starfield," "Thick Volumetric Haze")
4. **THE PALETTE:** What are the primary, accent, and background colors?

---

### PHASE 2: ENGINEERING STANDARDS

- **GLSL-DRIVEN:** All movement must be handled in the **Vertex Shader**.
- **BUTTERY SMOOTHING:** Use `THREE.MathUtils.lerp` for `bass`, `mids`, and `highs` within `useFrame`.
- **LAYERED DEPTH:** Background + Midground + Foreground layers.
- **PERFORMANCE:** Max 18,000 particles. All `Float32Array` attributes in `useMemo`.
- **THE GLOW:** Use `THREE.AdditiveBlending` and `depthWrite: false`.
- **AUDIO BANDS:** Bass (0-275Hz) = weight/pulse. Mids (320Hz-3.5kHz) = flow/rotation. Highs (3.5kHz-20kHz) = sparkle/speed.

---

### PHASE 3: COMPONENT STRUCTURE

```tsx
"use no memo";
"use client";

import { useFrame } from "@react-three/fiber";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const CONFIG = {
  /* scene constants */
};

export default function YourSceneName({
  audioData,
}: {
  audioData: Uint8Array | null;
}) {
  // REQUIRED: Seeded random — never Math.random()
  const seededRandom = useMemo(() => {
    let seed = 12345;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, []);

  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // REQUIRED: uniforms in useMemo, mutated only via materialRef
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMids: { value: 0 },
      uHighs: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    const { bass, mids, highs } = getThreeBands(audioData);
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uBass.value = bass;
      materialRef.current.uniforms.uMids.value = mids;
      materialRef.current.uniforms.uHighs.value = highs;
    }
  });

  return <>{/* R3F elements ONLY — no Canvas, no divs */}</>;
}
```

**DO NOT OUTPUT EXPLANATIONS. OUTPUT ONLY THE COMPONENT AFTER THE INTERVIEW.**
