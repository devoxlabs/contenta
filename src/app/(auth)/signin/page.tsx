"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { signInWithEmail, setAuthPersistence } from "@/lib/auth";
import { saveProfile } from "@/lib/profile";
import StarsBackground from "@/components/Stars";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Prefill last identifier when available
  useEffect(() => {
    try {
      const last = localStorage.getItem("contenta:lastEmail");
      if (last) setEmail(last);
      const pref = localStorage.getItem("contenta:remember");
      if (pref === "false") setRemember(false);
    } catch {}
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const raw = (email || "").trim();
      if (!raw) throw new Error("Enter email");
      if (!password) throw new Error("Password is required");
      await setAuthPersistence(remember);
      const user = await signInWithEmail(raw.toLowerCase(), password);
      try {
        localStorage.setItem("contenta:lastEmail", raw);
        localStorage.setItem("contenta:remember", String(remember));
      } catch {}
      // Backfill email into private profile for consistency
      try {
        await saveProfile(user.uid, { email: user.email || undefined });
      } catch {}
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <StarsBackground />
      <div className="relative z-10">
        <NavBar />
      </div>
      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-md px-4 py-12">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Sign in</h1>
          <p className="text-sm text-zinc-400 mt-1">
            New here? <Link href="/signup" className="underline">Create an account</Link>
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm mb-1 form-label">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm mb-1 form-label">Password</label>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 select-none">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-white" />
              <span style={{ fontFamily: 'var(--font-dot)' }}>Keep me signed in on this device</span>
            </label>
            {error && <p className="text-sm text-zinc-400" style={{ fontFamily: 'var(--font-dot)' }}>{error}</p>}
            <button disabled={loading} className="w-full px-3 py-2 rounded-md bg-white text-black disabled:opacity-60 btn-dot hover:bg-white/90 transition cursor-pointer">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}


