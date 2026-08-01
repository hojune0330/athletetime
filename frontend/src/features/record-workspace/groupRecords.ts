import type { PublicRecord } from '@/api/recordAnalytics'

export const RECORD_API_PAGE_SIZE = 50
export const RECORD_DISCLOSURE_BATCH_SIZE = 10

export type RecordSortOrder = 'newest' | 'oldest'

export type RecordSeasonGroup = {
  readonly recordCount: number
  readonly records: readonly PublicRecord[]
  readonly season: number
}

export type RecordEventGroup = {
  readonly eventKey: string
  readonly eventLabel: string
  readonly recordCount: number
  readonly seasons: readonly RecordSeasonGroup[]
}

export type RecordSeasonPage = {
  readonly hasMore: boolean
  readonly nextVisibleCount: number
  readonly records: readonly PublicRecord[]
  readonly totalCount: number
}

type MutableEventGroup = {
  eventKey: string
  eventLabel: string
  records: PublicRecord[]
}

function normalizedEventKey(record: PublicRecord) {
  return record.eventKey.trim() || 'unknown-event'
}

function normalizedEventLabel(record: PublicRecord) {
  return record.eventLabel.trim() || '종목 미상'
}

function chooseEventLabel(left: string, right: string) {
  if (left === '종목 미상') return right
  if (right === '종목 미상') return left
  return left.localeCompare(right, 'ko') <= 0 ? left : right
}

function compareRecordIdentity(left: PublicRecord, right: PublicRecord) {
  return left.id.localeCompare(right.id)
}

function compareNewest(left: PublicRecord, right: PublicRecord) {
  const dateOrder = right.date.localeCompare(left.date)
  return dateOrder === 0 ? compareRecordIdentity(left, right) : dateOrder
}

function compareOldest(left: PublicRecord, right: PublicRecord) {
  const dateOrder = left.date.localeCompare(right.date)
  return dateOrder === 0 ? compareRecordIdentity(left, right) : dateOrder
}

function buildSeasonGroups(records: readonly PublicRecord[]): readonly RecordSeasonGroup[] {
  const recordsBySeason = new Map<number, PublicRecord[]>()

  for (const record of records) {
    const seasonRecords = recordsBySeason.get(record.season) ?? []
    seasonRecords.push(record)
    recordsBySeason.set(record.season, seasonRecords)
  }

  return [...recordsBySeason.entries()]
    .sort(([left], [right]) => right - left)
    .map(([season, seasonRecords]) => ({
      season,
      recordCount: seasonRecords.length,
      records: [...seasonRecords].sort(compareNewest),
    }))
}

export function groupRecords(records: readonly PublicRecord[]): readonly RecordEventGroup[] {
  const events = new Map<string, MutableEventGroup>()

  for (const record of records) {
    const eventKey = normalizedEventKey(record)
    const current = events.get(eventKey) ?? {
      eventKey,
      eventLabel: normalizedEventLabel(record),
      records: [],
    }
    current.eventLabel = chooseEventLabel(
      current.eventLabel,
      normalizedEventLabel(record),
    )
    current.records.push(record)
    events.set(eventKey, current)
  }

  return [...events.values()]
    .map((event) => ({
      eventKey: event.eventKey,
      eventLabel: event.eventLabel,
      recordCount: event.records.length,
      seasons: buildSeasonGroups(event.records),
    }))
    .sort((left, right) => (
      right.recordCount - left.recordCount
      || left.eventLabel.localeCompare(right.eventLabel, 'ko')
      || left.eventKey.localeCompare(right.eventKey)
    ))
}

export function getRecordSeasonPage(
  group: RecordEventGroup,
  season: number,
  sortOrder: RecordSortOrder,
  visibleCount = RECORD_DISCLOSURE_BATCH_SIZE,
): RecordSeasonPage {
  const seasonGroup = group.seasons.find((item) => item.season === season)
  if (!seasonGroup) {
    return {
      hasMore: false,
      nextVisibleCount: 0,
      records: [],
      totalCount: 0,
    }
  }

  const normalizedVisibleCount = Math.max(
    RECORD_DISCLOSURE_BATCH_SIZE,
    Math.floor(visibleCount),
  )
  const ordered = sortOrder === 'oldest'
    ? [...seasonGroup.records].sort(compareOldest)
    : seasonGroup.records
  const shown = ordered.slice(0, normalizedVisibleCount)

  return {
    hasMore: shown.length < ordered.length,
    nextVisibleCount: Math.min(
      ordered.length,
      normalizedVisibleCount + RECORD_DISCLOSURE_BATCH_SIZE,
    ),
    records: shown,
    totalCount: ordered.length,
  }
}
