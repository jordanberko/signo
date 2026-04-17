'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';

interface AvatarUploadProps {
  /** Current avatar URL (for display). */
  currentUrl?: string | null;
  /** User's name (for initials fallback). */
  userName?: string;
  /** Size in pixels. */
  size?: number;
  /** Callback with the new public URL after upload. */
  onAvatarChange: (url: string | null) => void;
  /** Function to upload the file and return a public URL. */
  uploadFile: (file: File, onProgress: (progress: number) => void) => Promise<string>;
}

const ACCEPTED = '.jpg,.jpeg,.png,.webp';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

const SERIF_ITALIC: CSSProperties = {
  fontFamily: 'var(--font-serif), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
};

export default function AvatarUpload({
  currentUrl = null,
  userName = '',
  size = 120,
  onAvatarChange,
  uploadFile,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError('');

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please use a JPG, PNG, or WebP image.');
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(
          `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_SIZE_MB} MB.`
        );
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setUploading(true);
      setProgress(0);

      try {
        const url = await uploadFile(file, setProgress);
        setAvatarUrl(url);
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
        onAvatarChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploading(false);
      }
    },
    [uploadFile, onAvatarChange]
  );

  const removeAvatar = useCallback(() => {
    setAvatarUrl(null);
    setPreview(null);
    setError('');
    onAvatarChange(null);
  }, [onAvatarChange]);

  const displayUrl = preview || avatarUrl;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* ── Portrait frame (square, hairline ink border) ── */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          background: 'var(--color-cream)',
          border: '1px solid var(--color-border-strong)',
          overflow: 'hidden',
        }}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Avatar"
            width={size}
            height={size}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-cream)',
            }}
          >
            <span
              className="font-serif"
              style={{
                fontSize: size * 0.32,
                fontWeight: 400,
                color: 'var(--color-stone-dark)',
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
              }}
            >
              {userName ? getInitials(userName) : '—'}
            </span>
          </div>
        )}

        {/* Upload progress overlay — typographic */}
        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(26, 26, 24, 0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.6rem',
            }}
          >
            <p
              style={{
                ...SERIF_ITALIC,
                fontSize: '0.95rem',
                color: 'var(--color-warm-white)',
                margin: 0,
              }}
            >
              Uploading…
            </p>
            <div
              style={{
                width: '70%',
                height: 1,
                background: 'rgba(252, 251, 248, 0.25)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--color-warm-white)',
                  transition: 'width var(--dur-base) var(--ease-out)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = '';
        }}
      />

      {/* ── Action links ── */}
      {!uploading && (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'baseline',
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...SERIF_ITALIC,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-ink)',
              fontSize: '0.95rem',
              cursor: 'pointer',
              padding: 0,
              borderBottom: '1px solid var(--color-stone)',
              paddingBottom: '0.15rem',
              transition: 'border-color var(--dur-fast) var(--ease-out)',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.borderBottomColor = 'var(--color-ink)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.borderBottomColor = 'var(--color-stone)')
            }
          >
            {avatarUrl ? '— Change portrait' : '— Add portrait'}
          </button>

          {displayUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              style={{
                ...SERIF_ITALIC,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-stone-dark)',
                fontSize: '0.92rem',
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
              onMouseOut={(e) =>
                (e.currentTarget.style.color = 'var(--color-stone-dark)')
              }
            >
              Remove
            </button>
          )}
        </div>
      )}

      {/* ── Error notice ── */}
      {error && (
        <p
          style={{
            ...SERIF_ITALIC,
            fontSize: '0.88rem',
            color: 'var(--color-terracotta, #c45d3e)',
            textAlign: 'center',
            maxWidth: 240,
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

    </div>
  );
}
