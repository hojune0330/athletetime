import { describe, expect, it } from 'vitest'
import { selectInitialRecordEventKey } from './recordAthleteDefaultEvent'

describe('selectInitialRecordEventKey', () => {
  it('keeps a shared link\'s explicit event, even when the first page does not contain it', () => {
    expect(selectInitialRecordEventKey('200m', [
      { eventKey: '100m', eventLabel: '100m' },
    ])).toBe('200m')
  })

  it('opens the most represented loaded event when a shared link has no event', () => {
    expect(selectInitialRecordEventKey(null, [
      { eventKey: '800m', eventLabel: '800m' },
      { eventKey: '100m', eventLabel: '100m' },
      { eventKey: '100m', eventLabel: '100m' },
    ])).toBe('100m')
  })

  it('uses a stable label and key tie-breaker and ignores empty event keys', () => {
    expect(selectInitialRecordEventKey(null, [
      { eventKey: '', eventLabel: 'unknown' },
      { eventKey: 'long-jump', eventLabel: '멀리뛰기' },
      { eventKey: 'high-jump', eventLabel: '높이뛰기' },
    ])).toBe('high-jump')
  })

  it('does not select an event without loaded public records', () => {
    expect(selectInitialRecordEventKey(null, [])).toBeNull()
  })
})
