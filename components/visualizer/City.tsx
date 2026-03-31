"use no memo";
"use client";

import * as THREE from "three";
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { getThreeBands } from "@/lib/audioAnalysis";

export default function MyceliumCity({ audioData }: { audioData: Uint8Array | null }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  
  const PARTICLE_COUNT = 10000;

  // 1. Create the data once.
  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const rnds = new Float32Array(PARTICLE_COUNT);
    let seed = 555;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 25;
      pos[i * 3 + 1] = 0; 
      pos[i * 3 + 2] = (rnd() - 0.5) * 25;
      rnds[i] = rnd();
    }
    return { positions: pos, randoms: rnds };
  }, []);

  // 2. HARD-FIX: Manual attribute assignment (Stops the freeze)
  useLayoutEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    }
  }, [positions, randoms]);

  const vertexShader = `
    uniform float uTime;
    uniform float uBass;
    attribute float aRandom;
    varying vec3 vColor;

    void main() {
      vec3 pos = position;
      pos.y += uBass * aRandom * 10.0;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 2.0 * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      vColor = mix(vec3(0.0, 0.1, 0.2), vec3(0.0, 1.0, 0.8), uBass);
    }
  `;

  useFrame((state) => {
    if (!materialRef.current) return;
    const { bass } = getThreeBands(audioData);
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uBass.value,
      bass || 0,
      0.1
    );
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader="varying vec3 vColor; void main() { if(distance(gl_PointCoord, vec2(0.5)) > 0.5) discard; gl_FragColor = vec4(vColor, 1.0); }"
        uniforms={{ uTime: { value: 0 }, uBass: { value: 0 } }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}