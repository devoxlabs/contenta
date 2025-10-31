"use client";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react"; // Added useCallback/useEffect for robustness
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
  const { user, signOutUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  // Close menu on route change to avoid stale overlay
  useEffect(() => { if (menuOpen) setMenuOpen(false); }, [pathname]);

  // Helper function to handle navigation and close the menu
  const handleNavClick = useCallback((path: string) => {
    // Client nav first, then fallback to hard redirect to be safe on mobile emulation
    try { router.push(path); } catch {}
    // Close after scheduling navigation to avoid unmount cancelling events
    setTimeout(() => {
      setMenuOpen(false);
      // Fallback: if still on same page after a brief moment, force navigation
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== path) return;
        try { window.location.assign(path); } catch {}
      }, 120);
    }, 0);
  }, [router]);

  // Helper function for signing out and closing the menu
  const handleSignOut = async () => {
    try { await signOutUser(); } catch {}
    try { router.replace('/'); } catch {}
    setTimeout(() => {
      setMenuOpen(false);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/') return;
        try { window.location.assign('/'); } catch {}
      }, 120);
    }, 0);
  };

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-wide transition-colors hover:opacity-90" style={{ fontFamily: "var(--font-dot)" }}>Contenta</Link>
        
        {/* Desktop Navigation (Unchanged) */}
        <nav className="hidden md:flex items-center gap-3">
          {!loading && user && (
            <>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-md bg-white text-black text-sm hover:bg-white/90 transition-colors btn-dot">Dashboard</Link>
              <button onClick={signOutUser} className="px-3 py-1.5 rounded-md border border-white/30 text-sm hover:border-white/60 transition-colors cursor-pointer btn-dot">Sign out</button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/signin" className="px-3 py-1.5 rounded-md border border-white/30 text-sm hover:border-white/60 transition-colors btn-dot">Sign in</Link>
              <Link href="/signup" className="px-3 py-1.5 rounded-md bg-white text-black text-sm hover:bg-white/90 transition-colors btn-dot">Create account</Link>
            </>
          )}
        </nav>
        
        {/* Mobile Menu Toggle and Content */}
        <div className="md:hidden">
          <button 
            type="button" 
            className={`burger ${menuOpen ? 'open' : ''}`} 
            aria-label="Menu" 
            onClick={() => setMenuOpen(v => !v)}
          >
            <span></span><span></span><span></span>
          </button>

          {mounted && menuOpen && createPortal(
            <div className="fixed inset-0 z-[100]">
              {/* Backdrop closes menu */}
              <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
              {/* Menu panel */}
              <div className="absolute right-4 top-16 w-56 rounded-lg border border-white/20 bg-black text-white shadow-xl p-2">
                {!loading && user ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleNavClick('/dashboard')}
                      className="w-full text-left px-3 py-2 rounded-md bg-white text-black btn-dot hover:bg-white/90 transition"
                    >
                      Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 rounded-md border border-white/30 btn-dot hover:border-white/60 transition"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleNavClick('/signin')}
                      className="w-full text-left px-3 py-2 rounded-md border border-white/30 btn-dot hover:border-white/60 transition"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/signup')}
                      className="w-full text-left px-3 py-2 rounded-md bg-white text-black btn-dot hover:bg-white/90 transition"
                    >
                      Create account
                    </button>
                  </div>
                )}
              </div>
            </div>, document.body)
          }
        </div>
      </div>
    </header>
  );
}
