"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { loadSettings, saveOutput, toggleFavorite } from "@/lib/storage";
import CopyButton from "@/components/CopyButton";

type Mode = "generate" | "ideas" | "enhance";
type GenerateResponse = { content: string };
type StructuredGenerate = { captions: string[]; script: { title: string; hook: string[]; body: string[]; cta: string[] } } | undefined;
type StructuredIdeas = { ideas: { title: string; hook: string; platform?: string }[] } | undefined;
type StructuredEnhance = { variants: string[] } | undefined;

export default function GeneratorFormDark() {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const defaults = loadSettings(uid);
  const [mode, setMode] = useState<Mode>("generate");
  const [text, setText] = useState("");
  const [style, setStyle] = useState(defaults?.style || "casual");
  const [platform, setPlatform] = useState(defaults?.platform || "instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<GenerateResponse[]>([]);
  const [structured, setStructured] = useState<StructuredGenerate | StructuredIdeas | StructuredEnhance>();
  const [lastId, setLastId] = useState<string | null>(null);
  const [isFav, setIsFav] = useState<boolean>(false);

  const cleanText = (s: string) => s.replace(/\*\*?/g, "").replace(/^#+\s*/gm, "").replace(/`{1,3}/g, "").replace(/^---$/gm, "").replace(/\s*#\w+\b/g, "").replace(/\s{2,}/g, " ").trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { // minimal beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12); o.stop(ctx.currentTime + 0.13);
    } catch {}
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, text, style, platform }) });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { outputs: GenerateResponse[]; structured?: any };
      setOutputs(data.outputs || []);
      setStructured(data.structured);
      const raw = (data.outputs?.[0]?.content as string) || "";
      const saved = saveOutput(uid, { mode, text, style, platform, structured: data.structured, raw });
      if (saved) { setLastId(saved.id); setIsFav(!!saved.favorite); }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally { setLoading(false); }
  };

  const downloadBlob = (filename: string, content: string) => { const blob = new Blob([content.replace(/\n/g, '\r\n')], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  const sanitizePlain = (s: string) => (s || "").replace(/[\*`#_>|]/g, "").replace(/[\x00-\x1F\x7F-\uFFFF]/g, "").replace(/\s{2,}/g, " ").trim();
  const makePdfBlob = (text: string) => {
    const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const wrap = (t: string, max = 90) => { const out: string[] = []; let s = t; while (s.length > max) { let i = s.lastIndexOf(' ', max); if (i < max * 0.6) i = max; out.push(s.slice(0, i)); s = s.slice(i).trimStart(); } out.push(s); return out; };
    const lines = text.split(/\r?\n/).flatMap(l => wrap(l)).map(esc);
    const stream = `BT /F1 12 Tf 16 TL 50 780 Td (${lines.shift() || ""}) Tj` + lines.map(l=>` T* (${l}) Tj`).join("") + ` ET`;
    const header = "%PDF-1.4\n"; let body=""; const offs:number[]=[]; const add=(s:string)=>{offs.push(header.length+body.length); body+=s;};
    add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    add("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n");
    add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
    const xrefPos = header.length + body.length;
    const xref = `xref\n0 6\n0000000000 65535 f \n${offs.map(o=>String(o).padStart(10,'0')+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return new Blob([header+body+xref], { type: 'application/pdf' });
  };

  const bullets = (arr: string[], md: boolean) => arr.map(v => `- ${cleanText(v)}`).join("\n");
  const header = (text: string, level: number, md: boolean) => md ? `${"#".repeat(level)} ${text}` : text.toUpperCase();

  const formatReadable = (s: any, m: string) => {
    if (m === "generate" && s) {
      const parts: string[] = [];
      if (s.captions?.length) { parts.push(`${header("Captions", 0, false)}`, bullets(s.captions, false), ""); }
      if (s.script) {
        parts.push(`${header("Short Video Script", 0, false)}`);
        if (s.script.title) parts.push(`Title: ${cleanText(s.script.title)}`);
        if (s.script.hook?.length) { parts.push("", `Hook`, bullets(s.script.hook, false)); }
        if (s.script.body?.length) { parts.push("", `Body`, bullets(s.script.body, false)); }
        if (s.script.cta?.length) { parts.push("", `Call to Action`, bullets(s.script.cta, false)); }
      }
      return parts.join("\n");
    }
    if (m === "ideas" && s?.ideas?.length) {
      const t = header("Ideas", 0, false);
      const list = s.ideas.map((it: any, i: number) => `${i + 1}. ${cleanText(it.title || "Idea")} - ${cleanText(it.hook || "")}${it.platform ? ` (${it.platform})` : ""}`).join("\n");
      return `${t}\n${list}`;
    }
    if (m === "enhance" && s?.variants?.length) {
      const t = header("Enhanced Variants", 0, false);
      const list = s.variants.map((v: string, i: number) => `${i + 1}. ${cleanText(v)}`).join("\n\n");
      return `${t}\n${list}`;
    }
    return typeof s === 'string' ? s : JSON.stringify(s ?? {}, null, 2);
  };

  const formatForDownload = (s: any | undefined, raw: string, m: string) => {
    if (s) return formatReadable(s, m);
    return raw;
  };
  const download = (format: "txt" | "pdf") => { const raw = outputs?.[0]?.content ? cleanText(outputs[0].content) : ""; const base = formatForDownload(structured as any, raw, mode); const content = sanitizePlain(base); const ts = new Date().toISOString().replace(/[:.]/g, "-"); if (format==='pdf'){ const blob = makePdfBlob(content); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`contenta_${mode}_${ts}.pdf`; a.click(); URL.revokeObjectURL(url);} else { downloadBlob(`contenta_${mode}_${ts}.txt`, content); } };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 form-label">Mode</label>
            <select value={mode} onChange={(e)=>setMode(e.target.value as Mode)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30">
              <option value="generate">Script/Captions</option>
              <option value="ideas">Ideas/Brainstorm</option>
              <option value="enhance">Enhance/Rewrite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 form-label">Style/Tone</label>
            <select value={style} onChange={(e)=>setStyle(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30">
              <option>casual</option>
              <option>professional</option>
              <option>funny</option>
              <option>emotional</option>
              <option>poetic</option>
              <option>marketing</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1 form-label">Platform</label>
          <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="w-full border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30">
            <option>instagram</option>
            <option>x</option>
            <option>tiktok</option>
            <option>youtube</option>
            <option>blog</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 form-label">Text / Topic</label>
          <textarea value={text} onChange={(e)=>setText(e.target.value)} required rows={6} placeholder="Enter topic or paste text..." className="w-full border border-white/20 bg-black text-white placeholder:text-zinc-500 rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={loading} className="px-4 py-2 rounded-md bg-white text-black disabled:opacity-60 cursor-pointer hover:bg-white/90 active:scale-95 transition btn-dot">{loading ? "Generating..." : "Generate"}</button>
      </form>

      <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Outputs</h3>
              {structured || outputs.length>0 ? (
                <div className="flex gap-2">
              <button disabled={!lastId} onClick={()=>{ if(!lastId) return; const t = toggleFavorite(uid, lastId); setIsFav(!!t?.favorite); }} aria-label="favorite" className="text-xs px-2 py-1 border border-white/30 rounded disabled:opacity-60 transition-all duration-200 hover:border-white/60 active:scale-95">
                {isFav ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeWidth="1.5"/></svg>
                )}
              </button>
              {/* download buttons temporarily hidden */}
                </div>
              ) : null}
            </div>

        {/* Structured rendering */}
        {structured && mode === "generate" && (
          <div className="space-y-6">
            {"captions" in (structured as any) && (
              <section className="border border-white/15 rounded-md p-4 bg-black">
                <h4 className="font-semibold">Captions</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                  {(structured as StructuredGenerate)!.captions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="flex-1">{cleanText(c)}</span><CopyButton text={cleanText(c)} /></li>
                  ))}
                </ul>
              </section>
            )}
            {"script" in (structured as any) && (
              <section className="border border-white/15 rounded-md p-4 bg-black">
                <h4 className="font-semibold">Short Video Script</h4>
                <p className="text-sm text-zinc-400 mt-1">Title: {(structured as StructuredGenerate)!.script.title}</p>
                <div className="mt-3 space-y-4">
                  <div>
                    <h5 className="font-medium text-sm">Hook</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">{(structured as StructuredGenerate)!.script.hook.map((x, i) => <li key={i}>{cleanText(x)}</li>)}</ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Body</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">{(structured as StructuredGenerate)!.script.body.map((x, i) => <li key={i}>{cleanText(x)}</li>)}</ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Call to Action</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">{(structured as StructuredGenerate)!.script.cta.map((x, i) => <li key={i}>{cleanText(x)}</li>)}</ul>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

          {structured && mode === "ideas" && (
            <div className="grid md:grid-cols-2 gap-4">
              {(structured as StructuredIdeas)!.ideas.map((idea, i) => (
                <div key={i} className="border border-white/15 rounded-md p-4 bg-black">
                  <h4 className="font-semibold">{cleanText(idea.title)}</h4>
                  <p className="text-sm text-zinc-300 mt-1">{cleanText(idea.hook)}</p>
                </div>
              ))}
            </div>
          )}

          {structured && mode === "enhance" && (
            <div className="space-y-3">
              {(structured as StructuredEnhance)!.variants.map((v, i) => (
                <div key={i} className="border border-white/15 rounded-md p-3 bg-black"><p className="text-sm whitespace-pre-wrap">{cleanText(v)}</p></div>
              ))}
            </div>
          )}

        {/* Fallback plain text rendering */}
        {!structured && outputs.length > 0 && (
          <div className="space-y-3">
            {outputs.map((o, idx) => (
              <div key={idx} className="border border-white/15 rounded-md p-3 bg-black">
                <pre className="whitespace-pre-wrap text-sm">{cleanText(o.content)}</pre>
                <div className="mt-2 flex gap-2"><CopyButton text={cleanText(o.content)} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}






