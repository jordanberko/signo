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
  it('returns success modifier for completed', () => {
    expect(getStatusStyle('completed')).toBe('status-pill--success')
  })

  it('returns progress modifier for shipped', () => {
    expect(getStatusStyle('shipped')).toBe('status-pill--progress')
  })

  it('returns progress modifier for delivered', () => {
    expect(getStatusStyle('delivered')).toBe('status-pill--progress')
  })

  it('returns progress modifier for paid', () => {
    expect(getStatusStyle('paid')).toBe('status-pill--progress')
  })

  it('returns error modifier for disputed', () => {
    expect(getStatusStyle('disputed')).toBe('status-pill--error')
  })

  it('returns neutral modifier for refunded', () => {
    expect(getStatusStyle('refunded')).toBe('status-pill--neutral')
  })

  it('returns neutral modifier for unknown status', () => {
    expect(getStatusStyle('unknown_status')).toBe('status-pill--neutral')
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
