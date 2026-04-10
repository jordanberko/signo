import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the Signo team. Questions about selling art, buying artwork, or partnership enquiries — we typically respond within 24 hours.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
