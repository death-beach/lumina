"use no memo";
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three-stdlib";

interface StarData {
  angle: number;
  distance: number;
  speed: number;
  life: number;
  active: boolean;
  color: THREE.Color;
}

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const tesseractRef = useRef<THREE.Group>(null!);
  const hexGroupRef = useRef<THREE.Group>(null!);
  const rotationAngles = useRef({ xy: 0, xz: 0, yz: 0, xw: 0, yw: 0, zw: 0 });
  
  const solidLineRef = useRef<Line2>(null!);
  const glowLineRef = useRef<Line2>(null!);

  const { mouse } = useThree();

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

  const points = useMemo(() => new Array(edges.length * 2).fill(0).map(() => new THREE.Vector3()), [edges]);

  // === SHOOTING STARS SETUP ===
  const maxStars = 32;
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(maxStars * 2 * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(maxStars * 2 * 3), 3));
    return geo;
  }, []);

  const starMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    []
  );

  const starsData = useRef<StarData[]>([]);
  useMemo(() => {
    const data: StarData[] = [];
    let seed = 98765;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const palette = [new THREE.Color("#67e8f9"), new THREE.Color("#a5f3fc"), new THREE.Color("#f59e0b")];
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

  const hexBorderMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#b30505", side: THREE.DoubleSide }), []);
  const hexGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#f59e0b", transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, opacity: 0.6 }), []);

  const project = (v: number[], distance: number): [number, number, number] => {
    const factor = distance / (distance - v[3]);
    return [v[0] * factor, v[1] * factor, v[2] * factor];
  };

  const rotatePlane = (v: number[], a: number, b: number, angle: number) => {
    const ca = Math.cos(angle); const sa = Math.sin(angle);
    const va = v[a]; const vb = v[b];
    v[a] = va * ca - vb * sa; v[b] = va * sa + vb * ca;
  };

  useFrame((state, delta) => {
    const { bass, mids, highs } = getThreeBands(audioData) ?? { bass: 0, mids: 0, highs: 0 };
    const t = state.clock.getElapsedTime();

    // TESSERACT ENGINE: Bass drives speed. 
    // 0.2 is the idle speed. Increase 8.0 for more violence on the kick.
    const tesseractSpeed = 1.2 + (bass * 5.6);

    rotationAngles.current.xy += delta * tesseractSpeed * 0.22;
    rotationAngles.current.xz += delta * tesseractSpeed * 0.18;
    rotationAngles.current.yz += delta * tesseractSpeed * 0.25;
    rotationAngles.current.xw += delta * tesseractSpeed * 0.38;
    rotationAngles.current.yw += delta * tesseractSpeed * 0.31;
    rotationAngles.current.zw += delta * tesseractSpeed * 0.29;

    const { xy, xz, yz, xw, yw, zw } = rotationAngles.current;

    const rotated = vertices4D.map((v) => [...v] as [number, number, number, number]);
    rotated.forEach((v) => {
      rotatePlane(v, 0, 1, xy);
      rotatePlane(v, 0, 2, xz);
      rotatePlane(v, 1, 2, yz);
      rotatePlane(v, 0, 3, xw + mouse.x * 2);
      rotatePlane(v, 1, 3, yw + mouse.y * 2);
      rotatePlane(v, 2, 3, zw);
    });

    const projDist = 6.5 + bass * 1.5; 

    let pIdx = 0;
    for (const [i, j] of edges) {
      const p1 = project(rotated[i], projDist);
      const p2 = project(rotated[j], projDist);
      points[pIdx++].set(p1[0], p1[1], p1[2]);
      points[pIdx++].set(p2[0], p2[1], p2[2]);
    }

    if (solidLineRef.current) {
      solidLineRef.current.geometry.setPositions(points.flatMap(p => [p.x, p.y, p.z]));
      // Line thickness reacts to bass
      solidLineRef.current.material.linewidth = 2.5 + (bass * 5);
    }
    if (glowLineRef.current) {
      glowLineRef.current.geometry.setPositions(points.flatMap(p => [p.x, p.y, p.z]));
      // Glow reacts to bass
      glowLineRef.current.material.linewidth = 10 + (bass * 22);
    }

    if (tesseractRef.current) {
      tesseractRef.current.scale.setScalar(1.8 + bass * 0.5); 
    }

    // HEXAGON: Stays mids-reactive per your code
    if (hexGroupRef.current) {
      hexGroupRef.current.rotation.z = t * (0.6 + mids * 3.8);
      (hexGlowMaterial as THREE.MeshBasicMaterial).opacity = (0.35 + mids * 1.45) * 0.75;
    }

    // STARS: Stays highs-reactive per your code
    const activeCount = Math.max(2, Math.floor(4 + highs * 27));
    const starPos = starGeometry.attributes.position.array as Float32Array;
    const starCol = starGeometry.attributes.color.array as Float32Array;
    let sIdx = 0;

    starsData.current.forEach((star, i) => {
      if (i >= activeCount) { star.active = false; return; }
      if (!star.active || star.distance > 12) { star.distance = 1.5 + Math.random() * 2; star.life = 1.0; star.active = true; }
      star.distance += star.speed * (1 + highs * 3);
      star.life -= 0.018 * (0.6 + highs);
      const x = Math.cos(star.angle) * star.distance;
      const y = Math.sin(star.angle) * star.distance;
      starPos[sIdx] = x; starPos[sIdx+1] = y; starPos[sIdx+2] = -1;
      starPos[sIdx+3] = x - Math.cos(star.angle) * (0.8 + highs * 1.1);
      starPos[sIdx+4] = y - Math.sin(star.angle) * (0.8 + highs * 1.1);
      starPos[sIdx+5] = -1;
      const alpha = Math.max(0.1, star.life);
      starCol[sIdx] = star.color.r * alpha; starCol[sIdx+1] = star.color.g * alpha; starCol[sIdx+2] = star.color.b * alpha;
      starCol[sIdx+3] = star.color.r * alpha * 0.4; starCol[sIdx+4] = star.color.g * alpha * 0.4; starCol[sIdx+5] = star.color.b * alpha * 0.4;
      sIdx += 6;
    });
    starGeometry.attributes.position.needsUpdate = true;
    starGeometry.attributes.color.needsUpdate = true;
    starGeometry.setDrawRange(0, activeCount * 2);
  });

  return (
    <>
      <group ref={tesseractRef}>
        <Line 
          ref={solidLineRef} 
          points={points} 
          segments 
          color="#f8fafc" 
          lineWidth={2.5} 
          transparent 
          opacity={0.9} 
        />
        <Line 
          ref={glowLineRef} 
          points={points} 
          segments 
          color="#bae6fd" 
          lineWidth={10} 
          transparent 
          opacity={0.2} 
        />
      </group>

      <lineSegments geometry={starGeometry} material={starMaterial} />

      <group ref={hexGroupRef} position={[0, 0, -2.5]}>
        <mesh geometry={new THREE.CircleGeometry(0.7, 64)} material={hexGlowMaterial} />
        <mesh geometry={new THREE.RingGeometry(0.55, 0.65, 6)} material={hexBorderMaterial} />
        <mesh geometry={new THREE.CircleGeometry(0.55, 6)}><meshBasicMaterial color="#000000" /></mesh>
      </group>
      <ambientLight intensity={0.2} />
    </>
  );
}

export default function BreathingTesseract() {
  const audioData = useAudioData();
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 52 }}>
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}