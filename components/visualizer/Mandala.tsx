'use no memo';
'use client';

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

// ──────────────────────────────────────────────────────────────
// BACKGROUND
// ──────────────────────────────────────────────────────────────
const bgVertexShader = `
uniform float uTime;
varying vec3 vColor;
void main() {
  vec3 pos = position;
  pos.z += mod(uTime * 2.0, 50.0);
  if (pos.z > 25.0) pos.z -= 50.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 2.0 * (25.0 / -gl_Position.z);
  vColor = mix(vec3(0.05, 0.1, 0.2), vec3(0.3, 0.1, 0.4), sin(uTime * 0.5 + pos.x) * 0.5 + 0.5);
}
`;

const bgFragmentShader = `
varying vec3 vColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  gl_FragColor = vec4(vColor, 0.6);
}
`;

function BackgroundParticles() {
  const bgMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const { positions } = useMemo(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.sin(i * 3) * 10000 % 1 - 0.5) * 60;
      pos[i * 3 + 1] = (Math.sin(i * 3 + 1) * 10000 % 1 - 0.5) * 60;
      pos[i * 3 + 2] = (Math.sin(i * 3 + 2) * 10000 % 1 - 0.5) * 50;
    }
    return { positions: pos };
  }, []);
  useFrame((state) => {
    if (bgMaterialRef.current) bgMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={bgMaterialRef}
        vertexShader={bgVertexShader}
        fragmentShader={bgFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ──────────────────────────────────────────────────────────────
// MANDALA SHADERS (Restored to your high-visibility logic)
// ──────────────────────────────────────────────────────────────
const mandalaVertexShader = `
  attribute float aType;
  attribute float aDist;
  varying float vType;
  varying float vDist;
  uniform float uTime;
  uniform float uAudioBass;
  uniform float uAudioMids;
  uniform float uActive; 
  uniform vec2 uOriginOffset; // The circular motion vector

  void main() {
    if (position.z < -0.1) {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x + uOriginOffset.x, position.y + uOriginOffset.y, position.z, 1.0);
        return; 
    }
    vType = aType;
    vDist = aDist;
    vec3 pos = position;

    // Apply circular motion only to the "back" of the spokes/petals
    // This creates a "swivel" effect without breaking the hexagon connection
    if (pos.z < -1.0) {
        float depthFactor = abs(pos.z) / 10.0; // Influence increases with depth
        pos.xy += uOriginOffset * depthFactor;
    }

    vec3 dir = length(pos) > 0.0 ? normalize(pos) : vec3(0.0);
    float breath = sin(uTime * 1.5 + vDist * 5.0) * (0.05 + uAudioMids * 0.5 * uActive);
    float centerPulse = (vType < 0.5) ? (uAudioBass * 0.4 * uActive) : 0.0;
    float scale = 1.0 + centerPulse;
    
    pos = pos * scale + dir * breath;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const mandalaFragmentShader = `
  varying float vType;
  varying float vDist;
  uniform float uTime;
  uniform float uAudioBass;
  uniform float uAudioMids;
  uniform float uAudioHighs;
  uniform float uActive;

  void main() {
    vec3 finalColor = vec3(1.0, 1.0, 1.0);
    if (vType < 0.5) {
      float blueCycle = sin(uTime * 4.0 + uAudioMids * 10.0) * 0.5 + 0.5;
      vec3 midBlue = mix(vec3(0.0, 0.2, 1.0), vec3(0.4, 0.9, 1.0), blueCycle);
      finalColor = mix(finalColor, midBlue, uActive * clamp(uAudioMids * 3.0, 0.0, 1.0));
    } else {
      float pWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 - uTime * 2.0));
      vec3 purple = vec3(0.6, 0.1, 1.0);
      float rWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 + uTime * 2.5));
      vec3 red = vec3(1.0, 0.1, 0.1);
      vec3 waveColor = mix(finalColor, purple, pWave * clamp(uAudioBass * 4.0, 0.0, 1.0));
      waveColor = mix(waveColor, red, rWave * clamp(uAudioHighs * 4.0, 0.0, 1.0));
      finalColor = mix(finalColor, waveColor, uActive);
    }
    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

function SacredMandala({ audioData }: { audioData: Uint8Array | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const mainMatRef = useRef<THREE.ShaderMaterial>(null);
  const centerGroupRef = useRef<THREE.Group>(null);

  const borderMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), []);
  const internalMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uAudioBass: { value: 0 }, uAudioMids: { value: 0 }, uAudioHighs: { value: 0 }, uActive: { value: 0 }, uOriginOffset: { value: new THREE.Vector2(0, 0) }
  }), []);

  const { outerPositions, outerIndices, outerTypes, outerDists, borderSegments, internalSegments } = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const types: number[] = [];
    const dists: number[] = [];
    let idx = 0;

    const borderSegments: THREE.Vector3[][] = [];
    const internalSegments: THREE.Vector3[][] = [];

    const addOuterLine = (points: THREE.Vector3[], type: number) => {
      points.forEach((p, i) => {
        positions.push(p.x, p.y, p.z);
        types.push(type);
        dists.push(p.length() / 15.0);
        if (i > 0) indices.push(idx - 1, idx);
        idx++;
      });
    };

    // 1. WRAP-FORWARD SPOKES: Origin behind (Z < 0), Ending forward (Z > 0)
    const spokes = 12;
    const maxR = 15;
    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let r = 0; r <= 42; r++) {
        const radius = (r / 42) * maxR;
        // The spoke starts at Z=-8 and curves forward to Z=6
        // It intersects the Hexagon's plane (Z=0) at radius ~6
        const z = -8 + (Math.pow(radius / maxR, 1.2) * 14); 
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z));
      }
      addOuterLine(points, 1.0);
    }

    // 2. WRAP-FORWARD PETALS: Origin at deep convergence, arcing forward
    const layers = [4.0, 7.5, 11.0, 14.5];
    layers.forEach((baseR) => {
      const pts = 180;
      for (let i = 0; i < pts; i++) {
        const t = (i / pts) * Math.PI * 2;
        const petal = Math.abs(Math.sin(12 * t)) * 1.5;
        const r = baseR + petal;
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        const zEnd = (r / 16) * 8; // Forward depth
        
        const points: THREE.Vector3[] = [];
        // Starts behind at a distant point, flows through to forward Z
        points.push(new THREE.Vector3(0, 0, -10)); 
        points.push(new THREE.Vector3(x, y, zEnd));
        addOuterLine(points, 1.0);
      }
    });

    // 3. CENTER HEXAGON: Foreground Hero (Z = 0)
    const triPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.8, 0, 0),
      new THREE.Vector3(0.9, 1.55, 0),
      new THREE.Vector3(-0.9, 1.55, 0),
      new THREE.Vector3(-1.8, 0, 0),
      new THREE.Vector3(-0.9, -1.55, 0),
      new THREE.Vector3(0.9, -1.55, 0)
    ];
    const hexPoints = triPoints.slice(1);
    for (let i = 0; i < hexPoints.length; i++) {
      borderSegments.push([hexPoints[i].clone(), hexPoints[(i + 1) % hexPoints.length].clone()]);
      internalSegments.push([triPoints[0].clone(), hexPoints[i].clone()]);
      for (let j = i + 1; j < hexPoints.length; j++) {
        internalSegments.push([hexPoints[i].clone(), hexPoints[j].clone()]);
      }
    }

    return {
      outerPositions: new Float32Array(positions),
      outerIndices: new Uint16Array(indices),
      outerTypes: new Float32Array(types),
      outerDists: new Float32Array(dists),
      borderSegments,
      internalSegments,
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const { bass, mids, highs } = getThreeBands(audioData);
    
    const introProgress = Math.min(time / 17.0, 1.0);
    const ease = introProgress * introProgress * (3.0 - 2.0 * introProgress);
    const currentScale = 0.01 + ease * 0.99;
    const isActive = time > 17.0 ? 1.0 : 0.0;

    if (groupRef.current) {
      groupRef.current.scale.set(currentScale, currentScale, currentScale);
      groupRef.current.rotation.z = time * 0.05;
    }

    if (mainMatRef.current) {
      mainMatRef.current.uniforms.uTime.value = time;
      mainMatRef.current.uniforms.uAudioBass.value = bass;
      mainMatRef.current.uniforms.uAudioMids.value = mids;
      mainMatRef.current.uniforms.uAudioHighs.value = highs;
      mainMatRef.current.uniforms.uActive.value = isActive;

      // --- ADDED CIRCULAR MOTION LOGIC HERE ---
      const moveRadius = 0.2; 
      const moveSpeed = 0.6;
      // Slight expansion of the circle based on bass intensity
      const audioInfluence = 1.0 + (bass * 0.5 * isActive); 
      
      mainMatRef.current.uniforms.uOriginOffset.value.set(
        Math.cos(time * moveSpeed) * moveRadius * audioInfluence,
        Math.sin(time * moveSpeed) * moveRadius * audioInfluence
      );
      // -----------------------------------------
    }

    if (centerGroupRef.current) {
      const pulse = 1 + bass * 0.35 * isActive;
      centerGroupRef.current.scale.setScalar(pulse);
    }

    const midIntensity = mids * isActive;
    borderMaterial.color.setHSL(0.6, 1.0, 0.4 + midIntensity * 0.5);
    internalMaterial.color.setHSL(0.62, 0.9, 0.1 + midIntensity * 0.3);
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[outerPositions, 3]} />
          <bufferAttribute attach="attributes-aType" args={[outerTypes, 1]} />
          <bufferAttribute attach="attributes-aDist" args={[outerDists, 1]} />
          <bufferAttribute attach="index" args={[outerIndices, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mainMatRef}
          vertexShader={mandalaVertexShader}
          fragmentShader={mandalaFragmentShader}
          uniforms={uniforms}
          transparent
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <group ref={centerGroupRef}>
        {borderSegments.map((points, i) => (
          <mesh key={`border-${i}`}>
            <tubeGeometry args={[new THREE.CatmullRomCurve3(points), 1, 0.02, 6, false]} />
            <primitive object={borderMaterial} attach="material" />
          </mesh>
        ))}
        {internalSegments.map((points, i) => (
          <mesh key={`internal-${i}`}>
            <tubeGeometry args={[new THREE.CatmullRomCurve3(points), 1, 0.03, 6, false]} />
            <primitive object={internalMaterial} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function Mandala() {
  const audioData = useAudioData();
  return (
    <div style={{ position: "absolute", inset: 0, background: "#010103" }}>
      <Canvas camera={{ position: [-1, 1.7, 20], fov: 45 }}>
        <BackgroundParticles />
        <SacredMandala audioData={audioData} />
        <OrbitControls enablePan={false} maxDistance={50} minDistance={10} />
      </Canvas>
    </div>
  );
}