import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseTeamDetailResponse } from './teamPerformanceContracts'
import { TeamEventBreakdown } from './TeamEventBreakdown'
import { TeamParticipationList } from './TeamParticipationList'
import { TeamPerformanceSummary } from './TeamPerformanceSummary'
import { TeamSeasonTrend } from './TeamSeasonTrend'

describe('team performance dashboard sections', () => {
  it('shows aggregate team evidence without personal names or official claims', () => {
    // Given a bounded aggregate team detail.
    const detail = parseTeamDetailResponse(detailEnvelope())

    // When every dashboard section is rendered.
    const html = [
      renderToStaticMarkup(<TeamPerformanceSummary detail={detail} />),
      renderToStaticMarkup(<TeamSeasonTrend rows={detail.seasonTrend} />),
      renderToStaticMarkup(<TeamEventBreakdown rows={detail.eventBreakdown} />),
      renderToStaticMarkup(<TeamParticipationList rows={detail.participation} />),
    ].join('')

    // Then team-level counts are clear and raw athlete claims never appear.
    expect(html).toContain('확인된 입상')
    expect(html).toContain('참가 대회')
    expect(html).toContain('최고 갱신')
    expect(html).toContain('전국대회')
    expect(html).not.toContain('홍길동')
    expect(html).not.toContain('공식 메달')
    expect(html).not.toContain('팀 랭킹')
  })
})

function detailEnvelope() {
  const aggregate = {
    athleteCount: 19,
    resultCount: 138,
    competitionCount: 36,
    eventCount: 13,
    confirmedPodiumCount: 43,
    confirmedPodium: { first: 11, second: 20, third: 12, total: 43 },
    ambiguousPodiumCount: 2,
    preliminaryPodiumRowsExcluded: 3,
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
      eventBreakdown: [{ eventKey: '5000m', eventLabel: '5000m', ...aggregate }],
      participation: [{ competitionKey: 'abcdef1234567890', competitionName: '전국대회', season: 2026, latestDate: '2026-06-01', resultCount: 2, confirmedPodiumCount: 1 }],
      improvement: [{ season: 2026, eventKey: '5000m', eventLabel: '5000m', ...aggregate }],
      coverage: {
        appliedScope: 'all',
        appliedSeason: null,
        firstSeason: 2019,
        latestSeason: 2026,
        latestDate: '2026-06-01',
        sourceCount: 36,
        lastCapturedAt: '2026-07-31T00:00:00.000Z',
        ambiguousPodiumCount: 2,
        preliminaryPodiumRowsExcluded: 3,
        participationTotal: 36,
        participationReturned: 36,
        improvementGroupTotal: 1,
        improvementGroupReturned: 1,
        disclaimer: '공식 집계가 아니에요.',
      },
    },
  }
}
