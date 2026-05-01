"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./landing-tokens.css";
import "./landing-v2.css";
import { GLSLHills } from "@/components/ui/glsl-hills";

/* ─────────────────────────────────────────────────────────── */
/*  TYPES                                                       */
/* ─────────────────────────────────────────────────────────── */
type Theme = "dark" | "light";

/* ─────────────────────────────────────────────────────────── */
/*  ANIMATED COUNTER                                            */
/* ─────────────────────────────────────────────────────────── */
function AnimatedCounter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1400,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const value = to * easeOut(progress);
          el.textContent =
            prefix + value.toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, prefix, suffix, decimals, duration]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  TERMINAL TYPEWRITER                                         */
/* ─────────────────────────────────────────────────────────── */
interface TermLine {
  type: "user" | "engine" | "response" | "meta";
  segments: { text: string; cls?: string }[];
}

function TerminalCard() {
  const [lines, setLines] = useState<TermLine[]>([]);
  const [typing, setTyping] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const mountedRef = useRef(true);

  const sleep = (ms: number) =>
    new Promise<void>((res) => setTimeout(res, ms));

  const typeText = useCallback(
    async (
      setter: (line: TermLine) => void,
      lineTemplate: TermLine,
      msPerChar = 38
    ) => {
      const fullSegs = lineTemplate.segments;
      let built: { text: string; cls?: string }[] = fullSegs.map((s) => ({
        ...s,
        text: "",
      }));

      for (let si = 0; si < fullSegs.length; si++) {
        const fullText = fullSegs[si].text;
        for (let ci = 0; ci < fullText.length; ci++) {
          if (!mountedRef.current) return;
          built = built.map((b, i) =>
            i === si ? { ...b, text: fullText.slice(0, ci + 1) } : b
          );
          setter({ ...lineTemplate, segments: built });
          const jitter = msPerChar + Math.random() * 16 - 8;
          await sleep(Math.max(jitter, 8));
        }
      }
    },
    []
  );

  const runSequence = useCallback(async () => {
    if (!mountedRef.current) return;
    setLines([]);
    setTyping(true);
    setThinking(false);

    // Phase 1 — user prompt
    const userLine: TermLine = {
      type: "user",
      segments: [
        { text: "user: ", cls: "ke-term-user" },
        {
          text: "What is our policy on remote work equipment?",
          cls: "ke-term-text",
        },
      ],
    };
    setLines([{ ...userLine, segments: userLine.segments.map((s) => ({ ...s, text: "" })) }]);
    await typeText(
      (l) => setLines([l]),
      userLine,
      38
    );

    if (!mountedRef.current) return;

    // Phase 2 — thinking
    setThinking(true);
    setTyping(false);
    for (let i = 0; i < 6; i++) {
      if (!mountedRef.current) return;
      setDotCount((d) => (d % 3) + 1);
      await sleep(200);
    }
    setThinking(false);
    setTyping(true);

    // Phase 3 — engine scanning
    const scanLine: TermLine = {
      type: "engine",
      segments: [
        { text: "engine: ", cls: "ke-term-engine" },
        { text: "Searching ", cls: "ke-term-text" },
        { text: "[Employee-Handbook-2024]", cls: "ke-term-hl-violet" },
        { text: "...", cls: "ke-term-text" },
      ],
    };
    const scanBlank: TermLine = {
      ...scanLine,
      segments: scanLine.segments.map((s) => ({ ...s, text: "" })),
    };
    setLines((prev) => [...prev, scanBlank]);
    await typeText(
      (l) => setLines((prev) => [...prev.slice(0, -1), l]),
      scanLine,
      22
    );

    if (!mountedRef.current) return;

    // Phase 4 — response
    const respLine: TermLine = {
      type: "response",
      segments: [
        { text: "       All full-time employees are eligible for a ", cls: "ke-term-text" },
        { text: "$500 stipend", cls: "ke-term-hl-blue" },
        { text: " for home office setup, renewable every ", cls: "ke-term-text" },
        { text: "24 months", cls: "ke-term-hl-blue" },
        { text: ".", cls: "ke-term-text" },
      ],
    };
    const respBlank: TermLine = {
      ...respLine,
      segments: respLine.segments.map((s) => ({ ...s, text: "" })),
    };
    setLines((prev) => [...prev, respBlank]);
    await typeText(
      (l) => setLines((prev) => [...prev.slice(0, -1), l]),
      respLine,
      18
    );

    if (!mountedRef.current) return;

    // Phase 5 — metadata
    const metaLine: TermLine = {
      type: "meta",
      segments: [
        {
          text: "       Source: Finance Section, Page 12. Updated 2 months ago.",
          cls: "ke-term-meta",
        },
      ],
    };
    const metaBlank: TermLine = {
      ...metaLine,
      segments: metaLine.segments.map((s) => ({ ...s, text: "" })),
    };
    setLines((prev) => [...prev, metaBlank]);
    await typeText(
      (l) => setLines((prev) => [...prev.slice(0, -1), l]),
      metaLine,
      24
    );

    if (!mountedRef.current) return;
    setTyping(false);

    // Wait before looping
    await sleep(6000);
    if (!mountedRef.current) return;
    runSequence();
  }, [typeText]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => runSequence(), 800);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [runSequence]);

  return (
    <div className="ke-terminal" aria-label="AI Shell interactive query demo">
      <div className="ke-terminal-bar">
        <div className="ke-terminal-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="ke-terminal-title">AI-SHELL — INTERACTIVE-QUERY</span>
      </div>
      <div className="ke-terminal-body">
        {lines.map((line, li) => (
          <div key={li} className="ke-terminal-line">
            <span className="ke-terminal-gutter" aria-hidden="true">
              {String(li + 1).padStart(2, "0")}
            </span>
            <span>
              {line.segments.map((seg, si) => (
                <span key={si} className={seg.cls ?? ""}>
                  {seg.text}
                </span>
              ))}
            </span>
          </div>
        ))}
        {thinking && (
          <div className="ke-terminal-line">
            <span className="ke-terminal-gutter" aria-hidden="true">
              {String(lines.length + 1).padStart(2, "0")}
            </span>
            <span className="ke-term-engine">
              {"● ".repeat(dotCount)}
            </span>
          </div>
        )}
        {typing && (
          <span className="ke-cursor" aria-hidden="true" />
        )}
        {!typing && !thinking && lines.length > 0 && (
          <span className="ke-cursor" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  RADAR VISUALIZATION                                         */
/* ─────────────────────────────────────────────────────────── */
function RadarViz() {
  const scanRef = useRef<SVGLineElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const cx = 80, cy = 80, r = 70;

    const spin = () => {
      if (!scanRef.current) return;
      angleRef.current = (angleRef.current + 0.8) % 360;
      const rad = (angleRef.current * Math.PI) / 180;
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy + r * Math.sin(rad);
      scanRef.current.setAttribute("x2", x2.toString());
      scanRef.current.setAttribute("y2", y2.toString());
      rafRef.current = requestAnimationFrame(spin);
    };
    rafRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      viewBox="0 0 160 160"
      className="ke-radar-svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="scanGrad" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="var(--ke-accent-violet)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ke-trace-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--ke-accent-purple)" />
          <stop offset="100%" stopColor="var(--ke-accent-blue)" />
        </linearGradient>
      </defs>
      {/* Rings */}
      <circle cx="80" cy="80" r="70" className="ke-radar-ring" />
      <circle cx="80" cy="80" r="50" className="ke-radar-ring" />
      <circle cx="80" cy="80" r="30" className="ke-radar-ring" />
      <circle cx="80" cy="80" r="10" className="ke-radar-ring" />
      {/* Pulsing outer ring */}
      <circle cx="80" cy="80" r="62" className="ke-radar-pulse" />
      {/* Crosshairs */}
      <line x1="80" y1="10" x2="80" y2="150" className="ke-radar-axis" />
      <line x1="10" y1="80" x2="150" y2="80" className="ke-radar-axis" />
      {/* Data polygon */}
      <polygon
        points="80,20 130,55 115,115 45,115 30,55"
        className="ke-radar-data"
      />
      {/* Scan line */}
      <line
        ref={scanRef}
        x1="80" y1="80"
        x2="150" y2="80"
        stroke="url(#scanGrad)"
        strokeWidth="1.5"
        className="ke-radar-scan"
      />
      {/* Data points */}
      <circle cx="130" cy="55" r="3" fill="var(--ke-accent-purple)" opacity="0.8" />
      <circle cx="80" cy="20" r="2" fill="var(--ke-accent-blue)" opacity="0.6" />
      <circle cx="45" cy="115" r="2" fill="var(--ke-accent-violet)" opacity="0.6" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  WEBGL SHADER CANVAS                                         */
/* ─────────────────────────────────────────────────────────── */
function ShaderCanvas({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(performance.now());
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const isDarkRef = useRef(isDark);

  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check reduced motion / mobile
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth <= 768;
    if (reduceMotion || isMobile) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) return;
    glRef.current = gl;

    const vert = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const frag = `
      precision mediump float;
      uniform float uTime;
      uniform vec2  uMouse;
      uniform float uDark;
      varying vec2  vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        uv += (uMouse - 0.5) * 0.04;

        float t = uTime * 0.0003;
        float n = fbm(uv * 2.5 + t);
        float n2 = fbm(uv * 1.8 - t * 0.7 + vec2(3.2, 1.7));
        float blend = n * 0.6 + n2 * 0.4;

        vec3 dark1  = vec3(0.04, 0.03, 0.20);
        vec3 dark2  = vec3(0.18, 0.10, 0.55);
        vec3 dark3  = vec3(0.05, 0.12, 0.42);
        vec3 light1 = vec3(0.85, 0.82, 1.00);
        vec3 light2 = vec3(0.90, 0.88, 1.00);
        vec3 light3 = vec3(0.78, 0.80, 1.00);

        vec3 c;
        if (uDark > 0.5) {
          c = mix(dark1, dark2, blend);
          c = mix(c, dark3, n2 * 0.5);
        } else {
          c = mix(light1, light2, blend);
          c = mix(c, light3, n2 * 0.5);
        }

        // Grain
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        c += grain * 0.025;

        gl_FragColor = vec4(c, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    progRef.current = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uDark = gl.getUniformLocation(prog, "uDark");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.tx = e.clientX / window.innerWidth;
      mouseRef.current.ty = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouse);

    const draw = () => {
      if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return; }
      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.05;
      m.y += (m.ty - m.y) * 0.05;
      const t = performance.now() - startRef.current;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, m.x, m.y);
      gl.uniform1f(uDark, isDarkRef.current ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ke-shader-canvas"
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  DARK MODE TOGGLE ICON                                       */
/* ─────────────────────────────────────────────────────────── */
function ThemeIcon({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  MAIN LANDING PAGE                                           */
/* ─────────────────────────────────────────────────────────── */
export function LandingPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [annual, setAnnual] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [priceFlipping, setPriceFlipping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<{
    id: number; left: string; top: string; dur: string;
    ty: string; tx: string; delay: string; opacity: number;
  }[]>([]);

  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Theme persistence ────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ai-tracking-theme") as Theme | null;
    if (saved) setTheme(saved as Theme);
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
    // Generate particles client-side only to avoid SSR hydration mismatch
    setParticles(
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        dur: `${4 + Math.random() * 4}s`,
        ty: `${-20 - Math.random() * 30}px`,
        tx: `${(Math.random() - 0.5) * 30}px`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.2 + Math.random() * 0.3,
      }))
    );
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ai-tracking-theme", next);
      return next;
    });
  };

  // ── Scroll handler ───────────────────────────────────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const y = el.scrollTop;
      setNavScrolled(y > 40);
      setShowScrollTop(y > 400);

      const delta = y - lastScrollY.current;
      if (y > 200) {
        setNavHidden(delta > 0);
      } else {
        setNavHidden(false);
      }
      lastScrollY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Scroll-reveal observer ───────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const siblings = Array.from(
              target.parentElement?.querySelectorAll("[data-ke-reveal]") ?? []
            );
            const idx = siblings.indexOf(target);
            setTimeout(() => target.classList.add("ke-in-view"), idx * 80);
            observer.unobserve(target);
          }
        });
      },
      {
        threshold: 0.05,
        root: container,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    const reveals = container.querySelectorAll("[data-ke-reveal]");
    reveals.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // ── Chip reveal observer ─────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          document.querySelectorAll(".ke-chip").forEach((el) =>
            el.classList.add("visible")
          );
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    const frame = document.querySelector(".ke-device-frame");
    if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // ── magnetic cursor ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 768) return;

    const ring = document.querySelector<HTMLElement>(".ke-cursor-ring");
    const dot = document.querySelector<HTMLElement>(".ke-cursor-dot");
    if (!ring || !dot) return;

    let rx = 0, ry = 0, dx = 0, dy = 0;

    const onMove = (e: MouseEvent) => {
      dx = e.clientX;
      dy = e.clientY;
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
    };

    let raf = 0;
    const loop = () => {
      rx += (dx - rx) * 0.12;
      ry += (dy - ry) * 0.12;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // ── High-performance 3D tilt ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 768) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".ke-bento-card, .ke-device-frame"));
    if (targets.length === 0) return;

    // Cache rects to avoid layout thrashing on every mousemove
    const rects = targets.map(t => t.getBoundingClientRect());

    let mouseX = 0;
    let mouseY = 0;
    let rafId = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const update = () => {
      targets.forEach((el, i) => {
        const rect = rects[i];
        const isDashboard = el.classList.contains("ke-device-frame");

        // Only calculate tilt if mouse is near the element (performance win)
        const buffer = 200;
        if (
          mouseX > rect.left - buffer &&
          mouseX < rect.right + buffer &&
          mouseY > rect.top - buffer &&
          mouseY < rect.bottom + buffer
        ) {
          const x = ((mouseX - rect.left) / rect.width - 0.5) * 2;
          const y = ((mouseY - rect.top) / rect.height - 0.5) * 2;
          const intensity = isDashboard ? 4 : 8;
          el.style.transform = `perspective(1000px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg) ${!isDashboard ? "translateY(-5px)" : ""}`;

          const shine = el.querySelector<HTMLElement>(".ke-card-shine");
          if (shine) {
            const px = ((mouseX - rect.left) / rect.width) * 100;
            const py = ((mouseY - rect.top) / rect.height) * 100;
            shine.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
            shine.style.opacity = "1";
          }
        } else {
          el.style.transform = "";
          const shine = el.querySelector<HTMLElement>(".ke-card-shine");
          if (shine) shine.style.opacity = "0";
        }
      });
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = requestAnimationFrame(update);

    // Update rects on resize
    const onResize = () => {
      targets.forEach((t, i) => rects[i] = t.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Pricing toggle helper ────────────────────────────────
  const handleBillingToggle = (isAnnual: boolean) => {
    if (isAnnual === annual) return;
    setPriceFlipping(true);
    setTimeout(() => {
      setAnnual(isAnnual);
      setPriceFlipping(false);
    }, 300);
  };

  // ── CTA ripple ───────────────────────────────────────────
  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove("ripple");
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add("ripple");
  };

  // ── Scroll to section ────────────────────────────────────
  const scrollTo = (id: string) => {
    if (mobileOpen) setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Pricing data ──────────────────────────────────────────
  const plans = [
    {
      id: "starter",
      name: "Starter",
      monthly: "$499",
      yearly: "$399",
      features: ["Up to 500 Documents", "10 Team Members", "Standard Connectors", "Basic Gap Analysis"],
      cta: "Begin Ingestion",
      ctaStyle: "outline" as const,
      cardClass: "",
    },
    {
      id: "growth",
      name: "Growth",
      monthly: "$1,299",
      yearly: "$1,039",
      features: ["Unlimited Documents", "Enterprise Connectors", "Real-Time Gap Analysis", "Dedicated AI Support", "Priority SLA"],
      cta: "Scale Intelligence",
      ctaStyle: "solid" as const,
      cardClass: "ke-plan-card-growth",
      recommended: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthly: "Custom",
      yearly: "Custom",
      features: ["Dedicated Clusters", "Custom Fine-tuning", "White-glove Onboarding", "High-compliance Orgs", "Custom SLA"],
      cta: "Talk to Strategy",
      ctaStyle: "outline" as const,
      cardClass: "ke-plan-card-enterprise",
    },
  ];

  // particles state is populated client-side in useEffect above

  return (
    <div
      data-ke-theme={theme}
      className="ke-root"
      style={{ height: "100svh", overflowY: "auto", overflowX: "hidden" }}
      ref={scrollContainerRef}
      id="ke-top"
    >
      {/* ── Custom Cursor ─────────────────────────────────── */}
      <div className="ke-cursor-ring" aria-hidden="true" />
      <div className="ke-cursor-dot" aria-hidden="true" />

      {/* ── Scroll Progress ───────────────────────────────── */}
      <div
        className="ke-scroll-progress"
        style={{ transform: "scaleX(0)", willChange: "transform" }}
        aria-hidden="true"
        id="ke-progress"
      />

      {/* ── Scroll To Top ─────────────────────────────────── */}
      <button
        className={`ke-scroll-top${showScrollTop ? " visible" : ""}`}
        onClick={() => scrollTo("ke-top")}
        aria-label="Scroll to top"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav
        className={`ke-nav${navScrolled ? " scrolled" : ""}${navHidden ? " hidden" : ""}`}
        aria-label="Main navigation"
        style={{ transition: "transform 0.35s cubic-bezier(0.23,1,0.32,1), height 0.4s cubic-bezier(0.23,1,0.32,1), background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease" }}
      >
        <a href="#ke-top" className="ke-nav-logo" onClick={(e) => { e.preventDefault(); scrollTo("ke-top"); }}>
          KnowledgeEngine
        </a>

        <ul className="ke-nav-links" role="list">
          {(["features", "pipeline", "pricing"] as const).map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => { e.preventDefault(); scrollTo(id); }}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            </li>
          ))}
          <li>
            <a href="#cta" onClick={(e) => { e.preventDefault(); scrollTo("cta"); }}>
              Demo
            </a>
          </li>
        </ul>

        <div className="ke-nav-actions">
          <button
            className="ke-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "light"}
          >
            <ThemeIcon isDark={theme === "dark"} />
          </button>
          <a
            href="#cta"
            className="ke-nav-cta"
            onClick={(e) => { e.preventDefault(); scrollTo("cta"); }}
          >
            Request Demo
          </a>
          <button
            className={`ke-hamburger${mobileOpen ? " open" : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle mobile menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── MOBILE NAV ────────────────────────────────────── */}
      <nav
        className={`ke-mobile-nav${mobileOpen ? " open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        {["features", "pipeline", "pricing", "demo"].map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => { e.preventDefault(); scrollTo(id === "demo" ? "cta" : id); }}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </a>
        ))}
        <button
          className="ke-theme-toggle"
          onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{ marginTop: "1rem" }}
        >
          <ThemeIcon isDark={theme === "dark"} />
        </button>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <main>
        <section className="ke-hero relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
          <GLSLHills theme={theme} />
          <div className="space-y-6 pointer-events-none z-10 text-center absolute px-4">
            <h1 className="font-semibold text-5xl md:text-7xl whitespace-pre-wrap leading-tight text-foreground">
              <span className="italic text-4xl md:text-6xl font-thin block">Your Company's Brain, <br /> </span>
              Always at Your Fingertips
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground/80 max-w-2xl mx-auto">
              Stop searching through endless folders and chats. KnowledgeEngine connects your team's tools to provide instant, accurate answers from your own data.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center pointer-events-auto">
              <button className="ke-btn-primary px-8 py-3 rounded-full font-medium transition-all hover:scale-105" onClick={handlePrimaryClick}>
                Get Started Free
              </button>
              <button className="ke-btn-secondary px-8 py-3 rounded-full font-medium transition-all hover:bg-foreground/5">
                Watch How it Works
              </button>
            </div>
          </div>
        </section>




        {/* ── STATS BAR ───────────────────────────────────── */}
        <section className="ke-stats-bar" aria-label="Platform impact">
          <div className="ke-stats-container">
            <div className="ke-stats-inner">
              {[
                { num: 40, suffix: "%", label: "Faster Search Times" },
                { num: 2, suffix: "hrs", label: "Saved per Employee/Week", decimals: 0 },
                { num: 100, suffix: "%", label: "Data Privacy Guaranteed" },
                { num: 15, suffix: "min", label: "Average Setup Time", decimals: 0 },
              ].map((s) => (
                <div key={s.label} className="ke-stat" data-ke-reveal>
                  <div className="ke-stat-num">
                    <AnimatedCounter to={s.num} suffix={s.suffix} decimals={s.decimals ?? 0} />
                  </div>
                  <div className="ke-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROBLEM SECTION ─────────────────────────────── */}
        <section className="ke-section ke-problem-section" id="problem">
          {/* Animated Blobs for Liquid Effect */}
          <div className="ke-liquid-blob ke-blob-1" aria-hidden="true" />
          <div className="ke-liquid-blob ke-blob-2" aria-hidden="true" />

          <div className="ke-section-inner" style={{ position: "relative", zIndex: 2 }}>
            <h2 className="ke-section-h2 text-center mb-16" data-ke-reveal style={{ fontSize: "var(--ke-text-h2)", fontWeight: 800 }}>
              The cost of <span className="ke-gradient-text">scattered information.</span>
            </h2>
            <div className="ke-problem-grid">
              {[
                { title: "The Search Trap", desc: "Teams spend hours every week digging through Slack, Notion, and email just to find one file." },
                { title: "Outdated Answers", desc: "Using the wrong version of a document leads to mistakes that cost time and money." },
                { title: "Lost Knowledge", desc: "When an employee leaves, their expertise often walks out the door with them." }
              ].map((p, i) => (
                <div key={i} className="ke-problem-card" data-ke-reveal>
                  <div className="ke-problem-num">Step 0{i + 1}</div>
                  <h3 className="ke-problem-h3">{p.title}</h3>
                  <p className="ke-problem-p">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ── MIND-BLOWING BENTO FEATURES ────────────────── */}
        <section id="features" className="ke-section" aria-labelledby="ke-features-h2">
          <div className="ke-section-header text-center mb-20" data-ke-reveal>
            <h2 id="ke-features-h2">
              <span className="ke-sec-muted">Engineered for</span>
              {" "}
              <span className="ke-sec-accent">Total Clarity.</span>
            </h2>
          </div>

          <div className="ke-bento-grid">
            {/* Main Feature: AI Search (Span 2x2) */}
            <div className="ke-bento-card ke-bento-main" data-ke-reveal>
              <div className="ke-bento-visual">
                <RadarViz />
              </div>
              <div className="ke-bento-content">
                <span className="ke-feature-badge">Neural Search</span>
                <h3 className="ke-feature-title">Instant AI Search</h3>
                <p className="ke-feature-desc">
                  Ask anything in plain English. Our engine retrieves exact answers from your documents, citing every source for 100% transparency.
                </p>
              </div>
            </div>

            {/* Sync Feature (Span 2x1) */}
            <div className="ke-bento-card ke-bento-wide" data-ke-reveal>
              <div className="ke-bento-visual">
                <div className="ke-sync-visual">
                  <div className="ke-sync-orbit">
                    <div className="ke-sync-node" style={{ "--idx": 0 } as any}>G</div>
                    <div className="ke-sync-node" style={{ "--idx": 1 } as any}>N</div>
                    <div className="ke-sync-node" style={{ "--idx": 2 } as any}>S</div>
                  </div>
                  <div className="ke-sync-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="ke-bento-content">
                <span className="ke-feature-badge">Connections</span>
                <h3 className="ke-feature-title">One-Click Sync</h3>
                <p className="ke-feature-desc">
                  Seamlessly connect Slack, Google Drive, and Notion. We keep your knowledge fresh in real-time.
                </p>
              </div>
            </div>

            {/* Health Feature */}
            <div className="ke-bento-card" data-ke-reveal>
              <div className="ke-bento-visual">
                <div className="ke-health-monitor">
                  <div className="ke-health-wave" />
                  <div className="ke-health-stat">98% Health</div>
                </div>
              </div>
              <div className="ke-bento-content">
                <span className="ke-feature-badge">Insights</span>
                <h3 className="ke-feature-title">Info Health</h3>
                <p className="ke-feature-desc">
                  Automatically flag outdated content and conflicts.
                </p>
              </div>
            </div>

            {/* Security Feature */}
            <div className="ke-bento-card" data-ke-reveal>
              <div className="ke-bento-visual">
                <div className="ke-security-pulse">
                  <div className="ke-pulse-circle" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue-ribbon-400)" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="ke-bento-content">
                <span className="ke-feature-badge">Privacy</span>
                <h3 className="ke-feature-title">Private & Secure</h3>
                <p className="ke-feature-desc">
                  Enterprise-grade encryption. Your data never leaves your control.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE INTELLIGENCE CENTER ─────────────── */}
        <section id="pipeline" className="ke-dashboard-section" aria-labelledby="ke-dash-h2">
          <div className="ke-dashboard-inner">
            <div className="ke-section-header text-center mb-16" data-ke-reveal>
              <h2 id="ke-dash-h2">
                Your Knowledge,{" "}
                <span className="ke-sec-accent">Organized.</span>
              </h2>
              <p className="ke-sec-p mx-auto max-w-2xl mt-4">
                The Intelligence Center gives you a birds-eye view of your company's collective brain.
              </p>
            </div>

            <div className="ke-dashboard-visual-wrapper" data-ke-reveal>
              <div className="ke-device-frame">
                <div className="ke-dash-ui">
                  {/* Sidebar */}
                  <aside className="ke-dash-sidebar">
                    <div className="ke-dash-logo">KnowledgeEngine</div>
                    <nav className="ke-dash-nav">
                      {["Overview", "Data Sources", "Knowledge Graph", "Intelligence Feed", "Security"].map((item, i) => (
                        <div key={item} className={`ke-dash-nav-item ${i === 0 ? "active" : ""}`}>
                          <div className="ke-dash-nav-icon" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </nav>
                  </aside>

                  {/* Main Content */}
                  <main className="ke-dash-main">
                    <header className="ke-dash-header">
                      <div className="ke-dash-breadcrumb">Intelligence Center / Overview</div>
                      <div className="ke-dash-search-container">
                        <div className="ke-dash-search-box">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                          </svg>
                          <span>Search knowledge...</span>
                        </div>
                      </div>
                    </header>

                    <div className="ke-dash-grid">
                      {/* Stat Cards */}
                      <div className="ke-dash-stats-row">
                        {[
                          { label: "DOCUMENTS", val: "12,482", color: "var(--color-blue-ribbon-400)" },
                          { label: "ACCURACY", val: "99.2%", color: "var(--color-blue-ribbon-300)" },
                          { label: "GAP ALERTS", val: "03", color: "var(--color-blue-ribbon-500)" },
                        ].map(stat => (
                          <div key={stat.label} className="ke-dash-stat-mini">
                            <span className="ke-stat-mini-label">{stat.label}</span>
                            <span className="ke-stat-mini-val" style={{ color: stat.color }}>{stat.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Main Chart Area */}
                      <div className="ke-dash-chart-card">
                        <div className="ke-card-header">Knowledge Coverage</div>
                        <div className="ke-dash-bars">
                          {[40, 70, 45, 90, 65, 80, 55, 95, 75, 100].map((h, i) => (
                            <div key={i} className="ke-dash-bar" style={{ height: `${h}%` }}>
                              <div className="ke-bar-fill" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Side Activity */}
                      <div className="ke-dash-activity-card">
                        <div className="ke-card-header">Recent Intelligence</div>
                        <div className="ke-activity-list">
                          {[
                            "How do I request a vacation?",
                            "What is our remote work policy?",
                            "Budget for Q3 marketing?",
                            "Lead for Project Phoenix?"
                          ].map((text, i) => (
                            <div key={i} className="ke-activity-item">
                              <div className="ke-activity-dot" />
                              <div className="ke-activity-text">{text}</div>
                            </div>
                          ))}
                        </div>
                        <div className="ke-verified-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Source Verified
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────── */}
        <section id="pricing" className="ke-pricing-section" aria-labelledby="ke-pricing-h2">
          <div data-ke-reveal>
            <h2 id="ke-pricing-h2" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "var(--ke-text-h2)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
              Predictable{" "}
              <span className="ke-sec-accent">Scale.</span>
            </h2>

            {/* Billing toggle */}
            <div className="ke-billing-toggle" role="group" aria-label="Billing cycle">
              <div
                className="ke-billing-pill"
                aria-hidden="true"
                style={{ left: annual ? "calc(50% + 0.25rem)" : "0.25rem", width: annual ? "calc(50% - 0.25rem)" : "calc(50% - 0.25rem)" }}
              />
              <button
                className={`ke-billing-btn${!annual ? " active" : ""}`}
                onClick={() => handleBillingToggle(false)}
                aria-pressed={!annual}
              >
                Monthly
              </button>
              <button
                className={`ke-billing-btn${annual ? " active" : ""}`}
                onClick={() => handleBillingToggle(true)}
                aria-pressed={annual}
              >
                Yearly
                <span className={`ke-yearly-badge${annual ? " show" : ""}`}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="ke-pricing-grid">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`ke-plan-card ${plan.cardClass ?? ""}`}
                data-ke-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {plan.recommended && (
                  <div className="ke-plan-recommended" aria-label="Recommended plan">
                    Recommended
                  </div>
                )}
                <div className="ke-plan-name">{plan.name}</div>
                <div className={`ke-plan-price${priceFlipping ? " flipping" : ""}`}>
                  {annual ? plan.yearly : plan.monthly}
                  {plan.monthly !== "Custom" && (
                    <span className="ke-plan-period">/mo</span>
                  )}
                </div>
                <div className="ke-plan-divider" aria-hidden="true" />
                <ul className="ke-plan-features" aria-label={`${plan.name} features`}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className="ke-check" aria-hidden="true">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`ke-plan-cta${plan.ctaStyle === "solid" ? " ke-plan-cta-solid" : " ke-plan-cta-outline"}`}
                  id={`ke-plan-${plan.id}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ──────────────────────────────────── */}
        <section id="cta" className="ke-cta-banner-section" aria-labelledby="ke-cta-h2">
          <div className="ke-cta-banner" data-ke-reveal>
            <div className="ke-banner-blob ke-banner-blob-1" aria-hidden="true" />
            <div className="ke-banner-blob ke-banner-blob-2" aria-hidden="true" />
            <div className="ke-banner-blob ke-banner-blob-3" aria-hidden="true" />
            <div className="ke-cta-banner-content">
              <h2 className="ke-cta-h2" id="ke-cta-h2">
                Ready to find answers
                <br />
                faster than ever?
              </h2>
              <p className="ke-cta-sub">
                Join hundreds of teams who use KnowledgeEngine to stay organized and informed.
                Get started today and turn your data into your greatest asset.
              </p>
              <a
                href="/sign-in"
                className="ke-cta-btn"
                id="ke-request-demo"
              >
                Get Started for Free
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="ke-footer" aria-label="Site footer">
        <div className="ke-footer-grid">
          {/* Logo column */}
          <div>
            <a href="#ke-top" className="ke-footer-logo" onClick={(e) => { e.preventDefault(); scrollTo("ke-top"); }}>
              KnowledgeEngine
            </a>
            <p className="ke-footer-tagline">
              Building the architectural foundation for the age of autonomous knowledge management.
            </p>
          </div>

          {/* Link columns */}
          {[
            {
              heading: "Product",
              links: [
                { label: "Documentation", href: "#features" },
                { label: "Changelog", href: "#" },
                { label: "Status", href: "#" },
                { label: "Pipeline", href: "#pipeline" },
              ],
            },
            {
              heading: "Company",
              links: [
                { label: "About", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Security", href: "#" },
              ],
            },
            {
              heading: "Legal",
              links: [
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Cookie Policy", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.heading} className="ke-footer-col">
              <span className="ke-footer-col-heading">{col.heading}</span>
              <ul role="list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} onClick={link.href.startsWith("#") ? (e) => { e.preventDefault(); scrollTo(link.href.slice(1)); } : undefined}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="ke-footer-bottom">
          <p className="ke-footer-copy">
            © 2024 KnowledgeEngine AI. Architecting Intelligence.
          </p>
          <div className="ke-footer-social">
            {/* Twitter */}
            <a href="#" aria-label="Twitter" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" aria-label="LinkedIn" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            {/* GitHub */}
            <a href="#" aria-label="GitHub" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Scroll progress updater */}
      <ScrollProgressUpdater containerRef={scrollContainerRef} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SCROLL PROGRESS UPDATER                                     */
/* ─────────────────────────────────────────────────────────── */
function ScrollProgressUpdater({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const el = containerRef.current;
    const bar = document.getElementById("ke-progress");
    if (!el || !bar) return;

    const onScroll = () => {
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      bar.style.transform = `scaleX(${progress})`;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  return null;
}

export default LandingPage;
