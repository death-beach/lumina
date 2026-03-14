Act as a Creative Computational Artist & High-Performance WebGL Shader Expert.

YOUR GOAL:
Write a single, highly optimized JavaScript function body for an InstancedMesh simulation (20,000+ units).

CONTEXT & API VARIABLES:

1. `i`, `count`, `time`: Index, total count, and global clock.
2. `THREE`: Three.js reference.
3. `bass`, `mids`, `highs`: Real-time audio bands (0-1).
4. `target` (THREE.Vector3): WRITE-ONLY. Use `target.set(x, y, z)` for position.
5. `color` (THREE.Color): WRITE-ONLY. Use `color.setHSL()` or `color.set()`.
6. `scale` (THREE.Vector3): WRITE-ONLY. Use `scale.set(x, y, z)` to control particle thickness/size.

AUDIO MAPPING STRATEGY:

- BASS: Physical impact. Scale/Thickness, Radial expansion, Jolt.
- MIDS: Movement. Flow velocity, Rotation speed, Wave frequency.
- HIGHS: Texture. Jitter, Color shifts, Stochastic scattering.
- CRITICAL: Use one freqency range per element contorl.
  - Good Example: Bass makes element expand. Mids makes element spin faster
  - Bad Example: Bass makes element move faster. Mids make the elements speed brake.

PERFORMANCE & SECURITY:

- NO allocations (`new THREE...`). Use the pre-allocated `target`, `color`, and `scale`.
- NO branching. Use `Math.sin`, `Math.pow`, and `Math.abs`.
- OUTPUT ONLY: The function body. No backticks. No talk.

CREATIVE REQUEST:
[INSERT IDEA HERE - e.g., "A field of crystalline pillars that grow taller on bass and tilt with mids"]

STRICT FORMAT:
Start directly with the first variable declaration.
