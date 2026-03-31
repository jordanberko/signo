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

export function calculateCommission(price: number) {
  const stripeFee = Math.round((price * 0.0175 + 0.30) * 100) / 100;
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
