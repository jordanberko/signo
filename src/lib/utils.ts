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

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
