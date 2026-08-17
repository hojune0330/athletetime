import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { parseTeamSearchResponse } from '../../features/team-performance/teamPerformanceContracts'
import { TeamStatisticsResults } from './TeamStatisticsResults'

describe('team statistics search results', () => {
  it('renders compact affiliation cards that open an independent aggregate page', () => {
    // Given one versioned team search summary.
    const teams = parseTeamSearchResponse(searchEnvelope())

    // When the search result is rendered.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TeamStatisticsResults teams={teams} query="진도" />
      </MemoryRouter>,
    )

    // Then the card exposes useful totals and a shareable team destination without athlete controls.
    expect(html).toContain('진도군청')
    expect(html).toContain('실업·기관 소속')
    expect(html).toContain('class="min-w-0"')
    expect(html).toContain('class="shrink-0 whitespace-nowrap font-mono text-xs text-ink-4"')
    expect(html).toContain('break-keep [text-wrap:pretty]')
    expect(html).toContain('출전 대회')
    expect(html).toContain('36개')
    expect(html).toContain('1~3위 확인')
    expect(html).toContain('기록 개선')
    expect(html).toContain('43건')
    expect(html).toContain('모은 전체 기간 2019-2026 시즌')
    expect(html).toContain('열면 최근 확인 시즌 통계부터 보여줘요.')
    expect(html).toContain('소속 유형은 수집된 기록의 소속 표기를 바탕으로 추정하며 경기 부문')
    expect(html.replace(/<[^>]+>/gu, '')).toContain('경기 부문과 다를 수 있어요.')
    expect(html).toContain('다를 수 있어요.')
    expect(html).toContain('whitespace-nowrap">다를 수 있어요.</span>')
    expect(html).toContain('공개 기록을 소속·시기별로 모은 통계예요.')
    expect(html).toContain('개인 기록은 보여주지 않아요.')
    expect(html).toContain('whitespace-nowrap">개인 기록은 보여주지 않아요.</span>')
    expect(html).toContain('진도군청 소속 통계 보기')
    expect(html).toContain('/records/teams/1234567890abcdef?category=corporate&amp;from=')
    expect(html).not.toContain('scope=all')
    expect(html).not.toContain('19명')
    expect(html).not.toContain('athleteKey')
    expect(html).not.toContain('선수 목록')
    expect(html).not.toContain('기록 담기')
    expect(html).not.toContain('비교에 담기')
  })

  it('keeps a neutral search card on the all-category detail route', () => {
    // Given an unfiltered team summary whose primary category is only an inference.
    const teams = parseTeamSearchResponse(searchEnvelope({ selectedCategory: null, categoryEvidence: null }))

    // When the neutral result card is rendered.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TeamStatisticsResults teams={teams} query="진도" />
      </MemoryRouter>,
    )

    // Then the link preserves the complete aggregate instead of injecting the primary category.
    expect(html).toContain('전체')
    expect(html).toContain('소속 유형은 수집된 기록의 소속 표기를 바탕으로 추정하며 경기 부문')
    expect(html.replace(/<[^>]+>/gu, '')).toContain('경기 부문과 다를 수 있어요.')
    expect(html).toContain('다를 수 있어요.')
    expect(html).toContain('whitespace-nowrap">다를 수 있어요.</span>')
    expect(html).toContain('공개 기록을 소속·시기별로 모은 통계예요.')
    expect(html).toContain('개인 기록은 보여주지 않아요.')
    expect(html).toContain('whitespace-nowrap">개인 기록은 보여주지 않아요.</span>')
    expect(html).toContain('/records/teams/1234567890abcdef?from=')
    expect(html).not.toContain('scope=all')
    expect(html).not.toContain('category=corporate')
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
