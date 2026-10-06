import { useEffect, useRef } from "react";

export interface ParticlePalette {
  dot: [number, number, number];
  line: [number, number, number];
}

export interface ParticleBackgroundConfig {
  canvas: HTMLCanvasElement;
  density?: number;
  minParticles?: number;
  maxParticles?: number;
  linkDistance?: number;
  repelDistance?: number;
  repelStrength?: number;
  maxSpeed?: number;
  minRadius?: number;
  maxRadius?: number;
  dotAlpha?: number;
  lineAlpha?: number;
  palette?: (theme: "light" | "dark") => ParticlePalette;
  getTheme?: () => "light" | "dark";
  reducedMotion?: boolean;
}

export interface ParticleBackgroundInstance {
  destroy: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const DARK: ParticlePalette = { dot: [245, 245, 245], line: [255, 59, 59] };
const LIGHT: ParticlePalette = { dot: [20, 20, 20], line: [225, 29, 29] };

function rgba(color: [number, number, number], alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(3)})`;
}

export function createParticleBackground(
  config: ParticleBackgroundConfig
): ParticleBackgroundInstance {
  const {
    canvas,
    density = 17000,
    minParticles = 8,
    maxParticles = 110,
    linkDistance = 130,
    repelDistance = 130,
    repelStrength = 1.7,
    maxSpeed = 0.32,
    minRadius = 0.6,
    maxRadius = 2.1,
    dotAlpha = 0.5,
    lineAlpha = 0.25,
    palette = (theme) => (theme === "light" ? LIGHT : DARK),
    getTheme = () =>
      document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  } = config;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => undefined };

  let w = 0;
  let h = 0;
  let particles: Particle[] = [];
  const mouse = { x: -9999, y: -9999 };
  let rafId = 0;
  let running = false;
  let destroyed = false;

  const build = () => {
    const count = Math.min(Math.max(Math.round((w * h) / density), minParticles), maxParticles);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * maxSpeed,
      vy: (Math.random() - 0.5) * maxSpeed,
      r: Math.random() * (maxRadius - minRadius) + minRadius,
    }));
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  };

  const draw = () => {
    const { dot, line } = palette(getTheme());
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < repelDistance * repelDistance) {
        const d = Math.sqrt(dist2) || 1;
        const force = (repelDistance - d) / repelDistance;
        p.x += (dx / d) * force * repelStrength;
        p.y += (dy / d) * force * repelStrength;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(dot, dotAlpha);
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDistance * linkDistance) {
          const alpha = (1 - Math.sqrt(d2) / linkDistance) * lineAlpha;
          ctx.strokeStyle = rgba(line, alpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    if (!running) return;
    draw();
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || destroyed) return;
    running = true;
    if (reducedMotion) {
      draw();
      running = false;
    } else {
      rafId = window.requestAnimationFrame(loop);
    }
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(rafId);
  }

  function onMouseMove(e: MouseEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseOut() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  function onVisibility() {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("mouseout", onMouseOut);
  document.addEventListener("visibilitychange", onVisibility);
  start();

  return {
    destroy() {
      destroyed = true;
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type UseParticleBackgroundConfig = Omit<ParticleBackgroundConfig, "canvas">;

export function useParticleBackground<
  T extends HTMLCanvasElement = HTMLCanvasElement,
>(config: UseParticleBackgroundConfig = {}) {
  const ref = useRef<T | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const instance = createParticleBackground({ canvas, ...configRef.current });
    return () => instance.destroy();
  }, []);

  return ref;
}

export interface ParticleBackgroundProps {
  className?: string;
  config?: UseParticleBackgroundConfig;
}

export function ParticleBackground({ className = "particle-background", config = {} }: ParticleBackgroundProps) {
  return <canvas ref={useParticleBackground(config)} className={className} aria-hidden="true" />;
}