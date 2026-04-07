import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Outfit } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Signo — Where Art Finds Its People",
    template: "%s — Signo",
  },
  description:
    "Discover extraordinary art from Australian creators. A curated marketplace where artists keep 100% of every sale.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
