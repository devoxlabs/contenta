"use client";
import { useEffect, useMemo, useState } from "react";
import { loadOutputs, removeOutput, toggleFavorite, OutputRecord } from "@/lib/storage";
import OutputCard from "@/components/OutputCard";
import { useAuth } from "@/context/AuthContext";

export default function HistoryPanel() {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const [items, setItems] = useState<OutputRecord[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");

  const refresh = () => setItems(loadOutputs(uid));

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes("contenta:outputs")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const filtered = useMemo(() => {
    return items.filter((x) => {
      const mOk = mode === "all" || x.mode === mode;
      const pOk = platform === "all" || x.platform === platform;
      const q = query.toLowerCase();
      const qOk = !q || x.text.toLowerCase().includes(q);
      return mOk && pOk && qOk;
    });
  }, [items, mode, platform, query]);

  const clean = (s: string) => s.replace(/\*\*?/g, "").replace(/^#+\s*/gm, "").trim();
  const bullets = (arr: string[], md: boolean) => arr.map(v => `${md ? "-" : "•"} ${clean(v)}`).join("\n");
  const header = (text: string, level: number, md: boolean) => md ? `${"#".repeat(level)} ${text}` : text.toUpperCase();

  const formatReadable = (rec: OutputRecord) => {
    const s: any = rec.structured;
    if (rec.mode === "generate" && s) {
      const parts: string[] = [];
      if (s.captions?.length) parts.push(`${header("Captions", 0, false)}`, bullets(s.captions, false), "");
      if (s.script) {
        parts.push(`${header("Short Video Script", 0, false)}`);
        if (s.script.title) parts.push(`Title: ${clean(s.script.title)}`);
        if (s.script.hook?.length) parts.push("", `Hook`, bullets(s.script.hook, false));
        if (s.script.body?.length) parts.push("", `Body`, bullets(s.script.body, false));
        if (s.script.cta?.length) parts.push("", `Call to Action`, bullets(s.script.cta, false));
      }
      return parts.join("\n");
    }
    if (rec.mode === "ideas" && s?.ideas?.length) {
      const head = header("Ideas", 0, false);
      const list = s.ideas.map((it: any, i: number) => `${i + 1}. ${clean(it.title || "Idea")} – ${clean(it.hook || "")}${it.platform ? ` (${it.platform})` : ""}`).join("\n");
      return `${head}\n${list}`;
    }
    if (rec.mode === "enhance" && s?.variants?.length) {
      const head = header("Enhanced Variants", 0, false);
      const list = s.variants.map((v: string, i: number) => `${i + 1}. ${clean(v)}`).join("\n\n");
      return `${head}\n${list}`;
    }
    if (rec.mode === "vision" && s) {
      const parts: string[] = [];
      if (s.captions?.length) parts.push(`${header("Captions", 0, false)}`, bullets(s.captions, false), "");
      if (s.ideas?.length) parts.push(`${header("Ideas", 0, false)}`, bullets(s.ideas, false));
      return parts.join("\n");
    }
    return rec.raw || "";
  };

  const sanitizePlain = (s: string) => (s || "").replace(/[\*`#_>\|]/g, "").replace(/[\x00-\x1F\x7F-\uFFFF]/g, "").replace(/\s{2,}/g, " ").trim();

  const makePdfBlob = (text: string) => {
    const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const wrap = (t: string, max = 90) => { const out: string[] = []; let s = t; while (s.length > max) { let i = s.lastIndexOf(' ', max); if (i < max * 0.6) i = max; out.push(s.slice(0, i)); s = s.slice(i).trimStart(); } out.push(s); return out; };
    const lines = text.split(/\r?\n/).flatMap(l => wrap(l)).map(esc);
    const stream = `BT /F1 12 Tf 16 TL 50 780 Td (${lines.shift() || ""}) Tj` + lines.map(l=>` T* (${l}) Tj`).join("") + ` ET`;
    const header = "%PDF-1.4\n";
    let body = "";
    const offs: number[] = [];
    const add = (s: string) => { offs.push(header.length + body.length); body += s; };
    add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    add("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n");
    add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
    const xrefPos = header.length + body.length;
    const xref = `xref\n0 6\n0000000000 65535 f \n${offs.map(o=>String(o).padStart(10,'0')+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    const pdf = header + body + xref;
    return new Blob([pdf], { type: 'application/pdf' });
  };

  const downloadPdf = (name: string, text: string) => {
    const blob = makePdfBlob(text);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };

  const download = (rec: OutputRecord, format: "txt" | "pdf") => {
    const base = rec.structured ? formatReadable(rec) : (rec.raw || "");
    const content = sanitizePlain(base);
    const ts = new Date(rec.createdAt).toISOString().replace(/[:.]/g, "-");
    if (format === "pdf") {
      downloadPdf(`contenta_${rec.mode}_${ts}.pdf`, content);
    } else {
      const url = URL.createObjectURL(new Blob([content.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `contenta_${rec.mode}_${ts}.txt`; a.click(); URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="space-y-3 text-white">
      <div className="flex flex-wrap gap-2 items-center">
        <input placeholder="Search topic…" className="border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <select className="border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30" value={mode} onChange={(e)=>setMode(e.target.value)}>
          <option value="all">All modes</option>
          <option value="generate">Script/Captions</option>
          <option value="ideas">Ideas</option>
          <option value="enhance">Enhance</option>
          <option value="vision">Image (Vision)</option>
        </select>
        <select className="border border-white/20 bg-black text-white rounded-md px-3 py-2 hover-rise focus:outline-none focus:ring-2 focus:ring-white/30" value={platform} onChange={(e)=>setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          <option value="instagram">instagram</option>
          <option value="x">x</option>
          <option value="tiktok">tiktok</option>
          <option value="youtube">youtube</option>
          <option value="blog">blog</option>
        </select>
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-zinc-400">No history yet. Generate something to save it automatically.</p>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((rec) => (
          <article key={rec.id} className="border border-white/15 rounded-md p-3 bg-black fade-in">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                <span className="uppercase text-xs tracking-wide">{rec.mode}</span>
                <span className="mx-2">•</span>
                <span>{new Date(rec.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{toggleFavorite(uid, rec.id); refresh();}} aria-label="favorite" className="btn-icon">
                  {rec.favorite ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeWidth="1.5"/></svg>
                  )}
                </button>
                {/* download buttons temporarily hidden */}
                <button onClick={()=>{removeOutput(uid, rec.id); refresh();}} aria-label="delete" className="btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" strokeWidth="1.7"/><path d="M8 6V4h8v2" strokeWidth="1.7"/><rect x="6" y="6" width="12" height="14" rx="2"/></svg>
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm"><span className="text-zinc-400 mr-2">Topic:</span> {rec.text}</p>
            <p className="text-xs text-zinc-400 mt-1">Style: {rec.style} • Platform: {rec.platform}</p>
            <div className="mt-3">
              <OutputCard record={rec} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}




