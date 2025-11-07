"use client";
import { useState } from "react";

type Mode = "generate" | "ideas" | "enhance";

type GenerateResponse = { content: string };

type StructuredGenerate =
  | {
      captions: string[];
      script: { title: string; hook: string[]; body: string[]; cta: string[] };
    }
  | undefined;

type StructuredIdeas = { ideas: { title: string; hook: string; platform?: string }[] } | undefined;

type StructuredEnhance = { variants: string[] } | undefined;

import { saveOutput, toggleFavorite } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { loadSettings } from "@/lib/storage";

export default function GeneratorForm() {
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

  const cleanText = (s: string) =>
    s
      .replace(/\*\*?/g, "") // remove asterisks/bold
      .replace(/^#+\s*/gm, "") // remove markdown headings
      .replace(/`{1,3}/g, "") // remove backticks
      .replace(/^---$/gm, "") // remove hr
      .replace(/\s*#\w+\b/g, "") // remove hashtags
      .replace(/\s{2,}/g, " ")
      .trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text, style, platform }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { outputs: GenerateResponse[]; structured?: any };
      setOutputs(data.outputs || []);
      setStructured(data.structured);

      // persist to local history
      const raw = (data.outputs?.[0]?.content as string) || "";
      const saved = saveOutput(uid, { mode, text, style, platform, structured: data.structured, raw });
      if (saved) { setLastId(saved.id); setIsFav(!!saved.favorite); }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const download = (format: "txt" | "pdf") => {
    const raw = outputs?.[0]?.content ? cleanText(outputs[0].content) : "";
    const base = formatReadable(structured as any, mode, raw);
    const content = sanitizePlain(base);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "pdf") {
      const blob = makePdfBlob(content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `contenta_${mode}_${ts}.pdf`; a.click(); URL.revokeObjectURL(url);
    } else {
      downloadBlob(`contenta_${mode}_${ts}.txt`, content.replace(/\n/g, "\r\n"));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Mode</label>
            <select value={mode} onChange={(e)=>setMode(e.target.value as Mode)} className="w-full border rounded-md px-3 py-2">
              <option value="generate">Script/Captions</option>
              <option value="ideas">Ideas/Brainstorm</option>
              <option value="enhance">Enhance/Rewrite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Style/Tone</label>
            <select value={style} onChange={(e)=>setStyle(e.target.value)} className="w-full border rounded-md px-3 py-2">
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
          <label className="block text-sm mb-1">Platform</label>
          <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="w-full border rounded-md px-3 py-2">
            <option>instagram</option>
            <option>x</option>
            <option>tiktok</option>
            <option>youtube</option>
            <option>blog</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Text / Topic</label>
          <textarea value={text} onChange={(e)=>setText(e.target.value)} required rows={6} placeholder="Enter topic or paste text..." className="w-full border rounded-md px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60">
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Outputs</h3>
          {structured || outputs.length>0 ? (
            <div className="flex gap-2">
              <button
                disabled={!lastId}
                onClick={()=>{ if(!lastId) return; const t = toggleFavorite(uid, lastId); setIsFav(!!t?.favorite); }}
                className="text-xs px-2 py-1 border rounded disabled:opacity-60"
              >{isFav? "Favorited" : "Favorite"}</button>
              {/* download buttons temporarily hidden */}
            </div>
          ) : null}
        </div>
        {(!structured && outputs.length === 0) && (
          <p className="text-sm text-gray-500">No outputs yet. Generate something to see results here.</p>
        )}

        {/* Structured rendering */}
        {structured && mode === "generate" && (
          <div className="space-y-6">
            {"captions" in (structured as any) && (
              <section className="border rounded-md p-4 bg-white">
                <h4 className="font-semibold">Captions</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {(structured as StructuredGenerate)!.captions.map((c, i) => (
                    <li key={i} className="text-sm">{cleanText(c)}</li>
                  ))}
                </ul>
              </section>
            )}
            {"script" in (structured as any) && (
              <section className="border rounded-md p-4 bg-white">
                <h4 className="font-semibold">Short Video Script</h4>
                <p className="text-sm text-gray-600 mt-1">Title: {(structured as StructuredGenerate)!.script.title}</p>
                <div className="mt-3 space-y-4">
                  <div>
                    <h5 className="font-medium text-sm">Hook</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      {(structured as StructuredGenerate)!.script.hook.map((x, i) => <li key={i}>{cleanText(x)}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Body</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      {(structured as StructuredGenerate)!.script.body.map((x, i) => <li key={i}>{cleanText(x)}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Call to Action</h5>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      {(structured as StructuredGenerate)!.script.cta.map((x, i) => <li key={i}>{cleanText(x)}</li>)}
                    </ul>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {structured && mode === "ideas" && (
          <div className="grid md:grid-cols-2 gap-4">
            {(structured as StructuredIdeas)!.ideas.map((idea, i) => (
              <div key={i} className="border rounded-md p-4 bg-white">
                <h4 className="font-semibold">{cleanText(idea.title)}</h4>
                <p className="text-sm text-gray-700 mt-1">{cleanText(idea.hook)}</p>
              </div>
            ))}
          </div>
        )}

        {structured && mode === "enhance" && (
          <div className="space-y-3">
            {(structured as StructuredEnhance)!.variants.map((v, i) => (
              <div key={i} className="border rounded-md p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{cleanText(v)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fallback plain text rendering */}
        {!structured && outputs.length > 0 && (
          <div className="space-y-3">
            {outputs.map((o, idx) => (
              <div key={idx} className="border rounded-md p-3 bg-white">
                <pre className="whitespace-pre-wrap text-sm">{cleanText(o.content)}</pre>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>navigator.clipboard.writeText(cleanText(o.content))} className="text-xs px-2 py-1 border rounded">Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function sanitizePlain(s: string) {
  return (s || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatReadable(structured: any | undefined, mode: string, raw: string) {
  if (!structured) return raw;
  const s: any = structured;
  const bullets = (arr: string[]) => arr.map(v => `- ${v}`).join("\n");
  const parts: string[] = [];
  if (mode === "generate") {
    if (s.captions?.length) parts.push("Captions", bullets(s.captions), "");
    if (s.script) {
      parts.push("Short Video Script");
      if (s.script.title) parts.push(`Title: ${s.script.title}`);
      if (s.script.hook?.length) parts.push("", "Hook", bullets(s.script.hook));
      if (s.script.body?.length) parts.push("", "Body", bullets(s.script.body));
      if (s.script.cta?.length) parts.push("", "Call to Action", bullets(s.script.cta));
    }
    return parts.join("\n");
  }
  if (mode === "ideas" && s?.ideas?.length) {
    const list = s.ideas.map((it: any, i: number) => `${i + 1}. ${it.title || "Idea"} - ${it.hook || ""}${it.platform ? ` (${it.platform})` : ""}`).join("\n");
    return `Ideas\n${list}`;
  }
  if (mode === "enhance" && s?.variants?.length) {
    const list = s.variants.map((v: string, i: number) => `${i + 1}. ${v}`).join("\n\n");
    return `Enhanced Variants\n${list}`;
  }
  return raw;
}

function makePdfBlob(text: string) {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const wrap = (t: string, max = 90) => {
    const out: string[] = []; let s = t;
    while (s.length > max) { let i = s.lastIndexOf(' ', max); if (i < max * 0.6) i = max; out.push(s.slice(0, i)); s = s.slice(i).trimStart(); }
    out.push(s); return out;
  };
  const lines = text.split(/\r?\n/).flatMap(l => wrap(l)).map(esc);
  const stream = `BT /F1 12 Tf 16 TL 50 780 Td (${lines.shift() || ""}) Tj` + lines.map(l=>` T* (${l}) Tj`).join("") + ` ET`;
  const header = "%PDF-1.4\n";
  let body = ""; const offs: number[] = []; const add = (s: string) => { offs.push(header.length + body.length); body += s; };
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  add("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n");
  add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  const xrefPos = header.length + body.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n${offs.map(o=>String(o).padStart(10,'0')+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new Blob([header + body + xref], { type: 'application/pdf' });
}
