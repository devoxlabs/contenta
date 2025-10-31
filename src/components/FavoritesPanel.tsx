"use client";
import { useEffect, useState } from "react";
import { loadOutputs, toggleFavorite, OutputRecord } from "@/lib/storage";
import OutputCard from "@/components/OutputCard";
import { useAuth } from "@/context/AuthContext";

export default function FavoritesPanel() {
  const { user } = useAuth();
  const uid = user?.uid || "local";
  const [items, setItems] = useState<OutputRecord[]>([]);

  const refresh = () => setItems(loadOutputs(uid).filter((x) => x.favorite));

  useEffect(() => {
    refresh();
  }, [uid]);

  return (
    <section className="space-y-3 text-white">
      {items.length === 0 && (
        <p className="text-sm text-zinc-400">No favorites yet. Star items from History.</p>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((rec) => (
          <article key={rec.id} className="border border-white/15 rounded-md p-3 bg-black fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{rec.mode} • {new Date(rec.createdAt).toLocaleDateString()}</h4>
              <button onClick={()=>{toggleFavorite(uid, rec.id); refresh();}} aria-label="unfavorite" className="btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </button>
            </div>
            <p className="mt-1 text-sm"><span className="text-zinc-400 mr-2">Topic:</span> {rec.text}</p>
            <div className="mt-3">
              <OutputCard record={rec} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

