'use client';
import { useEffect, useRef } from 'react';

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = 390, H = Math.max(window.innerHeight, 800);
    c.width = W; c.height = H;
    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      o: Math.random() * 0.8 + 0.15,
      s: Math.random() * 0.003 + 0.001,
      ph: Math.random() * Math.PI * 2,
    }));
    let raf: number, t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(195, H * 0.35, 0, 195, H * 0.35, H * 0.75);
      g.addColorStop(0, '#1a1060'); g.addColorStop(0.5, '#0a0520'); g.addColorStop(1, '#050310');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => {
        const op = s.o * (0.4 + 0.6 * Math.sin(t * s.s * 60 + s.ph));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${op})`; ctx.fill();
      });
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}
