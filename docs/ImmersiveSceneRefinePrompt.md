# Immersive Scene Refinement Prompt

Use this prompt when you need to improve an existing immersive visualizer scene. This prompt provides context about Lumina's technical constraints and coding standards to ensure the refined scene maintains compatibility and performance.

**YOU WILL paste the existing code below AND put in what you want to refine. SEE NOTES below in ### Current Scene Code and ### Specific Requirements**

## Technical Context

### Core Requirements

- **React Compiler Compatibility**: All code must be compatible with React Compiler (no `useMemo` with closures, no `useCallback` with dependencies, no `useRef` with mutable objects in render)
- **No Math.random()**: Use seeded random functions only (see examples below)
- **No State in Visualizers**: Visualizers should not use React state - use props and refs only
- **Performance**: Keep render loops lightweight, avoid expensive calculations in `useFrame`
- **TypeScript**: All code must be properly typed
- **Particle Limit**: Maximum ~12,000 particles for smooth performance

### Audio Analysis

- Use `getThreeBands(audioData)` for frequency analysis (bass, mids, highs)
- Audio data is provided via `useAudioData()` hook
- Frequency ranges: Bass (0-275Hz), Mids (320Hz-3.5kHz), Highs (3.5kHz-20kHz)

### Immersive Scene Requirements

- **OrbitControls**: Must include interactive camera controls
- **Single Focus Element**: One main visual element for exploration
- **Audio-Driven Camera**: Camera movement controlled by audio
- **User-Defined Mappings**: Respect existing audio frequency band mappings
- **Mobile Optimization**: Reduce complexity on mobile devices
- **Color System**: Optional vertex colors with time-based and audio-reactive coloring
- **High Particle Counts**: Can support 12,000+ particles with proper optimization

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
[PASTE YOUR EXISTING IMMERSIVE VISUALIZER CODE HERE]
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
- "Improve camera responsiveness to audio"
- "Add more immersive lighting effects"
```

### Specific Requirements

```
[LIST ANY SPECIFIC REQUIREMENTS OR CONSTRAINTS]
Examples:
- "Must maintain current audio mappings"
- "Performance must remain under 60fps on mobile"
- "Keep particle count under 12,000"
- "Must work with existing OrbitControls setup"
- "Keep the scene within 1000 lines of code"
- "Must maintain current color scheme"
```

## Common Improvements for Immersive Scenes

### Audio Reactivity

- Increase sensitivity to specific frequency bands
- Add smoother transitions between audio states
- Implement more complex audio-driven camera movements
- Enhance element responsiveness to user-defined mappings
- Optimize color systems for better performance
- Improve color reaction speed and smoothness
- Add time-based color transitions
- Implement distance-based color variation

### Visual Polish

- Add lighting effects and shadows
- Improve material quality and shaders
- Add post-processing effects
- Enhance color palettes and gradients
- Add depth cues and atmospheric effects
- Implement vertex color systems with proper initialization
- Add time-based color keyframes and transitions
- Create audio-reactive color mapping systems

### Performance Optimization

- Reduce geometry complexity
- Optimize render loops
- Use instancing for repeated objects
- Implement level-of-detail (LOD) systems
- Optimize particle systems for mobile
- Optimize color calculations and buffer updates
- Use efficient color interpolation methods
- Implement proper color attribute management

### Camera & Interaction

- Improve OrbitControls responsiveness
- Add audio-reactive camera movements
- Enhance mouse/touch interaction
- Add smooth camera transitions
- Implement better collision detection for camera
- Add color-based camera effects
- Implement audio-reactive color transitions

### Mobile Optimization

- Reduce particle counts on mobile
- Simplify shaders for mobile GPUs
- Optimize texture usage
- Implement adaptive quality settings
- Reduce draw calls
- Optimize color buffer updates for mobile
- Use efficient color palette management

## Output Format

The refined scene should be provided as:

1. Complete TypeScript/React component code
2. Any new utility functions or hooks needed
3. Performance notes if applicable
4. Testing recommendations
5. Updated audio mapping documentation if changed

Ensure the final code maintains compatibility with Lumina's architecture and follows the technical constraints outlined above.

## Quality Checklist

- [ ] Maintains React Compiler compatibility
- [ ] Uses seeded random instead of Math.random()
- [ ] Respects particle count limits (can support 12k+)
- [ ] Includes OrbitControls for interaction
- [ ] Maintains user-defined audio mappings
- [ ] Optimized for mobile performance
- [ ] Professional visual quality
- [ ] Smooth 60fps animation
- [ ] Proper TypeScript typing
- [ ] No external dependencies or network requests
- [ ] Color system with proper vertex color initialization
- [ ] Time-based and audio-reactive color transitions
- [ ] Efficient color buffer management
- [ ] Race condition prevention in color systems
