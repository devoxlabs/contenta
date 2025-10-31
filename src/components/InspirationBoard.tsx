"use client";
import { useMemo } from "react";
import { loadOutputs } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import CopyButton from "@/components/CopyButton";

export default function InspirationBoard() {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const items = useMemo(() => loadOutputs(uid).filter((x) => x.mode === "ideas" && x.structured?.ideas), [uid]);

  return (
    <section className="space-y-4 text-white">
      {items.length === 0 && <p className="text-sm text-zinc-400">No brainstorms yet. Use Ideas mode to populate the board.</p>}
      <div className="grid md:grid-cols-3 gap-3">
        {items.flatMap((rec) => rec.structured.ideas.map((idea: any, i: number) => (
          <article key={`${rec.id}-${i}`} className="border border-white/15 rounded-md p-3 bg-black">
            <div className="flex items-center justify-between">
              <h4 className="font-medium" style={{ fontFamily: "var(--font-dot)" }}>{idea.title}</h4>
              {idea.platform && <span className="text-xs bg-white/10 border border-white/20 px-2 py-0.5 rounded">{idea.platform}</span>}
            </div>
            <p className="text-sm text-zinc-300 mt-1">{idea.hook}</p>
            <div className="mt-2">
              <CopyButton text={`${idea.title} — ${idea.hook}`} />
            </div>
          </article>
        )))}
      </div>
    </section>
  );
}

