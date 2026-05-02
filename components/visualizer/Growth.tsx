"use no memo";
"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";

// Aligned segments to allow a 1:1 mapping between geometry and fragment lines
const CONFIG = {
  width: 80,
  depth: 120,
  segmentsX: 80, 
  segmentsY: 120,
};

export default function CyberpunkGrid({
  audioData,
}: {
  audioData: Uint8Array | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const smoothBass = useRef(0);
  const smoothMids = useRef(0);
  const smoothHighs = useRef(0);

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(
      CONFIG.width,
      CONFIG.depth,
      CONFIG.segmentsX,
      CONFIG.segmentsY
    );
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMids: { value: 0 },
      uHighs: { value: 0 },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    varying vec2 vUv;
    varying float vElevation;

    // Generates geometric, angular topography instead of smooth ocean waves
    float getElevation(vec2 coord) {
      float h = 0.0;
      // Bass: Subterranean foundation (Smooth, massive)
      h += max(0.0, sin(coord.x * 2.0) * cos(coord.y * 2.0)) * uBass * 6.0;
      // Mids: Structural complexity (Angular, sharp ridges)
      h += abs(sin(coord.x * 6.0 - coord.y * 4.0)) * uMids * 2.5;
      // Highs: Glitchy surface tension (Spikey, nervous energy)
      h += step(0.85, sin(coord.x * 15.0) * cos(coord.y * 15.0)) * uHighs * 2.0;
      return h;
    }

    void main() {
      vec3 pos = position;
      vec2 scrolledUv = uv;

      // 1. Pull the grid towards the camera seamlessly
      scrolledUv.y -= uTime * 0.15;

      // 2. Lock displacement directly to the scrolled UVs. 
      // This ensures the peaks physically travel with the grid lines.
      float elevation = getElevation(scrolledUv * 10.0);

      // 3. THE FIX: Displace the Z axis.
      pos.z += elevation;

      vUv = scrolledUv;
      vElevation = elevation;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Sync the fragment grid perfectly to the geometry segments
      vec2 grid = fract(vUv * vec2(${CONFIG.segmentsX.toFixed(1)}, ${CONFIG.segmentsY.toFixed(1)}));
      float line = min(grid.x, grid.y);

      // Razor-sharp grid lines
      float alpha = smoothstep(0.08, 0.0, line);

      // Cyberpunk Palette: Deep cyan base, electric magenta peaks
      vec3 baseColor = vec3(0.02, 0.85, 0.95);
      vec3 peakColor = vec3(0.95, 0.1, 0.85);
      vec3 finalColor = mix(baseColor, peakColor, clamp(vElevation * 0.35, 0.0, 1.0));

      // Fade into the infinite distance (simulate depth fog)
      float depthFade = smoothstep(1.0, 0.1, vUv.y);

      gl_FragColor = vec4(finalColor, alpha * depthFade);
    }
  `;

  useFrame((state, delta) => {
    const { bass, mids, highs } = getThreeBands(audioData);

    smoothBass.current = THREE.MathUtils.lerp(smoothBass.current, bass, delta * 12);
    smoothMids.current = THREE.MathUtils.lerp(smoothMids.current, mids, delta * 14);
    smoothHighs.current = THREE.MathUtils.lerp(smoothHighs.current, highs, delta * 20);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uBass.value = smoothBass.current;
      materialRef.current.uniforms.uMids.value = smoothMids.current;
      materialRef.current.uniforms.uHighs.value = smoothHighs.current;
    }
  });

  return (
    <>
      <color attach="background" args={["#030508"]} />

      {/* Tilt the plane flat like a floor, then angle it down slightly for the infinite horizon */}
      <group rotation={[-Math.PI / 2 + 0.15, 0, 0]} position={[0, -5, -20]}>
        <mesh ref={meshRef} geometry={geometry}>
          <shaderMaterial
            ref={materialRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <OrbitControls
        makeDefault
        autoRotate={false}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}