'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, X, GripVertical, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import Image from 'next/image';

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

const ACCEPTED = '.jpg,.jpeg,.png,.webp';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
      // Mark as uploading
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
            img.id === itemId
              ? { ...img, uploading: false, error: message }
              : img
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

  // Validate and add files
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError('');
      const fileArray = Array.from(files);

      // Check total count
      const currentCount = images.length;
      if (currentCount + fileArray.length > maxFiles) {
        setError(`You can upload a maximum of ${maxFiles} images. You have ${currentCount} already.`);
        return;
      }

      // Validate each file
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

      // Add placeholders immediately (shows local preview)
      const newItems = validFiles.map((v) => v.item);
      setImages((prev) => [...prev, ...newItems]);

      // Upload each file
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
    <div className="space-y-4">
      {/* Drop zone */}
      {hasRoom && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
            isDraggingOver
              ? 'border-accent bg-accent-subtle scale-[1.01]'
              : 'border-border hover:border-accent/50 hover:bg-cream'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isDraggingOver
                  ? 'bg-accent/20 text-accent'
                  : 'bg-muted-bg text-muted group-hover:bg-accent-subtle group-hover:text-accent'
              }`}
            >
              <ImagePlus className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {isDraggingOver ? 'Drop images here' : 'Drop images here or click to browse'}
              </p>
              <p className="text-xs text-muted mt-1">
                JPG, PNG, or WebP · Max {maxSizeMB} MB each · Up to {maxFiles} images · High-res recommended
              </p>
            </div>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Uploading indicator */}
      {anyUploading && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading — please wait...</span>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable={!img.uploading}
              onDragStart={() => handleReorderDragStart(index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDragEnd={handleReorderDragEnd}
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                dragIndex === index
                  ? 'border-accent opacity-50 scale-95'
                  : 'border-border hover:border-accent/40'
              } ${img.error ? 'border-error/40' : ''}`}
            >
              {/* Thumbnail — uses local preview immediately, then Supabase URL */}
              <Image
                src={img.preview || img.url}
                alt={`Upload ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />

              {/* Upload progress overlay — spinner, not stuck percentage */}
              {img.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                    <span className="text-xs text-white/80 font-medium">
                      {img.progress < 40
                        ? 'Compressing...'
                        : img.progress < 90
                          ? 'Uploading...'
                          : 'Finishing...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error overlay — tap to retry */}
              {img.error && (
                <button
                  type="button"
                  onClick={() => retryUpload(img.id)}
                  className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[2px] cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-1.5 px-3 text-center">
                    <RotateCw className="h-5 w-5 text-white" />
                    <span className="text-xs text-white font-medium leading-tight">
                      Failed — tap to retry
                    </span>
                    <span className="text-[10px] text-white/70 leading-tight max-w-[120px] truncate">
                      {img.error}
                    </span>
                  </div>
                </button>
              )}

              {/* Primary badge */}
              {index === 0 && !img.uploading && !img.error && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
                  Primary
                </div>
              )}

              {/* Hover controls */}
              {!img.uploading && !img.error && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Drag handle */}
                  <div className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing shadow-sm">
                    <GripVertical className="h-3.5 w-3.5 text-muted" />
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-error hover:text-white transition-colors shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Remove button for errored items */}
              {img.error && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-error hover:text-white transition-colors shadow-sm z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add more placeholder */}
          {hasRoom && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-accent/50 hover:bg-cream flex items-center justify-center transition-all duration-200 group"
            >
              <div className="flex flex-col items-center gap-1.5">
                <ImagePlus className="h-5 w-5 text-muted group-hover:text-accent-dark transition-colors" />
                <span className="text-xs text-muted group-hover:text-accent-dark transition-colors">Add more</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Hint */}
      {images.length > 1 && (
        <p className="text-xs text-warm-gray text-center">
          Drag images to reorder · The first image will be the main thumbnail
        </p>
      )}
    </div>
  );
}
