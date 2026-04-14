import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">
          404
        </p>
        <h1 className="font-editorial text-3xl md:text-4xl font-semibold text-primary mb-4">
          This page doesn&apos;t exist
        </h1>
        <p className="text-muted leading-relaxed mb-8">
          The page you&apos;re looking for may have been moved or doesn&apos;t
          exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center px-6 py-3 border border-border text-primary font-medium rounded-full hover:bg-cream transition-colors"
          >
            Browse Artwork
          </Link>
        </div>
      </div>
    </div>
  );
}
