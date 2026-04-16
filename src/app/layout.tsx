import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

// ── Display / editorial serif ──
const bespokeSerif = localFont({
  src: [
    {
      path: "../../public/fonts/BespokeSerif-Variable.woff2",
      style: "normal",
      weight: "300 800",
    },
    {
      path: "../../public/fonts/BespokeSerif-VariableItalic.woff2",
      style: "italic",
      weight: "300 800",
    },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

// ── Body / UI sans ──
const outfit = localFont({
  src: [
    {
      path: "../../public/fonts/Outfit-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://signoart.com.au"),
  title: {
    default: "Signo — Where Art Finds Its People",
    template: "%s — Signo",
  },
  description:
    "A curated Australian art marketplace. Zero commission. Artists keep 100% of every sale.",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Signo",
    title: "Signo — Where Art Finds Its People",
    description:
      "A curated Australian art marketplace. Zero commission. Artists keep 100% of every sale.",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signo — Where Art Finds Its People",
    description:
      "A curated Australian art marketplace. Zero commission. Artists keep 100% of every sale.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#fcfbf8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bespokeSerif.variable} ${outfit.variable} h-full antialiased`}
    >
      <body id="top" className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
