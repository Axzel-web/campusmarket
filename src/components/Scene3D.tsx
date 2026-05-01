import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three/webgpu";
import {
  pass,
  color,
  mx_worley_noise_float,
  time,
  screenUV,
  vec2,
  uv,
  normalWorld,
  mx_fractal_noise_vec3,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Timer } from "three/addons/misc/Timer.js";

type ProgressRef = MutableRefObject<number>;

type SceneProps = {
  progressRef: ProgressRef;
  wireframe?: boolean;
  solidBg?: boolean;
  onReady?: () => void;
  onError?: (err: string) => void;
};

// Xbot model from the official three.js examples repo (CORS-enabled CDN)
const XBOT_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/r184/examples/models/gltf/Xbot.glb";

export default function Scene3D({
  progressRef,
  solidBg,
  onReady,
  onError,
}: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let renderer: THREE.WebGPURenderer | null = null;
    let raf = 0;
    const mixers: THREE.AnimationMixer[] = [];

    async function init() {
      // Hard guard: if WebGPU isn't available, surface a friendly message
      // (the sandbox preview iframe has no GPU adapter).
      const nav = navigator as Navigator & { gpu?: unknown };
      if (typeof navigator === "undefined" || !nav.gpu) {
        const msg = "WebGPU not available in this browser.";
        setUnsupported(msg);
        onError?.(msg);
        return;
      }

      const width = container!.clientWidth || window.innerWidth;
      const height = container!.clientHeight || window.innerHeight;

      // ---- Scenes ----
      const sceneMain = new THREE.Scene();
      if (solidBg) {
        sceneMain.background = new THREE.Color(0x0a0a14);
      } else {
        // Vertical gradient background using TSL normalWorld
        sceneMain.backgroundNode = normalWorld.y.mix(
          color(0xEF895F), // Onboarding Orange
          color(0xF5E8E2), // Onboarding Subtle Accent
        );
      }

      const scenePortal = new THREE.Scene();
      scenePortal.backgroundNode = mx_worley_noise_float(
        normalWorld.mul(20).add(vec2(0, time.oneMinus())),
      ).mul(color(0xEF895F));

      // ---- Camera ----
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 30);
      camera.position.set(2.5, 1, 3).multiplyScalar(0.8);
      camera.lookAt(0, 1, 0);

      const timer = new Timer();
      timer.connect(document);

      // ---- Lights ----
      const light = new THREE.PointLight(0xffffff, 1);
      light.position.set(0, 1, 5);
      light.power = 17000;

      sceneMain.add(new THREE.HemisphereLight(0xEF895F, 0xF5E8E2, 7));
      sceneMain.add(light);
      scenePortal.add(light.clone());

      // ---- Renderer ----
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        renderer = new THREE.WebGPURenderer({ 
          antialias: !isMobile, // Disable AA on mobile for performance
          alpha: !solidBg,
          powerPreference: "high-performance",
        });
        
        // On mobile, keep it sharp but avoid over-rendering
        renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 2));
      } catch (e) {
        const msg = `WebGPU init failed: ${(e as Error).message}`;
        setUnsupported(msg);
        onError?.(msg);
        return;
      }
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 0.15;

      try {
        await renderer.init();
      } catch (e) {
        const msg = `WebGPU device init failed: ${(e as Error).message}`;
        setUnsupported(msg);
        onError?.(msg);
        return;
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      container!.appendChild(renderer.domElement);
      Object.assign(renderer.domElement.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
      });

      // ---- Models ----
      const loader = new GLTFLoader();
      loader.load(
        XBOT_URL,
        (gltf) => {
          if (disposed) return;

          const createModel = (
            colorNode: any | null = null,
          ) => {
            let object: THREE.Object3D;
            if (mixers.length === 0) {
              object = gltf.scene;
            } else {
              object = gltf.scene.clone();
              const children = (object.children[0] as THREE.Object3D)
                .children as THREE.Mesh[];
              const applyFX = (index: number) => {
                const m = children[index];
                const mat = (m.material as any).clone();
                mat.colorNode = colorNode;
                mat.wireframe = true;
                m.material = mat;
              };
              applyFX(0);
              applyFX(1);
            }
            const mixer = new THREE.AnimationMixer(object);
            const action = mixer.clipAction(gltf.animations[6]);
            action.play();
            mixers.push(mixer);
            return object;
          };

          const colorNode = mx_fractal_noise_vec3(uv().mul(20).add(time));
          sceneMain.add(createModel());
          scenePortal.add(createModel(colorNode));
        },
        undefined,
        (err) => onError?.(`Model load failed: ${(err as Error).message}`),
      );

      // ---- Portal plane ----
      const geometry = new THREE.PlaneGeometry(1.7, 2);
      const material = new THREE.MeshBasicNodeMaterial();
      const mat = material as any;
      mat.colorNode = pass(scenePortal, camera).context({
        getUV: () => screenUV,
      });
      mat.opacityNode = uv().distance(0.5).remapClamp(0.3, 0.5).oneMinus();
      material.side = THREE.DoubleSide;
      material.transparent = true;

      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(0, 1, 0.8);
      sceneMain.add(plane);

      // ---- Resize ----
      let resizeTimeout: number;
      const onResize = () => {
        if (!renderer) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
          const w = container!.clientWidth || window.innerWidth;
          const h = container!.clientHeight || window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer!.setSize(w, h);
        }, 150);
      };
      window.addEventListener("resize", onResize);

      // ---- Animation loop with scroll-driven camera ----
      const target = new THREE.Vector3(0, 1, 0);
      const tmp = new THREE.Vector3();

      const animate = () => {
        if (disposed || !renderer) return;
        timer.update();
        const delta = timer.getDelta();
        for (const mixer of mixers) mixer.update(delta);

        // Cinematic orbit driven by scroll progress (0..1)
        const p = progressRef.current;
        const angle = p * Math.PI * 2;
        const radius = THREE.MathUtils.lerp(3.2, 2.0, Math.sin(p * Math.PI));
        const heightY = THREE.MathUtils.lerp(0.8, 1.8, p);
        tmp.set(Math.sin(angle) * radius, heightY, Math.cos(angle) * radius);
        camera.position.lerp(tmp, 0.06);
        camera.lookAt(target);

        renderer.render(sceneMain, camera);
        raf = requestAnimationFrame(animate);
      };

      raf = requestAnimationFrame(animate);
      onReady?.();

      // cleanup closure
      return () => {
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeTimeout);
      };
    }

    const cleanupPromise = init();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupPromise?.then?.((fn) => fn?.());
      if (renderer) {
        try {
          renderer.dispose();
        } catch {
          /* ignore */
        }
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [progressRef, solidBg, onReady, onError]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {unsupported && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="glass max-w-md rounded-2xl p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-accent mb-2">
              WebGPU required
            </p>
            <p className="text-muted-foreground text-sm">
              {unsupported} Open this page in Chrome or Edge with WebGPU
              enabled to see the live 3D portal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
