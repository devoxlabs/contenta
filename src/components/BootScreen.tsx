"use client";
import StarsBackground from "@/components/Stars";

export default function BootScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white boot-fade">
      <StarsBackground />
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <div className="w-14 h-14 flex items-center justify-center rounded-full border border-white/30 bg-black/40 shadow-inner">
          <IconSpark className="spin-slow" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold" style={{ fontFamily: "var(--font-dot)" }}>Contenta</h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-300">Warming up ideas and scripts…</p>
        </div>
      </div>
    </div>
  );
}

function IconSpark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeWidth="1.5"/>
    </svg>
  );
}


