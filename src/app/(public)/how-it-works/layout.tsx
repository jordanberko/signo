import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how to buy and sell art on Signo. Simple process for artists and collectors alike.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
