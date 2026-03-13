'use client'; // remove if not using Next.js

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  audioSrc?: string; // pass your MP3 path here
}

function Scene({ audioSrc = "/your-song.mp3" }: Props) {
  const samurai = useRef<THREE.Group>(null);
  const rain = useRef<THREE.Points>(null);
  const lightningGroup = useRef<THREE.Group>(null);
  const flashLight = useRef<THREE.PointLight>(null);

  const [isLightning, setIsLightning] = useState(false);

  // Audio reactivity
  const analyser = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaElementSource(audio);
    const analyzerNode = ctx.createAnalyser();
    analyzerNode.fftSize = 128;
    source.connect(analyzerNode);
    analyzerNode.connect(ctx.destination);
    analyser.current = analyzerNode;

    audio.play().catch(() => {}); // auto-play (user gesture may be needed)
  }, []);

  // Rain particles (2000 streaks)
  const rainGeometry = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count); // for speed variation

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 120;     // x
      positions[i + 1] = Math.random() * 80 + 10;    // y (start high)
      positions[i + 2] = (Math.random() - 0.5) * 80; // z
      velocities[i / 3] = Math.random() * 0.4 + 0.6; // fall speed
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (geo as any).velocities = velocities;
    return geo;
  }, []);

  // Lightning bolt (single jagged line)
  const lightningGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    let x = -10, y = 45, z = -15;
    for (let i = 0; i < 18; i++) {
      points.push(new THREE.Vector3(x, y, z));
      x += (Math.random() - 0.5) * 4;
      y -= 3.2;
      z += (Math.random() - 0.5) * 1.5;
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state, delta) => {
    const a = analyser.current;
    let bassLevel = 0;

    if (a) {
      const data = new Uint8Array(a.frequencyBinCount);
      a.getByteFrequencyData(data);
      bassLevel = data.slice(0, 8).reduce((sum, v) => sum + v, 0) / 8;
    }

    // Samurai sword training animation (slow dramatic swing)
    if (samurai.current) {
      const swing = Math.sin(state.clock.elapsedTime * 0.8) * 0.6;
      samurai.current.children[3].rotation.z = swing; // arm + sword
      samurai.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.08; // slight body sway
    }

    // Rain fall (reacts to music volume)
    if (rain.current) {
      const pos = rain.current.geometry.attributes.position as THREE.BufferAttribute;
      const vel = (rain.current.geometry as any).velocities as Float32Array;

      for (let i = 1; i < pos.count * 3; i += 3) {
        const idx = Math.floor(i / 3);
        pos.array[i] -= vel[idx] * (1 + bassLevel / 120); // faster on bass
        if (pos.array[i] < -30) {
          pos.array[i] = 60;
          pos.array[i - 1] = (Math.random() - 0.5) * 120;
        }
      }
      pos.needsUpdate = true;
    }

    // Lightning trigger on strong bass hits (single bolt, Samurai Jack style)
    if (bassLevel > 165 && Math.random() < 0.08 && !isLightning) {
      setIsLightning(true);
      if (flashLight.current) {
        flashLight.current.intensity = 8;
      }
      setTimeout(() => {
        setIsLightning(false);
        if (flashLight.current) flashLight.current.intensity = 0;
      }, 120);
    }
  });

  return (
    <>
      {/* Audio element (hidden) */}
      <audio ref={audioRef} src={audioSrc} loop />

      {/* Atmosphere */}
      <fog attach="fog" args={['#0a0a1f', 30, 110]} />
      <color attach="background" args={['#0a0a1f']} />

      {/* Dramatic lighting */}
      <ambientLight intensity={0.15} color="#112244" />
      <directionalLight
        position={[-30, 50, -20]}
        intensity={1.2}
        color="#aaccff"
        castShadow
      />
      {/* Lightning flash light */}
      <pointLight
        ref={flashLight}
        position={[-10, 35, -15]}
        color="#ffffff"
        intensity={0}
      />

      {/* Mountain (silhouette style) */}
      <mesh position={[0, -8, -45]} rotation={[0.2, 0, 0]}>
        <planeGeometry args={[120, 60]} />
        <meshPhongMaterial color="#111111" shininess={0} />
      </mesh>
      {/* Mountain peaks (simple layered) */}
      <mesh position={[5, -5, -38]}>
        <coneGeometry args={[28, 35, 4]} />
        <meshPhongMaterial color="#0a0a0a" />
      </mesh>

      {/* Samurai silhouette (procedural - easy to replace with real GLTF later) */}
      <group ref={samurai} position={[-8, 2, 0]}>
        {/* Legs */}
        <mesh position={[0, -6, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 8]} />
          <meshPhongMaterial color="#000000" shininess={0} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[2.8, 2.2, 7]} />
          <meshPhongMaterial color="#000000" shininess={0} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[2.1]} />
          <meshPhongMaterial color="#000000" shininess={0} />
        </mesh>
        {/* Arms + Sword group */}
        <group position={[-3, 4, 0]} rotation={[0, 0, 0]}>
          {/* Arm */}
          <mesh>
            <cylinderGeometry args={[0.8, 0.8, 7]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          {/* Sword (white highlight for silhouette pop) */}
          <mesh position={[0, -4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.3, 14, 0.3]} />
            <meshPhongMaterial color="#eeeeee" emissive="#444444" />
          </mesh>
        </group>
      </group>

      {/* Rain */}
      <points ref={rain} position={[0, 0, 0]}>
        <bufferGeometry attach="geometry" {...rainGeometry} />
        <pointsMaterial
          size={0.35}
          color="#aaccff"
          transparent
          opacity={0.6}
          sizeAttenuation={true}
        />
      </points>

      {/* Lightning bolt (single) */}
      {isLightning && (
        <group ref={lightningGroup}>
          <line>
            <bufferGeometry attach="geometry" {...lightningGeometry} />
            <lineBasicMaterial attach="material" color="#ffffff" linewidth={6} />
          </line>
          <line>
            <bufferGeometry attach="geometry" {...lightningGeometry} />
            <lineBasicMaterial attach="material" color="#bbddff" linewidth={3} />
          </line>
        </group>
      )}

      {/* Camera & Controls */}
      <perspectiveCamera makeDefault position={[-12, 18, 35]} />
      <OrbitControls enablePan={false} minDistance={20} maxDistance={80} />
    </>
  );
}

export default function SamuraiVisualizer() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ fov: 45 }}>
        <Scene audioSrc="/path-to-your-song.mp3" /> {/* ← change this to your MP3 */}
      </Canvas>

      {/* Optional on-screen instructions */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, color: '#fff', fontFamily: 'monospace' }}>
        Drop your MP3 in public/ and update the src above<br />
        Bass = faster rain + lightning strikes 🔥
      </div>
    </div>
  );
}