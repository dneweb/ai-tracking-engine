"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/LandingPage.module.css";

type ThemeMode = "light" | "dark";

const TRUST_LOGOS = ["Acme Corp", "NovaTech", "Brightline", "Quorum", "Axiom Group", "Vertex Systems"];
const NAV_LINKS = ["Features", "How It Works", "Analytics", "Pricing"];

const FEATURE_CARDS = [
  { title: "Neural Knowledge Retrieval", copy: "Semantic search that finds the precise SOP paragraph in milliseconds.", size: "wide", icon: "◎" },
  { title: "Intelligent Q&A", copy: "Natural-language responses with traceability like [Source: SOP-HR-012].", icon: "◉" },
  { title: "Documentation Gap Analysis", copy: "Confidence clustering surfaces exactly which policies are underspecified.", icon: "◌" },
  { title: "Dynamic SOP Management", copy: "Version-aware uploads, role-based visibility, and content lifecycle flows.", icon: "◍" },
  { title: "Temporal Analytics", copy: "Trend lines reveal where teams are blocked and when knowledge decays.", icon: "◔" },
  { title: "Reliability Spectrum", copy: "Coverage index across HR, IT, Engineering, Finance, and Operations.", size: "wide", icon: "◑" },
];

const TESTIMONIALS = [
  ["Ava Patel", "VP Operations", "Brightline", "We reduced repetitive support noise by half in under three weeks."],
  ["Noah Kim", "Head of IT", "NovaTech", "Cited answers gave our team instant trust in every response."],
  ["Iris Moore", "People Ops Lead", "Acme Corp", "Gap Reports replaced guesswork with a measurable documentation roadmap."],
  ["Liam Ortega", "Engineering Manager", "Vertex Systems", "Onboarding speed jumped the first month after launch."],
  ["Maya Chen", "Finance Director", "Axiom Group", "Audit readiness became a dashboard, not a fire drill."],
  ["Ethan Wade", "COO", "Quorum", "The product feels like an always-on expert for every team."],
];

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function LandingPage() {
  const { isSignedIn } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navElevated, setNavElevated] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [countReady, setCountReady] = useState(false);
  const [counts, setCounts] = useState({ queries: 0, accuracy: 0, onboarding: 0 });

  const cursorDot = useRef<HTMLDivElement>(null);
  const cursorRing = useRef<HTMLDivElement>(null);

  const heroWords = useMemo(() => ["Your", "Organization's", "Neural", "Memory."], []);
  const primaryAuthHref = isSignedIn ? "/dashboard" : "/sign-up";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("landing-theme") as ThemeMode | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme: ThemeMode = savedTheme ?? (preferredDark ? "dark" : "light");
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("landing-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setNavElevated(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const revealables = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add(styles.inView);
        });
      },
      { threshold: 0.2 }
    );
    revealables.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = document.getElementById("trust-counters");
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCountReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!countReady) return;
    const started = performance.now();
    const duration = 2000;
    const animate = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCounts({
        queries: Math.round(14847 * eased),
        accuracy: 98.4 * eased,
        onboarding: 3.2 * eased,
      });
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [countReady]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt-card]"));
    const disable = window.matchMedia("(max-width: 1023px)").matches;
    if (disable) return;
    cards.forEach((card) => {
      const onMove = (event: MouseEvent) => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${y * -8}deg) rotateY(${x * 8}deg)`;
      };
      const onLeave = () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
    });
    return () => {
      cards.forEach((card) => {
        card.replaceWith(card.cloneNode(true));
      });
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    if (!cursorDot.current || !cursorRing.current) return;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { x: mouse.x, y: mouse.y };
    const ring = { x: mouse.x, y: mouse.y };
    let active = false;

    const onMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    const onDown = () => rootRef.current?.classList.add(styles.cursorPulse);
    const onUp = () => rootRef.current?.classList.remove(styles.cursorPulse);
    const onHoverChange = (event: Event) => {
      const target = event.target as HTMLElement;
      active = Boolean(target.closest("a, button, [data-tilt-card]"));
    };

    const tick = () => {
      dot.x = lerp(dot.x, mouse.x, 0.35);
      dot.y = lerp(dot.y, mouse.y, 0.35);
      ring.x = lerp(ring.x, mouse.x, 0.2);
      ring.y = lerp(ring.y, mouse.y, 0.2);
      cursorDot.current!.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0)`;
      cursorRing.current!.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) scale(${active ? 1.5 : 1})`;
      cursorRing.current!.style.opacity = active ? "1" : "0.7";
      requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseover", onHoverChange);
    requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseover", onHoverChange);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.page}>
      <div className={styles.cursorDot} ref={cursorDot} />
      <div className={styles.cursorRing} ref={cursorRing} />

      <header className={`${styles.nav} ${navElevated ? styles.navElevated : ""}`}>
        <div className={styles.logo}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="11" cy="34" r="5" />
            <circle cx="24" cy="12" r="5" />
            <circle cx="37" cy="34" r="5" />
            <path d="M15 30 L21 16 M27 16 L33 30 M16 34 H32" />
          </svg>
          <span>SOPEngine</span>
        </div>
        <nav className={styles.desktopNav}>{NAV_LINKS.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>{item}</a>)}</nav>
        <div className={styles.navActions}>
          <Link href="/sign-in">Sign In</Link>
          <button className={styles.themeToggle} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            <span className={styles.themeBlob}>{theme === "dark" ? "☾" : "☼"}</span>
          </button>
          <Link href={primaryAuthHref} className={styles.requestDemo}>Request Demo</Link>
          <button className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`} onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <aside className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileOpen : ""}`}>
        {NAV_LINKS.map((item, idx) => (
          <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} style={{ animationDelay: `${idx * 0.08}s` }} onClick={() => setMobileOpen(false)}>
            {item}
          </a>
        ))}
        <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign In</Link>
        <Link href={primaryAuthHref} onClick={() => setMobileOpen(false)}>Request Demo</Link>
      </aside>

      <section className={styles.hero}>
        <div className={styles.orbField}>
          <span className={`${styles.orb} ${styles.orb1}`} />
          <span className={`${styles.orb} ${styles.orb2}`} />
          <span className={`${styles.orb} ${styles.orb3}`} />
          <span className={`${styles.orb} ${styles.orb4}`} />
          <span className={`${styles.orb} ${styles.orb5}`} />
        </div>
        <svg className={styles.noise} aria-hidden="true">
          <filter id="noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-filter)" />
        </svg>

        <div className={styles.heroContent}>
          <article className={styles.heroLeft}>
            <p className={styles.eyebrow}>AI-Powered Knowledge & SOP Tracking Engine</p>
            <h1>
              {heroWords.map((word, index) => (
                <span key={word} style={{ animationDelay: `${index * 80}ms` }} className={word.includes("Neural") || word.includes("Memory.") ? styles.accentWord : ""}>
                  {word}
                </span>
              ))}
            </h1>
            <p className={styles.subtagline}>Stop answering the same questions. Let your SOPs work for you - intelligently.</p>
            <div className={styles.ctaRow}>
              <Link href={primaryAuthHref} className={styles.primaryCta}>Start Free Trial</Link>
              <button className={styles.secondaryCta}>Watch Demo <span>▶</span></button>
            </div>
          </article>
          <article className={styles.heroPreview}>
            <div className={styles.floatingChip}>↑ 98.4% Accuracy</div>
            <div className={`${styles.floatingChip} ${styles.chip2}`}>14K+ Queries Resolved</div>
            <div className={`${styles.floatingChip} ${styles.chip3}`}>3.2x Faster Onboarding</div>
            <div className={styles.terminalCard}>
              <p><b>Employee:</b> What's the onboarding process for remote engineers?</p>
              <p><b>AI:</b> Based on SOP-ENG-047, remote engineer onboarding involves...</p>
              <p>[Source: Engineering Handbook v3.2, Section 4]</p>
              <p className={styles.confidence}>Confidence: 96.8% ████████████░░<span className={styles.cursor}>|</span></p>
            </div>
          </article>
        </div>
      </section>

      <section id="analytics" className={styles.trustBar} data-reveal>
        <div id="trust-counters" className={styles.counters}>
          <div><h3>{counts.queries.toLocaleString()}</h3><p>Queries Resolved</p></div>
          <div><h3>{counts.accuracy.toFixed(1)}%</h3><p>Accuracy Score</p></div>
          <div><h3>{counts.onboarding.toFixed(1)}x</h3><p>Faster Onboarding</p></div>
        </div>
        <div className={styles.marquee}><div>{[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => <span key={`${logo}-${i}`}>{logo}</span>)}</div></div>
      </section>

      <section id="features" className={styles.features}>
        <h2>Everything your team's knowledge needs</h2>
        <div className={styles.featureGrid}>
          {FEATURE_CARDS.map((card, index) => (
            <article key={card.title} className={`${styles.featureCard} ${card.size === "wide" ? styles.wide : ""}`} data-tilt-card data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
              <span className={styles.featureIcon}>{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={styles.pipeline}>
        <h2>From static document to living intelligence</h2>
        <div className={styles.pipelineGrid}>
          {["Ingest", "Ask", "Improve"].map((step, index) => (
            <article key={step} data-reveal style={{ transitionDelay: `${index * 400}ms` }}>
              <span>{`0${index + 1}`}</span>
              <h3>{step}</h3>
              <p>
                {index === 0 && "Upload PDFs, Word docs, and exports. We chunk, clean, and vectorize every paragraph."}
                {index === 1 && "Employees ask in plain English while RAG retrieves relevant SOP chunks and synthesizes cited answers."}
                {index === 2 && "Low-confidence queries are clustered into Gap Reports for your documentation roadmap."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.dashboardSection} data-reveal>
        <div className={styles.dashboardCard}>
          <aside><h4>Knowledge Base</h4><h4>Query Logs</h4><h4>Gap Reports</h4><h4>Analytics</h4><h4>Settings</h4></aside>
          <main>
            <header><input aria-label="Search" placeholder="Search SOPs or queries..." /><div /></header>
            <div className={styles.chartBars}><span /><span /><span /><span /><span /></div>
            <table><tbody><tr><td>Remote onboarding</td><td>96.8%</td></tr><tr><td>M1 environment setup</td><td>41.0%</td></tr><tr><td>Expense policy</td><td>34.0%</td></tr></tbody></table>
          </main>
        </div>
        <div className={styles.annotation}>⚡ Live Gap Report</div>
        <div className={`${styles.annotation} ${styles.annotation2}`}>🔒 RBAC Active</div>
        <div className={`${styles.annotation} ${styles.annotation3}`}>↑ 34% Resolution Rate</div>
      </section>

      <section className={styles.gapSection}>
        <article className={styles.radar} data-reveal><div /></article>
        <article className={styles.gapList}>
          <h2>Live Gap Report Preview</h2>
          {[
            ["⚠ Remote Work Expense Policy", "34% confidence"],
            ["⚠ M1 Chip Dev Environment Setup", "41% confidence"],
            ["⚠ GDPR Data Request Handling", "29% confidence"],
            ["✓ Employee Leave Entitlements", "94% confidence"],
            ["✓ New Hire IT Provisioning", "88% confidence"],
          ].map(([topic, score], i) => <p key={topic} data-reveal style={{ transitionDelay: `${i * 100}ms` }}><span>{topic}</span><b>{score}</b></p>)}
          <Link href={primaryAuthHref}>Generate Your Gap Report →</Link>
        </article>
      </section>

      <section className={styles.security}>
        <article><h3>JWT Session Management</h3><p>Clerk-authenticated sessions with hardened token lifecycle control.</p></article>
        <article><h3>Role-Based Access Control</h3><p>Admin → Manager → Employee policy boundaries and scoped visibility.</p></article>
        <article><h3>Enterprise Compliance</h3><p>SOC2-style controls, immutable audit trails, and access accountability.</p></article>
      </section>

      <section className={styles.testimonials}>
        <div>{[...TESTIMONIALS, ...TESTIMONIALS].map(([name, role, company, quote], i) => (
          <blockquote key={`${name}-${i}`}>
            <div />
            <h4>{name}</h4>
            <small>{role} - {company}</small>
            <p>{quote}</p>
          </blockquote>
        ))}</div>
      </section>

      <section id="pricing" className={styles.pricing}>
        <div className={styles.billingToggle}>
          <button onClick={() => setAnnual(false)} className={!annual ? styles.active : ""}>Monthly</button>
          <button onClick={() => setAnnual(true)} className={annual ? styles.active : ""}>Annual</button>
          {annual && <span>Save 30%</span>}
        </div>
        <div className={styles.priceGrid}>
          <article data-reveal><h3>Starter</h3><h4>${annual ? 34 : 49}/mo</h4><p>Up to 50 documents, 500 queries/month, monthly gap reports.</p></article>
          <article className={styles.recommended} data-reveal><label>Most Popular</label><h3>Growth</h3><h4>${annual ? 104 : 149}/mo</h4><p>500 docs, unlimited queries, weekly gap reports, RBAC, priority support.</p></article>
          <article data-reveal><h3>Enterprise</h3><h4>Custom</h4><p>Unlimited scale, SSO, custom tuning, SLA, dedicated CSM.</p></article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Ready to make your SOPs intelligent?</h2>
        <div>
          <Link href={primaryAuthHref}>Start Free Trial</Link>
          <Link href={primaryAuthHref}>Talk to Sales</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><h4>SOPEngine</h4><p>Your organization's neural memory for SOP intelligence.</p></div>
        <div><h5>Product</h5><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#">Changelog</a><a href="#">Roadmap</a></div>
        <div><h5>Resources</h5><a href="#">Docs</a><a href="#">API Reference</a><a href="#">SOC2 Report</a><a href="#">Blog</a></div>
        <div><h5>Company</h5><a href="#">About</a><a href="#">Careers</a><a href="#">Contact</a><a href="#">Privacy</a></div>
      </footer>
    </div>
  );
}
