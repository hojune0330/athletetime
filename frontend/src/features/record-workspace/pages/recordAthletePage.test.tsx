import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PublicRecord } from '@/api/recordAnalytics'
import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { RecordAthleteRecordTab } from './RecordAthleteRecordTab'
import { mergeRecordAthletePreviewPages } from '../useRecordAthletePreview'

function record(index: number): PublicRecord {
  const season = index < 25 ? 2026 : 2025
  return {
    id: `record-${String(index).padStart(3, '0')}`,
    athleteKey: '1111111111111111',
    name: '김선수',
    team: '서울고',
    season,
    competitionName: `${season} 테스트대회 ${index + 1}`,
    date: `${season}-07-${String((index % 28) + 1).padStart(2, '0')}`,
    venue: '예천스타디움',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: '남자 고등부',
    rawDivision: '남자고등부',
    phase: index % 2 === 0 ? '예선' : '결승',
    record: `${10 + index / 100}`,
    recordValue: 10 + index / 100,
    direction: 'lower',
    rank: (index % 8) + 1,
    wind: '+1.2',
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'KAAF',
      sourceType: 'result-file',
      sourceUrl: `https://example.com/${season}`,
      capturedAt: '2026-07-31T00:00:00.000Z',
    },
  }
}

function preview(records: readonly PublicRecord[], total: number, hasMore: boolean): RecordWorkspacePreview {
  return {
    subjects: [{
      athleteKey: '1111111111111111',
      name: '김선수',
      team: '서울고',
      teams: ['서울고'],
      years: [2025, 2026],
      events: ['100m'],
      divisions: ['남자 고등부'],
      recordCount: total,
      ambiguity: 'name_team',
      note: '',
    }],
    unavailableSubjectKeys: [],
    identity: { displayName: '김선수', distinctNames: ['김선수'], warning: 'none' },
    affiliations: [{
      label: '서울고',
      firstObservedSeason: 2025,
      lastObservedSeason: 2026,
      recordCount: total,
      status: 'latest_observed',
    }],
    coverage: {
      totalMatched: total,
      returned: records.length,
      hasMore,
      nextCursor: hasMore ? `cursor-${records.at(-1)?.id ?? 'none'}` : null,
      observedSeasons: [2026, 2025],
      competitionCount: total,
      sourceCount: 2,
      lastCapturedAt: '2026-07-31T00:00:00.000Z',
      qualityState: 'visible_index',
    },
    events: [{
      eventKey: '100m',
      eventLabel: '100m',
      recordCount: total,
      best: records[0] ?? null,
    }],
    records,
  }
}

describe('dedicated athlete record page', () => {
  it('merges three API pages without duplicate records or incomplete coverage', () => {
    // Given 125 records split across the API page boundary with one duplicate edge row.
    const records = Array.from({ length: 125 }, (_, index) => record(index))
    const pages = [
      preview(records.slice(0, 50), 125, true),
      preview(records.slice(49, 99), 125, true),
      preview(records.slice(99), 125, false),
    ]

    // When the athlete page combines the pages.
    const merged = mergeRecordAthletePreviewPages(pages)

    // Then all unique records remain and the last cursor state owns completeness.
    expect(merged?.records).toHaveLength(125)
    expect(new Set(merged?.records.map((item) => item.id)).size).toBe(125)
    expect(merged?.coverage).toMatchObject({ returned: 125, totalMatched: 125, hasMore: false })
  })

  it('renders the event index before records and only ten rows after event entry', () => {
    // Given one athlete preview with 25 recent-season records and more API data available.
    const athletePreview = preview(Array.from({ length: 50 }, (_, index) => record(index)), 125, true)
    const shared = {
      isLoadingMore: false,
      onCloseRecord: () => undefined,
      onLoadMore: () => undefined,
      onOpenRecord: () => undefined,
      onSelectEvent: () => undefined,
      onSelectSeason: () => undefined,
      preview: athletePreview,
      selectedRecordId: null,
      selectedSeason: null,
    }

    // When the index and selected-event views render.
    const indexMarkup = renderToStaticMarkup(
      <RecordAthleteRecordTab {...shared} selectedEventKey={null} />,
    )
    const eventMarkup = renderToStaticMarkup(
      <RecordAthleteRecordTab {...shared} selectedEventKey="100m" />,
    )

    // Then the index has no record rows and event entry discloses at most ten plus completeness control.
    expect(indexMarkup).toContain('종목 목록')
    expect(indexMarkup).not.toContain('data-record-row')
    expect(eventMarkup.match(/data-record-row=/g)).toHaveLength(10)
    expect(eventMarkup).toContain('10개 더 보기')
    expect(eventMarkup).toContain('나머지 기록 불러오기')
  })

  it('renders the season restored from the athlete page URL instead of resetting to the latest season', () => {
    // Given a shared athlete URL whose selected event season is 2025.
    const athletePreview = preview(Array.from({ length: 50 }, (_, index) => record(index)), 50, false)

    // When the dedicated athlete record tab is restored with that URL-backed season.
    const markup = renderToStaticMarkup(
      <RecordAthleteRecordTab
        isLoadingMore={false}
        onCloseRecord={() => undefined}
        onLoadMore={() => undefined}
        onOpenRecord={() => undefined}
        onSelectEvent={() => undefined}
        onSelectSeason={() => undefined}
        preview={athletePreview}
        selectedEventKey="100m"
        selectedRecordId={null}
        selectedSeason={2025}
      />,
    )

    // Then the rendered record list keeps 2025 rather than falling back to 2026.
    expect(markup).toContain('2025 시즌 · 25개')
  })

  it('asks for more records when a selected event exists outside the loaded page', () => {
    // Given an event index that knows about 400m while the first returned page only has 100m rows.
    const firstPage = preview([record(0)], 2, true)
    const athletePreview: RecordWorkspacePreview = {
      ...firstPage,
      events: [
        ...firstPage.events,
        { eventKey: '400m', eventLabel: '400m', recordCount: 1, best: null },
      ],
    }

    // When the visitor selects the later-page event.
    const markup = renderToStaticMarkup(
      <RecordAthleteRecordTab
        isLoadingMore={false}
        onCloseRecord={() => undefined}
        onLoadMore={() => undefined}
        onOpenRecord={() => undefined}
        onSelectEvent={() => undefined}
        onSelectSeason={() => undefined}
        preview={athletePreview}
        selectedEventKey="400m"
        selectedRecordId={null}
        selectedSeason={null}
      />,
    )

    // Then it does not call an unloaded result an empty season and offers the next page.
    expect(markup).toContain('이 종목의 기록은 나머지 목록에 있어요.')
    expect(markup).toContain('나머지 기록 불러오기')
    expect(markup).not.toContain('0 시즌 · 0개')
  })
})
