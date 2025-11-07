"use client";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import StarsBackground from "@/components/Stars";
import { useEffect, useMemo, useState } from "react";
import BootScreen from "@/components/BootScreen";

export default function Home() {
  const { user, loading } = useAuth();
  // Render boot screen on initial SSR to avoid hydration mismatch, then decide on mount.
  const [showBoot, setShowBoot] = useState<boolean>(true);
  const lines = useMemo(
    () => [
      "Create scroll‑stopping captions in seconds.",
      "Turn topics into hooks, scripts, and CTAs.",
      "Brainstorm 10 fresh ideas on demand.",
    ],
    []
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    // Decide visibility on the client using sessionStorage
    try {
      const seen = sessionStorage.getItem("contenta:bootSeen");
      if (seen) {
        // Already seen this session: hide immediately
        setShowBoot(false);
      } else {
        // First time this session: show for 3s, then mark seen
        const t = setTimeout(() => {
          setShowBoot(false);
          try { sessionStorage.setItem("contenta:bootSeen", "1"); } catch {}
        }, 3000);
        return () => clearTimeout(t);
      }
    } catch {
      // If sessionStorage not available, fail gracefully: hide after 3s
      const t = setTimeout(() => setShowBoot(false), 3000);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add("show");
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2600);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="min-h-screen flex flex-col bg-black text-white" style={{ fontFamily: "var(--font-dot), monospace" }}>
      {showBoot && <BootScreen />}
      <StarsBackground />
      <div className="relative z-10">
        <NavBar />
      </div>
      <main className="flex-1 relative z-10">
        {/* Hero (centered) */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="reveal" data-reveal>
            <h1 className="text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-dot)" }}>Contenta</h1>
            <div className="mt-4 text-zinc-300 cycle-holder hero-sub" aria-live="polite">
              <div key={idx} className="hero-glitch">
                {[...Array(8)].map((_,i)=>(
                  <div key={i} className="gline">{lines[idx]}</div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              {loading ? (
                <span className="text-sm text-zinc-400">Checking session…</span>
              ) : user ? (
                <Link href="/dashboard" className="px-5 py-2.5 rounded-md bg-white text-black btn-dot hover:bg-white/90 transition mx-auto">Go to dashboard</Link>
              ) : (
                <>
                  <Link href="/signup" className="px-5 py-2.5 rounded-md bg-white text-black btn-dot hover:bg-white/90 transition">Get started</Link>
                  <Link href="/signin" className="px-5 py-2.5 rounded-md border border-white/30 btn-dot hover:border-white/60 transition">Sign in</Link>
                </>
              )}
            </div>
            <div className="mt-10 grid md:grid-cols-2 gap-4 text-sm text-zinc-300">
              <div className="card-dark p-4 card-hover reveal" data-reveal>
                <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Script/Captions</h3>
                <p className="mt-1">Short captions for IG/X/TikTok and video scripts with hook, body, CTA.</p>
              </div>
              <div className="card-dark p-4 card-hover reveal" data-reveal>
                <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Ideas</h3>
                <p className="mt-1">Brainstorm 5–10 content ideas by platform and tone.</p>
              </div>
              <div className="card-dark p-4 card-hover reveal" data-reveal>
                <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Enhance</h3>
                <p className="mt-1">Improve grammar, tone, and clarity with multiple variants.</p>
              </div>
              <div className="card-dark p-4 card-hover reveal" data-reveal>
                <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Image Assist</h3>
                <p className="mt-1">Upload an image to get caption ideas and prompts.</p>
              </div>
            </div>
          </div>
        </section>
        <div className="divider mx-auto max-w-7xl" />
        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>How it works</h2>
          <ol className="mt-6 grid md:grid-cols-3 gap-4 text-zinc-300">
            <li className="card-dark p-4 card-hover reveal" data-reveal>
              <span className="text-sm uppercase tracking-wide">1. Input</span>
              <p className="mt-1">Type a topic or paste text. Optionally upload an image.</p>
            </li>
            <li className="card-dark p-4 card-hover reveal" data-reveal>
              <span className="text-sm uppercase tracking-wide">2. Generate</span>
              <p className="mt-1">Gemini suggests captions, scripts, ideas, or enhancements.</p>
            </li>
            <li className="card-dark p-4 card-hover reveal" data-reveal>
              <span className="text-sm uppercase tracking-wide">3. Export</span>
              <p className="mt-1">Copy or download as TXT/MD, star favorites, and revisit history.</p>
            </li>
          </ol>
        </section>
        <div className="divider mx-auto max-w-7xl" />
        {/* Why Contenta */}
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Why creators choose Contenta</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4 text-zinc-300">
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Fast, Clean Outputs</h3>
              <p className="mt-1">No messy markdown—readable captions, scripts, and ideas ready to copy or download.</p>
            </div>
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Auth + Profiles</h3>
              <p className="mt-1">Keep your favorites and history tied to your account with lightweight profiles.</p>
            </div>
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Image‑Aware Ideas</h3>
              <p className="mt-1">Upload an image and get fitting captions and content prompts.</p>
            </div>
          </div>
        </section>
        <div className="divider mx-auto max-w-7xl" />
        {/* Use Cases */}
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Use cases</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4 text-zinc-300">
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Social captions</h3>
              <p className="mt-1">Quick, on-brand captions for Instagram, X, TikTok, and more.</p>
            </div>
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Video hooks</h3>
              <p className="mt-1">High-retention hooks and CTAs for shorts and reels.</p>
            </div>
            <div className="card-dark p-4 card-hover reveal" data-reveal>
              <h3 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>Brainstorming</h3>
              <p className="mt-1">Kickstart your content calendar in minutes.</p>
            </div>
          </div>
        </section>
        <div className="divider mx-auto max-w-7xl" />
        {/* Call to action */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center reveal" data-reveal>
          <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Create faster. Create better.</h2>
          <p className="mt-3 text-zinc-300">Start with a topic, and let Contenta do the heavy lifting. You control tone, platform, and output.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="px-5 py-2.5 rounded-md bg-white text-black btn-dot hover:bg-white/90 transition">Open dashboard</Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-md border border-white/30 btn-dot hover:border-white/60 transition">Create account</Link>
          </div>
        </section>
        <div className="divider mx-auto max-w-7xl" />
        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-zinc-400 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Contenta</span>
            <span>Built with Next.js + Tailwind + Firebase + Gemini</span>
          </div>
        </footer>
      </main>
    </div>
  );
}


