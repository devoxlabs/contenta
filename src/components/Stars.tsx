"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

export default function StarsBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const stars: { x: number; y: number; r: number; t: number; s: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      stars.length = 0;
      const count = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 9000));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: (Math.random() * 1.2 + 0.3) * DPR,
          t: Math.random() * Math.PI * 2,
          s: 0.5 + Math.random() * 0.8,
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        st.t += 0.015 * st.s;
        const a = 0.15 + 0.85 * (0.5 + Math.sin(st.t) * 0.5);
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      }
    };

    // Immediate first paint before scheduling animation
    drawFrame();
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden className="fixed inset-0 z-0 opacity-[0.6] pointer-events-none" />
  );
}
