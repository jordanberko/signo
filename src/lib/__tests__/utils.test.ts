import { describe, it, expect } from 'vitest'
import {
  calculateStripeFee,
  formatStatus,
  getStatusStyle,
  calculateCommission,
} from '@/lib/utils'

describe('calculateStripeFee', () => {
  it('returns the fixed fee for a $0 amount', () => {
    expect(calculateStripeFee(0)).toBe(0.30)
  })

  it('calculates correctly for $100', () => {
    // 100 * 0.0175 + 0.30 = 2.05
    expect(calculateStripeFee(100)).toBe(2.05)
  })

  it('calculates correctly for $1000', () => {
    // 1000 * 0.0175 + 0.30 = 17.80
    expect(calculateStripeFee(1000)).toBe(17.80)
  })
})

describe('formatStatus', () => {
  it('converts underscores to spaces and capitalizes each word', () => {
    expect(formatStatus('pending_review')).toBe('Pending Review')
  })

  it('capitalizes a single word', () => {
    expect(formatStatus('shipped')).toBe('Shipped')
  })

  it('handles multiple underscores', () => {
    expect(formatStatus('waiting_for_artist')).toBe('Waiting For Artist')
  })
})

describe('getStatusStyle', () => {
  it('returns green classes for completed', () => {
    expect(getStatusStyle('completed')).toBe('bg-green-50 text-green-700')
  })

  it('returns blue classes for shipped', () => {
    expect(getStatusStyle('shipped')).toBe('bg-blue-50 text-blue-700')
  })

  it('returns blue classes for delivered', () => {
    expect(getStatusStyle('delivered')).toBe('bg-blue-50 text-blue-700')
  })

  it('returns amber classes for paid', () => {
    expect(getStatusStyle('paid')).toBe('bg-amber-50 text-amber-700')
  })

  it('returns red classes for disputed', () => {
    expect(getStatusStyle('disputed')).toBe('bg-red-50 text-red-700')
  })

  it('returns gray classes for refunded', () => {
    expect(getStatusStyle('refunded')).toBe('bg-gray-100 text-gray-600')
  })

  it('returns default gray classes for unknown status', () => {
    expect(getStatusStyle('unknown_status')).toBe('bg-gray-50 text-gray-600')
  })
})

describe('calculateCommission', () => {
  it('returns correct breakdown for $100', () => {
    const result = calculateCommission(100)
    expect(result.platformFee).toBe(0)
    expect(result.stripeFee).toBe(2.05)
    expect(result.artistPayout).toBe(97.95)
  })

  it('returns correct breakdown for $1000', () => {
    const result = calculateCommission(1000)
    expect(result.platformFee).toBe(0)
    expect(result.stripeFee).toBe(17.80)
    expect(result.artistPayout).toBe(982.20)
  })

  it('artist payout + stripe fee equals the original price', () => {
    const price = 250
    const result = calculateCommission(price)
    expect(result.artistPayout + result.stripeFee).toBeCloseTo(price, 2)
  })
})
