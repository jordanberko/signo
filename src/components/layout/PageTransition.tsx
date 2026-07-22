'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Page transition — fade-IN only.
 *
 * The previous implementation held the outgoing page for 150ms (fade-out)
 * before swapping, adding artificial latency to every navigation. New
 * content now renders the instant the route changes, with a fast opacity
 * ease-in so the swap doesn't feel abrupt. Honors reduced motion.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 180ms var(--ease-out)' : 'none',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
