import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trade Enquiries',
  description:
    'Art for hotels, restaurants, offices, and architects. Contact Signo for trade and bulk art purchases.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
