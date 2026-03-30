"use no memo";
"use client";

import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { getThreeBands } from "@/lib/audioAnalysis";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const CONFIG = {
  planet: {
    rotationSpeed: 0.05,
    baseColor: "#555558",
    tilt: [Math.PI * 0.58, 0, 0] as [number, number, number],
  },
  audio: {
    smoothing: 5,
  },
  effects: {
    strobeWindow: 30,
    strobeDuration: 3,
    strobeThreshold: 0.85,
    strobeColor: "#ff007f",
  }
};

const StarFieldShader = {
  uniforms: {
    time: { value: 0 },
    bass: { value: 0 },
  },
  vertexShader: `
    uniform float time;
    uniform float bass;
    attribute float size;
    varying vec3 vColor;
    varying float vOpacity;

    float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vColor = color;
      float uniqueId = rand(position.xy);
      float flicker = 0.5 + 0.5 * sin(time * (15.0 + uniqueId * 50.0));
      vOpacity = mix(0.4, flicker, step(0.05, bass) * bass);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
      if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
      gl_FragColor = vec4(vColor, vOpacity);
    }
  `
};

const colorBlack = new THREE.Color("#000000");

/**
 * Aurora Planet - Audio reactive 3D scene
 * This component should be used inside a VisualizerViewport
 */
export default function AuroraPlanet({ audioData }: { audioData: Uint8Array | null }) {
  const systemRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Points>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Points>(null);
  const auroraRef = useRef<THREE.Points>(null);
  const starFieldRef = useRef<THREE.Points>(null);
  const bgRef = useRef<THREE.Color>(null);

  const smoothBass = useRef(0);
  const smoothMids = useRef(0);
  const smoothHighs = useRef(0);
  const moonPhase = useRef(0);

  const getPoint = (seed: number) => {
    const s = Math.sin(seed) * 10000;
    return s - Math.floor(s);
  };

  const starFieldSetup = useMemo(() => {
    const count = 12000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (getPoint(i * 1.1) - 0.5) * 500;
      positions[i * 3 + 1] = (getPoint(i * 1.2) - 0.5) * 500;
      positions[i * 3 + 2] = (getPoint(i * 1.3) - 0.5) * 500;
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 1;
      sizes[i] = 0.4 + getPoint(i * 1.4) * 1.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return {
      geometry,
      material: new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(StarFieldShader.uniforms),
        vertexShader: StarFieldShader.vertexShader,
        fragmentShader: StarFieldShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        depthWrite: false,
      })
    };
  }, []);

  const ringsGeometry = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const ringDefs = [
      { inner: 2.9, outer: 3.3, count: 25000 },
      { inner: 3.4, outer: 4.0, count: 40000 },
      { inner: 4.1, outer: 4.5, count: 15000 },
    ];
    ringDefs.forEach((def, idx) => {
      const pos = new Float32Array(def.count * 3);
      for (let i = 0; i < def.count; i++) {
        const id = i + idx * 100000;
        const angle = getPoint(id) * Math.PI * 2;
        const radius = def.inner + (getPoint(id + 1) * (def.outer - def.inner));
        pos[i * 3] = Math.cos(angle) * radius;
        pos[i * 3 + 1] = (getPoint(id + 2) - 0.5) * 0.12;
        pos[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geometries.push(geo);
    });
    return geometries;
  }, []);

  const auroraGeometry = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = getPoint(i * 2.1) * Math.PI * 2;
      const phi = Math.acos(2 * getPoint(i * 2.2) - 1);
      const r = 2.2 + getPoint(i * 2.3) * 0.8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geometry;
  }, []);

  const strobeTimer = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Extract the frequencies
    const { bass, mids, highs } = getThreeBands(audioData);

    // 2. Interpolate the values (The missing link)
    smoothBass.current = THREE.MathUtils.lerp(smoothBass.current, bass, delta * CONFIG.audio.smoothing);
    smoothMids.current = THREE.MathUtils.lerp(smoothMids.current, mids, delta * CONFIG.audio.smoothing);
    smoothHighs.current = THREE.MathUtils.lerp(smoothHighs.current, highs, delta * CONFIG.audio.smoothing);

    // --- SNAP-ACTION STROBE ---
    if (bgRef.current) {
      const isStrobeWindow = (time % CONFIG.effects.strobeWindow) < CONFIG.effects.strobeDuration;

      if (isStrobeWindow) {
        // Isolate the trigger: Only fire if bass peaks AND we aren't currently locked in a flash or blackout
        if (bass > CONFIG.effects.strobeThreshold && strobeTimer.current === 0) {
          // Lock the duration: Force the pink flash for exactly 50ms
          strobeTimer.current = 0.05;
          bgRef.current.set(CONFIG.effects.strobeColor);
        }
      }

      // Handle the strict timekeeping
      if (strobeTimer.current > 0) {
        strobeTimer.current -= delta;
        // Enforce the blackout: Once the flash ends, snap to black and force a 50ms cooldown
        if (strobeTimer.current <= 0) {
          bgRef.current.set("#000000");
          strobeTimer.current = -0.05;
        }
      } else if (strobeTimer.current < 0) {
        // Count up the cooldown timer until it hits 0, resetting the system
        strobeTimer.current = Math.min(0, strobeTimer.current + delta);
      } else if (!isStrobeWindow && bgRef.current.getHexString() !== "000000") {
        // Failsafe: Ensure we are black when the strobe window closes
        bgRef.current.set("#000000");
      }
    }

    if (starFieldRef.current) {
      const mat = starFieldRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.time.value = time;
      mat.uniforms.bass.value = smoothBass.current;
    }

    if (systemRef.current) {
      systemRef.current.rotation.y = time * CONFIG.planet.rotationSpeed;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y += delta * (0.1 + smoothHighs.current * 1.8);
    }

    if (planetRef.current) {
      (planetRef.current.material as THREE.PointsMaterial).size = 0.01 + smoothBass.current * 0.015;
    }

    if (auroraRef.current) {
      const auroraMat = auroraRef.current.material as THREE.PointsMaterial;
      auroraMat.color.setHSL((time * 0.02 + smoothMids.current * 0.2) % 1, 0.9, 0.5);
      auroraRef.current.scale.setScalar(1.2 + Math.sin(time * 0.5) * 0.05 + smoothBass.current * 0.15);
    }

    if (moonRef.current) {
      moonPhase.current += delta * (0.4 + smoothHighs.current * 2.5);
      const moonDist = 6.0;
      moonRef.current.position.set(
        Math.cos(moonPhase.current) * moonDist,
        Math.sin(moonPhase.current * 0.3) * 1.5,
        Math.sin(moonPhase.current) * moonDist * 0.7
      );
      (moonRef.current.material as THREE.PointsMaterial).color.setHSL(smoothHighs.current * 0.45, 0.8, 0.6);
    }
  });

  return (
    <>
      <color ref={bgRef} attach="background" args={["#000000"]} />

      <ambientLight intensity={0.05} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />

      <points ref={starFieldRef} geometry={starFieldSetup.geometry} material={starFieldSetup.material} />

      <group ref={systemRef} rotation={CONFIG.planet.tilt}>
        <points ref={planetRef} renderOrder={1}>
          <sphereGeometry args={[1.9, 72, 72]} />
          <pointsMaterial color={CONFIG.planet.baseColor} size={0.01} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={true} depthTest={true} />
        </points>

        <points ref={auroraRef} geometry={auroraGeometry} renderOrder={0}>
          <pointsMaterial size={0.05} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>

        <group ref={ringsRef} renderOrder={10}>
          <points geometry={ringsGeometry[0]}><pointsMaterial color="#5599ff" size={0.007} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={true}/></points>
          <points geometry={ringsGeometry[1]}><pointsMaterial color="#3377dd" size={0.006} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={true}/></points>
          <points geometry={ringsGeometry[2]}><pointsMaterial color="#1144bb" size={0.005} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={true}/></points>
        </group>
      </group>

      <points ref={moonRef}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <pointsMaterial size={0.015} transparent opacity={1} depthWrite={false} />
      </points>

      <OrbitControls
        autoRotate={true}
        autoRotateSpeed={0.5}
        enablePan={false}
        minDistance={8}
        maxDistance={40}
        makeDefault
      />
    </>
  );
}
