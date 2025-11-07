"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { checkUsernameAvailable, deriveUsernameFromEmail, getProfile, isValidUsername, reserveOrChangeUsername, saveProfile, suggestUsernames } from "@/lib/profile";

export default function SettingsPanel() {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState("");
  const [photoURL] = useState<string | undefined>(undefined);
  const [avatar, setAvatar] = useState<string>("");
  const [availability, setAvailability] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const currentUsername = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await getProfile(user.uid);
      if (p) {
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setUsername(p.username || "");
        setNickname(p.nickname || "");
        setBio(p.bio || "");
        setLinks(p.links || "");
        // photoURL intentionally unused (no storage)
        setAvatar(p.avatar || "");
        currentUsername.current = p.username;
      }
    })();
  }, [user]);

  // Avatar uploads removed (no storage)

  // Auto-check username availability with debounce
  useEffect(() => {
    const u = username.trim();
    setSuggestions([]);
    if (!u) { setAvailability(null); setChecking(false); return; }
    if (u === (currentUsername.current || "")) { setAvailability("Current username"); setChecking(false); return; }
    if (!isValidUsername(u)) { setAvailability("Invalid format"); setChecking(false); return; }
    setChecking(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const free = await checkUsernameAvailable(u);
        if (cancelled) return;
        if (free) {
          setAvailability("Available");
          setSuggestions([]);
        } else {
          setAvailability("Taken");
          const picks: string[] = [];
          const baseFromEmail = deriveUsernameFromEmail(user?.email || "");
          if (baseFromEmail) {
            const tryList = [baseFromEmail];
            for (let i = 1; i <= 10; i++) tryList.push(`${baseFromEmail}${i}`);
            for (const cand of tryList) {
              if (!isValidUsername(cand)) continue;
              if (cand === u) continue;
              const ok = await checkUsernameAvailable(cand);
              if (cancelled) return;
              if (ok) { picks.push(cand); break; }
            }
          }
          const more = suggestUsernames(u);
          const unique = Array.from(new Set([...picks, ...more])).slice(0, 5);
          setSuggestions(unique);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username, user?.email]);

  const onCheck = async () => {
    if (!isValidUsername(username)) {
      setAvailability("Invalid format. Use 3–20 chars: a-z, 0-9, _ . , '");
      return;
    }
    const free = await checkUsernameAvailable(username);
    setAvailability(free ? "Available" : "Taken");
    if (!free) setSuggestions(suggestUsernames(username));
  };

  const onSave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Reserve username if changed
      if (username && username !== currentUsername.current) {
        await reserveOrChangeUsername(user.uid, username, currentUsername.current);
        currentUsername.current = username;
      }
      await saveProfile(user.uid, { firstName, lastName, username, nickname, bio, links, avatar });
      setAvailability("Saved");
    } catch (e: any) {
      setAvailability(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const namePreview = useMemo(() => [firstName, lastName].filter(Boolean).join(" "), [firstName, lastName]);

  return (
    <section className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border bg-zinc-50 flex items-center justify-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="avatar" className="object-cover w-full h-full" />
          ) : (
            <span className="text-sm font-medium">{(firstName||"?").charAt(0)}{(lastName||"").charAt(0)}</span>
          )}
        </div>
        <div>
          <p className="font-medium">@{username || "username"}</p>
          <p className="text-xs text-gray-500">{user?.email || namePreview}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 form-label">First name</label>
          <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" />
        </div>
        <div>
          <label className="block text-sm mb-1 form-label">Last name</label>
          <input value={lastName} onChange={(e)=>setLastName(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1 form-label">Username</label>
        <div>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" placeholder="your_name" />
        </div>
        {(checking || availability) && (
          <p className={`text-xs mt-1 ${availability === 'Available' ? 'text-white' : 'text-zinc-400'}`}>
            {checking ? 'Checking…' : availability}
          </p>
        )}
        {suggestions.length>0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s)=> (
              <button key={s} onClick={()=>{setUsername(s); setSuggestions([]); setAvailability(null);}} className="text-xs px-2 py-1 border rounded bg-zinc-50">{s}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm mb-1 form-label">Nickname</label>
        <input value={nickname} onChange={(e)=>setNickname(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" />
      </div>

      <div>
        <label className="block text-sm mb-1 form-label">Bio</label>
        <textarea value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" rows={4} />
      </div>

      <div>
        <label className="block text-sm mb-1 form-label">Links (comma separated)</label>
        <input value={links} onChange={(e)=>setLinks(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 transition" placeholder="https://..., https://..." />
      </div>

      <div>
        <label className="block text-sm mb-2 form-label">Choose an avatar</label>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 justify-items-center max-w-xl">
          {[1,2,3,4,5,6,7,8].map((n)=>{
            const src = `/avatars/${n}.png`;
            const active = avatar === src;
            return (
              <button type="button" key={n} onClick={()=>setAvatar(src)} className={`w-12 h-12 rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition cursor-pointer ${active? 'ring-2 ring-white' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`avatar ${n}`} className="w-full h-full object-cover" onError={(e:any)=>{e.currentTarget.style.opacity=0.2}}/>
              </button>
            );
          })}
        </div>
      </div>

      <button disabled={loading} onClick={onSave} className="px-5 py-2.5 rounded-md bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer">{loading?"Saving…":"Save"}</button>
    </section>
  );
}

