# Lumina Scene Ideas

A curated list of 20 visualizer concepts that work reliably with the Immersive Scene prompt system.

All of these are **centered on the origin**, look great from the default camera at `[0, 0, 12]`, and react naturally to audio through rotation, scale, and color. **Avoid landscape/horizon scenes** — they require custom camera engineering that fights the system.

---

## 🌌 Cosmic / Space

1. **Supernova** — A glowing sphere of particles that explodes outward on every bass hit, then slowly collapses back in. Palette: orange, white, deep red.

2. **Black Hole** — Dark center pulling a glowing accretion disk of particles into a spiral. Rotation speed reacts to bass. Palette: electric blue, white, void black.

3. **Solar Flare** — A central sun sphere with particle arcs shooting off on bass hits. Color shifts from yellow to red with highs. Palette: amber, coral, white.

4. **Nebula Cloud** — Soft, drifting particle fog in multiple color layers, slowly swirling and breathing with mids. Palette: purple, teal, pink.

5. **Pulsar** — Two opposing jets of particles shooting from a spinning neutron star core. Jet length driven by highs. Palette: cyan, white, deep blue.

---

## 🔷 Geometric / Abstract

6. **Kaleidoscope** — Symmetric fractal geometry rotating on multiple axes simultaneously. Each axis tied to a different audio band. Palette: anything vivid and high-contrast.

7. **Wormhole** — A spiraling tunnel of particles that you appear to fly through. Speed driven by mids. Palette: purple, white, electric blue.

8. **Quantum Atom** — A glowing nucleus with multiple electron shell rings orbiting at different speeds. Each ring responds to a different frequency band. Palette: neon green, cyan, white.

9. **Tesseract Bloom** — A 4D hypercube that unfolds and refolds with audio. Neon wireframe edges with additive glow. Palette: hot pink, electric blue, black.

10. **Crystal Lattice** — A 3D grid of glowing nodes connected by beams. Nodes pulse on bass, beams brighten on highs. Palette: ice blue, white, gold.

---

## 🌿 Organic / Natural

11. **Jellyfish** — A bioluminescent dome with flowing particle tentacles that trail as it rotates. Bass drives pulse, highs drive tentacle shimmer. Palette: soft teal, pink, white.

12. **Lotus Flower** — A giant flower that opens/closes petals on bass. Each petal a different neon color. Palette: pink, violet, gold, green.

13. **Coral Formation** — Branching organic particle structures growing outward from center on highs. Palette: orange, hot pink, deep blue.

14. **Living Organism** — An amorphous blob that breathes and morphs to every beat like a heartbeat. Palette: biomorphic greens and purples.

15. **Mycelium Network** — Branching glowing thread-lines spreading outward from center like a neural network. New branches on bass hits. Palette: white, soft blue, black.

---

## ⚡ Energy / Force

16. **Lightning Core** — Electrical tendrils fracturing outward from a central point on transients. Palette: white, electric blue, purple.

17. **Gravity Well** — A particle field being pulled into and orbiting a glowing singularity. Orbit speed driven by mids. Palette: red, orange, black.

18. **Plasma Tornado** — A spinning vortex of colored particles. Height and rotation speed react to bass. Palette: magenta, cyan, white.

19. **Lava Lamp** — Large glowing morphing blobs that slowly rise and fall. Bass-reactive size and brightness. Palette: orange, red, dark background.

20. **Prism Burst** — A central rotating prism that refracts colored particle beams outward like a disco ball. Each beam a different hue. Palette: full rainbow spectrum.

---

## ✅ What Makes These Work

- **Centered on origin** — the default camera at `[0, 0, 12]` sees everything
- **Spherical / radial** — looks good from every angle without a specific viewpoint
- **Scale + rotation + color** — the three things audio reactivity handles best natively
- **No landscape perspective needed** — no custom camera, no horizon, no ground plane tricks

## ❌ What Doesn't Work Well

- Horizon landscapes ("city on the horizon", "ocean waves")
- First-person perspectives
- Anything that requires the viewer to be "inside" a specific spatial relationship
