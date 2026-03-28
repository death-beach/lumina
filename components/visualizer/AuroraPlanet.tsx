"use no memo";
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Torus, Points, Stars } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { pointer, scene } = useThree();
  const planetRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const auroraRef = useRef<THREE.Points>(null);

  // Seeded random for pure, repeatable particle distribution
  const seededRandom = useMemo(() => {
    let seed = 987654;
    return () => {
      // eslint-disable-next-line react-hooks/immutability
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, []);

  // Aurora particle geometry – magnetic layer positions (flattened spherical shell)
  const auroraGeometry = useMemo(() => {
    const count = 4800; // well under 12k total particles limit
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = seededRandom() * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom() - 1);
      const r = 2.75 + seededRandom() * 0.65; // slightly larger than planet

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.85; // flattened for aurora-like belt
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Base deep-space aurora colors (purple/blue/reddish mix)
      colors[i * 3]     = 0.65;
      colors[i * 3 + 1] = 0.25;
      colors[i * 3 + 2] = 0.95;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [seededRandom]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { bass, mids, highs } = getThreeBands(audioData);

    // Planet – slow meditative spin (always alive)
    if (planetRef.current) {
      planetRef.current.rotation.y = time * 0.04;
    }

    // Aurora magnetic layer – BASS controls expansion + color shift
    if (auroraRef.current) {
      const scale = 1.0 + bass * 0.55;
      auroraRef.current.scale.setScalar(scale);

      // Hue shift: deep purple → vibrant magenta/reddish on bass hits
      const material = auroraRef.current.material as THREE.PointsMaterial;
      const hue = 0.72 - bass * 0.35;
      material.color.setHSL(hue, 0.85, 0.75);
    }

    // Rings – HIGHS control rotation speed (distinct from bass)
    if (ringsRef.current) {
      const rotationSpeed = 0.15 + highs * 1.1;
      ringsRef.current.rotation.z = time * rotationSpeed;
    }

    // Lonely moon orbit – HIGHS accelerate orbit speed
    if (moonRef.current) {
      const orbitSpeed = 0.35 + highs * 1.4;
      const distance = 4.8;
      moonRef.current.position.x = Math.cos(time * orbitSpeed) * distance;
      moonRef.current.position.z = Math.sin(time * orbitSpeed) * distance * 0.7;
      moonRef.current.position.y = Math.sin(time * orbitSpeed * 0.6) * 1.1;
    }

    // Mids control fog color (rings/fog/starfield atmosphere – no conflict)
    if (scene.fog) {
      const fogHue = 0.75 + mids * 0.15; // purple-blue → slight reddish tint
      (scene.fog as THREE.Fog).color.setHSL(fogHue, 0.6, 0.12);
    }

    // Gentle mouse/touch responsiveness – subtle ring tilt
    if (ringsRef.current) {
      ringsRef.current.rotation.x = pointer.y * 0.08;
    }
  });

  return (
    <>
      {/* Deep-space lighting */}
      <ambientLight intensity={0.35} color="#443366" />
      <pointLight position={[15, 8, 10]} intensity={1.2} color="#a0b0ff" />

      {/* Starfield – meditative background */}
      <Stars
        radius={120}
        depth={70}
        count={8500}
        factor={3.5}
        saturation={0.2}
        fade={true}
      />

      {/* Central planet (sphere) */}
      <Sphere ref={planetRef} args={[1.75, 72, 72]}>
        <meshPhongMaterial
          color="#1e2b4f"
          emissive="#0f1e3a"
          shininess={8}
          specular="#445577"
        />
      </Sphere>

      {/* Flowing colorful magnetic aurora layer (Points – bass reactive) */}
      <Points ref={auroraRef} geometry={auroraGeometry}>
        <pointsMaterial
          size={0.038}
          vertexColors
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
          depthTest={false}
        />
      </Points>

      {/* Rings group – surrounding the planet */}
      <group ref={ringsRef}>
        {/* Inner ring */}
        <Torus args={[2.9, 0.065, 3, 96]} rotation={[Math.PI * 0.58, 0, 0]}>
          <meshPhongMaterial
            color="#9c6cff"
            emissive="#4a2a88"
            shininess={30}
            side={THREE.DoubleSide}
          />
        </Torus>
        {/* Middle ring */}
        <Torus args={[3.45, 0.045, 3, 112]} rotation={[Math.PI * 0.52, 0, 0]}>
          <meshPhongMaterial
            color="#c07eff"
            emissive="#5c3a99"
            shininess={20}
            side={THREE.DoubleSide}
          />
        </Torus>
        {/* Outer faint ring */}
        <Torus args={[4.05, 0.03, 3, 128]} rotation={[Math.PI * 0.65, 0, 0]}>
          <meshPhongMaterial
            color="#b080ff"
            emissive="#3f1f77"
            shininess={15}
            side={THREE.DoubleSide}
            transparent
            opacity={0.75}
          />
        </Torus>
      </group>

      {/* Lonely moon circling the planet */}
      <Sphere ref={moonRef} args={[0.32, 36, 36]}>
        <meshPhongMaterial
          color="#e8e8f0"
          emissive="#445566"
          shininess={12}
        />
      </Sphere>

      {/* Deep-space fog for atmosphere and occasional mist feel */}
      <fog attach="fog" args={["#0c0b1f", 18, 95]} />

      {/* Interactive camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={28}
        target={[0, 0.6, 0]}
      />
    </>
  );
}

export default function AuroraPlanet() {
  const audioData = useAudioData();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: "#05040f",
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [0, 2.5, 8.2], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene audioData={audioData} />
      </Canvas>
    </div>
  );
}