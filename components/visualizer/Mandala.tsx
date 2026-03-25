'use no memo';
'use client';

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

// ──────────────────────────────────────────────────────────────
// IMPROVED LUMINOUS HAZE SHADERS
// (denser, softer, multi-layered drift + strong bass reactivity)
// The mist now fills the entire volume much more convincingly.
// Particles will beautifully "glow through" the haze, especially
// when the bass hits — the fog thickens, drifts faster, and pulses.
// ──────────────────────────────────────────────────────────────
const hazeVertexShader = `
  varying float vAlpha;
  uniform float uTime;
  uniform float uAudioBass;

  void main() {
    vec3 pos = position;
    
    // Multi-layered organic drift (feels like real mist)
    float t = uTime * 0.15;
    float bassDrift = uAudioBass * 4.0;               // stronger movement on bass
    pos.x += sin(t + position.z * 0.05) * 3.5 + cos(t * 1.3 + position.y * 0.04) * 2.0;
    pos.y += cos(t * 0.8 + position.x * 0.06) * 3.0 + sin(t * 1.7 + position.z * 0.03) * 1.8;
    pos.z += sin(t * 0.6 + position.y * 0.07) * 2.2;

    // Extra turbulence on bass hits
    pos.x += sin(t * 8.0 + position.z) * bassDrift * 0.8;
    pos.y += cos(t * 7.0 + position.x) * bassDrift * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = abs(mvPosition.z);

    // Alpha thins with distance + bass pulse (makes haze feel thicker when music hits)
    vAlpha = clamp(1.0 - (dist / 35.0), 0.0, 1.0);
    vAlpha *= (0.7 + uAudioBass * 0.8);

    gl_Position = projectionMatrix * mvPosition;
    
    // Much larger soft points + bass size boost = true volumetric cloud feel
    gl_PointSize = (55.0 + uAudioBass * 25.0) * (28.0 / dist);
  }
`;

const hazeFragmentShader = `
  varying float vAlpha;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float r = length(center);
    
    // Extremely soft, puffy cloud falloff (no hard edges)
    float strength = pow(1.0 - smoothstep(0.0, 0.85, r), 3.5);
    strength = smoothstep(0.0, 1.0, strength);

    // Deep, luminous indigo-purple haze that lets bright particles cut through
    vec3 color = vec3(0.12, 0.08, 0.28);

    gl_FragColor = vec4(color, strength * vAlpha * 0.28);
  }
`;

function LuminousHaze({ audioData }: { audioData: Uint8Array | null }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const count = 18000; // much denser → fills the space between everything

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    let seed = 123.45;
    const stableRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (stableRandom() - 0.5) * 90;
      p[i * 3 + 1] = (stableRandom() - 0.5) * 85;
      p[i * 3 + 2] = (stableRandom() - 0.5) * 70;
    }
    return p;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAudioBass: { value: 0 },
  }), []);

  useFrame((state) => {
    if (matRef.current) {
      const { bass } = getThreeBands(audioData);
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uAudioBass.value = bass;
    }
  });

  return (
    <points renderOrder={-1}> {/* render first so everything glows through the haze */}
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={hazeVertexShader}
        fragmentShader={hazeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ──────────────────────────────────────────────────────────────
// (BackgroundParticles and SacredMandala unchanged — only LuminousHaze was updated)
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
// INSTANCED MANDALA SHADERS (Volumetric Dust)
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
  uniform vec2 uOriginOffset; 

  void main() {
    vType = aType;
    vDist = aDist;

    // Extract the exact 3D position from the InstancedMesh matrix
    vec4 localPosition = instanceMatrix * vec4(position, 1.0);
    vec3 pos = localPosition.xyz;

    // Apply circular motion to the "back" of the bowl
    if (pos.z < -1.0) {
        float depthFactor = abs(pos.z) / 10.0; 
        pos.xy += uOriginOffset * depthFactor;
    }

    vec3 dir = length(pos) > 0.0 ? normalize(pos) : vec3(0.0);
    
    // Smooth geometric breathing
    float breath = sin(uTime * 1.5 + vDist * 5.0) * (0.05 + uAudioMids * 0.5 * uActive);
    pos += dir * breath;
    
    // High-frequency particle shiver on bass transients
    float shiver = sin(uTime * 20.0 + vDist * 15.0) * (uAudioBass * 0.2 * uActive);
    pos += dir * shiver;

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
    
    float pWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 - uTime * 2.0));
    vec3 purple = vec3(0.6, 0.1, 1.0);
    
    float rWave = smoothstep(0.7, 1.0, fract(vDist * 2.5 + uTime * 2.5));
    vec3 red = vec3(1.0, 0.1, 0.1);
    
    vec3 waveColor = mix(finalColor, purple, pWave * clamp(uAudioBass * 4.0, 0.0, 1.0));
    waveColor = mix(waveColor, red, rWave * clamp(uAudioHighs * 4.0, 0.0, 1.0));
    
    finalColor = mix(finalColor, waveColor, uActive);
    
    // Lower opacity slightly to allow dense particle layering
    gl_FragColor = vec4(finalColor, 0.7);
  }
`;

function SacredMandala({ audioData }: { audioData: Uint8Array | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const mainMatRef = useRef<THREE.ShaderMaterial>(null);
  const centerGroupRef = useRef<THREE.Group>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  const borderMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), []);
  const internalMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: false, blending: THREE.AdditiveBlending }), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, 
    uAudioBass: { value: 0 }, 
    uAudioMids: { value: 0 }, 
    uAudioHighs: { value: 0 }, 
    uActive: { value: 0 }, 
    uOriginOffset: { value: new THREE.Vector2(0, 0) }
  }), []);

  const { matrices, types, dists, borderSegments, internalSegments, particleCount } = useMemo(() => {
    const tempMatrices: THREE.Matrix4[] = [];
    const tempTypes: number[] = [];
    const tempDists: number[] = [];
    const borderSegments: THREE.Vector3[][] = [];
    const internalSegments: THREE.Vector3[][] = [];
    
    const dummy = new THREE.Object3D();

    // Deterministic random function to satisfy React Purity
    let seed = 123.456;
    const stableRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const addParticle = (pos: THREE.Vector3, type: number) => {
      dummy.position.copy(pos);
      // Use stableRandom instead of Math.random
      const scale = 0.3 + stableRandom() * 0.7;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      tempMatrices.push(dummy.matrix.clone());
      tempTypes.push(type);
      tempDists.push(pos.length() / 15.0);
    };

    // 1. WRAP-FORWARD SPOKES
    const spokes = 12;
    const maxR = 15;
    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2;
      for (let r = 0; r <= 80; r++) { 
        const radius = (r / 80) * maxR;
        const z = -8 + (Math.pow(radius / maxR, 1.2) * 14); 
        
        // Use stableRandom for scatter
        const scatter = () => (stableRandom() - 0.5) * 0.3;
        
        addParticle(new THREE.Vector3(
          Math.cos(angle) * radius + scatter(), 
          Math.sin(angle) * radius + scatter(), 
          z + scatter()
        ), 1.0);
      }
    }

    // 2. WRAP-FORWARD PETALS
    const layers = [4.0, 7.5, 11.0, 14.5];
    layers.forEach((baseR) => {
      const pts = 180;
      for (let i = 0; i < pts; i++) {
        const t = (i / pts) * Math.PI * 2;
        const petal = Math.abs(Math.sin(12 * t)) * 1.5;
        const r = baseR + petal;
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        const zEnd = (r / 16) * 8; 
        
        for (let step = 0; step < 8; step++) {
          const lerp = step / 7;
          const pX = x * lerp;
          const pY = y * lerp;
          const pZ = -10 + (zEnd - (-10)) * lerp;
          
          const scatter = () => (stableRandom() - 0.5) * 0.2;
          addParticle(new THREE.Vector3(pX + scatter(), pY + scatter(), pZ + scatter()), 1.0);
        }
      }
    });

    // 3. CENTER HEXAGON (Remains unchanged)
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
      particleCount: tempMatrices.length,
      matrices: tempMatrices,
      types: new Float32Array(tempTypes),
      dists: new Float32Array(tempDists),
      borderSegments,
      internalSegments,
    };
  }, []);

  // Apply the generated matrix positions to the InstancedMesh
  useEffect(() => {
    if (instancedMeshRef.current) {
      matrices.forEach((mat, i) => instancedMeshRef.current!.setMatrixAt(i, mat));
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);

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

      const moveRadius = 0.2; 
      const moveSpeed = 0.6;
      const audioInfluence = 1.0 + (bass * 0.5 * isActive); 
      
      mainMatRef.current.uniforms.uOriginOffset.value.set(
        Math.cos(time * moveSpeed) * moveRadius * audioInfluence,
        Math.sin(time * moveSpeed) * moveRadius * audioInfluence
      );
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
      {/* ────────────────────────────────────────────────────────────── */}
      {/* THE NEW INSTANCED MESH BOWL */}
      {/* ────────────────────────────────────────────────────────────── */}
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[0.08, 8, 8]}>
          <instancedBufferAttribute attach="attributes-aType" args={[types, 1]} />
          <instancedBufferAttribute attach="attributes-aDist" args={[dists, 1]} />
        </sphereGeometry>
        <shaderMaterial
          ref={mainMatRef}
          vertexShader={mandalaVertexShader}
          fragmentShader={mandalaFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

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
        {/* Haze first → deepest layer so everything glows through it */}
        <LuminousHaze audioData={audioData} />
        <BackgroundParticles />
        <SacredMandala audioData={audioData} />
        <OrbitControls enablePan={false} maxDistance={50} minDistance={10} />
      </Canvas>
    </div>
  );
}