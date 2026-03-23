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
  // Formation from scattered cloud, completing around 15 seconds
  float formation = smoothstep(2.0, 15.0, uTime);
  vec3 currentPos = mix(position, aTarget, formation);

  // Mids control neutral colors and manipulate the structural breathing
  float breath = sin(uTime * 1.5 + length(aTarget) * 2.0) * (0.05 + (uAudioMids * 0.2 * uAudioEnabled));

  // Bass drives scale expansion for inner ring
  float scale = 1.0;
  if (aRing < 0.5) {
    scale += uAudioBass * 0.4 * uAudioEnabled;
  }

  // Highs control chaotic scatter in the outer ring
  vec3 highScatter = vec3(0.0);
  if (aRing > 1.5) {
    highScatter = normalize(aTarget) * (uAudioHighs * 0.4 * uAudioEnabled);
  }

  vec3 finalPos = currentPos * scale + (normalize(currentPos) * breath) + highScatter;
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Particle size dynamics
  gl_PointSize = (2.0 + (aRing * 0.5) + (uAudioHighs * 2.0 * uAudioEnabled)) * (15.0 / -mvPosition.z);

  // Frequency-band color mapping
  vec3 baseColor;
  if (aRing < 0.5) {
    baseColor = mix(vec3(0.05, 0.02, 0.15), vec3(0.2, 0.0, 0.4), uAudioBass * uAudioEnabled);
  } else if (aRing < 1.5) {
    baseColor = mix(vec3(0.4, 0.3, 0.5), vec3(0.6, 0.4, 0.7), uAudioMids * uAudioEnabled);
  } else {
    baseColor = mix(vec3(0.6, 0.7, 0.9), vec3(0.9, 0.9, 1.0), uAudioHighs * uAudioEnabled);
  }

  vColor = baseColor;
}
`;

const fragmentShader = `
varying vec3 vColor;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.2, dist);
  gl_FragColor = vec4(vColor, alpha);
}
`;

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { pointer } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, targets, rings, count } = useMemo(() => {
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 12000;
    const pos = new Float32Array(count * 3);
    const tar = new Float32Array(count * 3);
    const rng = new Float32Array(count);
    const symmetry = 16;

    for (let i = 0; i < count; i++) {
      // Starting cloud
      const initR = 10 + seededRandom() * 15;
      const initTheta = seededRandom() * Math.PI * 2;
      const initPhi = Math.acos(2 * seededRandom() - 1);

      pos[i * 3] = initR * Math.sin(initPhi) * Math.cos(initTheta);
      pos[i * 3 + 1] = initR * Math.sin(initPhi) * Math.sin(initTheta);
      pos[i * 3 + 2] = initR * Math.cos(initPhi);

      // Mandala rings
      const ringType = i % 3;
      rng[i] = ringType;

      const baseRadius = (ringType + 1) * 2.0;
      const petalIndex = Math.floor(seededRandom() * symmetry);
      const baseAngle = petalIndex * ((Math.PI * 2) / symmetry);
      const angleSpread = (seededRandom() - 0.5) * 0.35;
      const finalAngle = baseAngle + angleSpread;
      const rVariation = (seededRandom() - 0.5) * 0.9;
      const finalRadius = baseRadius + rVariation;

      tar[i * 3] = finalRadius * Math.cos(finalAngle);
      tar[i * 3 + 1] = finalRadius * Math.sin(finalAngle);
      tar[i * 3 + 2] = (seededRandom() - 0.5) * 0.4;
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
      const baseRotation = time * 0.05;
      const highBoost = Math.sin(time * 0.8) * highs * 0.15 * audioEnabled;
      groupRef.current.rotation.y = baseRotation + highBoost + (pointer.x * 0.2);
      groupRef.current.rotation.x = Math.sin(time * 0.3) * (0.1 + mids * 0.1 * audioEnabled) - pointer.y * 0.2;
    }
  });

  return (
    <>
      <OrbitControls makeDefault enablePan={false} maxDistance={15} minDistance={2} />
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute
              attach="attributes-aTarget"
              args={[targets, 3]}
            />
            <bufferAttribute
              attach="attributes-aRing"
              args={[rings, 1]}
            />
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
      </group>
    </>
  );
}

export default function Mandala() {
  const audioData = useAudioData();

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000", overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 0, 7.5], fov: 60 }} dpr={[1, 2]}>
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}