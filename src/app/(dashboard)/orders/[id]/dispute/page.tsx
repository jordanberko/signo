'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import EditorialSpinner from '@/components/ui/EditorialSpinner';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { uploadDisputeEvidence, uploadDisputeVideo } from '@/lib/supabase/storage';

// ── Types ──

type DisputeType = 'damaged' | 'not_as_described' | 'not_received' | 'other';

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const HIGH_VALUE_THRESHOLD_AUD = 500;
const MAX_EXTRA_FILES = 5;

interface OrderBasic {
  id: string;
  status: string;
  inspection_deadline: string | null;
  total_amount_aud: number | null;
  artwork: {
    title: string;
  } | null;
}

interface EvidenceSlot {
  label: string;
  helpText: string;
  file: File | null;
  required: boolean;
}

function validateFile(file: File, kind: 'photo' | 'video'): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`;
  }
  if (kind === 'photo' && !ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported photo format. Use JPG, PNG, or HEIC.`;
  }
  if (kind === 'video' && !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported video format. Use MP4 or MOV.`;
  }
  return null;
}

function requiresStructuredEvidence(type: DisputeType | null): boolean {
  return type === 'damaged' || type === 'not_as_described';
}

const disputeTypes: { value: DisputeType; label: string; description: string }[] = [
  {
    value: 'damaged',
    label: 'Arrived damaged',
    description: 'The work was damaged in shipping or handling.',
  },
  {
    value: 'not_as_described',
    label: 'Not as described',
    description: 'The work differs significantly from the listing.',
  },
  {
    value: 'not_received',
    label: 'Not received',
    description: 'Delivery was confirmed but the work never arrived.',
  },
  {
    value: 'other',
    label: 'Another issue',
    description: 'Something else is wrong with the order.',
  },
];

// ── Content ──

function DisputeContent({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // Form state
  const [disputeType, setDisputeType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Structured evidence for damage/not_as_described
  const [evidenceSlots, setEvidenceSlots] = useState<EvidenceSlot[]>([
    { label: 'Close-up of damage or discrepancy', helpText: 'A clear, close-up photograph showing the issue.', file: null, required: true },
    { label: 'Full view of the work', helpText: 'A photograph of the entire piece so we can see the overall condition.', file: null, required: true },
    { label: 'Packaging as it arrived', helpText: 'How the packaging looked when you opened it.', file: null, required: true },
  ]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // For non-structured types (not_received, other) — simple multi-file input
  const [genericFiles, setGenericFiles] = useState<FileList | null>(null);

  const isHighValue = (order?.total_amount_aud ?? 0) > HIGH_VALUE_THRESHOLD_AUD;
  const structured = requiresStructuredEvidence(disputeType);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          setBlockReason('Order not found or you do not have access.');
          setLoading(false);
          return;
        }

        const { order: orderData } = await res.json();
        if (!orderData) {
          setBlockReason('Order not found or you do not have access.');
          setLoading(false);
          return;
        }

        const artwork = orderData.artworks as Record<string, string> | null;
        const ord: OrderBasic = {
          id: orderData.id as string,
          status: orderData.status as string,
          inspection_deadline: orderData.inspection_deadline as string | null,
          total_amount_aud: typeof orderData.total_amount_aud === 'number' ? orderData.total_amount_aud : null,
          artwork: artwork ? { title: artwork.title || 'Artwork' } : null,
        };
        setOrder(ord);

        if (ord.status !== 'delivered') {
          setBlockReason('Disputes can only be opened for delivered orders.');
          setLoading(false);
          return;
        }

        if (
          ord.inspection_deadline &&
          new Date(ord.inspection_deadline).getTime() < Date.now()
        ) {
          setBlockReason('The 48-hour inspection window has closed.');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('[Dispute] Fetch error:', err);
        setBlockReason('Failed to load order details.');
        setLoading(false);
      }
    }

    load();
  }, [user, orderId]);

  function canSubmit(): boolean {
    if (!disputeType || description.length < 20 || submitting) return false;
    if (structured) {
      const requiredFilled = evidenceSlots.every((s) => !s.required || s.file);
      if (!requiredFilled) return false;
      if (isHighValue && !videoFile) return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit() || !order) return;

    setSubmitting(true);
    setError(null);
    setFileError(null);
    setUploadProgress(null);

    try {
      const evidenceUrls: string[] = [];
      let videoUrl: string | undefined;

      if (structured) {
        const photoFiles = [
          ...evidenceSlots.filter((s) => s.file).map((s) => s.file!),
          ...extraFiles,
        ];
        const totalUploads = photoFiles.length + (videoFile ? 1 : 0);

        for (let i = 0; i < photoFiles.length; i++) {
          setUploadProgress({ current: i + 1, total: totalUploads });
          const url = await uploadDisputeEvidence(photoFiles[i], order.id);
          evidenceUrls.push(url);
        }

        if (videoFile) {
          setUploadProgress({ current: totalUploads, total: totalUploads });
          videoUrl = await uploadDisputeVideo(videoFile, order.id);
        }
      } else {
        const fileArray = genericFiles ? Array.from(genericFiles) : [];
        for (let i = 0; i < fileArray.length; i++) {
          setUploadProgress({ current: i + 1, total: fileArray.length });
          const url = await uploadDisputeEvidence(fileArray[i], order.id);
          evidenceUrls.push(url);
        }
      }
      setUploadProgress(null);

      const res = await fetch(`/api/orders/${order.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: disputeType,
          description,
          evidence_images: evidenceUrls,
          ...(videoUrl ? { evidence_video: videoUrl } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit dispute');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  // ── Loading ──

  if (loading) return <EditorialSpinner headline="Loading order…" />;

  const shellStyle = {
    background: 'var(--color-warm-white)',
    minHeight: '100vh',
  } as const;

  const pageShell = (children: React.ReactNode) => (
    <div style={shellStyle}>
      <div
        className="px-6 sm:px-10"
        style={{
          maxWidth: '46rem',
          margin: '0 auto',
          paddingTop: 'clamp(7.5rem, 10vw, 9.5rem)',
          paddingBottom: 'clamp(4rem, 7vw, 6rem)',
        }}
      >
        {children}
      </div>
    </div>
  );

  // ── Blocked ──

  if (blockReason) {
    return pageShell(
      <>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          — Not available —
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          We can&apos;t open a dispute for this order.
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          {blockReason}
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{ minWidth: '14rem' }}
        >
          ← Back to order
        </Link>
      </>
    );
  }

  // ── Success ──

  if (submitted) {
    return pageShell(
      <>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '1.2rem',
          }}
        >
          — Received —
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            fontWeight: 400,
            marginBottom: '1.2rem',
          }}
        >
          Your dispute is <em style={{ fontStyle: 'italic' }}>submitted.</em>
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-stone-dark)',
            fontWeight: 300,
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '52ch',
          }}
        >
          Signo will review within 48 hours. You&apos;ll hear from us by email.
        </p>
        <Link
          href={`/orders/${orderId}`}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{ minWidth: '14rem' }}
        >
          ← Back to order
        </Link>
      </>
    );
  }

  // ── Form ──

  return pageShell(
    <>
      <Link
        href={`/orders/${orderId}`}
        className="font-serif"
        style={{
          display: 'inline-block',
          marginBottom: '2rem',
          fontSize: '0.68rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontStyle: 'italic',
          color: 'var(--color-stone)',
          textDecoration: 'none',
        }}
      >
        ← Back to order
      </Link>

      <p
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--color-stone)',
          marginBottom: '1rem',
        }}
      >
        Report an issue
      </p>
      <h1
        className="font-serif"
        style={{
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          lineHeight: 1.08,
          letterSpacing: '-0.015em',
          color: 'var(--color-ink)',
          fontWeight: 400,
          marginBottom: '0.8rem',
        }}
      >
        Something isn&apos;t <em style={{ fontStyle: 'italic' }}>right.</em>
      </h1>
      <p
        style={{
          fontSize: '0.92rem',
          fontWeight: 300,
          color: 'var(--color-stone-dark)',
          lineHeight: 1.6,
          marginBottom: '2.4rem',
          maxWidth: '52ch',
        }}
      >
        Tell us what happened. A Signo team member will review your dispute within 48 hours.
        {order?.artwork && (
          <>
            {' '}For <em style={{ fontStyle: 'italic' }}>{order.artwork.title}</em>.
          </>
        )}
      </p>

      {/* ── Change-of-mind notice ── */}
      <div
        style={{
          background: 'var(--color-cream)',
          border: '1px solid var(--color-border)',
          padding: 'clamp(1.2rem, 2vw, 1.6rem)',
          marginBottom: '2.4rem',
        }}
      >
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-stone)',
            marginBottom: '0.7rem',
          }}
        >
          Before you raise a dispute
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
            lineHeight: 1.6,
            marginBottom: '0.6rem',
          }}
        >
          Change-of-mind returns are not accepted after shipping. If you simply no longer want the work,
          please contact the artist directly to discuss options.
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 300,
            color: 'var(--color-stone-dark)',
            lineHeight: 1.6,
          }}
        >
          This dispute flow is for artworks that arrived damaged, were not as described, or did not arrive
          at all. Please select the relevant reason below.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dispute type */}
        <div style={{ marginBottom: '2.2rem' }}>
          <p className="commission-label">What&apos;s the issue?</p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: '1px solid var(--color-border-strong)',
            }}
          >
            {disputeTypes.map((dt) => {
              const active = disputeType === dt.value;
              return (
                <li
                  key={dt.value}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setDisputeType(dt.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: active ? 22 : 0,
                        height: 1,
                        background: 'var(--color-ink)',
                        verticalAlign: 'middle',
                        marginRight: active ? 12 : 0,
                        transition: 'width var(--dur-fast) var(--ease-out), margin var(--dur-fast) var(--ease-out)',
                      }}
                      aria-hidden
                    />
                    <span
                      className="font-serif"
                      style={{
                        fontSize: '1.05rem',
                        color: 'var(--color-ink)',
                        fontWeight: 400,
                        fontStyle: active ? 'italic' : 'normal',
                      }}
                    >
                      {dt.label}
                    </span>
                    <p
                      style={{
                        marginTop: '0.3rem',
                        marginLeft: active ? 34 : 0,
                        fontSize: '0.82rem',
                        color: 'var(--color-stone)',
                        fontWeight: 300,
                        lineHeight: 1.5,
                        transition: 'margin var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      {dt.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '2.2rem' }}>
          <label htmlFor="description" className="commission-label">
            Describe the issue
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened in detail…"
            rows={6}
            className="commission-field"
            required
            minLength={20}
            style={{ resize: 'vertical' }}
          />
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.72rem',
              fontWeight: 300,
              fontStyle: description.length > 0 && description.length < 20 ? 'italic' : 'normal',
              color:
                description.length > 0 && description.length < 20
                  ? 'var(--color-terracotta)'
                  : 'var(--color-stone)',
            }}
          >
            {description.length} / 20 characters minimum
          </p>
        </div>

        {/* Evidence uploads */}
        <div style={{ marginBottom: '2.2rem' }}>
          <label className="commission-label">
            {structured ? 'Required evidence' : 'Photo evidence'}
          </label>

          {structured ? (
            <>
              {/* Structured photo slots */}
              {evidenceSlots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    borderTop: idx === 0 ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border)',
                    padding: '1.2rem 0',
                  }}
                >
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-ink)', fontWeight: 400, marginBottom: '0.3rem' }}>
                    {slot.label}
                    {slot.required && <span style={{ color: 'var(--color-terracotta, #c45d3e)', marginLeft: '0.3rem' }}>*</span>}
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-stone)', fontWeight: 300, marginBottom: '0.7rem' }}>
                    {slot.helpText}
                  </p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,.heif"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) {
                        const err = validateFile(f, 'photo');
                        if (err) { setFileError(err); return; }
                        setFileError(null);
                      }
                      setEvidenceSlots((prev) => prev.map((s, i) => i === idx ? { ...s, file: f } : s));
                    }}
                    style={{ display: 'block', width: '100%', fontSize: '0.82rem', color: 'var(--color-stone-dark)', fontWeight: 300 }}
                  />
                  {slot.file && (
                    <p className="font-serif" style={{ marginTop: '0.4rem', fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--color-stone)' }}>
                      {slot.file.name} ({(slot.file.size / 1024 / 1024).toFixed(1)}MB)
                    </p>
                  )}
                </div>
              ))}

              {/* Video upload */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '1.2rem 0',
                }}
              >
                <p style={{ fontSize: '0.88rem', color: 'var(--color-ink)', fontWeight: 400, marginBottom: '0.3rem' }}>
                  Video walkthrough
                  {isHighValue && <span style={{ color: 'var(--color-terracotta, #c45d3e)', marginLeft: '0.3rem' }}>*</span>}
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--color-stone)', fontWeight: 300, marginBottom: '0.7rem' }}>
                  {isHighValue
                    ? 'Required for orders over $500. A continuous 15–60 second video showing the work and packaging.'
                    : 'Optional. A short video showing the damage or discrepancy helps us resolve your dispute faster.'}
                </p>
                <input
                  type="file"
                  accept=".mp4,.mov"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      const err = validateFile(f, 'video');
                      if (err) { setFileError(err); return; }
                      setFileError(null);
                    }
                    setVideoFile(f);
                  }}
                  style={{ display: 'block', width: '100%', fontSize: '0.82rem', color: 'var(--color-stone-dark)', fontWeight: 300 }}
                />
                {videoFile && (
                  <p className="font-serif" style={{ marginTop: '0.4rem', fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--color-stone)' }}>
                    {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                  </p>
                )}
              </div>

              {/* Additional photos */}
              <div style={{ padding: '1.2rem 0' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-ink)', fontWeight: 400, marginBottom: '0.3rem' }}>
                  Additional photos
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--color-stone)', fontWeight: 300, marginBottom: '0.7rem' }}>
                  Up to {MAX_EXTRA_FILES} more photos from other angles, if helpful.
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.heic,.heif"
                  multiple
                  onChange={(e) => {
                    const selected = e.target.files ? Array.from(e.target.files) : [];
                    if (selected.length > MAX_EXTRA_FILES) {
                      setFileError(`Please select up to ${MAX_EXTRA_FILES} additional photos.`);
                      return;
                    }
                    for (const f of selected) {
                      const err = validateFile(f, 'photo');
                      if (err) { setFileError(err); return; }
                    }
                    setFileError(null);
                    setExtraFiles(selected);
                  }}
                  style={{ display: 'block', width: '100%', fontSize: '0.82rem', color: 'var(--color-stone-dark)', fontWeight: 300 }}
                />
                {extraFiles.length > 0 && (
                  <p className="font-serif" style={{ marginTop: '0.4rem', fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--color-stone)' }}>
                    {extraFiles.length} additional file{extraFiles.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Generic file input for not_received / other */
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                padding: '1.4rem 0',
              }}
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.heif"
                multiple
                onChange={(e) => setGenericFiles(e.target.files)}
                style={{ display: 'block', width: '100%', fontSize: '0.82rem', color: 'var(--color-stone-dark)', fontWeight: 300 }}
              />
              {genericFiles && genericFiles.length > 0 && (
                <p className="font-serif" style={{ marginTop: '0.6rem', fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--color-stone)' }}>
                  {genericFiles.length} file{genericFiles.length !== 1 ? 's' : ''} selected
                </p>
              )}
              <p className="font-serif" style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--color-stone)', fontWeight: 300, fontStyle: 'italic' }}>
                Recommended to support your claim.
              </p>
            </div>
          )}
        </div>

        {/* File validation error */}
        {fileError && (
          <p
            className="font-serif"
            style={{
              marginBottom: '1.2rem',
              fontSize: '0.85rem',
              color: 'var(--color-terracotta, #c45d3e)',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.5,
              maxWidth: '52ch',
            }}
          >
            {fileError}
          </p>
        )}

        {/* Submission error */}
        {error && (
          <p
            className="font-serif"
            style={{
              marginBottom: '1.6rem',
              fontSize: '0.92rem',
              color: 'var(--color-terracotta, #c45d3e)',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.5,
              maxWidth: '52ch',
            }}
          >
            {error}
          </p>
        )}

        {/* Missing evidence hint */}
        {structured && disputeType && !canSubmit() && !submitting && (
          <p
            className="font-serif"
            style={{
              marginBottom: '1.2rem',
              fontSize: '0.82rem',
              color: 'var(--color-stone)',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.5,
            }}
          >
            {(() => {
              const missing: string[] = [];
              evidenceSlots.forEach((s) => { if (s.required && !s.file) missing.push(s.label.toLowerCase()); });
              if (isHighValue && !videoFile) missing.push('video walkthrough');
              if (missing.length > 0) return `Still needed: ${missing.join(', ')}.`;
              if (description.length < 20) return 'Please describe the issue in at least 20 characters.';
              return '';
            })()}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit()}
          className="artwork-primary-cta artwork-primary-cta--compact"
          style={{
            minWidth: '18rem',
            opacity: canSubmit() ? 1 : 0.5,
          }}
        >
          {submitting
            ? uploadProgress
              ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
              : 'Submitting…'
            : 'Submit dispute'}
        </button>
      </form>
    </>
  );
}

// ── Page wrapper ──

export default function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { loading: authLoading } = useRequireAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  if (authLoading) return <EditorialSpinner />;
  if (!orderId) return <EditorialSpinner />;

  return <DisputeContent orderId={orderId} />;
}
