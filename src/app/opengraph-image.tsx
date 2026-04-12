import { ImageResponse } from 'next/og';

export const alt = 'Signo — Where Art Finds Its People';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
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
          background: '#f5f2ed',
        }}
      >
        {/* Favicon icon */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 27,
            background: '#6b7c4e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginBottom: 36,
          }}
        >
          {/* Outer frame */}
          <div
            style={{
              position: 'absolute',
              top: 28,
              left: 28,
              width: 64,
              height: 64,
              borderRadius: 5,
              border: '4.7px solid #faf8f4',
            }}
          />
          {/* Inner frame */}
          <div
            style={{
              position: 'absolute',
              top: 37,
              left: 37,
              width: 46,
              height: 46,
              borderRadius: 3,
              border: '2px solid rgba(250, 248, 244, 0.35)',
            }}
          />
          {/* Center dot */}
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#faf8f4',
            }}
          />
        </div>

        {/* SIGNO. wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 48,
              fontWeight: 500,
              color: '#1a1a1a',
              letterSpacing: '0.08em',
            }}
          >
            SIGNO
          </span>
          <span
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 48,
              fontWeight: 500,
              color: '#6b7c4e',
              fontStyle: 'italic',
            }}
          >
            .
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 18,
            color: '#7a7a72',
            letterSpacing: '0.05em',
          }}
        >
          Curated Australian Art
        </div>
      </div>
    ),
    { ...size },
  );
}
