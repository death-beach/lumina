'use no memo';
'use client';

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

// ──────────────────────────────────────────────────────────────
// BACKGROUND (unchanged)
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
// OUTER MANDALA SHADERS (100% unchanged)
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

  void main() {
    vType = aType;
    vDist = aDist;
    vec3 pos = position;
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

// ──────────────────────────────────────────────────────────────
// AUDIO-REACTIVE SACRED MANDALA
// ──────────────────────────────────────────────────────────────
function SacredMandala({ audioData }: { audioData: Uint8Array | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const mainMatRef = useRef<THREE.ShaderMaterial>(null);
  const centerGroupRef = useRef<THREE.Group>(null);

  // Shared materials for the entire center shape (this was the missing piece)
  const borderMaterial = useMemo(() => 
    new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), 
  []);
  const internalMaterial = useMemo(() => 
    new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), 
  []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAudioBass: { value: 0 },
    uAudioMids: { value: 0 },
    uAudioHighs: { value: 0 },
    uActive: { value: 0 }
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
        dists.push(p.length() / 13.0);
        if (i > 0) indices.push(idx - 1, idx);
        idx++;
      });
    };

    // Outer spokes
    const spokes = 12;
    const maxR = 13;
    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let r = 0; r <= 42; r++) {
        const radius = (r / 42) * maxR;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
      }
      addOuterLine(points, 1.0);
    }

    // Outer petals / layers
    const layers = [3.2, 5.8, 8.4, 11.0];
    layers.forEach((baseR) => {
      const pts = 180;
      for (let i = 0; i < pts; i++) {
        const t = (i / pts) * Math.PI * 2;
        const petal = Math.abs(Math.sin(12 * t)) * 1.35 + Math.sin(24 * t) * 0.4;
        const r = baseR + petal;
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        const z = Math.sin(12 * t) * 0.6;
        const points: THREE.Vector3[] = [];
        for (let k = 0; k <= 1; k++) {
          points.push(new THREE.Vector3(x * (0.3 + k * 0.7), y * (0.3 + k * 0.7), z * k));
        }
        addOuterLine(points, 1.0);
      }
    });

    // Center shape split
    const triPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.8, 0, 0),
      new THREE.Vector3(0.9, 1.55, 0),
      new THREE.Vector3(-0.9, 1.55, 0),
      new THREE.Vector3(-1.8, 0, 0),
      new THREE.Vector3(-0.9, -1.55, 0),
      new THREE.Vector3(0.9, -1.55, 0)
    ];

    const hexPoints = triPoints.slice(1); // 6 outer hexagon points

    // Border = outer hexagon
    for (let i = 0; i < hexPoints.length; i++) {
      const a = hexPoints[i];
      const b = hexPoints[(i + 1) % hexPoints.length];
      borderSegments.push([a.clone(), b.clone()]);
    }

    // Internal lines (center spokes + all cross connections)
    for (let i = 0; i < hexPoints.length; i++) {
      internalSegments.push([triPoints[0].clone(), hexPoints[i].clone()]);
    }
    for (let i = 0; i < hexPoints.length; i++) {
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
    }

    // Center pulse
    if (centerGroupRef.current) {
      const pulse = 1 + bass * 0.35 * isActive;
      centerGroupRef.current.scale.setScalar(pulse);
    }

    // Mid-frequency blue sweep (now applied to the entire center shape)
    const midIntensity = mids * isActive;

    // Border = deeper blue
    borderMaterial.color.setHSL(0.6, 1.0, 0.4 + midIntensity * 0.5);

    // Internal lines = lighter cyan-blue
    internalMaterial.color.setHSL(0.62, 0.9, 0.1 + midIntensity * 0.3);
  });

  return (
    <group ref={groupRef}>
      {/* Outer mandala — exactly your original thin lines */}
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

      {/* Center shape — tubes with shared materials so color reacts instantly */}
      <group ref={centerGroupRef}>
        {/* Border: outer hexagon */}
        {borderSegments.map((points, i) => (
          <mesh key={`border-${i}`}>
            <tubeGeometry args={[new THREE.CatmullRomCurve3(points), 1, 0.03, 6, false]} />
            <primitive object={borderMaterial} attach="material" />
          </mesh>
        ))}

        {/* Internal lines */}
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
    <div style={{ position: "absolute", inset: 0, background: "#020205" }}>
      <Canvas camera={{ position: [0, 0, 28], fov: 40 }}>
        <BackgroundParticles />
        <SacredMandala audioData={audioData} />
        <OrbitControls enablePan={false} maxDistance={50} minDistance={8} />
      </Canvas>
    </div>
  );
}