'use no memo';
'use client';

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
  // Formation phase: 2s to 15s
  float formation = smoothstep(2.0, 15.0, uTime);
  vec3 currentPos = mix(position, aTarget, formation);

  // Breathing effect driven by Mids
  float breathIntensity = 0.03 + (uAudioMids * 0.2 * uAudioEnabled);
  float breath = sin(uTime * 1.2 + length(aTarget) * 2.0) * breathIntensity;

  // Bass scale expansion for structural integrity
  float scale = 1.0 + (uAudioBass * 0.25 * uAudioEnabled * (1.0 - aRing * 0.15));

  // Highs create "sparkle" on the outer edges
  vec3 jitter = vec3(0.0);
  if (aRing > 3.5) {
    jitter = vec3(sin(uTime * 10.0 + float(gl_VertexID)), cos(uTime * 12.0), 0.0) * uAudioHighs * 0.1 * uAudioEnabled;
  }

  vec3 finalPos = (currentPos * scale) + (normalize(currentPos) * breath) + jitter;
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Sizes: Smaller for lines, larger for "accent dots"
  float size = (1.2 + (aRing * 0.2)) * (20.0 / -mvPosition.z);
  gl_PointSize = size * (1.0 + uAudioHighs * uAudioEnabled);

  // Sacred Geometry Palette: Deep Indigo to Electric White
  vec3 color;
  if (aRing < 1.0) color = mix(vec3(0.2, 0.05, 0.4), vec3(0.5, 0.2, 1.0), uAudioBass * uAudioEnabled);
  else if (aRing < 3.0) color = mix(vec3(0.4, 0.4, 0.7), vec3(0.7, 0.7, 1.0), uAudioMids * uAudioEnabled);
  else color = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 1.0, 1.0), uAudioHighs * uAudioEnabled);

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
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const { positions, targets, rings, count } = useMemo(() => {
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 15000; // Increased density for "lines"
    const pos = new Float32Array(count * 3);
    const tar = new Float32Array(count * 3);
    const rng = new Float32Array(count);

    // Layer definitions that mimic the "drawn" lines of the reference image
    const layers = [
      { r: 0.5, petals: 8, amp: 0.3, type: 0 },   // Core Seed
      { r: 1.5, petals: 12, amp: 0.8, type: 1 },  // Inner Sharp Petals
      { r: 2.8, petals: 24, amp: 0.2, type: 2 },  // Connecting Arc Ring
      { r: 4.2, petals: 16, amp: 1.2, type: 3 },  // Large Detailed Petals
      { r: 5.5, petals: 32, amp: 0.5, type: 4 }   // Outer Scalloped Border
    ];

    for (let i = 0; i < count; i++) {
      // 1. Initial Cloud (Unchanged)
      const iR = 10 + seededRandom() * 10;
      const iTheta = seededRandom() * Math.PI * 2;
      const iPhi = Math.acos(2 * seededRandom() - 1);
      pos[i * 3] = iR * Math.sin(iPhi) * Math.cos(iTheta);
      pos[i * 3 + 1] = iR * Math.sin(iPhi) * Math.sin(iTheta);
      pos[i * 3 + 2] = iR * Math.cos(iPhi);

      // 2. Target Path Mapping
      const lIdx = i % layers.length;
      const layer = layers[lIdx];
      rng[i] = layer.type;

      // Instead of random angle, we distribute them along the "line"
      const t = seededRandom(); // Progress along the petal path
      const angle = t * Math.PI * 2;
      
      // Sacred Geometry Path Function: Radius modulated by petal count
      // We use absolute sine for sharp "V" shapes vs rounded arcs
      const petalMod = Math.abs(Math.sin((layer.petals * angle) / 2));
      const targetR = layer.r + (layer.amp * petalMod);

      // Add "Stroke" noise (very thin) to make it look like a line
      const strokeJitter = (seededRandom() - 0.5) * 0.05;

      tar[i * 3] = (targetR + strokeJitter) * Math.cos(angle);
      tar[i * 3 + 1] = (targetR + strokeJitter) * Math.sin(angle);
      tar[i * 3 + 2] = (seededRandom() - 0.5) * 0.1;
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
      groupRef.current.rotation.z = time * 0.03;
      groupRef.current.rotation.x = pointer.y * -0.2;
      groupRef.current.rotation.y = pointer.x * 0.2;
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
      <Canvas camera={{ position: [0, 0, 17], fov: 45 }}>
        <Scene audioData={audioData} />
        <OrbitControls enablePan={false} maxDistance={25} minDistance={5} />
      </Canvas>
    </div>
  );
}