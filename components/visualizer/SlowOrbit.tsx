"use no memo";
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useLayoutEffect } from "react";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const velocitiesRef = useRef<Float32Array>(null!);
  const colorsRef = useRef<THREE.Color[]>([]);

  const NUM_PARTICLES = 12384;

  const colorSystem = useMemo(() => {
    const baseColor = new THREE.Color(0xffffff);

    const colorKeyframes = [
      { time: 0, color: new THREE.Color("#4a00e0") },
      { time: 25, color: new THREE.Color("#f093fb") },
      { time: 50, color: new THREE.Color("#00f260") },
      { time: 80, color: new THREE.Color("#1e3c72") },
      { time: 110, color: new THREE.Color("#8e2de2") },
    ];

    const bassColors = [
      new THREE.Color("#4a00e0"),
      new THREE.Color("#1e3c72"),
      new THREE.Color("#8e2de2"),
      new THREE.Color("#2c3e50"),
    ];

    const highColors = [
      new THREE.Color("#f093fb"),
      new THREE.Color("#00f260"),
      new THREE.Color("#0575e6"),
      new THREE.Color("#ffeb3b"),
      new THREE.Color("#00bcd4"),
    ];

    return { baseColor, colorKeyframes, bassColors, highColors };
  }, []);

  const { geometry, material, velocities } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(NUM_PARTICLES * 3);
    const colors = new Float32Array(NUM_PARTICLES * 3);
    const velArray = new Float32Array(NUM_PARTICLES * 3);

    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const spread = 8.5;
    for (let i = 0; i < NUM_PARTICLES * 3; i += 3) {
      const r = spread * Math.pow(seededRandom(), 0.62);
      const theta = seededRandom() * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom() - 1);

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);

      colors[i] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;

      velArray[i] = (seededRandom() - 0.5) * 0.015;
      velArray[i + 1] = (seededRandom() - 0.5) * 0.015;
      velArray[i + 2] = (seededRandom() - 0.5) * 0.015;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

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
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      sizeAttenuation: true,
    });

    return { geometry: geo, material: mat, velocities: velArray };
  }, []);

  useLayoutEffect(() => {
    colorsRef.current = new Array(NUM_PARTICLES)
      .fill(null)
      .map(() => new THREE.Color(0xffffff));
    velocitiesRef.current = velocities;
  }, [velocities]);

  function updateColors(time: number, bass: number, highs: number, positions: Float32Array) {
    if (!colorsRef.current || colorsRef.current.length === 0) return;

    const { baseColor, colorKeyframes, bassColors, highColors } = colorSystem;

    const timeColor = baseColor.clone();
    let timeIntensity = 0.45;

    const first = colorKeyframes[0];
    const last = colorKeyframes[colorKeyframes.length - 1];

    if (time < first.time) {
      const progress = time / first.time;
      timeColor.lerpColors(baseColor, first.color, progress);
    } else if (time > last.time) {
      timeColor.copy(last.color);
    } else {
      for (let i = 0; i < colorKeyframes.length - 1; i++) {
        const current = colorKeyframes[i];
        const next = colorKeyframes[i + 1];
        if (time >= current.time && time <= next.time) {
          const progress = (time - current.time) / (next.time - current.time);
          timeColor.lerpColors(current.color, next.color, progress);
          timeIntensity = Math.sin((time - current.time) * 0.6) * 0.5 + 0.5;
          break;
        }
      }
    }

    const bassIntensity = Math.pow(bass, 0.75) * 1.15;
    const highIntensity = Math.pow(highs, 0.75) * 1.0;

    const bassIndex = Math.min(Math.floor(bass * bassColors.length), bassColors.length - 1);
    const highIndex = Math.min(Math.floor(highs * highColors.length), highColors.length - 1);

    const bassColor = bassColors[bassIndex];
    const highColor = highColors[highIndex];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const particleColor = colorsRef.current[i];
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      const distance = Math.sqrt(px * px + py * py + pz * pz);
      const distanceFactor = Math.max(0, 1 - distance / 20);

      const finalColor = baseColor.clone().lerp(timeColor, timeIntensity * 0.65);

      if (bassIntensity > 0.08) finalColor.lerp(bassColor, bassIntensity * distanceFactor * 0.78);
      if (highIntensity > 0.08) finalColor.lerp(highColor, highIntensity * (1 - distanceFactor) * 0.72);

      particleColor.lerp(finalColor, 0.25);
    }
  }

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const velocities = velocitiesRef.current;

    if (!velocities || velocities.length === 0) return;
    if (!colorsRef.current || colorsRef.current.length === 0) return;

    const time = state.clock.getElapsedTime();
    const { bass, mids, highs } = audioData ? getThreeBands(audioData) : { bass: 0, mids: 0, highs: 0 };
    const audioActive = time > 3;

    updateColors(time, bass, highs, positions);

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
        const safeDist = Math.max(dist, 0.001);
        velocities[i] -= (x / safeDist) * attraction;
        velocities[i + 1] -= (y / safeDist) * attraction;
        velocities[i + 2] -= (z / safeDist) * attraction;
      }

      const phase = i * 0.00078;
      const nx = Math.sin(time * 1.12 + phase) * Math.cos(time * 0.71 + phase);
      const ny = Math.sin(time * 1.41 + phase * 1.22);
      const nz = Math.cos(time * 0.83 + phase * 0.95);

      velocities[i] += nx * noiseStrength;
      velocities[i + 1] += ny * noiseStrength;
      velocities[i + 2] += nz * noiseStrength * 0.75;

      velocities[i] *= damping;
      velocities[i + 1] *= damping;
      velocities[i + 2] *= damping;

      positions[i] += velocities[i] * 49 * delta;
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

      positions[i] = THREE.MathUtils.lerp(positions[i], tx * globalScale, morphLerp);
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

    const colorAttr = points.geometry.attributes.color as THREE.BufferAttribute;
    if (colorAttr) {
      const colorArray = colorAttr.array as Float32Array;
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const c = colorsRef.current[i];
        colorArray[i * 3] = c.r;
        colorArray[i * 3 + 1] = c.g;
        colorArray[i * 3 + 2] = c.b;
      }
      colorAttr.needsUpdate = true;
    }

    if (audioActive) {
      points.rotation.y += bass * 0.65 * delta;
      points.rotation.x += mids * 0.08 * delta;
      points.rotation.z += highs * 0.35 * delta;
    } else {
      points.rotation.y += 0.02 * delta;
      points.rotation.x += 0.01 * delta;
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
      <Canvas camera={{ position: [0, 4.5, 35], fov: 55 }} gl={{ antialias: true }}>
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}