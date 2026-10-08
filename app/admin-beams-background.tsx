"use client";

import { useEffect, useRef } from "react";

type Beam = {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
};

export function AdminBeamsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    const surface = canvas;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 1;
    let height = 1;
    let beams: Beam[] = [];
    let frame = 0;
    let previousTime = 0;
    let visible = true;
    let disposed = false;

    function createBeam(): Beam {
      return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 2 - height,
        width: 35 + Math.random() * 65,
        length: height * 2.5,
        angle: (-35 + Math.random() * 10) * Math.PI / 180,
        speed: 20 + Math.random() * 25,
        opacity: 0.12 + Math.random() * 0.13,
        hue: 190 + Math.random() * 70,
        pulse: Math.random() * Math.PI * 2,
      };
    }

    function draw(delta: number) {
      ctx.clearRect(0, 0, width, height);
      for (const beam of beams) {
        beam.y -= beam.speed * delta;
        beam.pulse += delta;
        if (beam.y + beam.length < -100) {
          beam.y = height + 100;
          beam.x = Math.random() * width;
        }
        const opacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2);
        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate(beam.angle);
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        gradient.addColorStop(0, `hsla(${beam.hue}, 75%, 65%, 0)`);
        gradient.addColorStop(0.15, `hsla(${beam.hue}, 75%, 65%, ${opacity * 0.5})`);
        gradient.addColorStop(0.4, `hsla(${beam.hue}, 75%, 65%, ${opacity})`);
        gradient.addColorStop(0.6, `hsla(${beam.hue}, 75%, 65%, ${opacity})`);
        gradient.addColorStop(1, `hsla(${beam.hue}, 75%, 65%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        ctx.restore();
      }
    }

    function animate(time: number) {
      frame = 0;
      if (disposed || document.hidden || !visible || reducedMotion.matches) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      draw(delta);
      frame = requestAnimationFrame(animate);
    }

    function syncAnimation() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      if (disposed) return;
      draw(0);
      if (!document.hidden && visible && !reducedMotion.matches) {
        frame = requestAnimationFrame(animate);
      }
    }

    function resize() {
      const bounds = surface.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      beams = Array.from({ length: width < 600 ? 14 : 24 }, createBeam);
      syncAnimation();
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      syncAnimation();
    });
    resizeObserver.observe(surface);
    intersectionObserver.observe(surface);
    reducedMotion.addEventListener("change", syncAnimation);
    document.addEventListener("visibilitychange", syncAnimation);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", syncAnimation);
      document.removeEventListener("visibilitychange", syncAnimation);
    };
  }, []);

  return (
    <div className="adminBeamsBackground" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
