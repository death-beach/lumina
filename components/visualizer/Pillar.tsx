"use no memo";
"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Cylinder, Plane } from "@react-three/drei";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";

function DustCloud() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particleCount = 1200; 
  const tempObject = new THREE.Object3D();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const particles = useMemo(() => {
    const data = [];
    let seed = 54321;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < particleCount; i++) {
      const radius = 15 + seededRandom() * 50;
      const theta = seededRandom() * Math.PI * 2;
      const y = (seededRandom() - 0.5) * 60;
      const speed = 0.05 + seededRandom() * 0.2;
      const distRatio = (radius - 15) / 50; 
      const brightness = 0.4 - distRatio * 0.35;
      const color = new THREE.Color().setHSL(0.48, 0.9, brightness);
      data.push({ radius, theta, y, speed, color });
    }
    return data;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, mouseRef.current.y * 0.15, 0.05);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -mouseRef.current.x * 0.15, 0.05);

    particles.forEach((p, i) => {
      const currentTheta = p.theta - t * p.speed * 0.15;
      const x = Math.cos(currentTheta) * p.radius;
      const z = Math.sin(currentTheta) * p.radius;
      tempObject.position.set(x + mouseRef.current.x * 2, p.y + mouseRef.current.y * 2, z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      meshRef.current!.setColorAt(i, p.color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshBasicMaterial transparent opacity={0.5} />
    </instancedMesh>
  );
}

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { camera } = useThree();
  const gridRef = useRef<THREE.Group>(null);
  const pillarGroups = useRef<THREE.Group[]>([]);
  const outerMeshes = useRef<THREE.Mesh[]>([]);
  const innerMeshes = useRef<THREE.Mesh[]>([]);
  const rotationY = useRef(0);

  // History for Phase Shift Ripple
  const bassHistory = useRef<number[]>(new Array(50).fill(0));
  const highsHistory = useRef<number[]>(new Array(50).fill(0));

  const positions = useMemo(() => {
    const pos: { coords: [number, number, number], dist: number }[] = [];
    const SIZE = 7;
    const SPACING = 3.85;
    const half = ((SIZE - 1) * SPACING) / 2;
    let seed = 987654321;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const px = x * SPACING - half + (rand() - 0.5) * 0.9;
        const pz = z * SPACING - half + (rand() - 0.5) * 0.9;
        const dist = Math.sqrt(px * px + pz * pz);
        pos.push({ coords: [px, 0, pz], dist });
      }
    }
    return pos;
  }, []);

  const colorPalette = useMemo(() => [
    new THREE.Color('#00ffff'), new THREE.Color('#ff003c'), new THREE.Color('#9d00ff'), new THREE.Color('#00ffff'), 
  ], []);

  // Create jagged geometry with audio-responsive displacement
  const createJaggedGeometry = useMemo(() => {
    return (radiusTop: number, radiusBottom: number, height: number, segments: number, seed: number) => {
      const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, true);
      const positionAttribute = geometry.attributes.position;
      const normalAttribute = geometry.attributes.normal;
      
      // Create a seeded random function for consistent jaggedness
      let currentSeed = seed;
      const seededRandom = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return (currentSeed / 233280) * 2 - 1; // Return -1 to 1
      };

      // Apply initial jagged displacement to make geometry more interesting
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Add initial jagged noise to vertices
        const noise = seededRandom();
        const jaggedNoise = noise * 0.15; // Base jaggedness
        
        // Apply noise along normal direction
        const normal = new THREE.Vector3();
        normal.fromBufferAttribute(normalAttribute, i);
        
        vertex.add(normal.multiplyScalar(jaggedNoise));
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      positionAttribute.needsUpdate = true;

      // Store original positions for displacement calculation
      const originalPositions: THREE.Vector3[] = [];
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        originalPositions.push(vertex.clone());
      }

      return { geometry, originalPositions, seededRandom };
    };
  }, []);

  // Create jagged geometries for outer and inner tubes
  const jaggedGeometries = useMemo(() => {
    const geometries = [];
    for (let i = 0; i < positions.length; i++) {
      // Use position-based seed for consistent jaggedness per pillar
      const seed = Math.floor(positions[i].coords[0] * 1000) + Math.floor(positions[i].coords[2] * 1000);
      
      geometries.push({
        outer: createJaggedGeometry(0.42, 0.38, 8.6, 16, seed),
        inner: createJaggedGeometry(0.26, 0.23, 8.3, 12, seed + 1000)
      });
    }
    return geometries;
  }, [positions, createJaggedGeometry]);

  useFrame((state) => {
    const bands = audioData ? getThreeBands(audioData) : { bass: 0, mids: 0, highs: 0 };
    const t = state.clock.getElapsedTime();

    // Log history for rippling glitch
    bassHistory.current.unshift(bands.bass);
    highsHistory.current.unshift(bands.highs);
    if (bassHistory.current.length > 50) bassHistory.current.pop();
    if (highsHistory.current.length > 50) highsHistory.current.pop();

    if (gridRef.current) {
      rotationY.current -= bands.bass * 0.02; 
      gridRef.current.rotation.y = rotationY.current;
    }

    const bassIntensity = bands.bass * 2.0;  // Amplify bass effect
    camera.position.set(
      Math.sin(t * 0.042) * (6.5 + bassIntensity),
      23 + Math.cos(t * 0.042 * 0.35) * (3.5 + bassIntensity),
      39 + Math.sin(t * 0.042 * 0.6) * (7 + bassIntensity)
    );
    camera.lookAt(0, 7, 0);

    pillarGroups.current.forEach((group, i) => {
      if (!group) return;
      const { coords, dist } = positions[i];
      const pillarT = t + i * 0.27;

      // DELAY LOGIC
      const dIdx = Math.min(Math.floor(dist * 2.2), 49);
      const dBass = bassHistory.current[dIdx];
      const dHighs = highsHistory.current[dIdx];

      // 1. GLITCH TRIGGER (Lowered threshold for more impact)
      const glitchActive = dHighs > 0.45;
      
      // 2. STROBE/BREAKAGE (Intermittent visibility)
      group.visible = glitchActive ? Math.random() > 0.15 : true;

      // 3. DIGITIZING SCALE
      let targetScaleY = 1.0 + dBass * 1.4;
      if (glitchActive) {
        // Snap to "bit-crushed" chunky steps
        targetScaleY = Math.floor(targetScaleY * 4) / 4; 
      }

      group.scale.y = THREE.MathUtils.lerp(group.scale.y, targetScaleY, 0.15);
      
      // 4. POSITIONAL FRACTURE (Sudden jumps)
      const jump = glitchActive && Math.random() > 0.5 ? (Math.random() - 0.5) * 1.1 : 0;
      group.position.x = coords[0] + jump;
      group.position.z = coords[2] + jump;

      const verticalOffset = 5; 
      group.position.y = THREE.MathUtils.lerp(group.position.y, verticalOffset + (targetScaleY - 1) * 4.3, 0.15);

      // Organic Sway
      const tilt = bands.mids * 0.8; 
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, tilt * (Math.sin(pillarT * 1.35) * 0.55 + coords[0] * 0.007), 0.15);
      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, tilt * (Math.cos(pillarT * 0.9) * 0.52 + coords[2] * 0.008), 0.15);

      // Audio-responsive jagged displacement
      const jaggedness = bands.bass * 0.3 + (glitchActive ? 0.2 : 0); // More jagged on bass hits and glitches
      const timeOffset = t * 2.0 + i * 0.3;
      
      // Update outer geometry displacement
      const outerGeometry = jaggedGeometries[i]?.outer;
      if (outerGeometry) {
        const positionAttribute = outerGeometry.geometry.attributes.position;
        const normalAttribute = outerGeometry.geometry.attributes.normal;
        
        for (let j = 0; j < positionAttribute.count; j++) {
          const originalPos = outerGeometry.originalPositions[j];
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(positionAttribute, j);
          
          // Calculate displacement based on audio and time
          const noise = outerGeometry.seededRandom();
          const displacement = Math.sin(timeOffset + j * 0.1) * jaggedness * 0.5 + noise * jaggedness * 0.3;
          
          // Apply displacement along normal direction for jagged effect
          const normal = new THREE.Vector3();
          normal.fromBufferAttribute(normalAttribute, j);
          
          vertex.copy(originalPos).add(normal.multiplyScalar(displacement));
          positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        positionAttribute.needsUpdate = true;
      }

      // Update inner geometry displacement (less intense)
      const innerGeometry = jaggedGeometries[i]?.inner;
      if (innerGeometry) {
        const positionAttribute = innerGeometry.geometry.attributes.position;
        const normalAttribute = innerGeometry.geometry.attributes.normal;
        
        for (let j = 0; j < positionAttribute.count; j++) {
          const originalPos = innerGeometry.originalPositions[j];
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(positionAttribute, j);
          
          // Inner tube has less jagged displacement
          const noise = innerGeometry.seededRandom();
          const displacement = Math.sin(timeOffset * 0.8 + j * 0.15) * jaggedness * 0.25 + noise * jaggedness * 0.15;
          
          const normal = new THREE.Vector3();
          normal.fromBufferAttribute(normalAttribute, j);
          
          vertex.copy(originalPos).add(normal.multiplyScalar(displacement));
          positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        positionAttribute.needsUpdate = true;
      }

      // Color dynamics
      const flowSpeed = 1.0 + bands.highs * 2.0;
      const phase = (pillarT * flowSpeed) % colorPalette.length;
      const idx = Math.floor(phase);
      const flowingColor = colorPalette[idx].clone().lerp(colorPalette[(idx + 1) % 4], phase - idx);

      const outer = outerMeshes.current[i];
      if (outer?.material) {
        const mat = outer.material as THREE.MeshPhongMaterial;
        mat.color.lerp(flowingColor, 0.09);
        mat.emissive.copy(flowingColor).multiplyScalar(glitchActive ? 2.0 : 0.2 + dHighs * 0.5);
        // Intensity Flicker
        mat.emissiveIntensity = glitchActive ? 0.4 + Math.random() * 3 : 0.4;
      }
      const inner = innerMeshes.current[i];
      if (inner?.material) {
        const mat = inner.material as THREE.MeshPhongMaterial;
        mat.emissive.copy(flowingColor).multiplyScalar(0.8 + dHighs * 1.2);
      }
    });
  });

  return (
    <>
      <fog attach="fog" args={['#030105', 20, 90]} />
      <ambientLight intensity={0.12} color="#0d1122" />
      <pointLight position={[-35, 52, -20]} color="#00ffff" intensity={2.0} distance={110} />
      <pointLight position={[32, 39, 26]} color="#ff003c" intensity={1.8} distance={110} />
      <DustCloud />
      <group ref={gridRef}>
        {positions.map((p, i) => (
          <group key={i} ref={(el) => { if (el) pillarGroups.current[i] = el; }} position={p.coords}>
            {/* Jagged outer tube */}
            <mesh ref={(el) => { if (el) outerMeshes.current[i] = el; }} geometry={jaggedGeometries[i]?.outer?.geometry}>
              <meshPhongMaterial color="#0a111a" emissive="#00ffff" emissiveIntensity={0.4} shininess={128} specular="#ffffff" transparent opacity={0.85} />
            </mesh>
            {/* Jagged inner tube */}
            <mesh ref={(el) => { if (el) innerMeshes.current[i] = el; }} geometry={jaggedGeometries[i]?.inner?.geometry} position={[0, 0.05, 0]}>
              <meshPhongMaterial color="#110511" emissive="#ff003c" emissiveIntensity={1.2} shininess={75} specular="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      <Plane args={[170, 170]} rotation={[-Math.PI * 0.5, 0, 0]} position={[0, -8.6, 0]}>
        <meshPhongMaterial color="#05020a" shininess={9} />
      </Plane>
    </>
  );
}

export default function Pillar() {
  const audioData = useAudioData();
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000", overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 22, 38], fov: 48 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ background: '#030105' }}>
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}