"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./landing-tokens.css";
import "./landing-v2.css";

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
          text: "How do we handle off-site data encryption for Tier-3 clients?",
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
        { text: "Scanning ", cls: "ke-term-text" },
        { text: "[SOP-SEC-2024]", cls: "ke-term-hl-violet" },
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
        { text: "       According to Section 4.2, all Tier-3 data requires ", cls: "ke-term-text" },
        { text: "AES-256", cls: "ke-term-hl-blue" },
        { text: " at rest with ", cls: "ke-term-text" },
        { text: "hardware-backed KMS", cls: "ke-term-hl-blue" },
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
          text: "       Last updated by Sarah J. — 14 days ago.",
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
      <circle cx="80" cy="20"  r="2" fill="var(--ke-accent-blue)"   opacity="0.6" />
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

    const uTime  = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uDark  = gl.getUniformLocation(prog, "uDark");

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
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
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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
    const saved = localStorage.getItem("ke-theme") as Theme | null;
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
      localStorage.setItem("ke-theme", next);
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const siblings = Array.from(
              el.parentElement?.querySelectorAll("[data-ke-reveal]") ?? []
            );
            const idx = siblings.indexOf(el);
            setTimeout(() => el.classList.add("ke-in-view"), idx * 80);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    const els = document.querySelectorAll("[data-ke-reveal]");
    els.forEach((el) => observer.observe(el));
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

  // ── 3D card tilt ─────────────────────────────────────────
  useEffect(() => {
    if (window.innerWidth <= 768) return;

    const cards = document.querySelectorAll<HTMLElement>(".ke-feature-card");

    const handlers: { el: HTMLElement; onMove: (e: MouseEvent) => void; onLeave: () => void }[] = [];

    cards.forEach((card) => {
      const shine = card.querySelector<HTMLElement>(".ke-card-shine");

      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        card.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-6px)`;
        if (shine) {
          const px = ((e.clientX - rect.left) / rect.width) * 100;
          const py = ((e.clientY - rect.top) / rect.height) * 100;
          shine.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
          shine.style.opacity = "1";
        }
      };

      const onLeave = () => {
        card.style.transform = "";
        if (shine) shine.style.opacity = "0";
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      handlers.push({ el: card, onMove, onLeave });
    });

    return () => {
      handlers.forEach(({ el, onMove, onLeave }) => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      });
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
      <div className="ke-cursor-dot"  aria-hidden="true" />

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
          <polyline points="18 15 12 9 6 15"/>
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
          style={{ marginTop: "16px" }}
        >
          <ThemeIcon isDark={theme === "dark"} />
        </button>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <main>
        <section className="ke-hero" aria-labelledby="ke-hero-h1">
          {/* WebGL Shader */}
          {/* WebGL shader — client only to avoid SSR mismatch */}
          {mounted && <ShaderCanvas isDark={theme === "dark"} />}

          {/* CSS Gradient fallback (always rendered, hidden when WebGL active) */}
          <div className="ke-hero-gradient-fallback" aria-hidden="true" />

          {/* Floating particles (dark, client only) */}
          {mounted && theme === "dark" && particles.length > 0 && (
            <div className="ke-particles" aria-hidden="true">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="ke-particle"
                  style={{
                    left: p.left,
                    top: p.top,
                    "--dur": p.dur,
                    "--ty": p.ty,
                    "--tx": p.tx,
                    animationDelay: p.delay,
                    opacity: p.opacity,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div className="ke-hero-content">
            {/* Badge */}
            <div className="ke-badge" role="status">
              <span className="ke-badge-dot" aria-hidden="true" />
              Neural Memory V4.2 Live
            </div>

            {/* H1 */}
            <h1 className="ke-hero-h1" id="ke-hero-h1">
              Your Organization&apos;s
              <br />
              <span className="ke-gradient-text">Neural Memory.</span>
            </h1>

            {/* Subtext */}
            <p className="ke-hero-sub">
              Transform scattered documentation into a living, breathing knowledge ecosystem.
              KnowledgeEngine curates, indexes, and surfaces intelligence before you even ask.
            </p>

            {/* CTAs */}
            <div className="ke-cta-group">
              <button
                className="ke-btn-primary"
                onClick={handlePrimaryClick}
                id="ke-cta-primary"
              >
                Start Mapping Intelligence
              </button>
              <button className="ke-btn-secondary" id="ke-cta-secondary">
                Watch System Tour
              </button>
            </div>

            {/* Terminal */}
            <TerminalCard />
          </div>
        </section>

        {/* ── STATS BAR ───────────────────────────────────── */}
        <section className="ke-stats-bar" aria-label="Platform statistics">
          <div className="ke-stats-inner">
            {[
              { num: 13.4, suffix: "%", label: "Active Knowledge Nodes" },
              { num: 2,    suffix: "ms", label: "Latency P99.9", decimals: 0 },
              { num: 68,   suffix: "M+", label: "Linked Vectors" },
              { num: 0.4,  suffix: "x",  label: "Engineering Speed", decimals: 1 },
            ].map((s) => (
              <div key={s.label} className="ke-stat" data-ke-reveal>
                <div className="ke-stat-num">
                  <AnimatedCounter to={s.num} suffix={s.suffix} decimals={s.decimals ?? 1} />
                </div>
                <div className="ke-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────── */}
        <section id="features" className="ke-section" aria-labelledby="ke-features-h2">
          <div className="ke-section-header" data-ke-reveal>
            <h2 id="ke-features-h2">
              <span className="ke-sec-muted">Architected for</span>
              {" "}
              <span className="ke-sec-accent">Logic.</span>
            </h2>
          </div>

          <div className="ke-features-grid">
            {/* SVG gradient for trace */}
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="ke-trace-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--ke-accent-purple)" />
                  <stop offset="100%" stopColor="var(--ke-accent-blue)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Featured card — Neural Knowledge Retrieval */}
            <div
              className="ke-feature-card ke-feature-card-featured"
              data-ke-reveal
              style={{ transitionDelay: "0ms" }}
            >
              <div className="ke-card-shine" aria-hidden="true" />
              <div className="ke-featured-inner">
                <div style={{ flex: 1 }}>
                  <span className="ke-feature-badge">Core Engine</span>
                  <h3 className="ke-feature-title" style={{ fontSize: "1.3rem", marginBottom: "12px" }}>
                    Neural Knowledge Retrieval
                  </h3>
                  <p className="ke-feature-desc">
                    Our proprietary RAG pipeline ensures the AI only speaks from your verified data.
                    No hallucinations — just architecture-grade intelligence with sub-2ms latency.
                  </p>
                </div>
                <div className="ke-featured-visual" aria-hidden="true">
                  <RadarViz />
                </div>
              </div>
            </div>

            {/* Feature cards */}
            {[
              {
                badge: "Ingestion Engine",
                title: "Automated Ingestion",
                desc: "Connect Slack, Notion, GitHub, and local PDFs. The engine watches changes in real-time and keeps your knowledge graph fresh.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                delay: 80,
              },
              {
                badge: "Intelligence Layer",
                title: "Gap Analysis",
                desc: "Detect outdated, conflicting, or missing documentation automatically. Surface blind spots before they become bottlenecks.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                ),
                delay: 160,
              },
              {
                badge: "Compliance",
                title: "Live Audit",
                desc: "Real-time compliance scoring across all your knowledge assets. Always know your regulatory exposure.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                ),
                delay: 240,
              },
            ].map((card) => (
              <div
                key={card.title}
                className="ke-feature-card"
                data-ke-reveal
                style={{ transitionDelay: `${card.delay}ms` }}
              >
                <div className="ke-card-shine" aria-hidden="true" />
                <span className="ke-feature-badge">{card.badge}</span>
                <div className="ke-feature-icon">{card.icon}</div>
                <h3 className="ke-feature-title">{card.title}</h3>
                <p className="ke-feature-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DASHBOARD / CURATION ────────────────────────── */}
        <section id="pipeline" className="ke-dashboard-section" aria-labelledby="ke-dash-h2">
          <div className="ke-dashboard-inner">
            <div className="ke-section-header" style={{ textAlign: "center", marginBottom: "56px" }} data-ke-reveal>
              <h2 id="ke-dash-h2">
                Curation{" "}
                <span className="ke-sec-accent">Redefined.</span>
              </h2>
            </div>

            <div style={{ position: "relative" }} data-ke-reveal>
              <div className="ke-device-frame">
                {/* Synthetic dashboard UI as SVG (no external images) */}
                <svg
                  viewBox="0 0 1200 680"
                  xmlns="http://www.w3.org/2000/svg"
                  className="ke-device-screen"
                  aria-label="KnowledgeEngine dashboard preview"
                  role="img"
                >
                  <rect width="1200" height="680" fill="#0A0918"/>
                  {/* Sidebar */}
                  <rect x="0" y="0" width="200" height="680" fill="rgba(255,255,255,0.03)"/>
                  <rect x="0" y="0" width="200" height="1" fill="rgba(255,255,255,0.06)"/>
                  {/* Logo area */}
                  <text x="20" y="38" fill="url(#svgGrad)" fontSize="14" fontWeight="700" fontFamily="system-ui">KnowledgeEngine</text>
                  {/* Nav items */}
                  {[70, 105, 140, 175, 210].map((y, i) => (
                    <g key={i}>
                      <rect x="12" y={y} width="176" height="28" rx="8" fill={i === 0 ? "rgba(124,111,255,0.15)" : "transparent"}/>
                      <rect x="24" y={y + 8} width="12" height="12" rx="3" fill={i === 0 ? "#7C6FFF" : "rgba(255,255,255,0.15)"}/>
                      <rect x="44" y={y + 10} width={60 + i * 10} height="8" rx="4" fill={i === 0 ? "rgba(124,111,255,0.6)" : "rgba(255,255,255,0.12)"}/>
                    </g>
                  ))}
                  {/* Main area */}
                  <rect x="200" y="0" width="1000" height="56" fill="rgba(255,255,255,0.02)"/>
                  <rect x="200" y="56" width="1000" height="1" fill="rgba(255,255,255,0.05)"/>
                  {/* Topbar text */}
                  <text x="224" y="34" fill="rgba(255,255,255,0.7)" fontSize="13" fontWeight="600" fontFamily="system-ui">Knowledge Graph — Overview</text>
                  {/* Search bar */}
                  <rect x="820" y="14" width="200" height="28" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  <text x="838" y="32" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="system-ui">Search knowledge…</text>
                  {/* Avatar */}
                  <circle cx="1060" cy="28" r="14" fill="url(#svgGrad2)"/>
                  {/* Stat cards */}
                  {[
                    { x: 220, label: "Documents", value: "8,421", color: "#7C6FFF" },
                    { x: 450, label: "Avg Accuracy", value: "98.4%", color: "#60A5FA" },
                    { x: 680, label: "Gap Alerts", value: "12", color: "#A78BFA" },
                    { x: 910, label: "Last Sync", value: "2m ago", color: "#34D399" },
                  ].map((card) => (
                    <g key={card.x}>
                      <rect x={card.x} y="76" width="200" height="90" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                      <text x={card.x + 16} y="100" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="system-ui" letterSpacing="1">{card.label.toUpperCase()}</text>
                      <text x={card.x + 16} y="138" fill={card.color} fontSize="22" fontWeight="700" fontFamily="system-ui">{card.value}</text>
                    </g>
                  ))}
                  {/* Chart area */}
                  <rect x="220" y="186" width="600" height="260" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                  <text x="240" y="212" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="600" fontFamily="system-ui">Knowledge Coverage Over Time</text>
                  {/* Chart bars */}
                  {[40, 70, 55, 85, 65, 90, 78, 95, 72, 88, 82, 100].map((h, i) => (
                    <g key={i}>
                      <rect
                        x={240 + i * 44}
                        y={410 - h * 1.8}
                        width="30"
                        height={h * 1.8}
                        rx="4"
                        fill={`rgba(124,111,255,${0.3 + (i / 12) * 0.5})`}
                      />
                      <rect
                        x={240 + i * 44}
                        y={410 - h * 1.8}
                        width="30"
                        height="3"
                        rx="2"
                        fill="rgba(124,111,255,0.9)"
                      />
                    </g>
                  ))}
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((f, i) => (
                    <line key={i} x1="235" y1={410 - f * 180} x2="810" y2={410 - f * 180} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  ))}
                  {/* Right panel — top docs */}
                  <rect x="840" y="186" width="350" height="260" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                  <text x="860" y="212" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="600" fontFamily="system-ui">Recent Knowledge Gaps</text>
                  {[
                    { label: "SOP-SEC-2024", status: "Outdated", c: "#F59E0B" },
                    { label: "HR Onboarding v3", status: "42% Gap", c: "#EF4444" },
                    { label: "Engineering Runbook", status: "Current", c: "#34D399" },
                    { label: "Compliance Matrix", status: "Review", c: "#60A5FA" },
                  ].map((row, i) => (
                    <g key={i}>
                      <rect x="855" y={228 + i * 48} width="320" height="36" rx="8" fill="rgba(255,255,255,0.02)"/>
                      <circle cx="875" cy={246 + i * 48} r="5" fill={row.c}/>
                      <text x="892" y={250 + i * 48} fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui">{row.label}</text>
                      <rect x={1080} y={234 + i * 48} width="80" height="20" rx="10" fill={`${row.c}22`}/>
                      <text x={1092} y={248 + i * 48} fill={row.c} fontSize="9" fontWeight="600" fontFamily="system-ui">{row.status}</text>
                    </g>
                  ))}
                  {/* Bottom row */}
                  <rect x="220" y="466" width="970" height="180" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                  <text x="240" y="492" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="600" fontFamily="system-ui">Query Intelligence Feed</text>
                  {[
                    "How do Tier-3 clients handle off-site encryption? → AES-256 KMS required",
                    "What's the SLA for incident response in EU regions? → 4h response, 24h resolution",
                    "Are HR onboarding docs compliant with 2024 regulations? → 42% gap detected",
                  ].map((q, i) => (
                    <g key={i}>
                      <rect x="236" y={504 + i * 44} width="930" height="32" rx="6" fill="rgba(255,255,255,0.02)"/>
                      <circle cx="256" cy={520 + i * 44} r="4" fill="#7C6FFF"/>
                      <text x="272" y={524 + i * 44} fill="rgba(255,255,255,0.55)" fontSize="10.5" fontFamily="system-ui">{q}</text>
                    </g>
                  ))}
                  <defs>
                    <linearGradient id="svgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7C6FFF"/>
                      <stop offset="100%" stopColor="#60A5FA"/>
                    </linearGradient>
                    <linearGradient id="svgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C6FFF"/>
                      <stop offset="100%" stopColor="#A78BFA"/>
                    </linearGradient>
                  </defs>
                </svg>

                {/* Floating chips */}
                <div className="ke-chip ke-chip-1" aria-label="Insight: SOP Outdated">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Insight: SOP Outdated
                </div>
                <div className="ke-chip ke-chip-2" aria-label="99% Confidence">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  99% Confidence
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
                style={{ left: annual ? "calc(50% + 4px)" : "4px", width: annual ? "calc(50% - 4px)" : "calc(50% - 4px)" }}
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
                Ready to curate
                <br />
                your intelligence?
              </h2>
              <p className="ke-cta-sub">
                Join the next generation of knowledge-first organizations.
                Deploy your engine in minutes, not months.
              </p>
              <a
                href="/sign-in"
                className="ke-cta-btn"
                id="ke-request-demo"
              >
                Request Demo Access
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
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" aria-label="LinkedIn" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            {/* GitHub */}
            <a href="#" aria-label="GitHub" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
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
