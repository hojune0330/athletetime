import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PublicRecord } from '@/api/recordAnalytics'
import {
  RECORD_API_PAGE_SIZE,
  RECORD_DISCLOSURE_BATCH_SIZE,
  getRecordSeasonPage,
  groupRecords,
} from './groupRecords'
import { RecordEventFilter } from './components/RecordEventFilter'
import { RecordGroupList } from './components/RecordGroupList'
import { RecordRow } from './components/RecordRow'
import { RecordSelectionBar } from './components/RecordSelectionBar'

const EVENT_SPECS = [
  { eventKey: '100m', eventLabel: '100m', count: 80 },
  { eventKey: 'long-jump', eventLabel: '멀리뛰기', count: 20 },
  { eventKey: 'marathon', eventLabel: '마라톤', count: 15 },
  { eventKey: 'shot-put', eventLabel: '포환던지기', count: 10 },
] as const

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019] as const

function fixtureRecord(eventIndex: number, recordIndex: number): PublicRecord {
  const event = EVENT_SPECS[eventIndex]
  if (!event) throw new Error('Missing fixture event')

  const season = eventIndex === 0
    ? recordIndex < 22
      ? 2026
      : SEASONS[((recordIndex - 22) % (SEASONS.length - 1)) + 1] ?? 2019
    : SEASONS[(recordIndex + eventIndex) % SEASONS.length] ?? 2019
  const isStatus = eventIndex === 0 && recordIndex === 0
  const day = isStatus ? '31' : String((recordIndex % 22) + 1).padStart(2, '0')

  return {
    id: `${event.eventKey}-${String(recordIndex).padStart(3, '0')}`,
    athleteKey: '1111111111111111',
    name: '김선수',
    team: recordIndex % 2 === 0 ? '서울중' : '서울고',
    season,
    competitionName: `${season} 테스트대회 ${recordIndex + 1}`,
    date: `${season}-07-${day}`,
    venue: '예천스타디움',
    eventKey: event.eventKey,
    eventLabel: event.eventLabel,
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: '남자 고등부',
    rawDivision: '남자고등부',
    phase: recordIndex % 2 === 0 ? '예선' : '결승',
    record: isStatus ? '' : `${10 + recordIndex / 100}`,
    recordValue: isStatus ? 0 : 10 + recordIndex / 100,
    direction: eventIndex % 2 === 0 ? 'lower' : 'higher',
    rank: isStatus ? null : (recordIndex % 8) + 1,
    wind: event.eventKey === '100m' ? '+1.2' : null,
    windLegal: true,
    isComparable: !isStatus,
    note: isStatus ? 'DNS' : '',
    source: {
      provider: 'KAAF',
      sourceType: 'result-file',
      sourceUrl: `https://example.com/${season}/${event.eventKey}`,
      capturedAt: '2026-07-30T00:00:00.000Z',
    },
  }
}

function buildFixture(): readonly PublicRecord[] {
  return EVENT_SPECS.flatMap((event, eventIndex) => (
    Array.from({ length: event.count }, (_, recordIndex) => (
      fixtureRecord(eventIndex, recordIndex)
    ))
  ))
}

describe('record workspace grouping', () => {
  it('groups 125 mixed records deterministically by event and season', () => {
    // Given four events across eight seasons in two different input orders.
    const records = buildFixture().map((record, index) => (
      index === 1 ? { ...record, eventLabel: '100 m' } : record
    ))

    // When both inputs are grouped.
    const grouped = groupRecords(records)
    const regrouped = groupRecords([...records].reverse())

    // Then the event, season, and record ordering is byte-for-byte stable.
    expect(grouped).toEqual(regrouped)
    expect(grouped.map((group) => [group.eventKey, group.recordCount])).toEqual([
      ['100m', 80],
      ['long-jump', 20],
      ['marathon', 15],
      ['shot-put', 10],
    ])
    expect(grouped[0]?.seasons.map((season) => season.season)).toEqual(SEASONS)
  })

  it('keeps date sorting independent from lower-is-better and higher-is-better marks', () => {
    // Given one sprint group containing mixed mark directions and stable record ids.
    const sprint = groupRecords(buildFixture()).find((group) => group.eventKey === '100m')
    if (!sprint) throw new Error('Missing sprint group')

    // When newest and oldest views are calculated for the same season.
    const newest = getRecordSeasonPage(sprint, 2026, 'newest', 10)
    const oldest = getRecordSeasonPage(sprint, 2026, 'oldest', 10)
    const nextPage = getRecordSeasonPage(sprint, 2026, 'newest', 20)

    // Then only date and id determine row order.
    expect(newest.records).toHaveLength(RECORD_DISCLOSURE_BATCH_SIZE)
    expect(newest.records[0]?.date >= newest.records[1]?.date).toBe(true)
    expect(oldest.records[0]?.date <= oldest.records[1]?.date).toBe(true)
    expect(newest.totalCount).toBe(22)
    expect(newest.hasMore).toBe(true)
    expect(newest.nextVisibleCount).toBe(20)
    expect(nextPage.records).toHaveLength(20)
    expect(new Set(nextPage.records.map((record) => record.id)).size).toBe(20)
    expect(nextPage.nextVisibleCount).toBe(22)
    expect(RECORD_API_PAGE_SIZE).toBe(50)
    expect(RECORD_DISCLOSURE_BATCH_SIZE).toBe(10)
  })

  it('renders an event index first and only ten rows after entering the latest season', () => {
    // Given the full 125-record grouped fixture.
    const groups = groupRecords(buildFixture())
    const sprint = groups[0]
    if (!sprint) throw new Error('Missing first event group')

    // When the event index and one selected event are rendered.
    const eventIndex = renderToStaticMarkup(
      <RecordEventFilter groups={groups} onSelectEvent={() => undefined} />,
    )
    const eventRows = renderToStaticMarkup(
      <RecordGroupList
        group={sprint}
        selectedSeason={2026}
        sortOrder="newest"
        visibleCount={10}
        onOpenRecord={() => undefined}
        onSeasonChange={() => undefined}
        onShowMore={() => undefined}
        onSortOrderChange={() => undefined}
      />,
    )

    // Then the first screen stays at four event rows and the event screen discloses ten records.
    expect(eventIndex.match(/<button/g)).toHaveLength(4)
    expect(eventIndex).not.toContain('테스트대회')
    expect(eventRows.match(/data-record-row=/g)).toHaveLength(10)
    expect(eventRows).toContain('10개 더 보기')
    expect(eventRows).toContain('경기 상태')
    expect(eventRows).not.toContain('2025 테스트대회')
  })

  it('uses one row action outside selection mode and one safe-area selection bar', () => {
    // Given one ordinary public record and a two-record selection.
    const record = fixtureRecord(0, 1)

    // When the normal row and selection bar render.
    const row = renderToStaticMarkup(
      <RecordRow
        mode="browse"
        record={record}
        onOpen={() => undefined}
      />,
    )
    const bar = renderToStaticMarkup(
      <RecordSelectionBar
        selectedCount={2}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    // Then the row has one whole-row action and the bottom bar clears the mobile tab area.
    expect(row.match(/<button/g)).toHaveLength(1)
    expect(row).toContain(record.competitionName)
    expect(row).not.toContain('풍속')
    expect(bar).toContain('2개 선택')
    expect(bar).toContain('safe-area-inset-bottom')
  })
})
