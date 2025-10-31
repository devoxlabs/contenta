"use client";
import { OutputRecord } from "@/lib/storage";
import CopyButton from "@/components/CopyButton";

function cleanText(s: string) {
  return s
    .replace(/\*\*?/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/`{1,3}/g, "")
    .replace(/^---$/gm, "")
    .replace(/\s*#\w+\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function OutputCard({ record }: { record: OutputRecord }) {
  const s = record.structured as any | undefined;

  if (record.mode === "generate" && s) {
    return (
      <div className="space-y-6 text-white">
        {s.captions?.length ? (
          <section className="border border-white/15 rounded-md p-4 bg-black">
            <h4 className="font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Captions</h4>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              {s.captions.map((c: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-1">{cleanText(c)}</span>
                  <CopyButton text={cleanText(c)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {s.script ? (
          <section className="border border-white/15 rounded-md p-4 bg-black">
            <h4 className="font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Short Video Script</h4>
            {s.script.title && (
              <p className="text-sm text-zinc-400 mt-1">Title: {cleanText(s.script.title)}</p>
            )}
            <div className="mt-3 space-y-4">
              <div>
                <h5 className="font-medium text-sm">Hook</h5>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                  {(s.script.hook || []).map((x: string, i: number) => <li key={i}>{cleanText(x)}</li>)}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-sm">Body</h5>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                  {(s.script.body || []).map((x: string, i: number) => <li key={i}>{cleanText(x)}</li>)}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-sm">Call to Action</h5>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                  {(s.script.cta || []).map((x: string, i: number) => <li key={i}>{cleanText(x)}</li>)}
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (record.mode === "ideas" && s?.ideas) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {s.ideas.map((idea: any, i: number) => (
          <article key={i} className="border border-white/15 rounded-md p-4 bg-black text-white">
            <h4 className="font-semibold" style={{ fontFamily: "var(--font-dot)" }}>{cleanText(idea.title || `Idea ${i+1}`)}</h4>
            <p className="text-sm text-zinc-300 mt-1">{cleanText(idea.hook || idea)}</p>
            {idea.platform && <span className="mt-2 inline-block text-xs bg-white/10 border border-white/20 px-2 py-0.5 rounded">{idea.platform}</span>}
          </article>
        ))}
      </div>
    );
  }

  if (record.mode === "enhance" && s?.variants) {
    return (
      <div className="space-y-3">
        {s.variants.map((v: string, i: number) => (
          <div key={i} className="border border-white/15 rounded-md p-3 bg-black">
            <p className="text-sm whitespace-pre-wrap">{cleanText(v)}</p>
            <div className="mt-2"><CopyButton text={cleanText(v)} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (record.mode === "vision" && s) {
    return (
      <div className="space-y-4 text-white">
        {record.imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.imageDataUrl} alt={record.imageName || "image"} className="mx-auto max-h-48 object-contain rounded-md border border-white/15" />
        )}
        <div className="space-y-4">
          {s.captions?.length ? (
            <section className="border border-white/15 rounded-md p-4 bg-black">
              <h4 className="font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Captions</h4>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                {s.captions.map((c: string, i: number) => (
                 <li key={i} className="flex items-start gap-2">
                    <span className="flex-1">{cleanText(c)}</span>
                    <CopyButton text={cleanText(c)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {s.ideas?.length ? (
            <section className="border border-white/15 rounded-md p-4 bg-black">
              <h4 className="font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Ideas</h4>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                {s.ideas.map((c: string, i: number) => <li key={i}>{cleanText(c)}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    );
  }

  // Fallback: raw
  return (
    <div className="border border-white/15 rounded-md p-3 bg-black text-white">
      <pre className="whitespace-pre-wrap text-sm">{cleanText(record.raw || "")}</pre>
    </div>
  );
}
