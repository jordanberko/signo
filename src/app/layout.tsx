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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signoart.com.au";

  // Sitewide structured data. Organization establishes brand identity for
  // Google knowledge panels; WebSite enables the sitelinks search box.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Signo",
    url: appUrl,
    logo: `${appUrl}/icon-512.png`,
    description:
      "A curated Australian art marketplace. Zero commission. Artists keep 100% of every sale.",
    sameAs: [] as string[],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Signo",
    url: appUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/browse?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      className={`${bespokeSerif.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body id="top" className="min-h-full flex flex-col">
        {/* Keyboard-only skip-link — bypasses the fixed nav for screen
            reader + keyboard users. Hidden off-screen until focused. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <AuthProvider>
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
