export default function Loading() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            fontWeight: 400,
            margin: 0,
          }}
        >
          One moment
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--color-ink)',
            marginTop: '1.2rem',
          }}
        >
          The work is{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--color-stone-dark)' }}>
            arriving.
          </em>
        </h1>
      </div>
    </div>
  );
}
