'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
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
const MAX_SIZE_MB = 2;

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

      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please use a JPG, PNG, or WebP image.');
        return;
      }

      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_SIZE_MB} MB.`);
        return;
      }

      // Show preview immediately
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
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative group" style={{ width: size, height: size }}>
        <div
          className="w-full h-full rounded-full overflow-hidden border-2 border-border bg-muted-bg transition-colors duration-200 group-hover:border-accent/40"
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Avatar"
              width={size}
              height={size}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent-subtle">
              <span
                className="font-editorial font-medium text-accent-dark"
                style={{ fontSize: size * 0.3 }}
              >
                {userName ? getInitials(userName) : '?'}
              </span>
            </div>
          )}

          {/* Upload progress overlay */}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
                <span className="text-[10px] text-white font-medium">{progress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Camera button — click to upload */}
        {!uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 bg-white border-2 border-border rounded-full flex items-center justify-center shadow-sm hover:border-accent hover:bg-accent-subtle transition-all duration-200"
          >
            <Camera className="h-4 w-4 text-muted" />
          </button>
        )}

        {/* Remove button */}
        {displayUrl && !uploading && (
          <button
            type="button"
            onClick={removeAvatar}
            className="absolute top-0 right-0 w-7 h-7 bg-white border-2 border-border rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 hover:border-error hover:bg-error hover:text-white transition-all duration-200"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Label */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-accent-dark font-medium hover:text-accent-light transition-colors disabled:opacity-50"
      >
        {avatarUrl ? 'Change photo' : 'Upload photo'}
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-error text-center max-w-[200px] animate-fade-in">{error}</p>
      )}
    </div>
  );
}
