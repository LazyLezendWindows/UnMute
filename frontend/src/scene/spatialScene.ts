import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NormalBlending,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The app's live 3D backdrop: an iridescent liquid-chrome blob, a chrome ring, orbiting chrome
 * spheres and drifting motes of light, on a transparent canvas behind the glass UI.
 *
 * Energy budget (this runs on phones):
 * - The blob's ripple is computed on the GPU (vertex shader); the CPU does no per-vertex work.
 * - Every material renders in a single pass (no transmission, which would render the scene twice).
 * - At most 30 frames per second; the motion is slow enough that more is invisible.
 * - It only animates while the person is interacting: after IDLE_MS without input it holds the last
 *   frame, so the page (and every blurred glass pane above it) stops repainting. Any input wakes it.
 * - It stops entirely in hidden tabs and unfocused windows.
 * - Pixel ratio is capped; antialiasing is skipped on high-density screens that do not need it.
 */

export type SceneMode = 'ambient' | 'hero';
export type SceneMotion = 'animate' | 'still';

export interface SpatialSceneOptions {
  mode: SceneMode;
  dark: boolean;
  /** Accent colour (hex); tints the chrome and the motes of light. */
  accent: string;
  /** `still` renders single frames only (on resize/theme change) and never animates. */
  motion: SceneMotion;
}

export interface SpatialSceneHandle {
  setDark(dark: boolean): void;
  setAccent(accent: string): void;
  setMotion(motion: SceneMotion): void;
  dispose(): void;
}

const FRAME_INTERVAL_MS = 1000 / 30;
const IDLE_MS = 8000;
const STILL_TIME = 2.4;

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Radial ripple shared by the position and normal code; must match on both. */
const RIPPLE_GLSL = /* glsl */ `
  uniform float uTime;
  vec3 unmuteRipple(vec3 p) {
    float wave = 0.11 * sin(p.x * 2.2 + uTime * 0.9) * sin(p.y * 2.6 + uTime * 1.1) * sin(p.z * 2.0 + uTime * 0.7)
               + 0.03 * sin(p.x * 3.4 - uTime * 1.1 + p.y * 2.6);
    return p * (1.0 + wave);
  }
`;

export function createSpatialScene(canvas: HTMLCanvasElement, options: SpatialSceneOptions): SpatialSceneHandle {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const dpr = window.devicePixelRatio || 1;
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: dpr < 2 && !small,
    powerPreference: 'low-power',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(dpr, small ? 1 : 1.25));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const world = new Group();
  scene.add(world);

  // --- Liquid chrome blob: displaced on the GPU ---
  const uniforms = { uTime: { value: STILL_TIME } };
  const segments = small ? 64 : 112;
  const chrome = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    metalness: 1,
    roughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 820],
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  });
  chrome.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${RIPPLE_GLSL}`)
      // Normal of the displaced surface, from two nearby displaced points (finite differences).
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 objectNormal = normalize(normal);
         vec3 rippleT = normalize(cross(objectNormal, abs(objectNormal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
         vec3 rippleB = cross(objectNormal, rippleT);
         vec3 rippleP0 = unmuteRipple(position);
         vec3 rippleP1 = unmuteRipple(position + rippleT * 0.01);
         vec3 rippleP2 = unmuteRipple(position + rippleB * 0.01);
         objectNormal = normalize(cross(rippleP1 - rippleP0, rippleP2 - rippleP0));
         #ifdef USE_TANGENT
           vec3 objectTangent = vec3(tangent.xyz);
         #endif`
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = unmuteRipple(position);');
  };
  const blob = new Mesh(new SphereGeometry(1.35, segments, segments), chrome);
  world.add(blob);

  // --- Chrome ring (single pass; a transmissive "glass" ring would render the scene twice) ---
  const ringMaterial = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    metalness: 0.9,
    roughness: 0.08,
    iridescence: 0.6,
    clearcoat: 1,
    envMapIntensity: 1.3,
  });
  const ring = new Mesh(new TorusGeometry(2.25, 0.035, 16, small ? 120 : 180), ringMaterial);
  ring.rotation.set(1.2, 0.25, 0.3);
  world.add(ring);

  // --- Orbiting chrome satellites ---
  const satellites: Mesh[] = [];
  const satelliteMaterial = new MeshPhysicalMaterial({ color: '#ffffff', metalness: 1, roughness: 0.15, envMapIntensity: 1.3 });
  for (const size of [0.18, 0.11, 0.08]) {
    const s = new Mesh(new SphereGeometry(size, 24, 24), satelliteMaterial);
    satellites.push(s);
    world.add(s);
  }

  // --- Motes of light ---
  const moteCount = small ? 110 : 240;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 16;
    motePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const moteGeometry = new BufferGeometry();
  moteGeometry.setAttribute('position', new BufferAttribute(motePositions, 3));
  const moteMaterial = new PointsMaterial({ size: 0.035, transparent: true, depthWrite: false });
  const motes = new Points(moteGeometry, moteMaterial);
  scene.add(motes);

  let dark = options.dark;
  let accent = new Color(options.accent);
  let motion = options.motion;

  // The accent reads as coloured light caught in the chrome, not as paint.
  function applyTheme() {
    const white = new Color('#ffffff');
    chrome.color = white.clone().lerp(accent, 0.22);
    ringMaterial.color = white.clone().lerp(accent, 0.12);
    satelliteMaterial.color = white.clone().lerp(accent, 0.3);
    renderer.toneMappingExposure = dark ? 0.95 : 1.15;
    moteMaterial.color = dark ? white.clone().lerp(accent, 0.55) : accent.clone();
    moteMaterial.opacity = dark ? 0.8 : 0.5;
    moteMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    moteMaterial.needsUpdate = true;
  }
  applyTheme();

  // --- Animation clock: advances only while animating, so motion resumes where it paused ---
  let time = STILL_TIME;
  let lastTick = 0;
  let lastInput = performance.now();
  let frame = 0;
  let running = false;
  const pointer = new Vector2();

  function renderAt(t: number) {
    uniforms.uTime.value = t;
    blob.rotation.set(t * 0.08, t * 0.12, 0);
    ring.rotation.z = 0.3 + t * 0.15;
    ring.rotation.x = 1.2 + Math.sin(t * 0.3) * 0.08;
    satellites.forEach((s, i) => {
      const r = 2.25 + i * 0.35;
      const a = t * (0.35 - i * 0.07) + i * 2.1;
      s.position.set(Math.cos(a) * r, Math.sin(a * 1.3) * 0.5, Math.sin(a) * r * 0.45);
    });
    motes.rotation.y = t * 0.012;
    motes.position.y = Math.sin(t * 0.2) * 0.15;
    camera.position.x += (pointer.x * 0.45 - camera.position.x) * 0.06;
    camera.position.y += (-pointer.y * 0.3 - camera.position.y) * 0.06;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  /** One frame now, without starting the loop (resize, theme change, still mode). */
  function requestRender() {
    if (!running) renderAt(time);
  }

  // Hero: above the headline in the left column. Ambient: tucked into the top-right corner.
  function layout() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const narrow = width < 768;
    const aspect = width / height;
    if (options.mode === 'hero') {
      world.position.set(narrow ? 0.4 : -aspect * 1.45, narrow ? 2.6 : 1.15, 0);
      world.scale.setScalar(narrow ? 0.5 : 0.78);
    } else {
      world.position.set(narrow ? 1.75 : aspect * 2.05, narrow ? 3.55 : 2.35, -3);
      world.scale.setScalar(narrow ? 0.55 : 0.9);
    }
    requestRender();
  }

  function loop(now: number) {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    const elapsed = now - lastTick;
    if (elapsed < FRAME_INTERVAL_MS) return;
    // Clamp so a long gap (e.g. after waking) never makes the scene jump.
    time += Math.min(elapsed, 100) / 1000;
    lastTick = now;
    renderAt(time);
    if (now - lastInput > IDLE_MS) stop();
  }

  function canAnimate() {
    return motion === 'animate' && !document.hidden && document.hasFocus();
  }

  function start() {
    if (running || !canAnimate()) return;
    running = true;
    lastTick = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  /** Any sign of the person using the app keeps (or brings) the scene alive for a while. */
  const wake = () => {
    lastInput = performance.now();
    start();
  };
  const onPointer = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    wake();
  };
  const onVisibility = () => (document.hidden ? stop() : wake());
  const onBlur = () => stop();

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('keydown', wake, { passive: true });
  window.addEventListener('focus', wake);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(canvas);
  layout();
  wake();

  return {
    setDark(value: boolean) {
      dark = value;
      applyTheme();
      requestRender();
    },
    setAccent(value: string) {
      accent = new Color(value);
      applyTheme();
      requestRender();
    },
    setMotion(value: SceneMotion) {
      motion = value;
      if (motion === 'still') {
        stop();
        requestRender();
      } else {
        wake();
      }
    },
    dispose() {
      stop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as MeshPhysicalMaterial | MeshPhysicalMaterial[] | undefined;
        (Array.isArray(material) ? material : material ? [material] : []).forEach((m) => m.dispose());
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
