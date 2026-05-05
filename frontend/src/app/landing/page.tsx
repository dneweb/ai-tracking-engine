import { Manrope, JetBrains_Mono } from "next/font/google";
import { LandingPage } from "@/app/landing/LandingPage";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});

export const metadata = {
  title: "Memora — Your Organization's Neural Memory",
  description:
    "Transform scattered documentation into a living knowledge ecosystem. Memora curates, indexes, and surfaces intelligence with sub-2ms latency.",
};

export default function LandingRootPage() {
  return (
    <main
      className={`${manrope.variable} ${jetBrainsMono.variable}`}
      style={{ height: "100svh", overflow: "hidden" }}
    >
      <style>{`
        .ke-root { font-family: var(--font-manrope, "Manrope", system-ui, sans-serif); }
        .ke-terminal-body, .ke-terminal-title, .ke-feature-badge, .ke-plan-name { font-family: var(--font-jetbrains, "JetBrains Mono", monospace); }
      `}</style>
      <LandingPage />
    </main>
  );
}
