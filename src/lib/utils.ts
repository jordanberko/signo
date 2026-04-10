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

/** Tailwind classes for order-status badges. */
export function getStatusStyle(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700';
    case 'shipped':
    case 'delivered':
      return 'bg-blue-50 text-blue-700';
    case 'paid':
      return 'bg-amber-50 text-amber-700';
    case 'disputed':
      return 'bg-red-50 text-red-700';
    case 'refunded':
    case 'cancelled':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-50 text-gray-600';
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
