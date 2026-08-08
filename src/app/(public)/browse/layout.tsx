import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Original Australian Art',
  description:
    'Discover curated original artworks from Australian artists. Oil, acrylic, watercolour, photography and more. Artists keep 100% of every sale.',
  // Filter state lives in query params (?category=…&medium=…&colour=…). Point
  // every permutation at the clean /browse URL so search engines consolidate
  // ranking signals here instead of indexing thousands of thin filter pages.
  alternates: { canonical: '/browse' },
  openGraph: {
    title: 'Browse Original Australian Art | Signo',
    description:
      'Discover curated original artworks from Australian artists. Oil, acrylic, watercolour, photography and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
