'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const ImageEditor = dynamic(() => import('./ImageEditor'), { ssr: false });

interface ImageItem {
  /** A unique key for React rendering and reordering. */
  id: string;
  /** The public URL (set after upload completes, or for initialImages). */
  url: string;
  /** Local preview URL (blob:) while the file is pending upload. */
  preview?: string;
  /** The original File object (null for already-uploaded images). */
  file?: File;
  /** Upload progress 0–100. */
  progress: number;
  /** True while uploading. */
  uploading: boolean;
  /** Error message if upload failed. */
  error?: string;
}

interface ImageUploadProps {
  /** Maximum number of images allowed. */
  maxFiles?: number;
  /** Maximum file size in MB. */
  maxSizeMB?: number;
  /** Already-uploaded image URLs (for edit mode). */
  initialImages?: string[];
  /** Callback fired whenever the image list changes. Returns final public URLs only. */
  onImagesChange: (urls: string[]) => void;
  /** Function to upload a single file and return its public URL. */
  uploadFile: (file: File, onProgress: (progress: number) => void) => Promise<string>;
}

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.heif';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ── Editorial style tokens ──

const KICKER: CSSProperties = {
  fontSize: '0.62rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-stone)',
  fontWeight: 400,
  margin: 0,
};

const SERIF_ITALIC: CSSProperties = {
  fontFamily: 'var(--font-serif), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
};

const HAIRLINE_BORDER = '1px solid var(--color-border-strong)';
const INK_BORDER = '1px solid var(--color-ink)';
const ERROR_BORDER = '1px solid var(--color-terracotta, #c45d3e)';

export default function ImageUpload({
  maxFiles = 6,
  maxSizeMB = 15,
  initialImages = [],
  onImagesChange,
  uploadFile,
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>(() =>
    initialImages.map((url) => ({
      id: crypto.randomUUID(),
      url,
      progress: 100,
      uploading: false,
    }))
  );
  const [error, setError] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Are any images currently uploading?
  const anyUploading = images.some((img) => img.uploading);

  // Notify parent of URL changes
  const notifyParent = useCallback(
    (items: ImageItem[]) => {
      const urls = items
        .filter((img) => img.url && !img.uploading && !img.error)
        .map((img) => img.url);
      onImagesChange(urls);
    },
    [onImagesChange]
  );

  // Upload a single file for a given image item
  const uploadSingleFile = useCallback(
    async (file: File, itemId: string) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId ? { ...img, uploading: true, error: undefined, progress: 0 } : img
        )
      );

      try {
        const url = await uploadFile(file, (progress) => {
          setImages((prev) =>
            prev.map((img) => (img.id === itemId ? { ...img, progress } : img))
          );
        });

        setImages((prev) => {
          const updated = prev.map((img) =>
            img.id === itemId
              ? { ...img, url, uploading: false, progress: 100, error: undefined }
              : img
          );
          notifyParent(updated);
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        console.error(`[ImageUpload] Upload failed for ${file.name}:`, message);
        setImages((prev) =>
          prev.map((img) =>
            img.id === itemId ? { ...img, uploading: false, error: message } : img
          )
        );
      }
    },
    [uploadFile, notifyParent]
  );

  // Retry a failed upload
  const retryUpload = useCallback(
    (id: string) => {
      const img = images.find((i) => i.id === id);
      if (img?.file) {
        uploadSingleFile(img.file, id);
      }
    },
    [images, uploadSingleFile]
  );

  // Handle edited image — re-upload the corrected file
  const handleEditApply = useCallback(
    async (file: File) => {
      const id = editingId;
      if (!id) return;
      setEditingId(null);

      const oldImg = images.find((i) => i.id === id);
      if (oldImg?.preview) URL.revokeObjectURL(oldImg.preview);

      const preview = URL.createObjectURL(file);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, file, preview, url: '', uploading: true, progress: 0, error: undefined }
            : img
        )
      );

      try {
        const url = await uploadFile(file, (progress) => {
          setImages((prev) =>
            prev.map((img) => (img.id === id ? { ...img, progress } : img))
          );
        });

        setImages((prev) => {
          const updated = prev.map((img) =>
            img.id === id
              ? { ...img, url, uploading: false, progress: 100, error: undefined }
              : img
          );
          notifyParent(updated);
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setImages((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, uploading: false, error: message } : img
          )
        );
      }
    },
    [editingId, images, uploadFile, notifyParent]
  );

  // Validate and add files
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError('');
      const fileArray = Array.from(files);

      const currentCount = images.length;
      if (currentCount + fileArray.length > maxFiles) {
        setError(
          `You can upload a maximum of ${maxFiles} images. You have ${currentCount} already.`
        );
        return;
      }

      const validFiles: { file: File; item: ImageItem }[] = [];
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(`"${file.name}" is not supported. Use JPG, PNG, or WebP.`);
          return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(
            `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${maxSizeMB} MB.`
          );
          return;
        }

        const item: ImageItem = {
          id: crypto.randomUUID(),
          url: '',
          preview: URL.createObjectURL(file),
          file,
          progress: 0,
          uploading: true,
        };
        validFiles.push({ file, item });
      }

      const newItems = validFiles.map((v) => v.item);
      setImages((prev) => [...prev, ...newItems]);

      for (const { file, item } of validFiles) {
        uploadSingleFile(file, item.id);
      }
    },
    [images, maxFiles, maxSizeMB, uploadSingleFile]
  );

  // Remove an image
  const removeImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const img = prev.find((i) => i.id === id);
        if (img?.preview) URL.revokeObjectURL(img.preview);

        const updated = prev.filter((i) => i.id !== id);
        notifyParent(updated);
        return updated;
      });
    },
    [notifyParent]
  );

  // ── Drag-and-drop files onto zone ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  // ── Reorder via drag handles ──
  const handleReorderDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleReorderDragOver = useCallback(
    (e: React.DragEvent, overIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === overIndex) return;

      setImages((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(overIndex, 0, moved);
        notifyParent(updated);
        return updated;
      });
      setDragIndex(overIndex);
    },
    [dragIndex, notifyParent]
  );

  const handleReorderDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const hasRoom = images.length < maxFiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Drop zone (hairline ink-bordered rectangle) ── */}
      {hasRoom && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: '100%',
            background: isDraggingOver ? 'var(--color-cream)' : 'transparent',
            border: isDraggingOver ? INK_BORDER : HAIRLINE_BORDER,
            padding: '2.6rem 1.5rem',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
            color: 'var(--color-ink)',
          }}
        >
          <p style={{ ...KICKER, marginBottom: '1rem' }}>
            {isDraggingOver ? 'Release to upload' : 'Add photographs'}
          </p>
          <p
            style={{
              ...SERIF_ITALIC,
              fontSize: '1.2rem',
              color: 'var(--color-ink)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {isDraggingOver
              ? 'Drop the files here.'
              : 'Drop files here, or click to browse.'}
          </p>
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-stone-dark)',
              fontWeight: 300,
              marginTop: '0.6rem',
              lineHeight: 1.5,
            }}
          >
            JPG · PNG · WebP · HEIC &nbsp;—&nbsp; max {maxSizeMB} MB each &nbsp;—&nbsp; up to {maxFiles} images
          </p>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple={maxFiles > 1}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* ── Error notice (terracotta hairline) ── */}
      {error && (
        <div
          style={{
            borderTop: ERROR_BORDER,
            borderBottom: ERROR_BORDER,
            padding: '0.9rem 0',
          }}
        >
          <p
            style={{
              ...KICKER,
              color: 'var(--color-terracotta, #c45d3e)',
              marginBottom: '0.4rem',
            }}
          >
            — A problem
          </p>
          <p
            style={{
              ...SERIF_ITALIC,
              fontSize: '1rem',
              color: 'var(--color-ink)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* ── Uploading hint ── */}
      {anyUploading && (
        <p
          style={{
            ...SERIF_ITALIC,
            fontSize: '0.92rem',
            color: 'var(--color-stone-dark)',
            margin: 0,
          }}
        >
          — Uploading, please wait…
        </p>
      )}

      {/* ── Image grid (square tiles, hairline borders, no rounded) ── */}
      {images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: '0.9rem',
          }}
          className="grid-cols-2 sm:grid-cols-3"
        >
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable={!img.uploading}
              onDragStart={() => handleReorderDragStart(index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDragEnd={handleReorderDragEnd}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                border: img.error
                  ? ERROR_BORDER
                  : dragIndex === index
                    ? INK_BORDER
                    : HAIRLINE_BORDER,
                background: 'var(--color-cream)',
                opacity: dragIndex === index ? 0.55 : 1,
                transition: 'opacity var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
                cursor: img.uploading ? 'default' : 'grab',
              }}
              className="group"
            >
              {/* Thumbnail */}
              <Image
                src={img.preview || img.url}
                alt={`Upload ${index + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 640px) 50vw, 33vw"
              />

              {/* Upload progress overlay — typographic, no spinner */}
              {img.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(26, 26, 24, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '1rem',
                  }}
                >
                  <p
                    style={{
                      ...SERIF_ITALIC,
                      fontSize: '1.1rem',
                      color: 'var(--color-warm-white)',
                      margin: 0,
                      textAlign: 'center',
                    }}
                  >
                    {img.progress < 40
                      ? 'Compressing…'
                      : img.progress < 90
                        ? 'Uploading…'
                        : 'Finishing…'}
                  </p>
                  {/* Hairline progress bar */}
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
                        width: `${img.progress}%`,
                        height: '100%',
                        background: 'var(--color-warm-white)',
                        transition: 'width var(--dur-base) var(--ease-out)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay — tap to retry */}
              {img.error && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    retryUpload(img.id);
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(196, 93, 62, 0.85)',
                    border: 'none',
                    color: 'var(--color-warm-white)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '1rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ ...KICKER, color: 'var(--color-warm-white)', margin: 0 }}>
                    Failed
                  </p>
                  <p
                    style={{
                      ...SERIF_ITALIC,
                      fontSize: '1rem',
                      color: 'var(--color-warm-white)',
                      margin: 0,
                    }}
                  >
                    Tap to retry ↻
                  </p>
                </button>
              )}

              {/* Primary kicker — bottom-left, only on first non-erroring tile */}
              {index === 0 && !img.uploading && !img.error && (
                <p
                  style={{
                    position: 'absolute',
                    bottom: '0.6rem',
                    left: '0.7rem',
                    margin: 0,
                    fontSize: '0.6rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--color-warm-white)',
                    fontWeight: 400,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                  }}
                >
                  01 — Primary
                </p>
              )}

              {/* Hover controls — text-only */}
              {!img.uploading && !img.error && (
                <div
                  className="opacity-0 group-hover:opacity-100"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(26,26,24,0.55) 0%, transparent 45%, transparent 55%, rgba(26,26,24,0.45) 100%)',
                    transition: 'opacity var(--dur-fast) var(--ease-out)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.8rem',
                  }}
                >
                  {/* Top row: drag glyph + remove */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      aria-hidden
                      title="Drag to reorder"
                      style={{
                        fontSize: '1rem',
                        color: 'var(--color-warm-white)',
                        cursor: 'grab',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                    >
                      ≡
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      aria-label="Remove image"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-warm-white)',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Bottom row: edit text-link */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(img.id);
                    }}
                    style={{
                      ...SERIF_ITALIC,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-warm-white)',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left',
                      alignSelf: 'flex-start',
                    }}
                  >
                    — Edit
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add another tile */}
          {hasRoom && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                aspectRatio: '1 / 1',
                background: 'transparent',
                border: HAIRLINE_BORDER,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-stone-dark)',
                transition: 'border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
              }}
              className="hover:!border-[var(--color-ink)] hover:!text-[var(--color-ink)]"
            >
              <span
                style={{
                  ...SERIF_ITALIC,
                  fontSize: '1rem',
                }}
              >
                + Add another
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Hint ── */}
      {images.length > 1 && (
        <p
          style={{
            ...SERIF_ITALIC,
            fontSize: '0.85rem',
            color: 'var(--color-stone-dark)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          — Drag to reorder. The first image becomes the primary.
        </p>
      )}

      {/* Image Editor modal */}
      {editingId && (() => {
        const img = images.find((i) => i.id === editingId);
        const src = img?.preview || img?.url;
        if (!src) return null;
        return (
          <ImageEditor
            src={src}
            onApply={handleEditApply}
            onCancel={() => setEditingId(null)}
          />
        );
      })()}
    </div>
  );
}
