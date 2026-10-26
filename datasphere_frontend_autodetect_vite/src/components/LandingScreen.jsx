import React, { useEffect, useRef } from "react";

export default function LandingScreen({ onEnter }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: Math.min(80, Math.floor(w / 20)) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 2

    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // dots
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
      }
      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 170) {
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    let raf = requestAnimationFrame(draw);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // prevent scroll only while on landing
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="landing-root">
      {/* animated gradient */}
      <div className="landing-gradient" />

      {/* particles */}
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* content */}
      <div className="landing-content">
        <div className="landing-card">
          <h1>Data Sphere</h1>
          <p className="tagline">A Self-Evolving Big Data Intelligence Platform</p>
          <button className="cta" onClick={onEnter}>
            Enter Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
