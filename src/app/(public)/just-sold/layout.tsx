import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Just Sold',
  description:
    "Recently sold artwork on Signo — Australia's curated art marketplace.",
  openGraph: {
    title: 'Just Sold | Signo',
    description:
      "Recently sold artwork on Signo — Australia's curated art marketplace.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
