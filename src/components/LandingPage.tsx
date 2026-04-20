import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * LandingPage component: A faithful reconstruction of the original airplane guide landing page.
 * Integrated with the marketplace app flow.
 */
export const LandingPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // --- Mock DrawSVG since it's a paid plugin ---
    const initSVG = (selector: string) => {
      const paths = document.querySelectorAll(selector);
      paths.forEach((path: any) => {
        if (path.getTotalLength) {
          const length = path.getTotalLength();
          path.style.strokeDasharray = length;
          path.style.strokeDashoffset = length;
        }
      });
    };

    const animateSVG = (selector: string, progress: number) => {
      const paths = document.querySelectorAll(selector);
      paths.forEach((path: any) => {
        if (path.getTotalLength) {
          const length = path.getTotalLength();
          gsap.to(path, {
            strokeDashoffset: length * (1 - progress / 100),
            overwrite: true
          });
        }
      });
    };

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
          let camZ = (window.screen.width - (this.w * 1)) / 3;
          camera.position.z = camZ < 180 ? 180 : camZ;
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

      // Initial transition for the renderer
      gsap.fromTo(activeScene.renderer.domElement, { x: "50%", autoAlpha: 0 }, { duration: 1, x: "0%", autoAlpha: 1 });
      gsap.to('.scroll-cta', { opacity: 1, duration: 1 });

      // Toggle SVG visibility based on section - this fixes the overlapping lines in "Fin"
      ScrollTrigger.create({
        trigger: ".blueprint",
        start: "top bottom",
        end: "bottom top",
        onToggle: self => {
          gsap.to('.blueprint svg', { autoAlpha: self.isActive ? 1 : 0, duration: 0.3 });
        }
      });

      // SVG Animations setup
      gsap.set(plane.rotation, { y: tau * -.25 });
      gsap.set(plane.position, { x: 80, y: -32, z: -60 });

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

      // SVG Animations
      ScrollTrigger.create({
        trigger: ".length",
        scrub: true,
        start: "top bottom",
        end: "top top",
        onUpdate: (self) => animateSVG('#line-length', self.progress * 100)
      });

      ScrollTrigger.create({
        trigger: ".wingspan",
        scrub: true,
        start: "top 25%",
        end: "bottom 50%",
        onUpdate: (self) => animateSVG('#line-wingspan', self.progress * 100)
      });

      ScrollTrigger.create({
        trigger: ".phalange",
        scrub: true,
        start: "top 50%",
        end: "bottom 100%",
        onUpdate: (self) => animateSVG('#circle-phalange', self.progress * 100)
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
      initSVG('#line-length');
      initSVG('#line-wingspan');
      initSVG('#circle-phalange');
      
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
    <div className="landing-page-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        
        .landing-page-wrapper {
          --padding: 10vmin;
          --color-background: #D0CBC7;
          --color-mint: #98FFBD;
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
          color: white; /* Keep text white/mint */
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

        .landing-page-wrapper a { color: var(--color-mint); }
        .landing-page-wrapper ul { margin: 0; padding: 0; list-style: none; }
        .landing-page-wrapper li { margin-top: 10px; }

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

        .landing-content .section.dark { color: var(--color-mint); background-color: black; }
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

        .blueprint svg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          stroke: white;
          pointer-events: none;
          visibility: hidden;
          z-index: 100;
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
        .scroll-cta { font-size: var(--font-size-medium); opacity: 0; color: white; }

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
          color: white;
        }

        .landing-page-wrapper h3 {
          font-size: var(--font-size-medium);
          font-weight: 400;
          margin: 0;
          color: var(--color-mint);
        }

        .landing-page-wrapper p {
           color: white;
        }

        .end h2 { margin-bottom: 50vh; }

        /* Go to Login Button - Technical/Editorial Styling */
        .login-btn-landing {
          position: fixed;
          top: var(--padding);
          right: var(--padding);
          background: white;
          color: var(--color-mint) !important;
          padding: 1rem 2rem;
          border-radius: 9999px;
          font-weight: 700;
          text-decoration: none;
          z-index: 100;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transition: transform 0.2s, background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid var(--color-mint);
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 14px;
        }
        .login-btn-landing:hover {
          transform: translateY(-2px);
          background: var(--color-mint);
          color: white !important;
        }
        
        canvas {
          image-rendering: auto;
        }
      `}</style>

      <div className="landing-content" ref={containerRef}>
        <Link to="/login" className="login-btn-landing">
          Marketplace <span className="opacity-50">/</span> Access
        </Link>

        {/* --- Airplane Section Content --- */}
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
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <line id="line-length" x1="10" y1="80" x2="90" y2="80" strokeWidth="0.5"></line>
            <path id="line-wingspan" d="M10 50, L40 35, M60 35 L90 50" strokeWidth="0.5"></path>
            <circle id="circle-phalange" cx="60" cy="60" r="15" fill="transparent" strokeWidth="0.5"></circle>
          </svg>
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
    </div>
  );
};
