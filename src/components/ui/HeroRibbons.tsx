'use client';

import { useEffect, useRef, useCallback } from 'react';

const PATHS = [
  // Ribbon 1: top-left → curves through middle → exits right
  'M-100,120 C100,80 200,220 350,200 C500,180 450,350 300,380 C150,410 80,500 200,550 C320,600 500,520 650,560 C800,600 850,480 750,420 C650,360 700,280 850,300 C1000,320 1050,200 1200,250 C1350,300 1400,180 1540,200',
  // Ribbon 2: bottom-right → curves up → exits left
  'M1540,650 C1350,680 1250,580 1100,620 C950,660 900,780 750,750 C600,720 550,600 400,640 C250,680 200,800 50,770 C-100,740 -50,620 100,600 C250,580 300,700 150,730 C0,760 -100,850 -200,820',
];

const RIBBON_TEXT = [
  'keep all your profits \u2726 no gallery commission \u2726 zero commission \u2726 direct to collectors \u2726 ',
  'originals \u2726 prints \u2726 digital downloads \u2726 art finds its people \u2726 ',
];

const RIBBON_CONFIG = [
  { duration: 50, direction: 1, fontClass: 'ribbon-serif', opacity: 0.08, fontSize: 17, strokeOpacity: 0.05 },
  { duration: 60, direction: -1, fontClass: 'ribbon-sans', opacity: 0.06, fontSize: 14, strokeOpacity: 0.04 },
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
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 28;
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none md:opacity-100 opacity-40">
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
          const startFrom = '0%';
          const startTo = config.direction === 1 ? '-50%' : '50%';

          return (
            <g key={i}>
              {/* Subtle path stroke */}
              <use
                href={`#ribbon-path-${i}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.8}
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
                strokeWidth={0.8}
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
