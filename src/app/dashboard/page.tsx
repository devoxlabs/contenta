"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import GeneratorForm from "@/components/GeneratorFormDark";
import ImageAssistant from "@/components/ImageAssistant";
import { useAuth } from "@/context/AuthContext";
import HistoryPanel from "@/components/HistoryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import SettingsPanel from "@/components/SettingsPanel";
import InspirationBoard from "@/components/InspirationBoard";
import DashboardSidebar from "@/components/DashboardSidebar";
import StarsBackground from "@/components/Stars";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<string>("outputs");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <StarsBackground />
      <div className="relative z-10">
        <NavBar />
      </div>
      <main className="flex-1 relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Dashboard</h1>
          <p className="text-sm text-zinc-400">Generate captions, ideas, and rewrite text with Gemini.</p>
        </div>
        {/* Mobile top tabs (inline under heading, non-sticky) */}
        <div className="md:hidden px-4 mb-3">
          <div className="flex items-center justify-around py-2 border-b border-white/10">
            {[
              { id: "outputs", label: "Outputs", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeWidth="1.5"/></svg> },
              { id: "history", label: "Recent", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path d="M12 7v6l4 2" strokeWidth="1.5"/></svg> },
              { id: "favorites", label: "Favs", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeWidth="1.2"/></svg> },
              { id: "inspiration", label: "Ideas", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18h6M10 22h4" strokeWidth="1.5"/><path d="M6 9a6 6 0 1 1 12 0c0 2.31-1.2 3.83-2.42 4.86-.53.45-1.04 1.46-1.22 2.14H9.64c-.18-.68-.69-1.69-1.22-2.14C7.2 12.83 6 11.31 6 9z" strokeWidth="1.5"/></svg> },
              { id: "settings", label: "Settings", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .67.39 1.27 1 1.51.31.13.64.19.98.19H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="1.2"/></svg> },
            ].map(t => {
              const anim = tab===t.id ? (t.id==='outputs'?'anim-spark': t.id==='history'?'anim-clock': t.id==='favorites'?'anim-star': t.id==='inspiration'?'anim-bulb':'anim-gear') : '';
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} className={`btn-icon ${tab===t.id? 'bg-white text-black' : ''}`} title={t.label} aria-label={t.label}>
                  <span className={anim}>{t.icon}</span>
                </button>
              )
            })}
          </div>
        </div>
        {/* no spacer needed since tabs are inline */}
        <div className="flex mx-auto max-w-7xl gap-6 px-4 pb-12">
          <DashboardSidebar tab={tab as any} onChange={(t)=>setTab(t)} />
          <section className="flex-1">
            <div key={tab} className="fade-slide">
              {tab === "outputs" && (
                <section className="max-w-3xl mx-auto space-y-8">
                  <div>
                    <h2 className="font-medium text-lg mb-3">Quick Start</h2>
                    <GeneratorForm />
                  </div>
                  <ImageAssistant platform="instagram" style="casual" />
                </section>
              )}
              {tab === "history" && <HistoryPanel />}
              {tab === "favorites" && <FavoritesPanel />}
              {tab === "inspiration" && <InspirationBoard />}
              {tab === "settings" && <SettingsPanel />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
