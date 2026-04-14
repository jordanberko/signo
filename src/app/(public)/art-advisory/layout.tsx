import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Your Art',
  description:
    'Take our guided quiz to discover artwork perfectly suited to your space and taste.',
  openGraph: {
    title: 'Find Your Art | Signo',
    description:
      'Take our guided quiz to discover artwork perfectly suited to your space and taste.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
