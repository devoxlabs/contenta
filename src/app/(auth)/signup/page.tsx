"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import StarsBackground from "@/components/Stars";
import { signUpWithEmail, isEmailInUse, setAuthPersistence } from "@/lib/auth";
import { isValidUsername, checkUsernameAvailable, reserveOrChangeUsername, saveProfile, deriveUsernameFromName } from "@/lib/profile";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [suggestedUsername, setSuggestedUsername] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwPct, setPwPct] = useState(0);
  const [pwLabel, setPwLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; username?: string; password?: string }>({});
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestedPassword, setSuggestedPassword] = useState<string | null>(null);
  const router = useRouter();

  // Auto-check username availability with debounce
  useEffect(() => {
    const u = username.trim();
    if (!u) { setUsernameStatus(null); setChecking(false); return; }
    if (!isValidUsername(u)) { setUsernameStatus("Invalid format"); setChecking(false); return; }
    setChecking(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const free = await checkUsernameAvailable(u);
        if (cancelled) return;
        setUsernameStatus(free ? "Available" : "Taken");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username]);

  // Suggest an available username from full name
  useEffect(() => {
    const base = deriveUsernameFromName(firstName || "", lastName || "");
    if (!base) { setSuggestedUsername(null); return; }
    const showSuggest = !username || usernameStatus === 'Invalid format' || usernameStatus === 'Taken';
    if (!showSuggest) { setSuggestedUsername(null); return; }
    let cancelled = false;
    (async () => {
      const tryList: string[] = [base];
      for (let i = 1; i <= 10; i++) tryList.push(`${base}${i}`);
      for (const cand of tryList) {
        if (!isValidUsername(cand)) continue;
        const ok = await checkUsernameAvailable(cand);
        if (cancelled) return;
        if (ok) { setSuggestedUsername(cand); return; }
      }
      setSuggestedUsername(null);
    })();
    return () => { cancelled = true; };
  }, [firstName, lastName, username, usernameStatus]);

  const canGoNext = useMemo(() => {
    return (firstName || "").trim().length > 0 && (lastName || "").trim().length > 0 && /.+@.+\..+/.test(email);
  }, [firstName, lastName, email]);

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
    // If meets recommended policy (>=7 and all categories), show full bar
    if (len >= 7 && lowers && uppers && digits && specials) {
      pct = 100;
    }
    setPwPct(pct);
    setPwLabel(pct >= 70 ? "Strong" : pct >= 40 ? "Medium" : "Weak");
  };

  // Generate a strong password (14 chars, includes all classes)
  function generateStrongPassword(): string {
    const lowers = "abcdefghijkmnopqrstuvwxyz"; // no l
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no O
    const digits = "23456789"; // no 0,1
    const specials = "!@#$%^&*()-_=+[]{}";
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    const base = [pick(lowers), pick(uppers), pick(digits), pick(specials)];
    const pool = lowers + uppers + digits + specials;
    for (let i = 0; i < 10; i++) base.push(pick(pool));
    // shuffle
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base.join("");
  }

  // Offer suggestion when weak
  useEffect(() => {
    if ((pwPct || 0) < 50) {
      if (!suggestedPassword) setSuggestedPassword(generateStrongPassword());
    } else {
      setSuggestedPassword(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwPct]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) return;
    setError(null);
    setLoading(true);
    try {
      // Client-side validation for step 2
      const e2: any = {};
      const uname = (username||'').trim();
      if (!uname) e2.username = 'Username is required';
      else if (!isValidUsername(uname)) e2.username = 'Invalid username';
      else if (usernameStatus === 'Taken') e2.username = 'Username is taken';
      if (!(password||'').length) e2.password = 'Password is required';
      else {
        const p = String(password);
        const hasLower = /[a-z]/.test(p);
        const hasUpper = /[A-Z]/.test(p);
        const hasDigit = /[0-9]/.test(p);
        const hasSpecial = /[^A-Za-z0-9]/.test(p);
        const strongEnough = (pwPct ?? 0) >= 50;
        const missing: string[] = [];
        if (!hasLower) missing.push('a lowercase letter');
        if (!hasUpper) missing.push('an uppercase letter');
        if (!hasDigit) missing.push('a number');
        if (!hasSpecial) missing.push('a special character');
        if (!strongEnough || missing.length) {
          e2.password = missing.length ? `Weak password � add ${missing.join(', ')}` : 'Weak password � use a stronger one';
        }
      }
      if (Object.keys(e2).length){ setErrors(p=>({...p, ...e2})); return; }

      // Final guard: prevent duplicates even if step-1 check was skipped
      const eaddr = email.trim().toLowerCase();
      try {
        const exists = await isEmailInUse(eaddr);
        if (exists) {
          setError('Please use a different email or sign in');
          setStep(1);
          return;
        }
      } catch {}

      await setAuthPersistence(remember);
      const user = await signUpWithEmail(eaddr, password);
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
          <form onSubmit={onSubmit} className="mt-6">
            <div className="relative overflow-hidden">
              {/* Step 1: name + email */}
              <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute inset-0'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1 form-label">First name</label>
                    <input value={firstName} onChange={(e)=>{ setFirstName(e.target.value); setErrors(p=>({...p, firstName: undefined})); }} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
                    {errors.firstName && <p className="text-xs mt-1 text-zinc-400" style={{ fontFamily: 'var(--font-dot)' }}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm mb-1 form-label">Last name</label>
                    <input value={lastName} onChange={(e)=>{ setLastName(e.target.value); setErrors(p=>({...p, lastName: undefined})); }} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
                    {errors.lastName && <p className="text-xs mt-1 text-zinc-400" style={{ fontFamily: 'var(--font-dot)' }}>{errors.lastName}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm mb-1 form-label">Email</label>
                  <input type="email" value={email} onChange={(e)=>{ setEmail((e.target.value || '').toLowerCase()); setEmailStatus(null); setErrors(p=>({...p, email: undefined})); }} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
                  {(checkingEmail || emailStatus) && (
                    <p className="text-xs mt-1 text-zinc-400">{checkingEmail ? 'Checking...' : emailStatus}</p>
                  )}
                  {errors.email && <p className="text-xs mt-1 text-zinc-400" style={{ fontFamily: 'var(--font-dot)' }}>{errors.email}</p>}
                </div>
                <div className="mt-6">
                  <button type="button" onClick={async ()=>{
                      if (checkingEmail) return;
                      const eaddr = (email || '').trim().toLowerCase();
                      const errs: any = {};
                      if (!(firstName||'').trim()) errs.firstName = 'First name is required';
                      if (!(lastName||'').trim()) errs.lastName = 'Last name is required';
                      if (!/.+@.+\..+/.test(eaddr)) errs.email = 'Enter a valid email';
                      if (Object.keys(errs).length) { setErrors(p=>({...p, ...errs})); return; }
                      try {
                        setCheckingEmail(true);
                        const used = await isEmailInUse(eaddr);
                        if (used) { setEmailStatus('Please use a different email or sign in'); return; }
                        setEmailStatus(null);
                        setStep(2);
                      } finally {
                        setCheckingEmail(false);
                      }
                    }} disabled={checkingEmail} className="w-full px-3 py-2 rounded-md bg-white text-black disabled:opacity-60 btn-dot hover:bg-white/90 transition cursor-pointer" style={{ fontFamily: 'var(--font-dot)' }}>
                    Next
                  </button>
                </div>
              </div>

              {/* Step 2: username + password */}
              <div className={`transition-all duration-300 ${step === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'}`}>
                <div>
                  <label className="block text-sm mb-1 form-label">Username</label>
                  <div>
                    <input value={username} onChange={(e)=>{ setUsername(e.target.value); setErrors(p=>({...p, username: undefined})); }} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" placeholder="your_name" />
                  </div>
                  {(checking || usernameStatus) && (
                    <p className={`text-xs mt-1 ${usernameStatus === 'Available' ? 'text-white' : 'text-zinc-400'}`}>
                      {checking ? 'Checking...' : usernameStatus}
                    </p>
                  )}
                  {errors.username && <p className="text-xs mt-1 text-zinc-400" style={{ fontFamily: 'var(--font-dot)' }}>{errors.username}</p>}
                  {suggestedUsername && (
                    <div className="mt-1 text-xs text-zinc-400">
                      Suggested: <button type="button" className="underline decoration-dotted hover:text-white" onClick={() => setUsername(suggestedUsername!)}>{suggestedUsername}</button>
                    </div>
                  )}
                </div>
              <div className="mt-4">
                <label className="block text-sm mb-1 form-label">Password</label>
                  <div className="relative">
                    <input type={showPassword? 'text':'password'} value={password} onChange={(e)=>{ setPassword(e.target.value); setErrors(p=>({...p, password: undefined})); evaluatePassword(e.target.value);} } className="w-full pr-10 border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30" />
                    <button type="button" aria-label={showPassword? 'Hide password':'Show password'} onClick={()=>setShowPassword(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                      {showPassword ? (
                        <svg className="w-5 h-5 transition-transform duration-200 rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18" strokeWidth="1.5"/><path d="M10.5 6.2A9.77 9.77 0 0 1 12 6c6 0 10 6 10 6a16.2 16.2 0 0 1-3.05 3.64" strokeWidth="1.5"/><path d="M7.11 7.11A16.07 16.07 0 0 0 2 12s4 6 10 6c1.1 0 2.16-.2 3.16-.56" strokeWidth="1.5"/></svg>
                      ) : (
                        <svg className="w-5 h-5 transition-transform duration-200 rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" strokeWidth="1.5"/></svg>
                      )}
                    </button>
                  </div>
                  {(() => {
                    const pct = Math.min(100, Math.max(0, pwPct));
                    const glow = pct >= 70 ? '0 0 16px rgba(255,255,255,.25)' : pct >= 40 ? '0 0 8px rgba(255,255,255,.15)' : 'none';
                    const stop = pct >= 70 ? 'rgba(255,255,255,.95)' : pct >= 40 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.5)';
                    return (
                      <>
                        <div className="mt-2 pw-meter"><div className="pw-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(255,255,255,.25), ${stop})`, boxShadow: glow }} /></div>
                        <div className="mt-1 pw-label text-zinc-400">Strength: {pwLabel || "..."} {pct < 50 ? 'Weak password � use a stronger one.' : ''}</div>
                      </>
                    );
                  })()}
                  {(() => {
                    const p = String(password||'');
                    const hasLower = /[a-z]/.test(p);
                    const hasUpper = /[A-Z]/.test(p);
                    const hasDigit = /[0-9]/.test(p);
                    const hasSpecial = /[^A-Za-z0-9]/.test(p);
                    const Item = ({ok, label}:{ok:boolean,label:string}) => (
                      <div className={`text-xs ${ok?'text-white':'text-zinc-400'} transition-colors`}>� {label}</div>
                    );
                    return (
                      <div className="mt-2 grid grid-cols-2 gap-y-1">
                        <Item ok={hasLower} label="Contains lowercase" />
                        <Item ok={hasUpper} label="Contains uppercase" />
                        <Item ok={hasDigit} label="Contains number" />
                        <Item ok={hasSpecial} label="Contains special character" />
                      </div>
                    );
                  })()}
                  <div className="mt-2 text-xs text-zinc-400">
                    {suggestedPassword ? (
                      <>
                        Suggested strong password: <code className="px-1 py-0.5 bg-white/10 rounded">{suggestedPassword}</code>
                        <button type="button" className="ml-2 underline decoration-dotted hover:text-white transition" onClick={()=>{ setPassword(suggestedPassword!); evaluatePassword(suggestedPassword!); }}>
                          Use suggestion
                        </button>
                        <button type="button" className="ml-3 underline decoration-dotted hover:text-white transition" onClick={()=> setSuggestedPassword(generateStrongPassword())}>Generate another</button>
                      </>
                    ) : (
                      <button type="button" className="underline decoration-dotted hover:text-white transition" onClick={()=> setSuggestedPassword(generateStrongPassword())}>Suggest a strong password</button>
                    )}
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-zinc-400 select-none">
                    <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-white" />
                    <span style={{ fontFamily: 'var(--font-dot)' }}>Keep me signed in on this device</span>
                  </label>
                </div>
                {errors.password && <p className="text-xs text-zinc-400 mt-1" style={{ fontFamily: 'var(--font-dot)' }}>{errors.password}</p>}
                {error && <p className="text-sm text-zinc-400 mt-2" style={{ fontFamily: 'var(--font-dot)' }}>{error}</p>}
                <div className="mt-6 flex items-center gap-3">
                  <button type="button" onClick={()=> setStep(1)} className="px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 transition" style={{ fontFamily: 'var(--font-dot)' }}>
                    Back
                  </button>
                  <button disabled={loading} className="flex-1 px-3 py-2 rounded-md bg-white text-black disabled:opacity-60 btn-dot hover:bg-white/90 transition cursor-pointer" style={{ fontFamily: 'var(--font-dot)' }}>
                    {loading ? "Creating..." : "Create account"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


