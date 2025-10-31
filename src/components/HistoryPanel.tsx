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

  const formatReadable = (rec: OutputRecord, f: "txt"|"md") => {
    const md = f === "md";
    const s: any = rec.structured;
    if (rec.mode === "generate" && s) {
      const parts: string[] = [];
      if (s.captions?.length) parts.push(`${header("Captions", md ? 2 : 0, md)}`, bullets(s.captions, md), "");
      if (s.script) {
        parts.push(`${header("Short Video Script", md ? 2 : 0, md)}`);
        if (s.script.title) parts.push(`${md ? "**Title:**" : "Title:"} ${clean(s.script.title)}`);
        if (s.script.hook?.length) parts.push("", `${md ? "**Hook**" : "Hook"}`, bullets(s.script.hook, md));
        if (s.script.body?.length) parts.push("", `${md ? "**Body**" : "Body"}`, bullets(s.script.body, md));
        if (s.script.cta?.length) parts.push("", `${md ? "**Call to Action**" : "Call to Action"}`, bullets(s.script.cta, md));
      }
      return parts.join("\n");
    }
    if (rec.mode === "ideas" && s?.ideas?.length) {
      const head = header("Ideas", md ? 2 : 0, md);
      const list = s.ideas.map((it: any, i: number) => `${i + 1}. ${clean(it.title || "Idea")} — ${clean(it.hook || "")}${it.platform ? ` (${it.platform})` : ""}`).join("\n");
      return `${head}\n${list}`;
    }
    if (rec.mode === "enhance" && s?.variants?.length) {
      const head = header("Enhanced Variants", md ? 2 : 0, md);
      const list = s.variants.map((v: string, i: number) => `${i + 1}. ${clean(v)}`).join("\n\n");
      return `${head}\n${list}`;
    }
    if (rec.mode === "vision" && s) {
      const parts: string[] = [];
      if (s.captions?.length) parts.push(`${header("Captions", md ? 2 : 0, md)}`, bullets(s.captions, md), "");
      if (s.ideas?.length) parts.push(`${header("Ideas", md ? 2 : 0, md)}`, bullets(s.ideas, md));
      return parts.join("\n");
    }
    return rec.raw || "";
  };

  const download = (rec: OutputRecord, format: "txt" | "md") => {
    const name = `contenta_${rec.mode}_${new Date(rec.createdAt).toISOString().replace(/[:.]/g, "-")}.${format}`;
    const content = rec.structured ? formatReadable(rec, format) : (rec.raw || "");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
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
                <button onClick={()=>download(rec, "txt")} aria-label="download txt" className="btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v10" strokeWidth="1.7"/><path d="M8 11l4 4 4-4" strokeWidth="1.7"/><rect x="4" y="19" width="16" height="2" rx="1"/></svg>
                </button>
                <button onClick={()=>download(rec, "md")} aria-label="download md" className="btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7v10h4l5-6 5 6h4V7" strokeWidth="1.5"/></svg>
                </button>
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

