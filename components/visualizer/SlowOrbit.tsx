"use no memo";
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const velocitiesRef = useRef<Float32Array>(null!);
  const { pointer } = useThree();

  const NUM_PARTICLES = 12384;

  const seededRandom = useMemo(() => {
    return () => {
      let seed = 12345;
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, []);

  const { geometry, material, velocities: initialVelocities } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(NUM_PARTICLES * 3);
    const velocities = new Float32Array(NUM_PARTICLES * 3);

    const spread = 8.5;
    for (let i = 0; i < NUM_PARTICLES * 3; i += 3) {
      const r = spread * Math.pow(seededRandom(), 0.62);
      const theta = seededRandom() * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom() - 1);

      positions[i]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);

      velocities[i]     = (seededRandom() - 0.5) * 0.015;
      velocities[i + 1] = (seededRandom() - 0.5) * 0.015;
      velocities[i + 2] = (seededRandom() - 0.5) * 0.015;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1.0)");
    grad.addColorStop(0.38, "rgba(255,255,255,0.93)");
    grad.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      sizeAttenuation: true,
    });

    return { geometry: geo, material: mat, velocities };
  }, [seededRandom]);

  useEffect(() => {
    velocitiesRef.current = initialVelocities;
  }, [initialVelocities]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const velocities = velocitiesRef.current;
    
    // Safety check: ensure velocities array is properly initialized
    if (!velocities || velocities.length === 0) return;

    const time = state.clock.getElapsedTime();
    // Safely handle null audio data
    const { bass, mids, highs } = audioData ? getThreeBands(audioData) : { bass: 0, mids: 0, highs: 0 };

    const audioActive = time > 4.5;

    const morphSpeed = 0.082 + (audioActive ? mids * 0.105 : 0);
    const noiseStrength = 0.00135 + (audioActive ? highs * 0.0021 : 0);
    const globalScale = 1.0 + (audioActive ? bass * 0.22 : 0.03);

    const morphCycle = (time * morphSpeed) % 3.0;
    const form = Math.floor(morphCycle);

    const attraction = 0.00078;
    const damping = 0.957;
    const morphLerp = 0.021 + (audioActive ? mids * 0.017 : 0.008);

    for (let i = 0; i < NUM_PARTICLES * 3; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const distSq = x * x + y * y + z * z;
      if (distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        // Safeguard against division by very small distances
        const minDist = 0.001;
        const safeDist = Math.max(dist, minDist);
        velocities[i]     -= (x / safeDist) * attraction;
        velocities[i + 1] -= (y / safeDist) * attraction;
        velocities[i + 2] -= (z / safeDist) * attraction;
      }

      const phase = i * 0.00078;
      const nx = Math.sin(time * 1.12 + phase) * Math.cos(time * 0.71 + phase);
      const ny = Math.sin(time * 1.41 + phase * 1.22);
      const nz = Math.cos(time * 0.83 + phase * 0.95);

      velocities[i]     += nx * noiseStrength;
      velocities[i + 1] += ny * noiseStrength;
      velocities[i + 2] += nz * noiseStrength * 0.75;

      velocities[i]     *= damping;
      velocities[i + 1] *= damping;
      velocities[i + 2] *= damping;

      positions[i]     += velocities[i] * 49 * delta;
      positions[i + 1] += velocities[i + 1] * 49 * delta;
      positions[i + 2] += velocities[i + 2] * 49 * delta;

      let tx = x, ty = y, tz = z;
      const r = Math.sqrt(x * x + y * y + z * z) || 9;

      if (form === 0) {
        const theta = Math.atan2(y, x);
        const phi = Math.acos(Math.min(1, z / r));
        tx = 11.2 * Math.sin(phi) * Math.cos(theta);
        ty = 11.2 * Math.sin(phi) * Math.sin(theta);
        tz = 11.2 * Math.cos(phi);
      } else if (form === 1) {
        const angle = Math.atan2(y, x);
        const wave = Math.sin(angle * 6 + time * 1.9) * 1.05;
        tx = (9.8 + (3.3 + wave) * Math.cos(angle * 4)) * Math.cos(angle);
        ty = (9.8 + (3.3 + wave) * Math.cos(angle * 4)) * Math.sin(angle);
        tz = (3.1 + wave * 0.8) * Math.sin(angle * 3.5);
      } else {
        const angle = Math.atan2(y, x);
        const spiral = angle * 2.85 + r * 0.48 + time * 1.1;
        const arm = Math.sin(spiral) * 2.65;
        tx = Math.cos(angle) * (r * 0.67 + arm);
        ty = Math.sin(angle) * (r * 0.67 + arm);
        tz = z * 0.28 + Math.sin(angle * 5.2 + time) * 2.15;
      }

      positions[i]     = THREE.MathUtils.lerp(positions[i], tx * globalScale, morphLerp);
      positions[i + 1] = THREE.MathUtils.lerp(positions[i + 1], ty * globalScale, morphLerp);
      positions[i + 2] = THREE.MathUtils.lerp(positions[i + 2], tz * globalScale, morphLerp);

      const newR2 = positions[i] * positions[i] + positions[i + 1] * positions[i + 1] + positions[i + 2] * positions[i + 2];
      if (newR2 > 260) {
        const s = 15.8 / Math.sqrt(newR2);
        positions[i] *= s;
        positions[i + 1] *= s;
        positions[i + 2] *= s;
      }
    }

    posAttr.needsUpdate = true;

    // Audio-reactive rotation
    if (audioActive) {
      // Bass controls Y rotation (spinning)
      pointsRef.current.rotation.y += (bass * 0.65) * delta;
      // Mids control X rotation (tilting)
      pointsRef.current.rotation.x += (mids * 0.08) * delta;
      // Highs add subtle Z rotation (twisting)
      pointsRef.current.rotation.z += (highs * 0.35) * delta;
    } else {
      // Gentle idle rotation when no audio
      pointsRef.current.rotation.y += 0.02 * delta;
      pointsRef.current.rotation.x += 0.01 * delta;
    }
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={material} />
      <OrbitControls
        enableDamping
        dampingFactor={0.085}
        autoRotate
        autoRotateSpeed={0.22}
        enableZoom
        minDistance={8}
        maxDistance={45}
      />
    </>
  );
}

export default function SlowOrbit() {
  const audioData = useAudioData();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: "#000",
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [0, 4.5, 35], fov: 55 }}
        gl={{ antialias: true }}
      >
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}