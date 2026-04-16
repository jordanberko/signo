export default function EditorialSpinner({
  label = 'One moment',
  headline = 'Loading\u2026',
}: {
  label?: string;
  headline?: string;
}) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
        background: 'var(--color-warm-white)',
      }}
    >
      <p
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          fontWeight: 400,
          marginBottom: '0.75rem',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {label}
      </p>
      <p
        className="font-serif"
        style={{
          fontStyle: 'italic',
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          lineHeight: 1.05,
          color: 'var(--color-stone-dark)',
        }}
      >
        {headline}
      </p>
    </div>
  );
}
