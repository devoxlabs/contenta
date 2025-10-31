"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import StarsBackground from "@/components/Stars";
import { signUpWithEmail } from "@/lib/auth";
import { isValidUsername, checkUsernameAvailable, reserveOrChangeUsername, saveProfile } from "@/lib/profile";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  // No avatar upload (no Storage)
  const [error, setError] = useState<string | null>(null);
  const [pwPct, setPwPct] = useState(0);
  const [pwLabel, setPwLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onCheck = async () => {
    if (!isValidUsername(username)) { setUsernameStatus("Invalid format"); return; }
    const free = await checkUsernameAvailable(username);
    setUsernameStatus(free ? "Available" : "Taken");
  };

  const evaluatePassword = (p: string) => {
    const len = p.length;
    const lowers = /[a-z]/.test(p);
    const uppers = /[A-Z]/.test(p);
    const digits = /[0-9]/.test(p);
    const specials = /[^A-Za-z0-9]/.test(p);
    const types = [lowers, uppers, digits, specials].filter(Boolean).length;

    const lengthScore = Math.min(20, len) / 20 * 55;
    const varietyScore = ((types - 1) / 3) * 35;

    const repeated = /(.)\1{2,}/.test(p);
    const penalty = repeated ? 12 : 0;

    const bonus = len >= 14 && types >= 3 ? 8 : 0;

    let pct = Math.max(0, Math.min(100, Math.round(lengthScore + varietyScore - penalty + bonus)));
    setPwPct(pct);
    setPwLabel(pct >= 70 ? "Strong" : pct >= 40 ? "Medium" : "Weak");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signUpWithEmail(email, password);
      try {
        if (username && isValidUsername(username)) {
          await reserveOrChangeUsername(user.uid, username);
        }
      } catch (e: any) {
        setUsernameStatus("Taken. You can set it later in Settings.");
      }
      await saveProfile(user.uid, { firstName, lastName, username });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign up");
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
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Create your account</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Already have one? <Link href="/signin" className="underline">Sign in</Link>
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 form-label">First name</label>
                <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
              </div>
              <div>
                <label className="block text-sm mb-1 form-label">Last name</label>
                <input value={lastName} onChange={(e)=>setLastName(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 form-label">Username</label>
              <div className="flex gap-2">
                <input value={username} onChange={(e)=>setUsername(e.target.value)} className="flex-1 border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" placeholder="your_name" />
                <button type="button" onClick={onCheck} aria-label="check username" className="btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="1.5"/><path d="M20 20l-3-3" strokeWidth="1.5"/></svg>
                </button>
              </div>
              {usernameStatus && <p className="text-xs mt-1 text-gray-600">{usernameStatus}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1 form-label">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
            <div>
              <label className="block text-sm mb-1 form-label">Password</label>
              <input type="password" value={password} onChange={(e)=>{ setPassword(e.target.value); evaluatePassword(e.target.value);} } required className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
              {(() => {
                const pct = Math.min(100, Math.max(0, pwPct));
                const glow = pct >= 70 ? '0 0 16px rgba(255,255,255,.25)' : pct >= 40 ? '0 0 8px rgba(255,255,255,.15)' : 'none';
                const stop = pct >= 70 ? 'rgba(255,255,255,.95)' : pct >= 40 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.5)';
                return (
                  <>
                    <div className="mt-2 pw-meter"><div className="pw-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(255,255,255,.25), ${stop})`, boxShadow: glow }} /></div>
                    <div className="mt-1 pw-label text-zinc-400">Strength: {pwLabel || "…"} Use 7+ chars with upper/lowercase, number and symbol.</div>
                  </>
                );
              })()}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={loading} className="w-full px-3 py-2 rounded-md bg-white text-black disabled:opacity-60 btn-dot hover:bg-white/90 transition cursor-pointer">
              {loading ? "Creating…" : "Create account"}
            </button>
            </form>
        </div>
      </main>
    </div>
  );
}



