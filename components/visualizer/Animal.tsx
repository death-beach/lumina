"use no memo";
"use client";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useAudioData } from "@/hooks/useAudioData";
import { useMemo, useRef } from "react";

const POINT_COUNT = 18500;  // ← boosted for richer detail
const MAX_RIPPLES = 5;

const vertexShader = `
uniform float uTime;
uniform float uBass;
uniform float uExpansion;
uniform vec3 uRippleOrigins[5];
uniform float uRippleTimes[5];
uniform float uRippleIntensities[5];
varying vec3 vColor;

void main() {
  vec3 pos = position;
  vec3 finalColor = color;

  for(int i = 0; i < 5; i++) {
    if (uRippleTimes[i] >= 0.0) {
      float dist = distance(pos, uRippleOrigins[i]);
      float radius = uRippleTimes[i] * 6.0;
      float diff = abs(dist - radius);
      if (diff < 1.5) {
        float intensity = (1.5 - diff) * uRippleIntensities[i];
        pos.x += sin(pos.y * 12.0 + uTime * 6.0) * 0.15 * intensity;
        pos.y += cos(pos.x * 12.0 + uTime * 6.0) * 0.15 * intensity;
        pos.z += sin(pos.z * 12.0 + uTime * 6.0) * 0.15 * intensity;

        vec3 baseRippleColor = vec3(0.0, 0.8, 1.0);
        vec3 bassRippleColor = vec3(1.0, 0.3, 0.0);
        vec3 rippleColor = mix(baseRippleColor, bassRippleColor, uBass);
        finalColor = mix(finalColor, rippleColor, intensity * 1.5);
      }
    }
  }

  // Organic skin wrinkles (makes it feel alive instead of balloon-smooth)
  float wrinkle = sin(pos.x * 13.0) * sin(pos.y * 17.0) * sin(pos.z * 11.0) * 0.011;
  pos += wrinkle;

  // Highs-driven expansion (the elephant breathes!)
  pos *= (1.0 + uExpansion);

  vColor = finalColor;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 18.0 / max(-mvPosition.z, 1.0);
}
`;

const fragmentShader = `
varying vec3 vColor;
void main() {
  float dist = distance(gl_PointCoord, vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.1, dist);
  gl_FragColor = vec4(vColor, alpha * 0.9);
}
`;

const mistVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const mistFragmentShader = `
varying vec2 vUv;
uniform float uTime;
void main() {
  float cycle = mod(uTime, 30.0);
  float sweepPos = -0.5 + (cycle / 6.0) * 2.0;
  float light = 0.0;
  for(int i = 0; i < 3; i++) {
    float offset = float(i) * 0.25;
    float dist = abs(vUv.x - (sweepPos - offset));
    float beam = smoothstep(0.1, 0.0, dist);
    beam *= sin(vUv.y * 12.0 + uTime * 1.5) * 0.4 + 0.6;
    light += beam;
  }
  float falloff = smoothstep(1.0, 0.0, abs(vUv.y - 0.5) * 2.0);
  light *= falloff;
  vec3 color = vec3(0.7, 0.85, 1.0) * light;
  gl_FragColor = vec4(color, light * 0.25);
}
`;

function useSeededRandom() {
  const seedRef = useRef(12345);
  return useMemo(() => {
    return () => {
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      return seedRef.current / 233280;
    };
  }, []);
}

function useElephantGeometry() {
  const seededRandom = useSeededRandom();
  return useMemo(() => {
    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);
    let valid = 0;

    const addPoint = (x: number, y: number, z: number, cr: number, cg: number, cb: number) => {
      if (valid >= POINT_COUNT) return;
      positions[valid * 3] = x;
      positions[valid * 3 + 1] = y;
      positions[valid * 3 + 2] = z;
      colors[valid * 3] = cr;
      colors[valid * 3 + 1] = cg;
      colors[valid * 3 + 2] = cb;
      valid++;
    };

    // Main body - large rounded
    for (let i = 0; i < 5800; i++) {
      let x, y, z;
      do {
        x = (seededRandom() - 0.5) * 9.2;
        y = (seededRandom() - 0.5) * 6.1 - 0.4;
        z = (seededRandom() - 0.5) * 4.6;
      } while (Math.pow(x / 4.9, 2) + Math.pow((y + 0.3) / 3.1, 2) + Math.pow(z / 2.25, 2) > 1.0);
      const shade = 0.48 + (y + 2.0) * 0.035;
      addPoint(x, y, z, shade * 0.96, shade * 1.02, shade * 1.08);
    }

    // Head
    for (let i = 0; i < 3100; i++) {
      let x, y, z;
      do {
        x = (seededRandom() - 0.5) * 4.1 + 3.4;
        y = (seededRandom() - 0.5) * 3.7 + 1.35;
        z = (seededRandom() - 0.5) * 3.4;
      } while (Math.pow((x - 3.85) / 2.25, 2) + Math.pow((y - 1.3) / 1.95, 2) + Math.pow(z / 1.8, 2) > 1.0);
      addPoint(x, y, z, 0.53, 0.56, 0.61);
    }

    // Ears (big + floppy - both sides now!)
    const earPoints = 1050;
    // Right ear (+z)
    for (let i = 0; i < earPoints; i++) {
      const x = seededRandom() * 2.1 + 3.1;
      const y = seededRandom() * 2.9 + 1.65;
      const z = seededRandom() * 2.3 + 2.55;
      if (Math.pow((x - 3.4) / 1.55, 2) + Math.pow((y - 1.9) / 1.85, 2) + Math.pow((z - 2.8) / 0.85, 2) < 1.0) {
        addPoint(x, y, z, 0.47, 0.49, 0.54);
      }
    }
    // Left ear (-z)
    for (let i = 0; i < earPoints; i++) {
      const x = seededRandom() * 2.1 + 3.1;
      const y = seededRandom() * 2.9 + 1.65;
      const z = -(seededRandom() * 2.3 + 2.55);
      if (Math.pow((x - 3.4) / 1.55, 2) + Math.pow((y - 1.9) / 1.85, 2) + Math.pow((z + 2.8) / 0.85, 2) < 1.0) {
        addPoint(x, y, z, 0.47, 0.49, 0.54);
      }
    }

    // 4 Legs (proper left/right pairs)
    const legBases = [
      {x: 2.1, z: 1.75}, {x: 2.1, z: -1.75},
      {x: -2.55, z: 1.8}, {x: -2.55, z: -1.8}
    ];
    for (const base of legBases) {
      for (let i = 0; i < 820; i++) {
        const t = seededRandom();
        const y = -1.55 - t * 2.35;
        const radius = 0.78 * (1.0 - t * 0.42);
        const ang = seededRandom() * Math.PI * 2;
        const x = base.x + Math.cos(ang) * radius * 0.95;
        const z = base.z + Math.sin(ang) * radius * 0.8;
        const shade = 0.41 + y * 0.015;
        addPoint(x, y, z, shade, shade * 1.04, shade * 1.1);
      }
    }

    // TRUNK - parametric curved trunk (the star of the show now)
    for (let s = 0; s < 42; s++) {
      const t = s / 41;
      const curveX = Math.sin(t * 2.7) * 1.45;
      const x = 4.75 + t * 1.1 + curveX;
      const y = 0.85 - t * 5.35 + Math.pow(t * 1.3, 2) * 0.8;
      const z = Math.sin(t * 4.0) * 0.45;

      const radius = 0.52 * (1.0 - t * 0.72) * (1 + Math.sin(t * 14) * 0.07);

      for (let p = 0; p < 42; p++) {
        const a = seededRandom() * Math.PI * 2;
        const r = radius * (0.65 + seededRandom() * 0.7);
        addPoint(
          x + Math.cos(a) * r,
          y,
          z + Math.sin(a) * r * 0.82,
          0.51, 0.54, 0.59
        );
      }
    }

    // Tusks (ivory - real elephant detail!)
    const tuskStarts = [
      {x: 4.35, y: 1.95, z: 1.05},
      {x: 4.35, y: 1.95, z: -1.05}
    ];
    for (const start of tuskStarts) {
      for (let i = 0; i < 340; i++) {
        const t = i / 340;
        const x = start.x + t * 2.65;
        const y = start.y - t * 1.1 + Math.pow(t, 1.6) * 0.6;
        const z = start.z * (1 - t * 0.35);
        const r = 0.19 * (1 - t * 0.75);
        for (let j = 0; j < 11; j++) {
          const a = (j / 11) * Math.PI * 2 + seededRandom() * 0.5;
          addPoint(x + Math.cos(a) * r, y, z + Math.sin(a) * r * 0.6, 0.92, 0.89, 0.82);
        }
      }
    }

    // Small tail
    for (let i = 0; i < 220; i++) {
      const t = i / 220;
      const x = -3.9 - t * 2.1;
      const y = -0.65 + Math.sin(t * 9) * 0.25;
      const z = Math.cos(t * 11) * 0.4;
      const r = 0.13 * (1 - t * 0.5);
      for (let j = 0; j < 8; j++) {
        const a = seededRandom() * Math.PI * 2;
        addPoint(x + Math.cos(a) * r, y, z + Math.sin(a) * r * 0.7, 0.39, 0.42, 0.47);
      }
    }

    // Fill rest with offscreen points
    while (valid < POINT_COUNT) {
      positions[valid * 3] = 9999;
      positions[valid * 3 + 1] = 9999;
      positions[valid * 3 + 2] = 9999;
      valid++;
    }

    return { positions, colors, seededRandom };
  }, [seededRandom]);
}

function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const lastRestRippleTime = useRef(0);
  const highsAccumulator = useRef(0);

  const { positions, colors, seededRandom } = useElephantGeometry();

  const pointsUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uExpansion: { value: 0 },
    uRippleOrigins: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector3()) },
    uRippleTimes: { value: new Float32Array(MAX_RIPPLES).fill(-1.0) },
    uRippleIntensities: { value: new Float32Array(MAX_RIPPLES).fill(0.0) }
  }), []);

  const mistUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const spawnRipple = (intensity: number) => {
    let idx = 0;
    let oldest = -999;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (pointsUniforms.uRippleTimes.value[i] < 0) { idx = i; break; }
      if (pointsUniforms.uRippleTimes.value[i] > oldest) { oldest = pointsUniforms.uRippleTimes.value[i]; idx = i; }
    }
    pointsUniforms.uRippleOrigins.value[idx].set((seededRandom() - 0.5) * 8.0, (seededRandom() - 0.5) * 6.0, seededRandom() * 2.0);
    // eslint-disable-next-line react-hooks/immutability
    pointsUniforms.uRippleTimes.value[idx] = 0.0;
    // eslint-disable-next-line react-hooks/immutability
    pointsUniforms.uRippleIntensities.value[idx] = intensity;
  };

  useFrame((state, delta) => {
    const { bass, mids, highs } = getThreeBands(audioData);
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.y += (0.05 + mids * 0.4) * delta;
      const targetTilt = pointer.y * 0.3;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetTilt, 0.05);
    }

    // eslint-disable-next-line react-hooks/immutability
    pointsUniforms.uBass.value = bass;
    // eslint-disable-next-line react-hooks/immutability
    pointsUniforms.uExpansion.value = highs * 0.35;
    pointsUniforms.uTime.value = t;
    // eslint-disable-next-line react-hooks/immutability
    mistUniforms.uTime.value = t;

    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (pointsUniforms.uRippleTimes.value[i] >= 0.0) {
        pointsUniforms.uRippleTimes.value[i] += delta;
        if (pointsUniforms.uRippleTimes.value[i] > 2.5) pointsUniforms.uRippleTimes.value[i] = -1.0;
      }
    }

    if (t - lastRestRippleTime.current > 20.0) {
      spawnRipple(0.4);
      lastRestRippleTime.current = t;
    }

    if (highs > 0.4) {
      highsAccumulator.current += highs * delta;
      if (highsAccumulator.current > 0.6) {
        spawnRipple(highs * 1.5 + 0.5);
        highsAccumulator.current = 0;
        lastRestRippleTime.current = t;
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={pointsUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexColors
          />
        </points>
      </group>

      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[40, 40]} />
        <shaderMaterial
          vertexShader={mistVertexShader}
          fragmentShader={mistFragmentShader}
          uniforms={mistUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

export default function Animal() {
  const audioData = useAudioData();
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#050508", overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 0, 7.5], fov: 60 }}>
        <Scene audioData={audioData} />
        <OrbitControls enablePan={false} enableZoom={true} maxDistance={20} minDistance={3} />
      </Canvas>
    </div>
  );
}