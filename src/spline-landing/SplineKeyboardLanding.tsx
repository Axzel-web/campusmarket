import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Application } from '@splinetool/runtime';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './spline-landing.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Your Spline + GSAP keyboard landing (HTML/CSS/JS preserved; JSX + lifecycle + scoped CSS only).
 */
export function SplineKeyboardLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [landingEntered, setLandingEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLandingEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const canvas = root.querySelector<HTMLCanvasElement>('#canvas3d');
    if (!canvas) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let splineApp: Application | null = null;
    let pressKeyCancelled = false;

    const ctx = gsap.context(() => {
      const app = new Application(canvas);
      splineApp = app;

      app
        .load('https://prod.spline.design/ZZOWNi4tS7p8xxOs/scene.splinecode')
        .then(() => {
          const keyboard = app.findObjectByName('keyboard');
          if (!keyboard) return;

          let rotationProgress = 0;

          gsap.set(keyboard.scale, { x: 1, y: 1, z: 1 });
          gsap.set(keyboard.position, { x: 110, y: 50 });

          const rotateKeyboard = gsap.to(keyboard.rotation, {
            y: Math.PI * 2 + keyboard.rotation.y,
            x: 0,
            z: 0,
            duration: 10,
            repeat: -1,
            ease: 'none',
          });

          gsap
            .timeline({
              scrollTrigger: {
                trigger: '#part1',
                start: 'top 60%',
                end: 'bottom bottom',
                scrub: true,
                onEnter: () => {
                  rotationProgress = rotateKeyboard.progress();

                  interval = setInterval(() => {
                    app.emitEvent('keyDown', 'keyboard');
                  }, 1500);

                  rotateKeyboard.pause();
                  gsap.to(keyboard.rotation, {
                    y: Math.PI / 12,
                    duration: 1,
                  });
                },
                onLeaveBack: () => {
                  const newProgress = keyboard.rotation.y / (Math.PI * 2);
                  rotateKeyboard.progress(newProgress).resume();
                  if (interval) clearInterval(interval);
                },
              },
            })
            .to(keyboard.rotation, { x: -Math.PI / 14, z: Math.PI / 36 }, 0)
            .to(keyboard.position, { x: -500, y: -200 }, 0)
            .to(keyboard.scale, { x: 3, y: 3, z: 3 }, 0);

          gsap
            .timeline({
              onComplete: () => {
                if (interval) clearInterval(interval);
                app.emitEvent('mouseDown', 'keyboard');
              },
              scrollTrigger: {
                trigger: '#part2',
                start: 'top bottom',
                end: 'center bottom',
                scrub: true,
              },
            })
            .to(keyboard.rotation, { x: Math.PI / 36, y: -Math.PI / 10 }, 0)
            .to(keyboard.position, { x: 150, y: 50 }, 0)
            .to(keyboard.scale, { x: 0.8, y: 0.8, z: 0.8 }, 0);

          gsap
            .timeline({
              scrollTrigger: {
                trigger: '#part3',
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true,
              },
            })
            .to(keyboard.position, { x: 0, y: 0 }, 0);
        })
        .catch((e) => console.error('Spline load error:', e));

      function animateBar(triggerElement: string, onEnterWidth: string, onLeaveBackWidth: string) {
        gsap.to('.spline-landing-root .bar', {
          scrollTrigger: {
            trigger: triggerElement,
            start: 'top center',
            end: 'bottom bottom',
            scrub: true,
            onEnter: () => {
              gsap.to('.spline-landing-root .bar', {
                width: onEnterWidth,
                duration: 0.2,
                ease: 'none',
              });
            },
            onLeaveBack: () => {
              gsap.to('.spline-landing-root .bar', {
                width: onLeaveBackWidth,
                duration: 0.2,
                ease: 'none',
              });
            },
          },
        });
      }

      animateBar('#part1', '35%', '0%');
      animateBar('#part2', '65%', '35%');
      animateBar('#part3', '100%', '65%');

      const keys = root.querySelectorAll('.key');

      function pressRandomKey() {
        if (pressKeyCancelled || keys.length === 0) return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)] as HTMLElement;

        randomKey.style.animation = 'spline-landing-pressDown 0.2s ease-in-out';

        randomKey.onanimationend = () => {
          randomKey.style.animation = '';
          if (!pressKeyCancelled) {
            setTimeout(pressRandomKey, 100 + Math.random() * 300);
          }
        };
      }

      pressRandomKey();
    }, root);

    return () => {
      pressKeyCancelled = true;
      if (interval) clearInterval(interval);
      ctx.revert();
      splineApp?.dispose();
    };
  }, []);

  return (
    <div ref={rootRef} className={`spline-landing-root${landingEntered ? ' spline-landing-root--entered' : ''}`}>
      {/* note: it might take a (little) while for Spline to load. */}
      <header className="spline-nav">
        <div className="spline-nav-inner">
          <div className="nav-brand">
            {/*  made-up logo  */}
            <svg width="85" height="29" viewBox="0 0 85 29" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="0.111538" y="0.111538" width="84.1" height="28.7769" rx="1.67308" stroke="#065f46" strokeOpacity="0.2" strokeWidth="0.223077" />
              <rect x="1.56152" y="1.56154" width="25.8769" height="25.8769" rx="12.9385" fill="white" />
              <rect x="1.67306" y="1.67308" width="25.6538" height="25.6538" rx="12.8269" stroke="#065f46" strokeOpacity="0.15" strokeWidth="0.223077" />
              <rect x="29.2231" y="1.56154" width="25.8769" height="25.8769" rx="5.35385" fill="white" />
              <rect x="29.3346" y="1.67308" width="25.6538" height="25.6538" rx="5.24231" stroke="#065f46" strokeOpacity="0.15" strokeWidth="0.223077" />
              <rect x="56.8846" y="1.56154" width="25.8769" height="25.8769" rx="0.892308" fill="white" />
              <rect x="56.9962" y="1.67308" width="25.6538" height="25.6538" rx="0.780769" stroke="#065f46" strokeOpacity="0.15" strokeWidth="0.223077" />
              <rect x="12.9385" y="18.9615" width="2.9" height="5.13077" rx="1.45" fill="#059669" />
              <rect x="13.05" y="19.0731" width="2.67692" height="4.90769" rx="1.33846" stroke="#065f46" strokeOpacity="0.2" strokeWidth="0.223077" />
            </svg>
            <span className="nav-wordmark">CampusMarket</span>
          </div>
          <span className="nav-pill">Plsp University • peer marketplace</span>
        </div>
      </header>

      <div className="bar" />

      <div className="canvas-cont">
        <canvas id="canvas3d" />
      </div>

      <div id="hero">
        <div className="hero-copy">
          <h1>
            YOUR
            <br />
            CAMPUS.
            <br />
            <div className="keyboard">
              <span className="key">B</span>
              <span className="key">U</span>
              <span className="key">Y</span>
              <span className="key">&amp;</span>
              <span className="key">S</span>
              <span className="key">E</span>
              <span className="key">L</span>
              <span className="key">L</span>
            </div>
          </h1>
          <p className="hero-tagline">
            Textbooks, tech, dorm gear—list what you don&apos;t need and buy what you do. Built for students who shop on
            campus and sell without the hassle.
          </p>
        </div>
        <div className="hero-scroll">
          <div className="scroll-icon">
            <div className="scroll" />
          </div>
          <span>Scroll</span>
        </div>
      </div>

      <div id="part1">
        <div className="part-spacer" aria-hidden="true" />
        <article className="landing-card">
          <div>
            <p className="section-eyebrow">For buyers</p>
            <h2>Find deals on campus.</h2>
          </div>
          <p>
            Browse textbooks, gadgets, and dorm essentials from other students—save money and meet up right on
            campus.
          </p>
          <Link to="/login" className="part-link-btn">
            Browse listings
            <span aria-hidden> →</span>
          </Link>
        </article>
      </div>

      <div id="part2">
        <article className="landing-card">
          <div>
            <p className="section-eyebrow">For students who sell</p>
            <h2>List it. Ship the meetup.</h2>
          </div>
          <p>
            Post what you no longer need and reach buyers at your school. CampusMarket keeps listing and chat
            straightforward so you can focus on selling—not admin.
          </p>
          <Link to="/login" className="part-link-btn">
            List an item
            <span aria-hidden> →</span>
          </Link>
        </article>
        <div className="part-spacer" aria-hidden="true" />
      </div>

      <div id="part3" className="flex column">
        <div className="landing-footer-card">
          <p className="section-eyebrow footer-eyebrow">CampusMarket</p>
          <h3>Ready to buy or sell?</h3>
          <p>
            Use the buttons above or the controls top-right to get started. Same account works whether you&apos;re
            shopping or listing.
          </p>
          <div className="footer-benefits">
            <span className="footer-chip">Verified campus flow</span>
            <span className="footer-chip">Buyer &amp; seller friendly</span>
            <span className="footer-chip">Meet on your schedule</span>
          </div>
          <div className="footer-cta-row">
            <Link to="/login" className="part-link-btn">
              Get started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
