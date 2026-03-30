"use no memo";
"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getThreeBands } from "@/lib/audioAnalysis";

// ─────────────────────────────────────────────────────────────────────────────
// SCENE DIMENSIONS (everything relative to camera at [0, 14, 38])
// The horizon sits at z ≈ -55. Tallest buildings reach y ≈ 60.
// Ground is y = 0. River flows from z +25 (near) to z -50 (horizon).
// ─────────────────────────────────────────────────────────────────────────────
const BUILDING_COUNT = 340;
const RIVER_COUNT    = 16000;
const STAR_COUNT     = 3000;
const MOON_COUNT     = 2600;
const WINDOW_COUNT   = 3000;
const MOON_CYCLE     = 30.0;
const MOON_DURATION  = 5.0;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL RNG + SHARED BUFFERS
// ─────────────────────────────────────────────────────────────────────────────
let _s = 55123;
function rng(): number { _s = (_s * 9301 + 49297) % 233280; return _s / 233280; }
function resetRng() { _s = 55123; }

const RIVER_FREQ: number[] = new Array(128).fill(0);

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildStarGeo(): THREE.BufferGeometry {
  const pos   = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const seeds = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    pos[i * 3]     = (rng() - 0.5) * 320;
    pos[i * 3 + 1] = 28 + rng() * 90;     // upper sky
    pos[i * 3 + 2] = -55 - rng() * 140;   // behind horizon
    sizes[i] = 0.5 + rng() * 1.8;
    seeds[i] = rng();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize",    new THREE.BufferAttribute(sizes, 1));
  g.setAttribute("aSeed",    new THREE.BufferAttribute(seeds, 1));
  return g;
}

function buildRiverGeo(): THREE.BufferGeometry {
  // Flows from near camera (z ≈ +25) to horizon (z ≈ -50)
  // Perspective convergence: 28 units wide near camera, 4 at horizon
  const pos  = new Float32Array(RIVER_COUNT * 3);
  const idx  = new Float32Array(RIVER_COUNT); // 0=near, 1=horizon
  const lane = new Float32Array(RIVER_COUNT);
  const bx   = new Float32Array(RIVER_COUNT);
  const bz   = new Float32Array(RIVER_COUNT);
  for (let i = 0; i < RIVER_COUNT; i++) {
    const t  = i / RIVER_COUNT;
    const w  = THREE.MathUtils.lerp(28, 4, t);
    const lv = (rng() - 0.5) * 2.0;
    const x  = lv * w;
    const z  = THREE.MathUtils.lerp(25, -50, t);
    pos[i * 3]     = x;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = z;
    idx[i]  = t;
    lane[i] = lv;
    bx[i]   = x;
    bz[i]   = z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aIndex",   new THREE.BufferAttribute(idx, 1));
  g.setAttribute("aLane",    new THREE.BufferAttribute(lane, 1));
  g.setAttribute("aBaseX",   new THREE.BufferAttribute(bx, 1));
  g.setAttribute("aBaseZ",   new THREE.BufferAttribute(bz, 1));
  return g;
}

// Building data: [x, z, width, height, depth]
type Bld = [number, number, number, number, number];
function buildBuildingData(): Bld[] {
  const d: Bld[] = [];
  for (let i = 0; i < BUILDING_COUNT; i++) {
    d.push([
      (rng() - 0.5) * 130,   // x: spread across horizon
      -55 - rng() * 65,      // z: from -55 to -120 (horizon band)
      1.5 + rng() * 5.0,     // width
      10  + rng() * 50,      // height (10–60 units — very tall!)
      1.5 + rng() * 5.0,     // depth
    ]);
  }
  return d;
}

function buildWindowGeo(): THREE.BufferGeometry {
  const pos   = new Float32Array(WINDOW_COUNT * 3);
  const seeds = new Float32Array(WINDOW_COUNT);
  for (let i = 0; i < WINDOW_COUNT; i++) {
    pos[i * 3]     = (rng() - 0.5) * 125;
    pos[i * 3 + 1] = 2 + rng() * 52;
    pos[i * 3 + 2] = -56 - rng() * 60;
    seeds[i] = rng();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed",    new THREE.BufferAttribute(seeds, 1));
  return g;
}

function buildMoonGeo(): THREE.BufferGeometry {
  const pos   = new Float32Array(MOON_COUNT * 3);
  const seeds = new Float32Array(MOON_COUNT);
  for (let i = 0; i < MOON_COUNT; i++) {
    const theta = rng() * Math.PI * 2;
    const phi   = Math.acos(2 * rng() - 1);
    const r     = rng() < 0.45 ? rng() * 3.0 : 3.0 + rng() * 2.5;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    seeds[i] = rng();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed",    new THREE.BufferAttribute(seeds, 1));
  return g;
}

resetRng();
const STAR_GEO   = buildStarGeo();
const RIVER_GEO  = buildRiverGeo();
const BUILDINGS  = buildBuildingData();
const WINDOW_GEO = buildWindowGeo();
const MOON_GEO   = buildMoonGeo();

// Pre-build instanced matrices at rest position (no bass)
const INIT_MATRICES = (() => {
  const dummy = new THREE.Object3D();
  const arr   = new Array<THREE.Matrix4>(BUILDING_COUNT);
  for (let i = 0; i < BUILDING_COUNT; i++) {
    const [bx, bz, sx, sy, sz] = BUILDINGS[i];
    dummy.position.set(bx, sy * 0.5, bz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    arr[i] = dummy.matrix.clone();
  }
  return arr;
})();

// ─────────────────────────────────────────────────────────────────────────────
// SHADERS
// ─────────────────────────────────────────────────────────────────────────────

const starVert = /* glsl */`
  uniform float uTime;
  uniform float uHighs;
  attribute float aSize;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    float flicker = 0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 11.0) + aSeed * 6.2831);
    vAlpha = mix(0.3, 1.0, flicker * (0.4 + uHighs * 0.6));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (600.0 / -mv.z) * (1.0 + uHighs * 0.5);
    gl_Position  = projectionMatrix * mv;
  }
`;
const starFrag = /* glsl */`
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = 1.0 - smoothstep(0.3, 0.5, d);
    if (a < 0.01) discard;
    float core = 1.0 - smoothstep(0.0, 0.2, d);
    vec3 col = mix(uColor, vec3(1.0), core * 0.7);
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

const riverVert = /* glsl */`
  uniform float uTime;
  uniform float uHighs;
  uniform float uFreqData[128];
  attribute float aIndex;
  attribute float aLane;
  attribute float aBaseX;
  attribute float aBaseZ;
  varying float vWave;
  varying float vDepth;
  varying float vH;
  void main() {
    int bin    = int(mod(aIndex * 127.0, 128.0));
    float freq = uFreqData[bin];
    float near = 1.0 - aIndex;
    float wave = freq * 9.0 * near;
    float flow = sin(uTime * 2.0 + aBaseZ * 0.07 + aLane * 2.2) * 1.4 * near;
    vWave  = freq;
    vDepth = aIndex;
    vH     = uHighs;
    vec4 mv = modelViewMatrix * vec4(aBaseX, wave + flow, aBaseZ, 1.0);
    gl_PointSize = max(1.5, mix(4.0, 1.2, aIndex) * (280.0 / -mv.z));
    gl_Position  = projectionMatrix * mv;
  }
`;
const riverFrag = /* glsl */`
  varying float vWave;
  varying float vDepth;
  varying float vH;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = 1.0 - smoothstep(0.2, 0.5, d);
    if (a < 0.01) discard;
    // Cyan (hue 0.5) at low highs → pink/magenta (hue 0.85) at high highs
    float hue = 0.5 + vH * 0.35 + vWave * 0.08;
    float h6  = fract(hue) * 6.0;
    float r   = abs(h6 - 3.0) - 1.0;
    float g   = 2.0 - abs(h6 - 2.0);
    float b   = 2.0 - abs(h6 - 4.0);
    vec3 rgb  = clamp(vec3(r,g,b), 0.0, 1.0);
    float fade = 1.0 - smoothstep(0.6, 1.0, vDepth);
    // Solid baseline alpha — always visible even without audio
    float baseAlpha = 0.55 + vWave * 0.45;
    gl_FragColor = vec4(rgb * (1.2 + vWave), a * fade * baseAlpha);
  }
`;

const winVert = /* glsl */`
  uniform float uTime;
  attribute float aSeed;
  varying float vBright;
  void main() {
    float fl = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 9.0) + aSeed * 80.0);
    vBright = 0.3 + fl * 0.7;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, 2.4 * (200.0 / -mv.z));
    gl_Position  = projectionMatrix * mv;
  }
`;
const winFrag = /* glsl */`
  uniform float uTime;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = 1.0 - smoothstep(0.2, 0.5, d);
    if (a < 0.04) discard;
    float t   = fract(vBright * 4.3 + uTime * 0.006);
    vec3 warm = vec3(1.0, 0.88, 0.45);
    vec3 cool = vec3(0.35, 0.9, 1.0);
    vec3 col  = t < 0.5 ? warm : cool;
    gl_FragColor = vec4(col * vBright, a * 0.92);
  }
`;

const moonVert = /* glsl */`
  uniform float uTime;
  uniform float uHighs;
  attribute float aSeed;
  varying float vCore;
  varying float vShimmer;
  void main() {
    float sh = 0.55 + 0.45 * sin(uTime * (1.4 + aSeed * 5.5) + aSeed * 42.0);
    vShimmer = sh * (0.55 + uHighs * 0.45);
    vCore    = 1.0 - clamp(length(position) / 5.5, 0.0, 1.0);
    float dist = length(position) / 5.5;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, mix(5.0, 1.5, dist) * (300.0 / -mv.z));
    gl_Position  = projectionMatrix * mv;
  }
`;
const moonFrag = /* glsl */`
  varying float vCore;
  varying float vShimmer;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = 1.0 - smoothstep(0.25, 0.5, d);
    if (a < 0.01) discard;
    vec3 col = mix(vec3(0.0,1.0,0.45), vec3(0.92,1.0,0.96), vCore * vCore);
    gl_FragColor = vec4(col, a * vShimmer);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// INNER SCENE — needs useThree so it must be a child component
// ─────────────────────────────────────────────────────────────────────────────
function Scene({ audioData }: { audioData: Uint8Array | null }) {
  const { camera } = useThree();

  // Set camera once on mount
  useEffect(() => {
    camera.position.set(0, 14, 38);
    (camera as THREE.PerspectiveCamera).fov = 62;
    (camera as THREE.PerspectiveCamera).near = 0.5;
    (camera as THREE.PerspectiveCamera).far  = 400;
    camera.lookAt(0, 4, -60);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starMatRef  = useRef<THREE.ShaderMaterial>(null!);
  const riverMatRef = useRef<THREE.ShaderMaterial>(null!);
  const winMatRef   = useRef<THREE.ShaderMaterial>(null!);
  const moonMatRef  = useRef<THREE.ShaderMaterial>(null!);
  const cityMeshRef = useRef<THREE.InstancedMesh>(null!);
  const cityMatRef  = useRef<THREE.MeshBasicMaterial>(null!);
  const moonRef     = useRef<THREE.Group>(null!);

  const sBass       = useRef(0);
  const sMids       = useRef(0);
  const sHighs      = useRef(0);
  const moonOpacity = useRef(0);
  const camSway     = useRef(new THREE.Vector2(0, 0));

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const starUniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uHighs: { value: 0 },
    uColor: { value: new THREE.Color(0.5, 0.5, 1.0) },
  }), []);

  const riverUniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uHighs:    { value: 0 },
    uFreqData: { value: RIVER_FREQ },
  }), []);

  const winUniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  const moonUniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uHighs: { value: 0 },
  }), []);

  // HSL color helper for city material
  const cityColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const { bass, mids, highs } = getThreeBands(audioData);

    sBass.current  = THREE.MathUtils.lerp(sBass.current,  bass,  delta * 7);
    sMids.current  = THREE.MathUtils.lerp(sMids.current,  mids,  delta * 5);
    sHighs.current = THREE.MathUtils.lerp(sHighs.current, highs, delta * 9);

    // Subtle camera sway on mouse position (pointer is -1..1 even without pointerEvents)
    camSway.current.x = THREE.MathUtils.lerp(camSway.current.x, state.pointer.x * 5, delta * 1.2);
    camSway.current.y = THREE.MathUtils.lerp(camSway.current.y, state.pointer.y * 2, delta * 1.2);
    camera.lookAt(camSway.current.x, 4 + camSway.current.y, -60);

    // Stars
    if (starMatRef.current) {
      starMatRef.current.uniforms.uTime.value  = t;
      starMatRef.current.uniforms.uHighs.value = sHighs.current;
    }

    // River
    if (riverMatRef.current) {
      if (audioData) {
        for (let b = 0; b < 128; b++) RIVER_FREQ[b] = audioData[b] / 255;
      }
      riverMatRef.current.uniforms.uTime.value     = t;
      riverMatRef.current.uniforms.uHighs.value    = sHighs.current;
      riverMatRef.current.uniforms.uFreqData.value = RIVER_FREQ;
    }

    // City: bassScale drives height, color drives hue shift
    // Use meshBasicMaterial — no custom vertex shader needed, instancing works natively
    if (cityMeshRef.current) {
      const bassScale = 1.0 + sBass.current * 2.5;
      for (let i = 0; i < BUILDING_COUNT; i++) {
        const [bx, bz, sx, sy, sz] = BUILDINGS[i];
        const h = sy * bassScale;
        dummy.position.set(bx, h * 0.5, bz);
        dummy.scale.set(sx, h, sz);
        dummy.updateMatrix();
        cityMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      cityMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (cityMatRef.current) {
      // Pink (hue 0.85) → purple (0.75) → blue (0.62) as bass rises
      const hue = 0.85 - sBass.current * 0.23 + Math.sin(t * 0.1) * 0.04;
      const sat = 1.0;
      const lit = 0.35 + sBass.current * 0.25;
      cityColor.setHSL(hue, sat, lit);
      cityMatRef.current.color = cityColor;
    }

    // Windows
    if (winMatRef.current) {
      winMatRef.current.uniforms.uTime.value = t;
    }

    // Moon
    if (moonRef.current) {
      const inWindow = (t % MOON_CYCLE) < MOON_DURATION;
      moonOpacity.current = THREE.MathUtils.lerp(
        moonOpacity.current,
        inWindow ? 1.0 : 0.0,
        inWindow ? delta * 2.0 : delta * 3.5,
      );
      moonRef.current.visible = moonOpacity.current > 0.01;
      if (moonRef.current.visible) {
        moonRef.current.position.set(
          -38 + Math.sin(t * 0.06) * 2.5,
          52  + Math.cos(t * 0.08) * 2.0,
          -95,
        );
        moonRef.current.rotation.y = t * 0.08;
        moonRef.current.rotation.z = t * 0.03;
      }
    }
    if (moonMatRef.current) {
      moonMatRef.current.uniforms.uTime.value  = t;
      moonMatRef.current.uniforms.uHighs.value = sHighs.current;
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#04001a", 80, 260]} />

      {/* ── Stars ── */}
      <points geometry={STAR_GEO}>
        <shaderMaterial
          ref={starMatRef}
          uniforms={starUniforms}
          vertexShader={starVert}
          fragmentShader={starFrag}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── Moon (top-left, 5s every 30s) ── */}
      <group ref={moonRef} visible={false}>
        <mesh>
          <sphereGeometry args={[7, 18, 18]} />
          <meshBasicMaterial color="#001a10" transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>
        <points geometry={MOON_GEO}>
          <shaderMaterial
            ref={moonMatRef}
            uniforms={moonUniforms}
            vertexShader={moonVert}
            fragmentShader={moonFrag}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>

      {/* ── Ground plane ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -12]}>
        <planeGeometry args={[240, 180]} />
        <meshBasicMaterial color="#020009" />
      </mesh>

      {/* ── River ── */}
      <points geometry={RIVER_GEO}>
        <shaderMaterial
          ref={riverMatRef}
          uniforms={riverUniforms}
          vertexShader={riverVert}
          fragmentShader={riverFrag}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── Horizon atmosphere band ── */}
      {/* Dark fill plane behind city so sky reads correctly */}
      <mesh position={[0, 15, -57]} rotation={[0, 0, 0]}>
        <planeGeometry args={[400, 70]} />
        <meshBasicMaterial color="#040006" side={THREE.DoubleSide} />
      </mesh>
      {/* Neon glow horizon line */}
      <mesh position={[0, 0.8, -54]}>
        <planeGeometry args={[260, 1.5]} />
        <meshBasicMaterial color="#cc00cc" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* ── City buildings ── 
           Using meshBasicMaterial so instancing works natively (no custom instanceMatrix shader needed).
           Color is updated per-frame in useFrame above. ── */}
      <instancedMesh ref={cityMeshRef} args={[undefined, undefined, BUILDING_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={cityMatRef} color="#cc00cc" />
      </instancedMesh>

      {/* ── Window glow particles ── */}
      <points geometry={WINDOW_GEO}>
        <shaderMaterial
          ref={winMatRef}
          uniforms={winUniforms}
          vertexShader={winVert}
          fragmentShader={winFrag}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — thin wrapper; Canvas is provided by VisualizerViewport
// ─────────────────────────────────────────────────────────────────────────────
export default function CyberpunkOz({ audioData }: { audioData: Uint8Array | null }) {
  return <Scene audioData={audioData} />;
}
