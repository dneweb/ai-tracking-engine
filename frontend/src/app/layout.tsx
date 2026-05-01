import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Newsreader, Manrope, Space_Grotesk, Geist } from "next/font/google";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/Toast";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


/* 
  Tri-font Architecture (Stitch Design System):
  - Newsreader:    Display/Headlines — editorial authority
  - Manrope:       Body/UI — technical precision
  - Space_Grotesk: Labels/Metadata — architectural feel
*/
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus AI | Neural Intelligence Platform",
  description: "Enterprise SOP Query Engine powered by neural RAG — Ask, Analyze, and Automate your knowledge base.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={cn(newsreader.variable, manrope.variable, spaceGrotesk.variable, "font-sans", geist.variable)}
        suppressHydrationWarning
        data-scroll-behavior="smooth"
      >
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;700;800;900&amp;family=Manrope:wght@400;500;600&amp;family=Space+Grotesk:wght@300;500;700&amp;family=JetBrains+Mono&amp;display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
          <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
                    document.documentElement.setAttribute('data-theme', savedTheme);
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body className="antialiased selection:bg-accent-primary/25 selection:text-accent-glow">
          <ThemeProvider>
            <ToastProvider>
              <LayoutShell>{children}</LayoutShell>
              <ToastContainer />
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
