"use client";
import { useRef, useState } from "react";
import CopyButton from "@/components/CopyButton";

import { useAuth } from "@/context/AuthContext";
import { saveOutput, toggleFavorite } from "@/lib/storage";

export default function ImageAssistant({ platform, style }: { platform: string; style: string }) {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageOk, setImageOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [isFav, setIsFav] = useState<boolean>(false);

  const onPick = () => fileInputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // use DataURL so we can persist to localStorage
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(String(reader.result));
      setImageOk(true);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  const onAnalyze = async () => {
    if (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0) {
      setError("Please choose an image first.");
      return;
    }
    setError(null);
    setLoading(true);
    setCaptions([]);
    setIdeas([]);
    try {
      const fd = new FormData();
      fd.append("file", fileInputRef.current.files[0]);
      fd.append("style", style);
      fd.append("platform", platform);
      const res = await fetch("/api/vision", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Vision failed: ${res.status}`);
      const data = (await res.json()) as { structured?: { captions?: string[]; ideas?: string[] }; raw?: string };
      const caps = data.structured?.captions || [];
      const idz = data.structured?.ideas || [];
      setCaptions(caps);
      setIdeas(idz);

      // save to history
      const name = fileInputRef.current.files[0]?.name || "image";
      const saved = saveOutput(uid, {
        mode: "vision",
        text: `Image: ${name}`,
        style,
        platform,
        structured: data.structured,
        raw: data.raw || "",
        imageDataUrl: previewUrl || undefined,
        imageName: name,
      });
      if (saved) { setLastId(saved.id); setIsFav(!!saved.favorite); }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const sanitizePlain = (s: string) => (s || "").replace(/[\*`#_>\|]/g, "").replace(/[\x00-\x1F\x7F-\uFFFF]/g, "").replace(/\s{2,}/g, " ").trim();
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
  const download = (format: "txt" | "pdf") => {
    const header = (text: string) => text.toUpperCase();
    const bullets = (arr: string[]) => arr.map(v => `• ${v}`).join("\n");
    const parts: string[] = [];
    if (captions.length) parts.push(`${header("Captions")}`, bullets(captions), "");
    if (ideas.length) parts.push(`${header("Ideas")}`, bullets(ideas));
    const content = sanitizePlain(parts.join("\n"));
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === 'pdf') {
      const blob = makePdfBlob(content);
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`contenta_vision_${ts}.pdf`; a.click(); URL.revokeObjectURL(url);
    } else {
      downloadBlob(`contenta_vision_${ts}.txt`, content);
    }
  };

  return (
    <div className="border border-white/15 rounded-md p-4 bg-black max-w-3xl mx-auto text-white">
      <h3 className="font-medium">Image Assistant</h3>
      <p className="text-sm text-zinc-400">Upload an image to get caption ideas and prompts.</p>

      <div
        onDrop={onDrop}
        onDragOver={(e)=>e.preventDefault()}
        className="mt-3 border-2 border-dashed border-white/20 rounded-md p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5"
        onClick={onPick}
      >
        <div className="w-36 h-36 flex items-center justify-center overflow-hidden rounded-md bg-white/5 border border-white/15 mx-auto">
          {previewUrl && imageOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="preview" className="object-contain w-full h-full" onError={()=>setImageOk(false)} />
          ) : (
            <UploadIcon />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-zinc-300"><span className="font-medium">Drag & drop</span> or click to upload. JPG/PNG/WebP, up to ~5MB recommended.</p>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e)=>onFiles(e.target.files)} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={onAnalyze} disabled={loading} aria-label="generate from image" className="btn-icon disabled:opacity-60">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v5M12 17v5M4.22 4.22l3.54 3.54M16.24 16.24l3.54 3.54M2 12h5M17 12h5M4.22 19.78l3.54-3.54M16.24 7.76l3.54-3.54" strokeWidth="1.5"/></svg>
        </button>
        <button disabled={!lastId} onClick={()=>{ if(!lastId) return; const t = toggleFavorite(uid, lastId); setIsFav(!!t?.favorite); }} aria-label="favorite" className="btn-icon disabled:opacity-60">
          {isFav ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeWidth="1.5"/></svg>
          )}
        </button>
        {/* download buttons temporarily hidden */}
        {previewUrl && (
          <button onClick={()=>{setPreviewUrl(null); setCaptions([]); setIdeas([]);}} aria-label="clear" className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" strokeWidth="1.7"/><path d="M8 6V4h8v2" strokeWidth="1.7"/><rect x="6" y="6" width="12" height="14" rx="2"/></svg>
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {(captions.length>0 || ideas.length>0) && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {captions.length>0 && (
            <section>
              <h4 className="font-semibold">Captions</h4>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                {captions.map((c, i)=> (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-1">{c}</span>
                    <CopyButton text={c} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {ideas.length>0 && (
            <section>
              <h4 className="font-semibold">Ideas</h4>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                {ideas.map((c, i)=> (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" className="text-zinc-400">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.5"/>
      <polyline points="7 10 12 5 17 10" strokeWidth="1.5"/>
      <line x1="12" y1="5" x2="12" y2="16" strokeWidth="1.5"/>
    </svg>
  );
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content.replace(/\n/g, '\r\n')], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatForDownload(structured: any | undefined, raw: string, mode: string, format: "txt"|"md") {
  if (structured) {
    const body = JSON.stringify(structured, null, 2);
    if (format === "md") return `# ${mode}\n\n\n${"```"}json\n${body}\n${"```"}\n`;
    return body;
  }
  return raw;
}



