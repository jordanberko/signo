'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-accent-dark text-sm font-medium tracking-[0.2em] uppercase mb-4">
          Error
        </p>
        <h1 className="font-editorial text-3xl md:text-4xl font-medium text-primary mb-4">
          Something went wrong
        </h1>
        <p className="text-muted leading-relaxed mb-8">
          Please try again. If the problem persists, return to the home page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-border text-primary font-medium rounded-full hover:bg-cream transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
