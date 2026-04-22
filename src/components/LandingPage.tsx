import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Menu, X } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'motion/react';

/**
 * LandingPage component: A faithful reconstruction of the original airplane guide landing page.
 * Integrated with the marketplace app flow.
 */
/**
 * HomeBackground component: Fractal Glass Distortion Background
 * Based on user-provided Three.js code.
 */
const HomeBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });

    renderer.setClearColor(0x000000, 0); // Transparent background for the renderer
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, window.innerWidth < 768 ? 15 : 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enabled = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = false;

    const angleLimit = Math.PI / 7;
    controls.minPolarAngle = Math.PI / 2 - angleLimit;
    controls.maxPolarAngle = Math.PI / 2 + angleLimit;

    // Add a gradient HDR background
    const hdrEquirect = new RGBELoader()
      .setPath("https://miroleon.github.io/daily-assets/")
      .load("GRADIENT_01_01_comp.hdr", function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
      });

    scene.environment = hdrEquirect;
    scene.fog = new THREE.FogExp2(0x11151c, 0.4);

    const surfaceImperfection = new THREE.TextureLoader().load(
      "https://miroleon.github.io/daily-assets/surf_imp_02.jpg"
    );
    surfaceImperfection.wrapT = THREE.RepeatWrapping;
    surfaceImperfection.wrapS = THREE.RepeatWrapping;

    const hands_mat = new THREE.MeshPhysicalMaterial({
      color: 0x606060,
      roughness: 0.2,
      metalness: 1,
      roughnessMap: surfaceImperfection,
      envMap: hdrEquirect,
      envMapIntensity: 1.5
    });

    const fbxloader = new FBXLoader();
    fbxloader.load(
      "https://miroleon.github.io/daily-assets/two_hands_01.fbx",
      function (object) {
        object.traverse(function (child) {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = hands_mat;
          }
        });
        object.position.set(0, 0, 0);
        const scalar = window.innerWidth < 768 ? 0.035 : 0.05;
        object.scale.setScalar(scalar);
        scene.add(object);
      }
    );

    // POST PROCESSING
    const renderScene = new RenderPass(scene, camera);
    const afterimagePass = new AfterimagePass();
    afterimagePass.uniforms["damp"].value = 0.9;

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(containerRef.current.clientWidth, containerRef.current.clientHeight),
      1.75,
      0.1,
      1
    );

    const displacementShader = {
      uniforms: {
        tDiffuse: { value: null },
        displacement: { value: null },
        scale: { value: 0.025 },
        tileFactor: { value: 2 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D displacement;
        uniform float scale;
        uniform float tileFactor;
        varying vec2 vUv;
        void main() {
            if (vUv.x < 0.75 && vUv.x > 0.25 && vUv.y < 0.75 && vUv.y > 0.25) {
                vec2 tiledUv = mod(vUv * tileFactor, 1.0);
                vec2 disp = texture2D(displacement, tiledUv).rg * scale;
                vec2 distUv = vUv + disp;
                gl_FragColor = texture2D(tDiffuse, distUv);
            } else {
                gl_FragColor = texture2D(tDiffuse, vUv);
            }
        }
      `
    };

    const displacementTexture = new THREE.TextureLoader().load(
      "https://raw.githubusercontent.com/miroleon/displacement_texture_freebie/main/assets/1K/jpeg/normal/ml-dpt-21-1K_normal.jpeg",
      function (texture) {
        texture.minFilter = THREE.NearestFilter;
      }
    );

    const displacementPass = new ShaderPass(displacementShader);
    displacementPass.uniforms["displacement"].value = displacementTexture;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(afterimagePass);
    composer.addPass(bloomPass);
    composer.addPass(displacementPass);

    function easeInOutCubic(x: number) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    let isUserInteracting = false;
    let transitionProgress = 0;
    const transitionTime = 2; 
    const transitionIncrement = 1 / (60 * transitionTime);
    const transitionStartCameraPosition = new THREE.Vector3();
    const transitionStartCameraQuaternion = new THREE.Quaternion();

    let theta = 0;
    const updateCamera = function () {
      theta += 0.005;

      const targetPosition = new THREE.Vector3(
        Math.sin(theta) * 3,
        Math.sin(theta),
        Math.cos(theta) * 3
      );

      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, -theta, 0)
      );

      if (isUserInteracting) {
        if (transitionProgress > 0) {
          transitionProgress = 0;
        }
        transitionStartCameraPosition.copy(camera.position);
        transitionStartCameraQuaternion.copy(camera.quaternion);
      } else {
        if (transitionProgress < 1) {
          transitionProgress += transitionIncrement;
          const easedProgress = easeInOutCubic(transitionProgress);
          camera.position.lerpVectors(
            transitionStartCameraPosition,
            targetPosition,
            easedProgress
          );
          camera.quaternion.slerpQuaternions(
            transitionStartCameraQuaternion,
            targetQuaternion,
            easedProgress
          );
        } else {
          camera.position.copy(targetPosition);
          camera.quaternion.copy(targetQuaternion);
        }
      }
      camera.lookAt(scene.position);
    };

    const onControlsStart = () => { isUserInteracting = true; };
    const onControlsEnd = () => {
      isUserInteracting = false;
      transitionStartCameraPosition.copy(camera.position);
      transitionStartCameraQuaternion.copy(camera.quaternion);
      transitionProgress = 0;
    };

    controls.addEventListener("start", onControlsStart);
    controls.addEventListener("end", onControlsEnd);

    const onResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      updateCamera();
      composer.render();
    };

    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      renderer.dispose();
      scene.clear();
      composer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#D0CBC7]/20 pointer-events-none" />
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useApp();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/market');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // --- Scene Setup ---
    class Scene {
      views: any[];
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      modelGroup: THREE.Group;
      light: THREE.PointLight;
      softLight: THREE.AmbientLight;
      w: number = window.innerWidth;
      h: number = window.innerHeight;

      constructor(model: THREE.Object3D) {
        this.views = [
          { bottom: 0, height: 1 },
          { bottom: 0, height: 0 }
        ];

        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Apply visual properties directly as in CSS
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '2';
        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.visibility = 'hidden';
        this.renderer.domElement.style.opacity = '0';
        this.renderer.domElement.className = 'three-canvas';

        if (containerRef.current) {
          containerRef.current.appendChild(this.renderer.domElement);
        }

        this.scene = new THREE.Scene();

        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
          camera.position.fromArray([0, 0, 180]);
          camera.layers.disableAll();
          camera.layers.enable(ii);
          view.camera = camera;
          camera.lookAt(new THREE.Vector3(0, 5, 0));
        }

        // Adjust light intensity for Three.js 0.180+ (normalized)
        this.light = new THREE.PointLight(0xffffff, 15); 
        this.light.position.set(70, -20, 150);
        this.scene.add(this.light);

        this.softLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(this.softLight);

        this.onResize();
        window.addEventListener('resize', this.onResize, false);

        // Robust mesh discovery
        let mesh: THREE.Mesh | null = null;
        model.traverse(child => {
          if (!mesh && child instanceof THREE.Mesh) mesh = child;
        });

        if (mesh) {
          const edges = new THREE.EdgesGeometry(mesh.geometry);
          const line = new THREE.LineSegments(edges);
          line.material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1, // Much more subtle
            depthTest: false
          });
          line.position.set(0.5, 0.2, -1);
          
          this.modelGroup = new THREE.Group();
          model.layers.set(0);
          line.layers.set(1);

          this.modelGroup.add(model);
          this.modelGroup.add(line);
          this.scene.add(this.modelGroup);
        } else {
          this.modelGroup = new THREE.Group();
          this.modelGroup.add(model);
          this.scene.add(this.modelGroup);
        }
      }

      render = () => {
        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = view.camera;

          const bottom = Math.floor(this.h * view.bottom);
          const height = Math.floor(this.h * view.height);

          this.renderer.setViewport(0, 0, this.w, this.h);
          this.renderer.setScissor(0, bottom, this.w, height);
          this.renderer.setScissorTest(true);

          camera.aspect = this.w / this.h;
          camera.updateProjectionMatrix();
          this.renderer.render(this.scene, camera);
        }
      }

      onResize = () => {
        this.w = window.innerWidth;
        this.h = window.innerHeight;

        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = view.camera;
          camera.aspect = this.w / this.h;
          
          // Better mobile scaling: pull camera back further on narrow screens
          let camZ = 180;
          if (this.w < 800) {
            camZ = 180 + (800 - this.w) * 0.5;
          }
          camera.position.z = Math.max(180, camZ);
          camera.updateProjectionMatrix();
        }

        this.renderer.setSize(this.w, this.h);
        this.render();
      }

      destroy = () => {
        window.removeEventListener('resize', this.onResize);
        if (this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
      }
    }

    let activeScene: Scene | null = null;

    const setupAnimation = (model: THREE.Object3D) => {
      activeScene = new Scene(model);
      const plane = activeScene.modelGroup;

      const tau = Math.PI * 2;

      // Airplane Visibility Control (Hidden on Home)
      gsap.set(activeScene.renderer.domElement, { autoAlpha: 0, x: "50%" });
      ScrollTrigger.create({
        trigger: ".landing-content",
        start: "top 80%",
        onEnter: () => {
          if (activeScene) {
            gsap.to(activeScene.renderer.domElement, { autoAlpha: 1, x: "0%", duration: 1 });
            gsap.to('.scroll-cta', { opacity: 1, duration: 1 });
          }
        },
        onLeaveBack: () => {
          if (activeScene) {
            gsap.to(activeScene.renderer.domElement, { autoAlpha: 0, x: "50%", duration: 0.5 });
            gsap.to('.scroll-cta', { opacity: 0, duration: 0.5 });
          }
        }
      });

      // Airplane animations setup
      const initialX = window.innerWidth < 800 ? 0 : 80;
      gsap.set(plane.rotation, { y: tau * -.25 });
      gsap.set(plane.position, { x: initialX, y: -32, z: -60 });

      activeScene.render();

      const sectionDuration = 1;

      // Split view animations
      gsap.fromTo(activeScene.views[1],
        { height: 1, bottom: 0 },
        {
          height: 0, bottom: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: ".blueprint",
            scrub: true,
            start: "bottom bottom",
            end: "bottom top",
            onUpdate: activeScene.render
          }
        });

      gsap.fromTo(activeScene.views[1],
        { height: 0, bottom: 0 },
        {
          height: 1, bottom: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: ".blueprint",
            scrub: true,
            start: "top bottom",
            end: "top top",
            onUpdate: activeScene.render
          }
        });

      // Parallax
      gsap.to('.ground', {
        y: "30%",
        scrollTrigger: {
          trigger: ".ground-container",
          scrub: true,
          start: "top bottom",
          end: "bottom top"
        }
      });

      gsap.from('.clouds', {
        y: "25%",
        scrollTrigger: {
          trigger: ".ground-container",
          scrub: true,
          start: "top bottom",
          end: "bottom top"
        }
      });

      // Core Timeline
      const tl = gsap.timeline({
        onUpdate: activeScene.render,
        scrollTrigger: {
          trigger: ".landing-content",
          scrub: true,
          start: "top top",
          end: "bottom bottom"
        },
        defaults: { duration: sectionDuration, ease: 'power2.inOut' }
      });

      let delay = 0;
      tl.to('.scroll-cta', { duration: 0.25, opacity: 0 }, delay);
      tl.to(plane.position, { x: -10, ease: 'power1.in' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * .25, y: 0, z: -tau * 0.05, ease: 'power1.inOut' }, delay);
      tl.to(plane.position, { x: -40, y: 0, z: -60, ease: 'power1.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * .25, y: 0, z: tau * 0.05, ease: 'power3.inOut' }, delay);
      tl.to(plane.position, { x: 40, y: 0, z: -60, ease: 'power2.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * .2, y: 0, z: -tau * 0.1, ease: 'power3.inOut' }, delay);
      tl.to(plane.position, { x: -40, y: 0, z: -30, ease: 'power2.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: 0, z: 0, y: tau * .25 }, delay);
      tl.to(plane.position, { x: 0, y: -10, z: 50 }, delay);

      delay += sectionDuration * 2;
      tl.to(plane.rotation, { x: tau * 0.25, y: tau * .5, z: 0, ease: 'power4.inOut' }, delay);
      tl.to(plane.position, { z: 30, ease: 'power4.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * 0.25, y: tau * .5, z: 0, ease: 'power4.inOut' }, delay);
      tl.to(plane.position, { z: 60, x: 30, ease: 'power4.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * 0.35, y: tau * .75, z: tau * 0.6, ease: 'power4.inOut' }, delay);
      tl.to(plane.position, { z: 100, x: 20, y: 0, ease: 'power4.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { x: tau * 0.15, y: tau * .85, z: -tau * 0, ease: 'power1.in' }, delay);
      tl.to(plane.position, { z: -150, x: 0, y: 0, ease: 'power1.inOut' }, delay);

      delay += sectionDuration;
      tl.to(plane.rotation, { duration: sectionDuration, x: -tau * 0.05, y: tau, z: -tau * 0.1, ease: 'none' }, delay);
      tl.to(plane.position, { duration: sectionDuration, x: 0, y: 30, z: 320, ease: 'power1.in' }, delay);

      tl.to(activeScene.light.position, { duration: sectionDuration, x: 0, y: 0, z: 0 }, delay);
    };

    const loadModel = () => {
      const loader = new OBJLoader();
      
      loader.load(
        'https://assets.codepen.io/557388/1405+Plane_1.obj', 
        (object) => {
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = new THREE.MeshPhongMaterial({
                color: 0x171511,
                specular: 0xD0CBC7,
                shininess: 5,
                flatShading: true
              });
            }
          });
          setupAnimation(object);
        },
        undefined,
        (error) => {
          console.error(error);
        }
      );
    };

    loadModel();

    return () => {
      if (activeScene) activeScene.destroy();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="landing-page-wrapper selection:bg-black selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        html {
          scroll-behavior: smooth;
        }

        .landing-page-wrapper {
          --padding: 10vmin;
          --color-background: #D0CBC7;
          --color-text: black;
          --color-text-light: white;
          --font-size-large: 8vw;
          --font-size-medium: 4vw;
          --font-size-normal: 2vw;
          margin: 0;
          min-height: 100vh;
          min-width: 100vw;
          font-family: 'Libre Baskerville', serif;
          background-color: var(--color-background);
          font-weight: 400;
          font-size: var(--font-size-normal);
          overflow-x: hidden;
          color: var(--color-text);
          position: relative;
          line-height: 1.5;
        }

        @media only screen and (min-width: 800px) {
          .landing-page-wrapper {
            --font-size-large: 64px;
            --font-size-medium: 32px;
            --font-size-normal: 16px;
          }
        }

        @media only screen and (max-width: 500px) {
          .landing-page-wrapper {
            --font-size-large: 40px;
            --font-size-medium: 20px;
            --font-size-normal: 14px;
          }
        }

        .landing-page-wrapper a { color: black; font-weight: 700; }
        .landing-page-wrapper ul { margin: 0; padding: 0; list-style: none; }
        .landing-page-wrapper li { margin-top: 10px; }

        /* Navigation */
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(208, 203, 199, 0.95);
          backdrop-filter: blur(20px);
          z-index: 2000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem var(--padding);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }

        .nav-links {
          display: flex;
          gap: 2.5rem;
        }

        @media screen and (max-width: 768px) {
          .landing-nav {
            padding: 1rem 1.5rem;
          }
          .nav-links {
            display: none;
          }
        }

        /* Mobile Menu */
        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(208, 203, 199, 0.98);
          backdrop-filter: blur(40px);
          z-index: 3000;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          gap: 2rem;
          transform: translateY(-100%);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          visibility: hidden;
        }

        .mobile-menu.open {
          transform: translateY(0);
          pointer-events: auto;
          visibility: visible;
        }

        .mobile-menu a {
          font-family: 'Inter', sans-serif;
          font-size: 2.5rem;
          text-decoration: none;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          color: black;
          opacity: 0.8;
          transition: opacity 0.3s, transform 0.3s;
        }

        .mobile-menu a:hover {
          opacity: 1;
          transform: scale(1.05);
        }

        .mobile-toggle {
          display: none;
          z-index: 3001;
          background: none;
          border: none;
          cursor: pointer;
        }

        @media screen and (max-width: 768px) {
           .mobile-toggle { display: block; }
        }

        .nav-links a {
          text-decoration: none;
          color: black;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          opacity: 0.5;
          transition: all 0.3s;
          font-family: 'Inter', sans-serif;
          position: relative;
        }

        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: black;
          transition: width 0.3s;
        }

        .nav-links a:hover {
          opacity: 1;
        }
        
        .nav-links a:hover::after {
          width: 100%;
        }

        /* New Sections */
        .main-section {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 120px var(--padding) var(--padding);
          position: relative;
          box-sizing: border-box;
          z-index: 5;
        }

        .section-tag {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.3em;
          margin-bottom: 1.5rem;
          opacity: 0.4;
          display: block;
        }

        .hero-title {
          font-size: clamp(40px, 10vw, 80px);
          line-height: 0.95;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.04em;
        }

        @media screen and (max-width: 900px) {
           .about-grid { grid-template-columns: 1fr; gap: 2rem; }
           .main-section { 
             padding: 100px 1.5rem 2rem; 
             min-height: 100vh;
             justify-content: flex-start;
           }
           .section-tag { margin-bottom: 0.5rem; margin-top: 2rem; }
        }

        @media screen and (max-width: 600px) {
          .login-btn-landing { padding: 0.5rem 0.8rem; font-size: 10px; }
          .section-tag { font-size: 10px; }
        }

        /* Existing Content Styles */
        .landing-content {
          position: relative;
          z-index: 1;
        }

        .landing-content .section {
          position: relative;
          padding: var(--padding);
          --pad2: calc(var(--padding) * 2);
          width: calc(100vw - var(--pad2));
          height: calc(100vh - var(--pad2));
          margin: 0 auto;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @media only screen and (max-width: 600px) {
          .landing-content .section {
            padding: 2rem;
            width: calc(100vw - 4rem);
            height: calc(100vh - 4rem);
          }
        }

        .landing-content .section.dark { color: white; background-color: black; }
        .landing-content .section.right { text-align: right; align-items: flex-end; }

        .blueprint {
          position: relative;
          background-color: #131C2A;
          background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, .05) 1px, transparent 1px);
          background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
          background-position: -2px -2px, -2px -2px, -1px -1px, -1px -1px;
          background-attachment: fixed;
        }

        .blueprint .dark { background-color: transparent; }

        .ground-container {
          position: relative;
          overflow: hidden;
        }

        .ground-container .parallax {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: -100px;
          background-repeat: no-repeat;
          background-position: top center;
          background-size: cover;
          transform-origin: top center;
          opacity: 0.8;
        }

        .ground { z-index: -1; background-image: url("https://assets.codepen.io/557388/background-reduced.jpg"); }
        .clouds { z-index: 2; background-image: url("https://assets.codepen.io/557388/clouds.png"); }

        .scroll-cta, .credits { position: absolute; bottom: var(--padding); }
        .scroll-cta { font-size: var(--font-size-medium); opacity: 0; color: black; }

        .sunset {
          background: url("https://assets.codepen.io/557388/sunset-reduced.jpg") no-repeat top center;
          background-size: cover;
          transform-origin: top center;
        }

        .landing-page-wrapper h1, .landing-page-wrapper h2 {
          font-size: var(--font-size-large);
          margin: 0vmin 0 2vmin 0;
          font-weight: 700;
          display: inline;
          line-height: 1.1;
          color: inherit;
        }

        .landing-page-wrapper h3 {
          font-size: var(--font-size-medium);
          font-weight: 400;
          margin: 0;
          opacity: 0.7;
        }

        .landing-page-wrapper p {
           color: inherit;
        }

        .end h2 { margin-bottom: 50vh; }

        .login-btn-landing {
          background: white;
          color: black !important;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-weight: 700;
          text-decoration: none;
          z-index: 100;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
          transition: transform 0.2s, background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(0,0,0,0.2);
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 10px;
          white-space: nowrap;
        }

        .login-btn-landing:hover {
          transform: translateY(-2px);
          background: black;
          color: white !important;
        }
        
        canvas {
          image-rendering: auto;
        }
      `}</style>

      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
        <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
        <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>Process</a>
        <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
      </div>

      {/* NAVIGATION BAR */}
      <nav className="landing-nav">
        <Link to="/" className="text-base font-black tracking-tighter" style={{ textDecoration: 'none' }}>CAMPUSMARKET.</Link>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#contact">Contact</a>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/login" className="login-btn-landing flex">
            Get Started
          </Link>
          <button className="mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* HOME SECTION */}
      <section id="home" className="main-section relative overflow-hidden">
         <HomeBackground />
         <motion.div 
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
         >
            <span className="section-tag">University Marketplace</span>
            <h1 className="hero-title select-none">Buy Secure.<br/>Sell Simple.</h1>
            <div className="mt-12 max-w-xl">
               <p className="text-lg opacity-60 italic">The exclusive digital hub for student exchanges. Built for high-trust transactions within your campus neighborhood.</p>
            </div>
            <div className="mt-12 flex gap-6">
               <a href="#how-it-works" className="text-xs font-black uppercase tracking-[0.2em] underline underline-offset-8">Explore Journey</a>
            </div>
         </motion.div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="main-section bg-[#c5c0bc]">
         <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
         >
            <span className="section-tag">The Story</span>
            <h2 className="text-5xl font-bold tracking-tight">Built by students,<br/>for the community.</h2>
         </motion.div>
         
         <div className="about-grid">
            <motion.div 
               className="space-y-6"
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.2 }}
            >
               <p className="text-lg leading-relaxed">CampusMarket was founded with a singular purpose: to eliminate the friction in university second-hand commerce. We saw students struggling with shipping fees and shady meetups, so we built something better.</p>
            </motion.div>
            <motion.div 
               className="space-y-6"
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.3 }}
            >
               <p className="text-lg leading-relaxed">By restricting access to verified university emails, we ensure every person you meet is a peer. It's a high-trust, low-impact way to keep gear in use and money in student pockets.</p>
            </motion.div>
         </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="main-section">
         <motion.span 
            className="section-tag"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
         >
            Capabilities
         </motion.span>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-12">
            {[
               {
                  title: "Zero Friction",
                  desc: "No packing tape, no post office. Just walk to the student union and exchange items between classes."
               },
               {
                  title: "AI Listings",
                  desc: "Our Gemini integration crafts expert descriptions from a few words. Listing an item takes under 30 seconds."
               },
               {
                  title: "Verified ID",
                  desc: "Every user is authenticated against university records. Safety isn't optional—it's built in."
               }
            ].map((feature, i) => (
               <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
               >
                  <h3 className="text-3xl font-bold italic mb-4">{feature.title}</h3>
                  <p className="opacity-60 text-sm">{feature.desc}</p>
               </motion.div>
            ))}
         </div>
      </section>

      {/* HOW IT WORKS SECTION (WRAPPED EXISTING CONTENT) */}
      <section id="how-it-works" className="w-full">
         <div className="landing-content" ref={containerRef}>
            {/* The airplane/three.js interaction content (UNCHANGED IN STRUCTURE) */}
            <div className="trigger"></div>
            <div className="section">
              <h1>Marketplace.</h1>
              <h3>The campus guide.</h3>
              <p>Everything you need, right where you live.</p>
              <div className="scroll-cta">Scroll</div>
            </div>

            <div className="section right">
              <h2>It's kinda like a mall...</h2>
            </div>

            <div className="ground-container">
              <div className="parallax ground"></div>
              <div className="section right">
                <h2>..except it's built for students.</h2>
                <p>No more shipping fees.</p>
              </div>

              <div className="section">
                <h2>Buy and sell locally.</h2>
                <p>Exchange between classes.</p>
              </div>

              <div className="section right">
                <h2>Safe and verified.</h2>
                <p>Student community only.</p>
              </div>
              <div className="parallax clouds"></div>
            </div>

            <div className="blueprint">
              <div className="section dark ">
                <h2>Stats and Savings.</h2>
                <p>The marketplace by the numbers...</p>
              </div>
              <div className="section dark length">
                <h2>Reach.</h2>
                <p>Hundreds of listings.</p>
              </div>
              <div className="section dark wingspan">
                <h2>Speed.</h2>
                <p>Instant chat and pickup.</p>
              </div>
              <div className="section dark phalange">
                <h2>Trust.</h2>
                <p>Verified Student IDs.</p>
              </div>
              <div className="section dark">
                <h2>Cycle.</h2>
                <p>Sustainable student reuse.</p>
              </div>
            </div>
            
            <div className="sunset">
              <div className="section"></div>
              <div className="section end">
                <h2>Start.</h2>
                <ul className="credits">
                  <li className="mt-4">Welcome to the inner circle</li>
                  <li>Campus Market © 2026</li>
                </ul>
              </div>
            </div>
         </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="main-section bg-black text-white h-auto min-h-[60vh] py-32 overflow-hidden">
          <div className="relative z-10">
             <span className="section-tag opacity-30 text-white">Reach Out</span>
             <h2 className="text-6xl font-bold mb-16 tracking-tighter">Connect with the campus community.</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-24 font-sans uppercase tracking-[0.2em] text-xs font-black">
                <div>
                   <p className="opacity-40 mb-4">Email Support</p>
                   <p className="text-lg tracking-normal normal-case font-serif italic text-white/80">support@campusmarket.edu</p>
                </div>
                <div>
                   <p className="opacity-40 mb-4">University Relations</p>
                   <p className="text-lg tracking-normal normal-case font-serif italic text-white/80">admin@campusmarket.edu</p>
                </div>
             </div>
             <div className="mt-40 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40 text-[10px] uppercase tracking-widest font-sans">
                <p>Campus Market &copy; 2026 All Rights Reserved</p>
                <div className="flex gap-8">
                   <a href="#" className="text-white hover:text-brand-primary transition-colors">Privacy Policy</a>
                   <a href="#" className="text-white hover:text-brand-primary transition-colors">Terms of Service</a>
                </div>
             </div>
          </div>
      </section>
    </div>
  );
};
