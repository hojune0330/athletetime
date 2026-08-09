import type { PublicRecord } from '@/api/recordAnalytics'

type EventRecord = Pick<PublicRecord, 'eventKey' | 'eventLabel'>

type EventCandidate = {
  readonly eventKey: string
  readonly eventLabel: string
  readonly recordCount: number
}

export function selectInitialRecordEventKey(
  explicitEventKey: string | null,
  records: readonly EventRecord[],
): string | null {
  const requestedEventKey = explicitEventKey?.trim()
  if (requestedEventKey) return requestedEventKey

  const candidates = new Map<string, EventCandidate>()
  for (const record of records) {
    const eventKey = record.eventKey.trim()
    if (!eventKey) continue

    const current = candidates.get(eventKey)
    const eventLabel = record.eventLabel.trim() || eventKey
    candidates.set(eventKey, {
      eventKey,
      eventLabel: current && current.eventLabel.localeCompare(eventLabel, 'ko') <= 0
        ? current.eventLabel
        : eventLabel,
      recordCount: (current?.recordCount ?? 0) + 1,
    })
  }

  return [...candidates.values()]
    .sort((left, right) => (
      right.recordCount - left.recordCount
      || left.eventLabel.localeCompare(right.eventLabel, 'ko')
      || left.eventKey.localeCompare(right.eventKey)
    ))[0]?.eventKey ?? null
}
