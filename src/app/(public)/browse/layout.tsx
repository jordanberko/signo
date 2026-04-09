import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Original Australian Art',
  description:
    'Discover curated original artworks from Australian artists. Oil, acrylic, watercolour, photography and more. Artists keep 100% of every sale.',
  openGraph: {
    title: 'Browse Original Australian Art | Signo',
    description:
      'Discover curated original artworks from Australian artists. Oil, acrylic, watercolour, photography and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
