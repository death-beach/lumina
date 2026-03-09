"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── FREQUENCY MAP (fftSize=4096, 2048 bins, ~10.77Hz/bin at 44100Hz) ─────────
// Sub-bass / kick  (0–86Hz)    → bins 0–7
// Low-mids         (200–900Hz) → bins 19–84
// High-mids        (900–4kHz)  → bins 84–372
// Presence         (4k–8kHz)   → bins 372–743
// Air              (8k–20kHz)  → bins 743–1857

function binPeak(data, lo, hi) {
  if (!data) return 0;
  let peak = 0;
  const end = Math.min(hi, data.length - 1);
  for (let i = lo; i <= end; i++) if (data[i] > peak) peak = data[i];
  return peak / 255;
}

function binAvg(data, lo, hi) {
  if (!data) return 0;
  const end = Math.min(hi, data.length - 1);
  let sum = 0;
  for (let i = lo; i <= end; i++) sum += data[i];
  return sum / (end - lo + 1) / 255;
}

// ── CORE ─────────────────────────────────────────────────────────────────────
// Fixed size sphere with constant rotation and gentle breathing.
// No audio response — stays the same size always.
// Core always rotates at constant speed.
function Core({ audioDataRef }) {
  const meshRef = useRef(null);
  const scale = useRef(1.0);

  useFrame((state) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.y += 0.008;
    meshRef.current.rotation.x += 0.004;

    // Gentle breathing animation, no audio response
    const idle = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
    scale.current = THREE.MathUtils.lerp(scale.current, idle, 0.04);

    meshRef.current.scale.setScalar(scale.current);
  });

  const shader = useMemo(() => ({
    uniforms: {
      color1: { value: new THREE.Color("#f00c6f") },
      color2: { value: new THREE.Color("#12abff") },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec3 vNormal;
      void main() {
        float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
        float intensity = pow(1.0 - fresnel, 3.0);
        float grad = vNormal.x * 0.5 + 0.5;
        float mask = smoothstep(0.0, 0.5, grad);
        vec3 rim = mix(color1, color2, grad) * mask;
        gl_FragColor = vec4(rim * intensity * 1.5, 1.0);
      }
    `,
  }), []);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <shaderMaterial args={[shader]} />
    </mesh>
  );
}

// ── RINGS ─────────────────────────────────────────────────────────────────────
// 15 rings, each assigned to a specific bin in the low-mid range (bins 19–84).
// Each ring glows brighter (higher opacity) when its bin has energy.
// Rings rotate as a group on their own axis — completely independent of particles.
// Scale stays fixed at 1.0 — no swelling.
function Rings({ audioDataRef }) {
  const groupRef = useRef(null);
  const opacities = useRef([]);

  const rings = useMemo(() => {
    const c1 = new THREE.Color("#f00c6f");   // pink
    const c2 = new THREE.Color("#12abff");   // blue
    const c3 = new THREE.Color("#9b30ff");   // purple
    const c4 = new THREE.Color("#00ff88");   // green
    const palette = [c1,c1,c1,c1, c2,c2,c2,c2, c3,c3,c3,c3, c4,c4];  // 4+4+4+2=14
    const arr = [];
    for (let i = 0; i < 14; i++) {
      // Spread evenly across bins 19–84 (200–900Hz)
      const bin = 19 + Math.floor((i / 14) * 65);
      arr.push({
        radius: 2.2 + Math.random() * 7,
        tube:   0.012 + Math.random() * 0.018,
        color: palette[i],
        speed:  (Math.random() - 0.5) * 0.04,   // individual spin speed
        rot:    new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        bin,
      });
    }
    opacities.current = new Array(arr.length).fill(0.5);
    return arr;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Group rotates on its own axes — independent of particles
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.07;
    groupRef.current.rotation.x = state.clock.elapsedTime * 0.025;

    const data = audioDataRef?.current ?? null;

    groupRef.current.children.forEach((child, i) => {
      // Each ring also spins individually
      child.rotation.z += rings[i].speed;

      // Scale stays fixed at 1.0 — no swelling
      child.scale.setScalar(1.0);

      if (!data) {
        // Idle: nearly invisible, subtle flicker
        const idle = 0.05 + Math.sin(state.clock.elapsedTime * 1.8 + i * 0.4) * 0.03;
        opacities.current[i] = THREE.MathUtils.lerp(opacities.current[i], idle, 0.04);
      } else {
        // Flash bright when frequency fires, slow fade back to near-invisible
        const val = (data[rings[i].bin] || 0) / 255;
        const target = 0.05 + val * 0.95;  // 0.05 (ghost) to 1.0 (full bright) — 20x contrast
        const lerpSpeed = target > opacities.current[i] ? 0.5 : 0.06;  // fast attack, slow release
        opacities.current[i] = THREE.MathUtils.lerp(opacities.current[i], target, lerpSpeed);
      }


      // Update material opacity
      child.material.opacity = opacities.current[i];
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={r.rot}>
          <torusGeometry args={[r.radius, r.tube, 16, 100]} />
          <meshBasicMaterial
            color={r.color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── PARTICLES ─────────────────────────────────────────────────────────────────
// Rotation speed driven by a weighted average of three high-frequency bands:
//   Low-high  (900Hz–4kHz,  bins 84–372):  weight 1×
//   Presence  (4kHz–8kHz,   bins 372–743): weight 2×
//   Air       (8kHz–20kHz,  bins 743–1857):weight 4×
// Higher frequencies contribute more to rotation speed.
// Particles rotate on their own axis — completely independent of rings.
function Particles({ count = 2000, audioDataRef }) {
  const pointsRef = useRef(null);
  const rotSpeed = useRef(0.015);

  const [positions, colors, sizes] = useMemo(() => {
    const pos  = new Float32Array(count * 3);
    const col  = new Float32Array(count * 3);
    const sz   = new Float32Array(count);
    const c1   = new THREE.Color("#f00c6f");
    const c2   = new THREE.Color("#12abff");
    const c3 = new THREE.Color("#9b30ff");   // purple — some rings
    const c4 = new THREE.Color("#00ff88");

    for (let i = 0; i < count; i++) {
      const r     = Math.pow(Math.random(), 2) * 15 + 1.6;
      const theta = Math.random() * 2 * Math.PI;
      const phi   = Math.acos(Math.random() * 2 - 1);
      pos.set([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ], i * 3);
      const mc = c1.clone().lerp(c2, Math.random());
      col.set([mc.r, mc.g, mc.b], i * 3);
      sz[i] = Math.random() * 3.0 + 1.0;
    }
    return [pos, col, sz];
  }, [count]);

  const shaderArgs = useMemo(() => ({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (40.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float a = 1.0 - smoothstep(0.4, 0.5, d);
        if (a < 0.01) discard;
        float df = smoothstep(8.0, 16.0, vDepth);
        gl_FragColor = vec4(mix(vec3(1.0), vColor, df), a * 0.8);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const data = audioDataRef?.current ?? null;

    if (data) {
      // Weighted average: higher bands count more
      const loHigh  = binAvg(data, 84,  372);   // 900Hz–4kHz,  weight 1
      const presence = binAvg(data, 372, 743);  // 4kHz–8kHz,   weight 2
      const air      = binAvg(data, 743, 1857); // 8kHz–20kHz,  weight 4
      const weighted = (loHigh * 1 + presence * 2 + air * 4) / 7;
      const target = 0.015 + weighted * 0.8;
      rotSpeed.current = THREE.MathUtils.lerp(rotSpeed.current, target, 0.1);
    } else {
      rotSpeed.current = THREE.MathUtils.lerp(rotSpeed.current, 0.015, 0.05);
    }

    // Particles rotate on Y and Z — different axes from rings (which use Y and X)
    pointsRef.current.rotation.y += rotSpeed.current * delta;
    pointsRef.current.rotation.z += 0.008 * delta;

    // Subtle mouse follow
    pointsRef.current.position.x = THREE.MathUtils.lerp(pointsRef.current.position.x, state.pointer.x * 2, 0.04);
    pointsRef.current.position.y = THREE.MathUtils.lerp(pointsRef.current.position.y, state.pointer.y * 2, 0.04);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color"    count={colors.length / 3}    array={colors}    itemSize={3} />
        <bufferAttribute attach="attributes-size"     count={sizes.length}          array={sizes}     itemSize={1} />
      </bufferGeometry>
      <shaderMaterial args={[shaderArgs]} />
    </points>
  );
}

// ── SCENE ─────────────────────────────────────────────────────────────────────
function Scene({ audioDataRef, position }) {
  const { size } = useThree();
  const isMobile = size.width < 768;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLowPower = isMobile && (prefersReducedMotion || size.width < 480);

  // Reduce particle count on mobile/low-power devices
  const particleCount = isLowPower ? 0 : isMobile ? 500 : 2000;

  const pos = isMobile ? [0, 0, -4.0] : (position || [0, 0, 0]);

  return (
    <group position={pos}>
      <Core    audioDataRef={audioDataRef} />
      <Rings   audioDataRef={audioDataRef} />
      {particleCount > 0 && <Particles count={particleCount} audioDataRef={audioDataRef} />}
    </group>
  );
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
// audioDataRef: React ref whose .current is a Uint8Array (or null when idle)
// position:     optional [x, y, z] override
// style:        optional extra CSS for the container
export default function MediaSingularity({ audioDataRef = null, position = null, style = {} }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#050505", overflow: "hidden", ...style }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }} dpr={[1, isMobile ? 1.5 : 2]}>
        <fog attach="fog" args={["#050505", 5, 25]} />
        <Scene audioDataRef={audioDataRef} position={position} />
      </Canvas>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 40%, #0f0f0f 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
