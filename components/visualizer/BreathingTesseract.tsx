"use no memo";
// Required - opts out of React Compiler
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";
import { useRef, useMemo } from "react";
import * as THREE from "three";

interface StarData {
  angle: number;
  distance: number;
  speed: number;
  life: number;
  active: boolean;
  color: THREE.Color;
}

/**
 * BreathingTesseract v2 – Upgraded Cosmic Edition
 *
 * • Tesseract lines now glowing white with soft cyan halo (bass breathing preserved)
 * • Central core replaced with a true hexagonal blackhole:
 *    – Thin rotating hexagonal border
 *    – Black center disc
 *    – Red → yellow glow halo from behind (mids control rotation speed + brightness + color shift)
 *    – Positioned behind the tesseract
 * • Floating square particles replaced with real shooting stars:
 *    – Highs control number (many during drops, only 1–2 sporadic when quiet)
 *    – Stars spawn from edges, streak across the scene with proper head/tail trails
 * • Mouse tilt + seeded PRNG still intact
 * • All original 4D breathing, smooth 60 fps, mobile friendly
 */

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const tesseractRef = useRef<THREE.Group>(null!);
  const hexGroupRef = useRef<THREE.Group>(null!);

  const { mouse } = useThree();

  // 4D Tesseract vertices & edges (unchanged)
  const vertices4D = useMemo<[number, number, number, number][]>(() => {
    const verts: [number, number, number, number][] = [];
    for (let x = -1; x <= 1; x += 2)
      for (let y = -1; y <= 1; y += 2)
        for (let z = -1; z <= 1; z += 2)
          for (let w = -1; w <= 1; w += 2) verts.push([x, y, z, w]);
    return verts;
  }, []);

  const edges = useMemo<number[][]>(() => {
    const e: number[][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        const diff = vertices4D[i].reduce((acc, v, idx) => acc + (v !== vertices4D[j][idx] ? 1 : 0), 0);
        if (diff === 1) e.push([i, j]);
      }
    }
    return e;
  }, [vertices4D]);

  // Tesseract line geometry
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edges.length * 2 * 3), 3));
    return geo;
  }, [edges]);

  // === SHOOTING STARS SETUP ===
  const maxStars = 32;
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(maxStars * 2 * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(maxStars * 2 * 3), 3));
    return geo;
  }, []);

  const starMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        linewidth: 2.5,
      }),
    []
  );

  // Shooting star data (seeded initialization + dynamic respawn)
  const starsData = useRef<
    Array<{
      angle: number;
      distance: number;
      speed: number;
      life: number;
      active: boolean;
      color: THREE.Color;
    }>
  >([]);

  // Seeded init for consistent star directions
  useMemo(() => {
    const data: StarData[] = [];
    let seed = 98765;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const palette = [
      new THREE.Color("#67e8f9"),
      new THREE.Color("#a5f3fc"),
      new THREE.Color("#f59e0b"),
    ];

    for (let i = 0; i < maxStars; i++) {
      data.push({
        angle: rand() * Math.PI * 2,
        distance: 1.5 + rand() * 3,
        speed: 0.08 + rand() * 0.15,
        life: 0,
        active: false,
        color: palette[Math.floor(rand() * palette.length)],
      });
    }
    starsData.current = data;
  }, []);

  // === HEXAGON BLACKHOLE CORE SETUP ===
  const hexBorderMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#f8fafc", side: THREE.DoubleSide }),
    []
  );
  const hexGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f59e0b",
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        opacity: 0.6, // More focused glow
      }),
    []
  );

  const project = (v: number[], distance: number): [number, number, number] => {
    const factor = distance / (distance - v[3]);
    return [v[0] * factor, v[1] * factor, v[2] * factor];
  };

  const rotatePlane = (v: number[], a: number, b: number, angle: number) => {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const va = v[a];
    const vb = v[b];
    v[a] = va * ca - vb * sa;
    v[b] = va * sa + vb * ca;
  };

  useFrame((state, delta) => {
    const { bass, mids, highs } = getThreeBands(audioData) ?? { bass: 0, mids: 0, highs: 0 };
    const t = state.clock.getElapsedTime();

    // === TESSERACT (white glowing) ===
    const xy = t * (0.22 + mids * 0.6);
    const xz = t * (0.18 + mids * 0.4);
    const yz = t * (0.25 + mids * 0.5);
    const xw = t * (0.38 + mids * 0.75) + mouse.x * 2;
    const yw = t * (0.31 + mids * 0.6) + mouse.y * 2;
    const zw = t * (0.29 + highs * 0.4);

    const rotated = vertices4D.map((v) => [...v] as [number, number, number, number]);
    rotated.forEach((v) => {
      rotatePlane(v, 0, 1, xy);
      rotatePlane(v, 0, 2, xz);
      rotatePlane(v, 1, 2, yz);
      rotatePlane(v, 0, 3, xw);
      rotatePlane(v, 1, 3, yw);
      rotatePlane(v, 2, 3, zw);
    });

    const projDist = 6.5 + bass * 1.5;

    // Update tesseract lines
    const posAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
    let idx = 0;
    for (const [i, j] of edges) {
      const p1 = project(rotated[i], projDist);
      const p2 = project(rotated[j], projDist);
      posAttr.array[idx++] = p1[0];
      posAttr.array[idx++] = p1[1];
      posAttr.array[idx++] = p1[2];
      posAttr.array[idx++] = p2[0];
      posAttr.array[idx++] = p2[1];
      posAttr.array[idx++] = p2[2];
    }
    posAttr.needsUpdate = true;

    if (tesseractRef.current) {
      tesseractRef.current.scale.setScalar(1.8 + bass * 0.03); // Much less reactive scaling
      tesseractRef.current.rotation.y = mouse.x * 0.005; // Much slower rotation
      tesseractRef.current.rotation.x = mouse.y * 0.01; // Much slower rotation
    }

    // === HEXAGON BLACKHOLE CORE (mids controlled) ===
    if (hexGroupRef.current) {
      const spinSpeed = 0.6 + mids * 3.8; // much faster when mids hit
      hexGroupRef.current.rotation.z = t * spinSpeed;

      const glowIntensity = 0.35 + mids * 1.45;
      const glowScale = 1.8 + mids * 0.9;

      const glowMat = hexGlowMaterial as THREE.MeshBasicMaterial;
      glowMat.opacity = glowIntensity * 0.75;

      // Red → yellow fade
      const hueShift = Math.sin(t * 2) * 0.05;
      glowMat.color.setHSL(0.08 + hueShift, 0.95, 0.65);
    }

    // === SHOOTING STARS (highs controlled) ===
    const activeCount = Math.max(2, Math.floor(4 + highs * 27)); // 2 when quiet → ~31 when full blast

    const starPositions = starGeometry.attributes.position.array as Float32Array;
    const starColors = starGeometry.attributes.color.array as Float32Array;

    let sIdx = 0;

    starsData.current.forEach((star, i) => {
      if (i >= activeCount) {
        star.active = false;
        star.life = 0;
        return;
      }

      if (!star.active || star.distance > 12) {
        // Respawn (sporadic feel when highs low)
        star.distance = 1.5 + Math.random() * 2;
        star.life = 1.0;
        star.active = true;
      }

      star.distance += star.speed * (1 + highs * 3);
      star.life -= 0.018 * (0.6 + highs);

      if (star.life <= 0) star.active = false;

      const x = Math.cos(star.angle) * star.distance;
      const y = Math.sin(star.angle) * star.distance;
      const z = Math.sin(star.angle * 1.3) * 1.2 - 1;

      // Head
      starPositions[sIdx] = x;
      starPositions[sIdx + 1] = y;
      starPositions[sIdx + 2] = z;

      // Tail
      const tailLen = 0.8 + highs * 1.1;
      starPositions[sIdx + 3] = x - Math.cos(star.angle) * tailLen;
      starPositions[sIdx + 4] = y - Math.sin(star.angle) * tailLen;
      starPositions[sIdx + 5] = z;

      // Color fade (bright head → dim tail)
      const alpha = Math.max(0.1, star.life);
      const col = star.color;
      starColors[sIdx] = col.r * alpha;
      starColors[sIdx + 1] = col.g * alpha;
      starColors[sIdx + 2] = col.b * alpha;
      starColors[sIdx + 3] = col.r * alpha * 0.4;
      starColors[sIdx + 4] = col.g * alpha * 0.4;
      starColors[sIdx + 5] = col.b * alpha * 0.4;

      sIdx += 6;
    });

    starGeometry.attributes.position.needsUpdate = true;
    starGeometry.attributes.color.needsUpdate = true;
    starGeometry.setDrawRange(0, activeCount * 2);
  });

  return (
    <>
      {/* Tesseract – Glowing White */}
      <group ref={tesseractRef}>
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#f8fafc" transparent opacity={0.95} />
        </lineSegments>
        {/* Soft glow layer */}
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#bae6fd" transparent opacity={0.25} linewidth={8.5} />
        </lineSegments>
      </group>

      {/* Shooting Stars (highs) */}
      <lineSegments geometry={starGeometry} material={starMaterial} />

      {/* Hexagonal Blackhole Core – Behind Tesseract (mids) */}
      <group ref={hexGroupRef} position={[0, 0, -2.5]}>
        {/* Backlit Glow - behind the hexagon */}
        <mesh geometry={new THREE.CircleGeometry(0.7, 64)} material={hexGlowMaterial} />

        {/* Hexagonal Border - smaller and more defined */}
        <mesh geometry={new THREE.RingGeometry(0.55, 0.65, 6)} material={hexBorderMaterial} />

        {/* Blackhole Center Disc - smaller */}
        <mesh geometry={new THREE.CircleGeometry(0.55, 6)}>
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      <ambientLight intensity={0.2} color="#e0f2fe" />
    </>
  );
}

export default function BreathingTesseract() {
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
        camera={{ position: [0, 0, 10], fov: 52 }}
        gl={{
          preserveDrawingBuffer: true,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}