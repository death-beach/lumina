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
// SHADERS (Moved outside to prevent re-compilation)
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

    // FIX: Protect against NaN from normalizing the (0,0,0) origin point
    vec3 dir = length(pos) > 0.0 ? normalize(pos) : vec3(0.0);
    
    float breath = sin(uTime * 1.5 + vDist * 5.0) * (0.05 + uAudioMids * 0.5 * uActive);
    
    // BASS PULSE (Center Only)
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
    // START STATE: PURE WHITE
    vec3 finalColor = vec3(1.0, 1.0, 1.0);

    if (vType < 0.5) {
      // MID FREQ: CENTER SHAPE BLUES
      float blueCycle = sin(uTime * 4.0 + uAudioMids * 10.0) * 0.5 + 0.5;
      vec3 midBlue = mix(vec3(0.0, 0.2, 1.0), vec3(0.4, 0.9, 1.0), blueCycle);
      
      // Transition from White to Blue based on Mid intensity + 17s gate
      finalColor = mix(finalColor, midBlue, uActive * clamp(uAudioMids * 3.0, 0.0, 1.0));
    } else {
      // LOW FREQ: PURPLE PUSH OUT
      float pWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 - uTime * 2.0));
      vec3 purple = vec3(0.6, 0.1, 1.0);
      
      // HIGH FREQ: RED PUSH IN
      float rWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 + uTime * 2.5));
      vec3 red = vec3(1.0, 0.1, 0.1);

      // Mix waves into the lines after 17s
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

  // FIX: Memoize uniforms so React rendering doesn't overwrite useFrame mutations
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAudioBass: { value: 0 },
    uAudioMids: { value: 0 },
    uAudioHighs: { value: 0 },
    uActive: { value: 0 }
  }), []);

  const { linePositions, lineIndices, lineTypes, lineDists } = useMemo(() => {
    const positions: number[] = [];
    const indices: number[] = [];
    const types: number[] = [];
    const dists: number[] = [];
    let idx = 0;

    const addLine = (points: THREE.Vector3[], type: number) => {
      points.forEach((p, i) => {
        positions.push(p.x, p.y, p.z);
        types.push(type);
        dists.push(p.length() / 13.0); 
        if (i > 0) indices.push(idx - 1, idx);
        idx++;
      });
    };

    const spokes = 12;
    const maxR = 13;

    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let r = 0; r <= 42; r++) {
        const radius = (r / 42) * maxR;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
      }
      addLine(points, 1.0);
    }

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
        addLine(points, 1.0);
      }
    });

    const triPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.8, 0, 0), new THREE.Vector3(0.9, 1.55, 0),
      new THREE.Vector3(-0.9, 1.55, 0), new THREE.Vector3(-1.8, 0, 0),
      new THREE.Vector3(-0.9, -1.55, 0), new THREE.Vector3(0.9, -1.55, 0)
    ];
    for (let i = 0; i < triPoints.length; i++) {
      for (let j = i + 1; j < triPoints.length; j++) {
        addLine([triPoints[i], triPoints[j]], 0.0);
      }
    }

    return {
      linePositions: new Float32Array(positions),
      lineIndices: new Uint16Array(indices),
      lineTypes: new Float32Array(types),
      lineDists: new Float32Array(dists),
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
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="attributes-aType" args={[lineTypes, 1]} />
          <bufferAttribute attach="attributes-aDist" args={[lineDists, 1]} />
          <bufferAttribute attach="index" args={[lineIndices, 1]} />
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