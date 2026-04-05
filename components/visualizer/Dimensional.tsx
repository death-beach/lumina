"use no memo";
"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";

// ── LAYER 1: HYPERDIMENSIONAL FRACTAL LATTICE & HEX CORE ───────────────────
function HexFractalCore({
  audioData,
  smoothBass,
  smoothHighs,
  bloomPhase,
}: {
  audioData: Uint8Array | null;
  smoothBass: React.MutableRefObject<number>;
  smoothHighs: React.MutableRefObject<number>;
  bloomPhase: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, randoms } = useMemo(() => {
    let seed = 11111;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 10000;
    const pos = new Float32Array(count * 3);
    const rands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distributed within a large spherical volume to be folded by the fractal shader
      pos[i * 3] = (rnd() - 0.5) * 45;
      pos[i * 3 + 1] = (rnd() - 0.5) * 45;
      pos[i * 3 + 2] = (rnd() - 0.5) * 45;
      rands[i] = rnd();
    }
    return { positions: pos, randoms: rands };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uHighs: { value: 0 },
      uBloom: { value: 0 },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uHighs;
    uniform float uBloom;
    attribute float aRandom;
    varying vec3 vColor;

    vec2 rotate(vec2 p, float a) {
      float s = sin(a), c = cos(a);
      return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }

    float hexDist(vec2 p) {
      p = abs(p);
      float d = dot(p, normalize(vec2(1.0, 1.73205081)));
      return max(d, p.x);
    }

    void main() {
      vec3 p = position;

      // Base slow rotation
      p.xz = rotate(p.xz, uTime * 0.1);
      p.yz = rotate(p.yz, uTime * 0.05);

      // Hyperdimensional fractal folding
      for(int i = 0; i < 3; i++) {
        p.xy = rotate(p.xy, uTime * 0.1 + float(i) * 0.5);
        p.xz = rotate(p.xz, uTime * 0.15);
        // Bloom expands the folds, creating new symmetries
        p = abs(p) - (2.5 + uBloom * 3.5 + uBass * 1.5);
      }

      // Hexagonal shaping and shockwave
      float hd = hexDist(p.xy);
      float shockwave = sin(length(position) * 0.5 - uTime * 5.0) * uBass * 2.0;
      p.z += sin(hd * 4.0 - uTime * 2.0) * (0.5 + uBass * 3.0) + shockwave;

      // Core pulsing
      p *= 1.0 + uBass * 0.6;

      // Palette mapping: Void Black to Deep Purple to Violet to Magenta
      vec3 col1 = vec3(0.29, 0.0, 0.51); // #4B0082 Deep Purple
      vec3 col2 = vec3(0.54, 0.17, 0.89); // #8A2BE2 Violet
      vec3 col3 = vec3(1.0, 0.0, 1.0);    // #FF00FF Magenta

      float tColor = fract(hd * 0.15 + uTime * 0.2 + aRandom);
      vec3 color = mix(col1, col2, smoothstep(0.0, 0.5, tColor));
      color = mix(color, col3, smoothstep(0.5, 1.0, tColor));

      // Highs reaction: Voids flare and extreme glitter
      float glitter = step(0.92, fract(aRandom * 20.0 + uTime * 8.0 + uHighs * 15.0)) * (1.0 + uHighs * 3.0);
      color += vec3(glitter);

      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      
      // Highs make the intricate lattice details sharper/brighter
      float pointSize = (2.0 + aRandom * 2.5) + (uHighs * 5.0) + (uBass * 3.0);
      gl_PointSize = pointSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.2, 0.5, d);
      gl_FragColor = vec4(vColor, a * 0.9);
    }
  `;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uBass.value = smoothBass.current;
      materialRef.current.uniforms.uHighs.value = smoothHighs.current;
      materialRef.current.uniforms.uBloom.value = bloomPhase.current;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ── LAYER 2: ETHEREAL JELLYFISH ENTITIES ──────────────────────────────────────
function JellyfishEntities({
  audioData,
  smoothBass,
  smoothHighs,
  bloomPhase,
}: {
  audioData: Uint8Array | null;
  smoothBass: React.MutableRefObject<number>;
  smoothHighs: React.MutableRefObject<number>;
  bloomPhase: React.MutableRefObject<number>;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, jellyIds, trailIdxs } = useMemo(() => {
    let seed = 88888;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const numJellies = 75;
    const particlesPerJelly = 40;
    const total = numJellies * particlesPerJelly;

    const pos = new Float32Array(total * 3);
    const p_jid = new Float32Array(total);
    const p_tidx = new Float32Array(total);

    for (let i = 0; i < numJellies; i++) {
      const radius = 12 + rnd() * 25;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(rnd() * 2 - 1);
      
      const ox = radius * Math.sin(phi) * Math.cos(theta);
      const oy = radius * Math.sin(phi) * Math.sin(theta);
      const oz = radius * Math.cos(phi);

      const jid = rnd();

      for (let j = 0; j < particlesPerJelly; j++) {
        const idx = i * particlesPerJelly + j;
        const trailRatio = j / particlesPerJelly; // 0 = Core, 1 = Tail end

        // Distribute trail particles slightly loosely for an organic feel
        pos[idx * 3] = ox + (rnd() - 0.5) * trailRatio * 3;
        pos[idx * 3 + 1] = oy + (rnd() - 0.5) * trailRatio * 3;
        pos[idx * 3 + 2] = oz + (rnd() - 0.5) * trailRatio * 3;

        p_jid[idx] = jid;
        p_tidx[idx] = trailRatio;
      }
    }
    return { positions: pos, jellyIds: p_jid, trailIdxs: p_tidx };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uHighs: { value: 0 },
      uBloom: { value: 0 },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uHighs;
    uniform float uBloom;
    attribute float aJellyId;
    attribute float aTrailIdx;
    varying vec3 vColor;

    vec2 rotate(vec2 p, float a) {
      float s = sin(a), c = cos(a);
      return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }

    void main() {
      vec3 p = position;

      // Organic drifting
      p.xz = rotate(p.xz, uTime * 0.15 + aJellyId * 6.28);
      p.y += sin(uTime * 1.5 + aJellyId * 15.0) * 3.0;

      // Trail stretch dynamics driven by Highs
      float trailStretch = 1.0 + uHighs * 4.0;
      vec3 outward = normalize(p);
      p -= outward * aTrailIdx * 1.5 * trailStretch;

      // Bass reaction: Pull slightly inward, then blast outward
      float pullPush = smoothstep(0.0, 0.3, uBass) * -3.0 + smoothstep(0.4, 1.0, uBass) * 8.0;
      p += outward * pullPush;

      // Event: Entities expand outward during bloom phase
      p *= 1.0 + uBloom * 0.8;

      // Palette: Cyan (#00FFFF) and Lime (#39FF14) with White-hot cores
      vec3 cyan = vec3(0.0, 1.0, 1.0);
      vec3 lime = vec3(0.22, 1.0, 0.08);
      vec3 coreCol = vec3(1.0, 1.0, 1.0);

      vec3 color = mix(cyan, lime, fract(aJellyId * 5.73));
      
      float isCore = 1.0 - smoothstep(0.0, 0.15, aTrailIdx);
      color = mix(color, coreCol, isCore);

      // Highs make entities more translucent and trails glow brighter
      color *= (1.0 - aTrailIdx * 0.7) + (uHighs * 0.8);

      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      float size = mix(1.5, 8.0, isCore) + uHighs * 4.0;
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.1, 0.5, d);
      gl_FragColor = vec4(vColor, a * 0.85);
    }
  `;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uBass.value = smoothBass.current;
      materialRef.current.uniforms.uHighs.value = smoothHighs.current;
      materialRef.current.uniforms.uBloom.value = bloomPhase.current;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aJellyId" args={[jellyIds, 1]} />
        <bufferAttribute attach="attributes-aTrailIdx" args={[trailIdxs, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ── ROOT EXPORT ──────────────────────────────────────────────────────────────
export default function HyperdimensionalHexScene({
  audioData,
}: {
  audioData: Uint8Array | null;
}) {
  const smoothBass = useRef(0);
  const smoothMids = useRef(0);
  const smoothHighs = useRef(0);

  // Time-based Bloom Event Refs
  const bloomPhase = useRef(0);
  const lastBloomTime = useRef(0);
  const bloomActive = useRef(false);

  useFrame((state, delta) => {
    const { bass, mids, highs } = getThreeBands(audioData);

    // Smooth audio inputs
    smoothBass.current = THREE.MathUtils.lerp(smoothBass.current, bass, delta * 12);
    smoothMids.current = THREE.MathUtils.lerp(smoothMids.current, mids, delta * 8);
    smoothHighs.current = THREE.MathUtils.lerp(smoothHighs.current, highs, delta * 16);

    // 28-second Bloom Event Logic
    const elapsed = state.clock.elapsedTime;
    const cycleLength = 28;
    const cyclePos = elapsed % cycleLength;

    if (cyclePos < delta * 2 && elapsed - lastBloomTime.current > cycleLength * 0.5) {
      lastBloomTime.current = elapsed;
      bloomActive.current = true;
    }

    if (bloomActive.current) {
      const age = elapsed - lastBloomTime.current;
      if (age < 2.0) {
        // Expand outward quickly
        bloomPhase.current = THREE.MathUtils.lerp(bloomPhase.current, 1.0, delta * 4);
      } else if (age < 6.0) {
        // Gently contract back
        bloomPhase.current = THREE.MathUtils.lerp(bloomPhase.current, 0.0, delta * 1.5);
      } else {
        bloomActive.current = false;
      }
    } else {
      bloomPhase.current = THREE.MathUtils.lerp(bloomPhase.current, 0.0, delta * 2);
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      
      <HexFractalCore 
        audioData={audioData} 
        smoothBass={smoothBass} 
        smoothHighs={smoothHighs} 
        bloomPhase={bloomPhase} 
      />
      
      <JellyfishEntities 
        audioData={audioData} 
        smoothBass={smoothBass} 
        smoothHighs={smoothHighs} 
        bloomPhase={bloomPhase} 
      />
      
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.6}
        enablePan={false}
        minDistance={5}
        maxDistance={60}
      />
    </>
  );
}