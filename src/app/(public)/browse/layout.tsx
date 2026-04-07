import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Artwork',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
