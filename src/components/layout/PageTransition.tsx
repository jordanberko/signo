'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef, type ReactNode } from 'react';

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [displayed, setDisplayed] = useState(children);
  const [displayedKey, setDisplayedKey] = useState(pathname);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (pathname === displayedKey) {
      setDisplayed(children);
      return;
    }

    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(children);
      setDisplayedKey(pathname);
      return;
    }

    setPhase('out');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplayed(children);
      setDisplayedKey(pathname);
      setPhase('in');
      // Reset to idle after fade-in completes
      timeoutRef.current = setTimeout(() => setPhase('idle'), 350);
    }, 150);

    return () => clearTimeout(timeoutRef.current);
  }, [pathname, children, displayedKey]);

  return (
    <div
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out'
          ? 'opacity 150ms var(--ease-in)'
          : phase === 'in'
          ? 'opacity var(--dur-base) var(--ease-out)'
          : undefined,
        minHeight: '100vh',
      }}
    >
      {displayed}
    </div>
  );
}
