import { DM_Sans, JetBrains_Mono, Syne } from "next/font/google";
import { LandingPage } from "./components/LandingPage";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export default function LandingRootPage() {
  return (
    <main className={`${syne.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}>
      <LandingPage />
    </main>
  );
}
