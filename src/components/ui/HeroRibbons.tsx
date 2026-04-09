'use client';

import { useEffect, useRef, useCallback } from 'react';

const PATHS = [
  // Gentle middle flow
  'M-150,400 C50,350 150,450 300,420 C450,390 500,300 650,330 C800,360 900,450 1050,400 C1200,350 1300,430 1450,380 C1600,330 1550,450 1600,500',
];

const RIBBON_TEXT = [
  'originals \u2726 prints \u2726 digital downloads \u2726 direct from the studio \u2726 art finds its people \u2726 ',
];

const RIBBON_CONFIG = [
  { duration: 60, direction: -1, fontClass: 'ribbon-sans', opacity: 0.08, fontSize: 15, strokeOpacity: 0.06 },
];

export default function HeroRibbons() {
  const svgRef = useRef<SVGSVGElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const lerp = 0.03;
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * lerp;
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * lerp;

    if (svgRef.current) {
      svgRef.current.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px)`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // Skip mouse tracking on mobile
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 50; // max ~25px each direction
      const y = (e.clientY / window.innerHeight - 0.5) * 36; // max ~18px each direction
      targetRef.current = { x, y };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none md:opacity-100 opacity-50">
      <svg
        ref={svgRef}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full motion-safe:block motion-reduce:hidden"
        aria-hidden="true"
      >
        <defs>
          {PATHS.map((d, i) => (
            <path key={`path-${i}`} id={`ribbon-path-${i}`} d={d} />
          ))}
        </defs>

        {PATHS.map((d, i) => {
          const config = RIBBON_CONFIG[i];
          const text = RIBBON_TEXT[i].repeat(4);
          const startFrom = config.direction === 1 ? '0%' : '0%';
          const startTo = config.direction === 1 ? '-50%' : '50%';

          return (
            <g key={i}>
              {/* Subtle path stroke */}
              <use
                href={`#ribbon-path-${i}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                opacity={config.strokeOpacity}
              />

              {/* Flowing text */}
              <text
                className={config.fontClass}
                fontSize={config.fontSize}
                fill="currentColor"
                opacity={config.opacity}
              >
                <textPath href={`#ribbon-path-${i}`} startOffset={startFrom}>
                  <animate
                    attributeName="startOffset"
                    from={startFrom}
                    to={startTo}
                    dur={`${config.duration}s`}
                    repeatCount="indefinite"
                  />
                  {text}
                </textPath>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Static fallback for reduced motion */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full motion-safe:hidden motion-reduce:block"
        aria-hidden="true"
      >
        <defs>
          {PATHS.map((d, i) => (
            <path key={`static-path-${i}`} id={`static-ribbon-${i}`} d={d} />
          ))}
        </defs>

        {PATHS.map((d, i) => {
          const config = RIBBON_CONFIG[i];
          const text = RIBBON_TEXT[i].repeat(4);

          return (
            <g key={i}>
              <use
                href={`#static-ribbon-${i}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                opacity={config.strokeOpacity}
              />
              <text
                className={config.fontClass}
                fontSize={config.fontSize}
                fill="currentColor"
                opacity={config.opacity}
              >
                <textPath href={`#static-ribbon-${i}`} startOffset="0%">
                  {text}
                </textPath>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
