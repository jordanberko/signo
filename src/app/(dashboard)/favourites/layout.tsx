import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Favourites — Signo',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
