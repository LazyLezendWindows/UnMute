import {
  AdditiveBlending,
  NormalBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The app's live 3D backdrop: a liquid-chrome blob with iridescent reflections, a floating glass
 * ring, small orbiting chrome spheres and drifting motes of light. Rendered on a transparent canvas
 * behind the glass UI. Kept framework-free so it can be lazy-loaded as its own chunk.
 */

export type SceneMode = 'ambient' | 'hero';

export interface SpatialSceneOptions {
  mode: SceneMode;
  dark: boolean;
  /** Accent colour (hex); tints the chrome and the motes of light. */
  accent: string;
  /** Render one still frame and never animate. */
  still: boolean;
}

export interface SpatialSceneHandle {
  setDark(dark: boolean): void;
  setAccent(accent: string): void;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createSpatialScene(canvas: HTMLCanvasElement, options: SpatialSceneOptions): SpatialSceneHandle {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6));
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

  // --- Liquid chrome blob: a sphere whose vertices ripple with layered sine "noise" ---
  const segments = small ? 56 : 88;
  const blobGeometry = new SphereGeometry(1.35, segments, segments);
  const basePositions = (blobGeometry.attributes.position.array as Float32Array).slice();
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
  const blob = new Mesh(blobGeometry, chrome);
  world.add(blob);

  // --- Glass ring ---
  const ring = new Mesh(
    new TorusGeometry(2.25, 0.045, 24, 220),
    new MeshPhysicalMaterial({
      color: new Color('#ffffff'),
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      thickness: 0.5,
      ior: 1.45,
      clearcoat: 1,
      envMapIntensity: 1.4,
    })
  );
  ring.rotation.set(1.2, 0.25, 0.3);
  world.add(ring);

  // --- Orbiting chrome satellites ---
  const satellites: Mesh[] = [];
  const satelliteMaterial = new MeshPhysicalMaterial({ color: '#ffffff', metalness: 1, roughness: 0.15, envMapIntensity: 1.3 });
  for (const size of [0.18, 0.11, 0.08]) {
    const s = new Mesh(new SphereGeometry(size, 32, 32), satelliteMaterial);
    satellites.push(s);
    world.add(s);
  }

  // --- Motes of light ---
  const moteCount = small ? 140 : 320;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 16;
    motePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const moteGeometry = new BufferGeometry();
  moteGeometry.setAttribute('position', new BufferAttribute(motePositions, 3));
  const moteMaterial = new PointsMaterial({
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const motes = new Points(moteGeometry, moteMaterial);
  scene.add(motes);

  let dark = options.dark;
  let accent = new Color(options.accent);

  // The accent reads as coloured light caught in the chrome, not as paint: a light tint on the
  // metal, and the motes glow in the accent colour.
  function applyTheme() {
    const white = new Color('#ffffff');
    chrome.color = white.clone().lerp(accent, 0.22);
    satelliteMaterial.color = white.clone().lerp(accent, 0.3);
    renderer.toneMappingExposure = dark ? 0.95 : 1.15;
    moteMaterial.color = dark ? white.clone().lerp(accent, 0.55) : accent.clone();
    moteMaterial.opacity = dark ? 0.8 : 0.5;
    moteMaterial.blending = dark ? AdditiveBlending : NormalBlending;
    moteMaterial.needsUpdate = true;
  }
  applyTheme();

  // Composition: off to the upper right behind content, or centred as a hero object.
  function layout() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const narrow = width < 768;
    // Hero: above the headline in the left column. Ambient: tucked into the top-right corner,
    // mostly outside the content column so it never competes with text.
    const aspect = width / height;
    if (options.mode === 'hero') {
      world.position.set(narrow ? 0.4 : -aspect * 1.45, narrow ? 2.6 : 1.15, 0);
      world.scale.setScalar(narrow ? 0.5 : 0.78);
    } else {
      world.position.set(narrow ? 1.75 : aspect * 2.05, narrow ? 3.55 : 2.35, -3);
      world.scale.setScalar(narrow ? 0.55 : 0.9);
    }
  }
  layout();
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(canvas);

  // Pointer parallax (desktop): the camera drifts slightly toward the pointer.
  const pointer = new Vector3();
  const onPointer = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2, 0);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const clock = new Clock();
  let frame = 0;
  let running = false;

  function deform(t: number) {
    const pos = blobGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = basePositions[i];
      const y = basePositions[i + 1];
      const z = basePositions[i + 2];
      const wave =
        0.11 * Math.sin(x * 2.2 + t * 0.9) * Math.sin(y * 2.6 + t * 1.1) * Math.sin(z * 2.0 + t * 0.7) +
        0.03 * Math.sin(x * 3.4 - t * 1.1 + y * 2.6);
      const k = 1 + wave;
      pos[i] = x * k;
      pos[i + 1] = y * k;
      pos[i + 2] = z * k;
    }
    blobGeometry.attributes.position.needsUpdate = true;
    blobGeometry.computeVertexNormals();
  }

  let lastDeform = -1;

  function renderAt(t: number) {
    // The ripple is slow, so recomputing the mesh at ~30 fps is indistinguishable and halves the CPU cost.
    if (t - lastDeform >= 1 / 30 || lastDeform < 0) {
      deform(t);
      lastDeform = t;
    }
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
    camera.position.x += (pointer.x * 0.45 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    renderAt(clock.getElapsedTime());
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (options.still || running) return;
    running = true;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  // Never burn battery in a background tab.
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  if (options.still) {
    renderAt(2.4);
  } else {
    start();
  }

  return {
    setDark(value: boolean) {
      dark = value;
      applyTheme();
      if (options.still) renderAt(2.4);
    },
    setAccent(value: string) {
      accent = new Color(value);
      applyTheme();
      if (options.still) renderAt(2.4);
    },
    dispose() {
      stop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
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
