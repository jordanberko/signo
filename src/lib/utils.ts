import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceInDollars: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(priceInDollars);
}

/**
 * Calculate Stripe processing fee for AU domestic cards.
 * Rate: 1.75% + $0.30 AUD
 */
export function calculateStripeFee(amountAud: number): number {
  return Math.round((amountAud * 0.0175 + 0.30) * 100) / 100;
}

export function calculateCommission(price: number) {
  const stripeFee = calculateStripeFee(price);
  const artistPayout = Math.round((price - stripeFee) * 100) / 100;
  return {
    platformFee: 0,
    stripeFee,
    artistPayout,
  };
}

/**
 * Editorial status-pill classes.
 *
 * Maps order/artwork/dispute statuses onto a small palette-consistent
 * vocabulary defined in `globals.css` (`.status-pill--success`,
 * `.status-pill--progress`, `.status-pill--attention`,
 * `.status-pill--error`, `.status-pill--neutral`). Callers combine with
 * the base `.status-pill` class, e.g.
 *   `<span className={`status-pill ${getStatusStyle(order.status)}`}>`.
 */
export function getStatusStyle(status: string): string {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'active':
      return 'status-pill--success';
    case 'shipped':
    case 'delivered':
    case 'paid':
    case 'pending':
    case 'pending_review':
    case 'processing':
    case 'under_review':
      return 'status-pill--progress';
    case 'disputed':
    case 'past_due':
    case 'rejected':
    case 'failed':
      return 'status-pill--error';
    case 'requires_action':
    case 'needs_attention':
    case 'open':
      return 'status-pill--attention';
    case 'refunded':
    case 'cancelled':
    case 'closed':
    case 'paused':
    case 'archived':
      return 'status-pill--neutral';
    default:
      return 'status-pill--neutral';
  }
}

/** Convert a snake_case status to a readable label (e.g. 'pending_review' → 'Pending Review'). */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
