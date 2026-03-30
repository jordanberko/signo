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
  const platformFee = price * 0.165;
  const artistPayout = price * 0.835;
  return {
    platformFee: Math.round(platformFee * 100) / 100,
    artistPayout: Math.round(artistPayout * 100) / 100,
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
