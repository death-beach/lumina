"use no memo";
"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

const vertexShader = `
uniform float uTime;
uniform float uAudioBass;
uniform float uAudioMids;
uniform float uAudioHighs;
uniform float uAudioEnabled;

attribute vec3 aTarget;
attribute float aRing;

varying vec3 vColor;

void main() {
  // 15-second formation window from cloud to geometry
  float formation = smoothstep(2.0, 15.0, uTime);
  vec3 currentPos = mix(position, aTarget, formation);

  // Mids drive the "pulse" of the geometry
  float breath = sin(uTime * 1.2 + length(aTarget) * 1.5) * (0.04 + (uAudioMids * 0.25 * uAudioEnabled));

  // Bass impacts the core (Rings 0, 1, 2)
  float scale = 1.0;
  if (aRing < 2.5) {
    scale += uAudioBass * 0.35 * uAudioEnabled;
  }

  // Highs create jitter in the outer petal tips
  vec3 highScatter = vec3(0.0);
  if (aRing > 3.5) {
    highScatter = normalize(aTarget) * (uAudioHighs * 0.5 * uAudioEnabled);
  }

  vec3 finalPos = currentPos * scale + (normalize(currentPos) * breath) + highScatter;
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Particle size based on frequency and depth
  float sizeMod = 1.0 + (uAudioHighs * 2.0 * uAudioEnabled);
  gl_PointSize = (1.4 + (aRing * 0.3)) * sizeMod * (20.0 / -mvPosition.z);

  // High-contrast Mandala Palette
  vec3 color;
  if (aRing < 1.0) color = mix(vec3(0.1, 0.05, 0.2), vec3(0.4, 0.1, 0.8), uAudioBass * uAudioEnabled);
  else if (aRing < 3.0) color = mix(vec3(0.3, 0.3, 0.6), vec3(0.7, 0.5, 0.9), uAudioMids * uAudioEnabled);
  else color = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 1.0, 1.0), uAudioHighs * uAudioEnabled);

  vColor = color;
}
`;

const fragmentShader = `
varying vec3 vColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.2, dist));
}
`;

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { pointer } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, targets, rings, count } = useMemo(() => {
    let seed = 777;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 12000;
    const pos = new Float32Array(count * 3);
    const tar = new Float32Array(count * 3);
    const rng = new Float32Array(count);

    // Geometry definitions based on the provided reference image
    const layers = [
      { r: 0.6, petals: 8, amp: 0.2, type: 0, density: 0.1 },  // Central Seed
      { r: 1.8, petals: 16, amp: 0.4, type: 1, density: 0.15 }, // Inner Lotus
      { r: 3.2, petals: 32, amp: 0.1, type: 2, density: 0.05 }, // Dotted Mid-Ring
      { r: 4.5, petals: 12, amp: 0.6, type: 3, density: 0.2 },  // Outer Petal Tier
      { r: 5.8, petals: 24, amp: 0.3, type: 4, density: 0.25 }  // Scalloped Border
    ];

    for (let i = 0; i < count; i++) {
      // Step 1: Initial Random Sphere Cloud
      const iR = 12 + seededRandom() * 8;
      const iTheta = seededRandom() * Math.PI * 2;
      const iPhi = Math.acos(2 * seededRandom() - 1);
      pos[i * 3] = iR * Math.sin(iPhi) * Math.cos(iTheta);
      pos[i * 3 + 1] = iR * Math.sin(iPhi) * Math.sin(iTheta);
      pos[i * 3 + 2] = iR * Math.cos(iPhi);

      // Step 2: Target Sacred Geometry (Polar Rose Mathematics)
      const layer = layers[i % layers.length];
      rng[i] = layer.type;

      const angle = seededRandom() * Math.PI * 2;
      // The "Sacred" shape: Radius = Base + (Amplitude * cos(Petals * Angle))
      const petalShape = Math.abs(Math.cos((layer.petals * angle) / 2.0));
      const radius = layer.r + (layer.amp * petalShape);
      
      const jitter = (seededRandom() - 0.5) * layer.density;

      tar[i * 3] = (radius + jitter) * Math.cos(angle);
      tar[i * 3 + 1] = (radius + jitter) * Math.sin(angle);
      tar[i * 3 + 2] = (seededRandom() - 0.5) * 0.2;
    }

    return { positions: pos, targets: tar, rings: rng, count };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAudioBass: { value: 0 },
    uAudioMids: { value: 0 },
    uAudioHighs: { value: 0 },
    uAudioEnabled: { value: 0 },
  }), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const { bass, mids, highs } = getThreeBands(audioData);
    const audioEnabled = time > 17.0 ? 1.0 : 0.0;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uAudioBass.value = bass;
      materialRef.current.uniforms.uAudioMids.value = mids;
      materialRef.current.uniforms.uAudioHighs.value = highs;
      materialRef.current.uniforms.uAudioEnabled.value = audioEnabled;
    }

    if (groupRef.current) {
      groupRef.current.rotation.z = time * 0.05 + (highs * 0.1 * audioEnabled);
      groupRef.current.rotation.x = (pointer.y * -0.15) + (Math.sin(time * 0.5) * 0.05);
      groupRef.current.rotation.y = (pointer.x * 0.15);
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTarget" args={[targets, 3]} />
        <bufferAttribute attach="attributes-aRing" args={[rings, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Mandala() {
  const audioData = useAudioData();

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <Scene audioData={audioData} />
        <OrbitControls enablePan={false} maxDistance={20} minDistance={5} />
      </Canvas>
    </div>
  );
}