# Scene Refinement Prompt

Use this prompt when you need to improve an existing visualizer scene. This prompt provides context about Lumina's technical constraints and coding standards to ensure the refined scene maintains compatibility and performance.

**STEP 1: INTERVIEW THE USER**

**BEFORE writing any code, ask the user these 3 questions:**

1. **WHAT'S NOT WORKING:** "What specifically feels off about the current scene? (e.g., too busy, not reactive enough, colors clash, camera moves wrong)"
2. **WHAT SHOULD CHANGE:** "What do you want to improve? (e.g., more bass reactivity, smoother camera, better colors, more layers, mobile performance)"
3. **WHAT SHOULD STAY:** "What parts of the current scene do you love and want to keep?"

**Wait for the user's answers before proceeding.**

**STEP 2: ANALYZE & REFINE**

**After receiving answers, analyze the existing code and generate the refined component.**

**YOU WILL paste the existing code below AND put in what you want to refine. SEE NOTES below in ### Current Scene Code, ### Description of Desired Improvements, and ### Specific Requirements**

## Technical Context

### Core Requirements

- **React Compiler Compatibility**: All code must be compatible with React Compiler (no `useMemo` with closures, no `useCallback` with dependencies, no `useRef` with mutable objects in render)
- **No Math.random()**: Use seeded random functions only (see examples below)
- **No State in Visualizers**: Visualizers should not use React state - use props and refs only
- **Performance**: Keep render loops lightweight, avoid expensive calculations in `useFrame`
- **TypeScript**: All code must be properly typed

### Audio Analysis

- Use `getThreeBands(audioData)` for frequency analysis (bass, mids, highs)
- Audio data is provided via `useAudioData()` hook
- Frequency ranges: Bass (0-275Hz), Mids (320Hz-3.5kHz), Highs (3.5kHz-20kHz)

### React Three Fiber

- Use `useFrame` for animations and updates
- Use `useRef` for persistent references to Three.js objects
- Use `useMemo` for expensive geometry/material calculations (but not with closures)
- Use `useThree` for camera, scene, and renderer access

### Seeded Random Example

```typescript
// Use this pattern instead of Math.random()
let seed = 12345;
const seededRandom = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
```

## Scene Refinement Template

### Current Scene Code

```
[PASTE YOUR EXISTING VISUALIZER CODE HERE]
```

### Description of Desired Improvements

```
[DESCRIBE WHAT YOU WANT TO IMPROVE OR CHANGE IN THE SCENE]
Examples:
- "Make the scene more reactive to bass frequencies"
- "Add particle effects that respond to high frequencies"
- "Improve performance by optimizing the render loop"
- "Add more dynamic color transitions"
- "Make the scene more interactive with mouse movement"
- "Add depth and layering to the visual elements"
```

### Specific Requirements

```
[LIST ANY SPECIFIC REQUIREMENTS OR CONSTRAINTS]
Examples:
- "Must maintain current color scheme"
- "Performance must remain under 60fps on mobile"
- "Keep the scene within 1000 lines of code"
- "Must work with existing audio analysis"
```

## Common Improvements

### Audio Reactivity

- Increase sensitivity to specific frequency bands
- Add smoother transitions between audio states
- Implement more complex audio-driven animations

### Visual Polish

- Add lighting effects and shadows
- Improve material quality and shaders
- Add post-processing effects
- Enhance color palettes and gradients

### Performance Optimization

- Reduce geometry complexity
- Optimize render loops
- Use instancing for repeated objects
- Implement level-of-detail (LOD) systems

### Interactivity

- Add mouse/touch responsiveness
- Implement keyboard controls
- Add parameter controls for user customization
- Create smooth transitions between states

## Output Format

The refined scene should be provided as:

1. Complete TypeScript/React component code
2. Any new utility functions or hooks needed
3. Performance notes if applicable
4. Testing recommendations

Ensure the final code maintains compatibility with Lumina's architecture and follows the technical constraints outlined above.
