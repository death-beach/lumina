"use no memo";
"use client";

import * as THREE from "three";
import { useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";

const NUM_BEAMS = 40;
const PARTICLES_PER_BEAM = 300;
const TOTAL_PARTICLES = NUM_BEAMS * PARTICLES_PER_BEAM;
const BEAM_DISTANCE = 50.0;

// ── LAYER 1: THE PERFECT BACKGROUND ────────────────────────────────────────
function BackgroundShimmer({
  smoothMids,
}: {
  smoothMids: React.MutableRefObject<number>;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, randoms } = useMemo(() => {
    let seed = 11111;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 4000;
    const pos = new Float32Array(count * 3);
    const rands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 60 + rnd() * 40;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(rnd() * 2 - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      rands[i] = rnd();
    }
    return { positions: pos, randoms: rands };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMids: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime % 1000;
      materialRef.current.uniforms.uMids.value = smoothMids.current;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uMids;
          attribute float aRandom;
          varying float vAlpha;
          void main() {
            float shimmer = sin(uTime * 12.0 + aRandom * 314.0) * cos(uTime * 7.0 + aRandom * 123.0);
            vAlpha = max(0.0, shimmer) * (0.4 + uMids * 2.0);
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (3.0 + uMids * 4.0) * (50.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vAlpha;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vec3(0.7, 0.7, 0.9), vAlpha * (1.0 - d * 2.0));
          }
        `}
      />
    </points>
  );
}

// ── LAYER 2: PRISM CORE ───────────────────────────────────────────────────
function PrismCore({
  smoothBass,
}: {
  smoothBass: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime % 1000;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      const scale = 1.0 + smoothBass.current * 0.8;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <octahedronGeometry args={[2, 0]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normal;
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;

            vec3 hsl2rgb(vec3 c) {
                vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
                return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
            }

            void main() {
              float hue = fract(vPosition.y * 0.1 + uTime * 0.2);
              vec3 baseColor = hsl2rgb(vec3(hue, 1.0, 0.6));
              float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0);
              gl_FragColor = vec4(baseColor * 0.4 + vec3(rim * 0.2), 0.85);
            }
          `}
        />
      </mesh>
      <mesh>
        <octahedronGeometry args={[2.01, 0]} />
        <meshBasicMaterial 
          color="#ffffff" 
          wireframe={true} 
          transparent={true} 
          opacity={0.3} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ── LAYER 3: THE PERFECT BEAMS ─────────────────────────────────────────────
function RefractedBeams({
  smoothHighs,
  smoothBass,
}: {
  smoothHighs: React.MutableRefObject<number>;
  smoothBass: React.MutableRefObject<number>;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, angles, distances, beamIndices } = useMemo(() => {
    let seed = 22222;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const pos = new Float32Array(TOTAL_PARTICLES * 3);
    const ang = new Float32Array(TOTAL_PARTICLES * 2);
    const dist = new Float32Array(TOTAL_PARTICLES);
    const bIndex = new Float32Array(TOTAL_PARTICLES);

    let idx = 0;
    for (let b = 0; b < NUM_BEAMS; b++) {
      const phi = Math.acos(1 - 2 * (b + 0.5) / NUM_BEAMS);
      const theta = Math.PI * (1 + Math.sqrt(5)) * b;

      for (let p = 0; p < PARTICLES_PER_BEAM; p++) {
        pos[idx * 3] = 0;
        pos[idx * 3 + 1] = 0;
        pos[idx * 3 + 2] = 0;
        ang[idx * 2] = theta;
        ang[idx * 2 + 1] = phi;
        dist[idx] = rnd() * BEAM_DISTANCE;
        bIndex[idx] = b;
        idx++;
      }
    }
    return { positions: pos, angles: ang, distances: dist, beamIndices: bIndex };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHighs: { value: 0 },
      uBass: { value: 0 },
      uStrobeActive: { value: 0 },
      uStrobeProgress: { value: 0 },
      uNumBeams: { value: NUM_BEAMS },
      uMaxDistance: { value: BEAM_DISTANCE },
    }),
    []
  );

  const lastStrobeTime = useRef(0);
  const isStrobing = useRef(false);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    const cycleLength = 33;
    const cyclePos = elapsed % cycleLength;

    if (cyclePos < delta * 2 && elapsed - lastStrobeTime.current > cycleLength * 0.5) {
      lastStrobeTime.current = elapsed;
      isStrobing.current = true;
    }

    let strobeActive = 0.0;
    let strobeProgress = 0.0;

    if (isStrobing.current) {
      const strobeAge = elapsed - lastStrobeTime.current;
      if (strobeAge > 6.0) {
        isStrobing.current = false;
      } else {
        strobeActive = 1.0;
        strobeProgress = strobeAge / 6.0;
      }
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime % 1000;
      materialRef.current.uniforms.uHighs.value = smoothHighs.current;
      materialRef.current.uniforms.uBass.value = smoothBass.current;
      materialRef.current.uniforms.uStrobeActive.value = strobeActive;
      materialRef.current.uniforms.uStrobeProgress.value = strobeProgress;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aAngle" args={[angles, 2]} />
        <bufferAttribute attach="attributes-aDistance" args={[distances, 1]} />
        <bufferAttribute attach="attributes-aBeamIndex" args={[beamIndices, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uHighs;
          uniform float uBass;
          uniform float uMaxDistance;
          attribute vec2 aAngle;
          attribute float aDistance;
          attribute float aBeamIndex;
          varying float vBeamIndex;
          varying float vDistance;
          varying float vCurrentDist;
          varying float vGlimmer;
          
          void main() {
            vBeamIndex = aBeamIndex;
            vDistance = aDistance;
            
            float baseRadius = 1.0 * (1.0 + uBass * 0.8);
            float currentDist = mod(aDistance + uTime * (12.0 + uHighs * 20.0), uMaxDistance);
            vGlimmer = sin(aDistance * 10.0 - uTime * 20.0) * uHighs;

            float theta = aAngle.x;
            float phi = aAngle.y;
            float r = baseRadius + 1.75 + currentDist;   // ← teeny tiny gap added here
            
            vec3 pos;
            pos.x = r * sin(phi) * cos(theta);
            pos.y = r * sin(phi) * sin(theta);
            pos.z = r * cos(phi);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            float sizeScale = max(0.0, 1.0 - (currentDist / uMaxDistance));
            
            gl_PointSize = (1.5 + vGlimmer) * sizeScale * (150.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float uStrobeActive;
          uniform float uStrobeProgress;
          uniform float uNumBeams;
          uniform float uHighs;
          uniform float uMaxDistance;
          varying float vBeamIndex;
          varying float vDistance;
          varying float vGlimmer;
          
          vec3 hsl2rgb(vec3 c) {
              vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
              return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
          }
          
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            
            float hue = vBeamIndex / uNumBeams;
            vec3 baseColor = hsl2rgb(vec3(hue, 1.0, 0.5)); 
            vec3 activeColor = baseColor * (1.0 + vGlimmer * 3.0 + uHighs * 4.0);
            
            if (uStrobeActive > 0.5) {
              float beamNormalized = vBeamIndex / uNumBeams;
              float diff = abs(beamNormalized - uStrobeProgress);
              if (diff > 0.5) diff = 1.0 - diff;
              if (diff < 0.03) activeColor = mix(activeColor, vec3(2.0), 1.0 - (diff / 0.03));
            }
            
            float alpha = exp(-25.0 * d * d);
            float distanceFade = max(0.0, 1.0 - (vDistance / uMaxDistance));
            
            gl_FragColor = vec4(activeColor, alpha * distanceFade * (0.7 + uHighs));
          }
        `}
      />
    </points>
  );
}

// ── ROOT SCENE ─────────────────────────────────────────────────────────────
// ── ROOT SCENE (FINAL FIX — stops the audio from dying) ─────────────────────────────────────────────────────────────
export default function PrismBurstScene({ audioData }: { audioData: Uint8Array | null }) {
  const smoothBass = useRef(0);
  const smoothMids = useRef(0);
  const smoothHighs = useRef(0);
  const worldRef = useRef<THREE.Group>(null!);
  const containerRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  // Hard Spin State
  const lastSpinTime = useRef(0);
  const isSpinning = useRef(false);

  // ←←← THIS IS THE FIX
  const audioDataRef = useRef<Uint8Array | null>(null);

  useLayoutEffect(() => {
    camera.position.set(0, 0, 40);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((state, delta) => {
    // Keep audioData fresh every single frame
    if (audioData !== audioDataRef.current) {
      audioDataRef.current = audioData;
    }

    const currentAudio = audioDataRef.current;
    const { bass, mids, highs } = getThreeBands(currentAudio);

    smoothBass.current = THREE.MathUtils.lerp(smoothBass.current, bass, delta * 12);
    smoothMids.current = THREE.MathUtils.lerp(smoothMids.current, mids, delta * 10);
    smoothHighs.current = THREE.MathUtils.lerp(smoothHighs.current, highs, delta * 15);

    const elapsed = state.clock.elapsedTime;
    
    // Check 30s interval
    if (elapsed % 30 < delta * 2 && elapsed - lastSpinTime.current > 15) {
      lastSpinTime.current = elapsed;
      isSpinning.current = true;
    }

    if (worldRef.current) {
      const rotationSpeed = 0.04 + smoothHighs.current * 0.15;
      worldRef.current.rotation.y += delta * rotationSpeed;
      worldRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.2;
    }

    // Camera Hard Spin (10 rapid rotations over 2 seconds)
    if (containerRef.current) {
      if (isSpinning.current) {
        const spinDuration = 2.0;
        const age = elapsed - lastSpinTime.current;
        if (age > spinDuration) {
          isSpinning.current = false;
          containerRef.current.rotation.y = 0; // Reset
        } else {
          const progress = age / spinDuration;
          const totalRotation = Math.PI * 2 * 10; // 10 full spins
          containerRef.current.rotation.y = progress * totalRotation;
        }
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.2} />
      {/* Container group allows camera-perspective spinning without breaking world logic */}
      <group ref={containerRef}>
        <group ref={worldRef}>
          <BackgroundShimmer smoothMids={smoothMids} />
          <PrismCore smoothBass={smoothBass} />
          <RefractedBeams smoothHighs={smoothHighs} smoothBass={smoothBass} />
        </group>
      </group>
      <OrbitControls makeDefault enablePan={false} minDistance={10} maxDistance={100} />
    </>
  );
}