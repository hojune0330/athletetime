import { describe, expect, it } from 'vitest'
import {
  parseTeamDetailQuery,
  parseTeamDetailResponse,
  parseTeamSearchResponse,
  TeamPerformanceContractError,
} from './teamPerformanceContracts'

describe('team performance API boundary', () => {
  it('parses a versioned team search response when every compact total is present', () => {
    // Given a current aggregate response with an unrelated raw field.
    const payload = searchEnvelope({ records: [{ name: '노출되면 안 됨' }] })

    // When it crosses the frontend trust boundary.
    const parsed = parseTeamSearchResponse(payload)

    // Then only the typed compact summary remains.
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      teamLabel: '진도군청',
      selectedCategory: 'corporate',
      confirmedPodiumCount: 43,
      indexedImprovementCount: 37,
    })
    expect(parsed[0]).not.toHaveProperty('records')
  })

  it('rejects stale or incomplete team search responses instead of guessing missing totals', () => {
    // Given one stale contract and one current response without a required count.
    const stale = { ...searchEnvelope(), contractVersion: 0 }
    const incomplete = searchEnvelope({ competitionCount: undefined })

    // When each response is parsed.
    const parseStale = () => parseTeamSearchResponse(stale)
    const parseIncomplete = () => parseTeamSearchResponse(incomplete)

    // Then both become the same typed recoverable contract error.
    expect(parseStale).toThrowError(TeamPerformanceContractError)
    expect(parseIncomplete).toThrowError(TeamPerformanceContractError)
  })

  it('parses a team detail without admitting athlete rows or unbounded source fields', () => {
    // Given the current team detail envelope and an injected raw records field.
    const payload = detailEnvelope({ records: [{ athleteKey: 'private-row' }] })

    // When it crosses the detail boundary.
    const parsed = parseTeamDetailResponse(payload)

    // Then the aggregate identity, period, and totals remain while raw rows are stripped.
    expect(parsed.identity.teamLabel).toBe('진도군청')
    expect(parsed.summary.confirmedPodiumCount).toBe(43)
    expect(parsed.coverage.appliedScope).toBe('all')
    expect(parsed.coverage.availableSeasons).toEqual([2026, 2025, 2024])
    expect(parsed).not.toHaveProperty('records')
  })

  it('normalizes valid category and period URLs into one legal query state', () => {
    // Given an explicit category and season URL.
    const params = new URLSearchParams('category=corporate&season=2025')

    // When the URL is parsed.
    const result = parseTeamDetailQuery(params)

    // Then season scope is represented without a contradictory scope field.
    expect(result).toEqual({
      kind: 'ready',
      value: { category: 'corporate', period: { kind: 'season', season: 2025 } },
    })
  })

  it('returns a typed invalid state for unsupported category scope or season values', () => {
    // Given three malformed shared URLs.
    const values = [
      new URLSearchParams('category=elite'),
      new URLSearchParams('scope=recent'),
      new URLSearchParams('season=1800'),
    ]

    // When each URL is parsed.
    const results = values.map(parseTeamDetailQuery)

    // Then the exact invalid boundary is available to the future recovery screen.
    expect(results).toEqual([
      { kind: 'invalid', code: 'INVALID_TEAM_CATEGORY' },
      { kind: 'invalid', code: 'INVALID_TEAM_SCOPE' },
      { kind: 'invalid', code: 'INVALID_TEAM_SEASON' },
    ])
  })
})

function searchEnvelope(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    success: true,
    contractVersion: 1,
    total: 1,
    data: [{
      teamKey: '1234567890abcdef',
      teamLabel: '진도군청',
      selectedCategory: 'corporate',
      primaryCategory: 'corporate',
      categoryEvidence: { category: 'corporate', resultCount: 138, confidence: 0.9, reasons: ['team_signature:corporate'] },
      categoryBreakdown: [{ category: 'corporate', resultCount: 138, confidence: 0.9, reasons: ['team_signature:corporate'] }],
      athleteCount: 19,
      resultCount: 138,
      competitionCount: 36,
      eventCount: 13,
      confirmedPodiumCount: 43,
      indexedImprovementCount: 37,
      firstSeason: 2019,
      latestSeason: 2026,
      latestDate: '2026-06-01',
      coverageDisclaimer: '모은 공개 기록 기준이에요.',
      ...overrides,
    }],
  }
}

function detailEnvelope(overrides: Readonly<Record<string, unknown>> = {}) {
  const aggregate = {
    athleteCount: 19,
    resultCount: 138,
    competitionCount: 36,
    eventCount: 13,
    confirmedPodiumCount: 43,
    confirmedPodium: { first: 11, second: 20, third: 12, total: 43 },
    ambiguousPodiumCount: 0,
    preliminaryPodiumRowsExcluded: 0,
    indexedImprovementCount: 37,
    sourceMarkedPersonalBestCount: 0,
  }
  return {
    success: true,
    contractVersion: 1,
    data: {
      identity: {
        teamKey: '1234567890abcdef',
        teamLabel: '진도군청',
        selectedCategory: 'corporate',
        categoryEvidence: { category: 'corporate', resultCount: 138, confidence: 0.9, reasons: ['team_signature:corporate'] },
        otherCategories: [],
      },
      summary: aggregate,
      seasonTrend: [{ season: 2026, ...aggregate }],
      eventBreakdown: [{ eventKey: '100m', eventLabel: '100m', ...aggregate }],
      participation: [{ competitionKey: 'abcdef1234567890', competitionName: '전국대회', season: 2026, latestDate: '2026-06-01', resultCount: 2, confirmedPodiumCount: 1 }],
      improvement: [{ season: 2026, eventKey: '100m', eventLabel: '100m', ...aggregate }],
      coverage: {
        appliedScope: 'all',
        appliedSeason: null,
        firstSeason: 2019,
        latestSeason: 2026,
        availableSeasons: [2026, 2025, 2024],
        latestDate: '2026-06-01',
        sourceCount: 36,
        lastCapturedAt: '2026-07-31T00:00:00.000Z',
        ambiguousPodiumCount: 0,
        preliminaryPodiumRowsExcluded: 0,
        participationTotal: 36,
        participationReturned: 36,
        improvementGroupTotal: 8,
        improvementGroupReturned: 8,
        disclaimer: '공식 집계가 아니에요.',
      },
      ...overrides,
    },
  }
}
