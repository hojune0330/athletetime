import { describe, expect, it } from 'vitest'
import { SHARE_POLICY, formatSource, scopeCount } from './dataPolicy'

describe('data policy launch safeguards', () => {
  it('keeps public sharing disabled until owner verification exists', () => {
    expect(SHARE_POLICY.status).toBe('disabled')
  })

  it('keeps source language and scope language explicit', () => {
    expect(formatSource({ provider: 'KAAF', competitionName: '서울 대회', date: '2026-07-26' }))
      .toContain('AthleteTime이 모아 정리')
    expect(scopeCount(1234, '명')).toContain('AthleteTime이 모은')
  })
})
