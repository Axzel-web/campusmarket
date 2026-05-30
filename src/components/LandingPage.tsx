// LandingPage.tsx — CampusMarket cinematic scroll landing.
// A fixed full-screen 3D canvas (three.js WebGPU portal scene) sits behind
// scrolling sections. GSAP ScrollTrigger feeds a 0..1 progress ref into the
// scene to drive a cinematic camera path.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Scene3D from "./Scene3D";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const { user, loading } = useApp();
  const navigate = useNavigate();
  const progressRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/market');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
              end: "top 40%",
              scrub: 1,
            },
          },
        );
      });

      // No context needed anymore if we removed the glow layer animation
    }, containerRef);

    return () => ctx.revert();
  }, []);

  if (loading || user) return null;

  return (
    <div ref={containerRef} className="relative w-full bg-background text-white dark:text-white">
      {/* Fixed full-viewport 3D canvas — persists across all sections */}
      <div className="fixed inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <Scene3D progressRef={progressRef} />
      </div>

      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-0">
        <nav className="glass mx-auto mt-4 mb-2 flex max-w-5xl items-center justify-between rounded-full px-4 md:px-6 py-2 md:py-3">
          <span className="text-sm font-semibold tracking-tight text-white">CampusMart</span>
          <div className="hidden gap-8 md:flex">
            <a href="#browse" className="text-sm text-white/70 transition hover:text-white">Shop</a>
            <a href="#sell" className="text-sm text-white/70 transition hover:text-white">Sell</a>
            <a href="#trust" className="text-sm text-white/70 transition hover:text-white">Community</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:opacity-90"
          >
            Sign in
          </button>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div data-fade className="max-w-4xl">
            <p className="mb-4 md:mb-6 text-[10px] md:text-sm font-medium uppercase tracking-[0.3em] text-white/60">
              Fueling your hustle @ PLSP
            </p>
            <h1 className="text-4xl font-bold tracking-tightest md:text-8xl text-white drop-shadow-2xl leading-none">
              CampusMart.
            </h1>
            <p className="mt-4 md:mt-6 text-lg text-white/80 md:text-2xl drop-shadow-md">
              The digital hub for the Green and Gold economy.
            </p>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:opacity-90 shadow-xl"
              >
                Browse listings
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto glass rounded-full px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Start selling
              </button>
            </div>
          </div>
        </section>

        {/* Browse — for buyers */}
        <section id="browse" className="flex min-h-screen items-center px-6 md:px-20">
          <div data-fade className="max-w-xl">
            <p className="mb-4 text-xs md:text-sm uppercase tracking-[0.3em] text-brand-primary font-bold">For PLSP Student Buyers</p>
            <h2 className="text-4xl font-semibold tracking-tightest md:text-6xl text-white">
              Books, Snacks, Printing,<br/>and dorm gear.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/70">
              Skip the shipping wait and delivery fees. Find textbooks, student-made snacks, and 
              local services from classmates you can trust.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { k: "Essentials", v: "Books & Gear" },
                { k: "Hustles", v: "Snacks & Crafts" },
                { k: "Services", v: "Print & Help" },
              ].map((s) => (
                <div key={s.k} className="glass border-l-4 border-yellow-400 rounded-2xl p-4 text-center sm:text-left text-white">
                  <div className="text-lg font-semibold">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sell — for sellers */}
        <section id="sell" className="flex min-h-screen items-center justify-end px-6 md:px-20">
          <div data-fade className="max-w-xl text-center sm:text-right">
            <p className="mb-4 text-xs md:text-sm uppercase tracking-[0.3em] text-brand-primary font-bold">Student Entrepreneurs</p>
            <h2 className="text-4xl font-semibold tracking-tightest md:text-6xl text-white">
              List in 30 seconds.<br/>Keep your profit.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/70">
              Turn your skills or extra gear into a side hustle. Reach thousands of PLSP students 
              instantly with zero shipping hassle—just face-to-face meetups.
            </p>
            <div className="mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { k: "0%", v: "membership fee" },
                { k: "Verified", v: "Campus Badges" },
                { k: "Dashboard", v: "Track Earnings" },
              ].map((s) => (
                <div key={s.v} className="glass border-r-4 border-yellow-400 rounded-2xl p-4 text-white">
                  <div className="text-2xl md:text-3xl font-semibold">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="flex min-h-screen items-center justify-center px-6 text-center">
          <div data-fade className="max-w-3xl">
            <p className="mb-4 text-xs md:text-sm uppercase tracking-[0.3em] text-brand-primary font-bold">PLSP-Only Access</p>
            <h2 className="text-4xl font-semibold tracking-tightest md:text-7xl text-white">
              A Trusted Digital Ecosystem.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/70">
              Every user is a verified student. Meet safely in campus hallways or 
              tambayans. Zero delivery fees, zero strangers, 100% Green and Gold.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="flex min-h-screen items-center justify-center px-6 text-center">
          <div data-fade className="max-w-3xl">
            <h2 className="text-4xl font-bold tracking-tightest md:text-8xl text-white">
              Join your campus.
            </h2>
            <p className="mt-6 text-lg md:text-xl text-white/80">
              Free to join with your student email.
            </p>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto rounded-full bg-white px-8 py-4 text-sm font-medium text-black transition hover:opacity-90 shadow-2xl"
              >
                Get started
              </button>
              <button className="w-full sm:w-auto glass rounded-full px-8 py-4 text-sm font-medium text-white transition hover:bg-white/20">
                How it works
              </button>
            </div>
          </div>
        </section>

        <footer className="relative z-10 py-10 text-center text-xs text-white/40">
          © 2026 CampusMart — PLSP Campus Marketplace. Made for the community by PLSP CpE Students.
        </footer>
      </main>
    </div>
  );
}
