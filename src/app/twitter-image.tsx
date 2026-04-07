import { ImageResponse } from 'next/og';

export const alt = 'Signo — Where Art Finds Its People';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5F2ED',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#C8E600',
          }}
        />

        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#111111',
            letterSpacing: 8,
            marginBottom: 24,
          }}
        >
          SIGNO
        </div>

        <div
          style={{
            fontSize: 32,
            color: '#111111',
            fontStyle: 'normal',
            display: 'flex',
            gap: 8,
          }}
        >
          <span>Where Art Finds</span>
          <span style={{ fontStyle: 'italic', color: '#B8965A' }}>
            Its People
          </span>
        </div>

        <div
          style={{
            fontSize: 18,
            color: '#78716c',
            marginTop: 20,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          A curated Australian art marketplace. Zero commission.
        </div>
      </div>
    ),
    { ...size },
  );
}
