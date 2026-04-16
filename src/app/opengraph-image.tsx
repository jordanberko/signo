import { ImageResponse } from 'next/og';

export const alt = 'Signo — A curated room for Australian artists';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Editorial palette — mirrors --color-* tokens in globals.css
const INK = '#1a1a18';
const STONE = '#b8b2a4';
const STONE_DARK = '#8a8478';
const WARM_WHITE = '#fcfbf8';
const TERRACOTTA = '#c45d3e';

export default function OGImage() {
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
          background: WARM_WHITE,
          fontFamily: 'Georgia, serif',
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
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
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
            fontSize: 124,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          <span>Where art</span>
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span>finds&nbsp;</span>
            <span style={{ fontStyle: 'italic', color: TERRACOTTA }}>its people.</span>
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
              alignItems: 'baseline',
              fontSize: 56,
              fontWeight: 400,
              color: INK,
              letterSpacing: '-0.005em',
            }}
          >
            <span>Signo</span>
            <span style={{ fontStyle: 'italic' }}>.</span>
          </div>
          <div
            style={{
              fontFamily: 'Helvetica Neue, Arial, sans-serif',
              fontSize: 18,
              color: STONE_DARK,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            A curated room for Australian artists
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
