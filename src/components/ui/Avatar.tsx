'use client';

import Image from 'next/image';

/**
 * Avatar — read-only display component.
 *
 * Shows a user's profile picture as a circle, or their initials on an
 * olive gradient background as fallback.
 *
 * Props:
 *  - avatarUrl: public URL to the avatar image (null/undefined → initials)
 *  - name: user's full name (used for initials + alt text)
 *  - size: diameter in pixels (default 40)
 *  - className: optional extra classes on the outer container
 */

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Size-to-font ratio
function fontSize(size: number): number {
  if (size <= 24) return 9;
  if (size <= 32) return 11;
  if (size <= 40) return 13;
  if (size <= 56) return 16;
  if (size <= 96) return 28;
  return Math.round(size * 0.3);
}

export default function Avatar({
  avatarUrl,
  name = '',
  size = 40,
  className = '',
}: {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name);

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name || 'User avatar'}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: 'var(--color-cream)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            className="leading-none"
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: fontSize(size),
              fontWeight: 400,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
