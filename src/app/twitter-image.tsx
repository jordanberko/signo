import { ImageResponse } from 'next/og';

export const alt = 'Signo — Original art, direct from Australian artists';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Gallery palette — mirrors --color-* tokens in globals.css
const INK = '#161616';
const STONE = '#b4b2ad';
const STONE_DARK = '#78766f';
const WHITE = '#ffffff';
const TERRACOTTA = '#bc5636';

const SANS = 'Helvetica Neue, Arial, sans-serif';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '88px 96px',
          background: WHITE,
          fontFamily: SANS,
        }}
      >
        {/* Top kicker row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'space-between',
            fontSize: 16,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: STONE,
          }}
        >
          <span>signoart.com.au</span>
          <span>est. 2026</span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            color: INK,
            fontSize: 108,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
          }}
        >
          <span>Original art, direct</span>
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span>from the&nbsp;</span>
            <span style={{ color: TERRACOTTA }}>artist.</span>
          </span>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              fontWeight: 700,
              color: INK,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            <span>Signo</span>
          </div>
          <div
            style={{
              fontSize: 18,
              color: STONE_DARK,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Australian art marketplace · Zero commission
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
