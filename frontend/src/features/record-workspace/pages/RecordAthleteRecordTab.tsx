import { useEffect, useMemo, useState } from 'react'
import type { PublicRecord } from '@/api/recordAnalytics'
import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { groupRecords, type RecordEventGroup, type RecordSortOrder } from '../groupRecords'
import { resolveRecordAthleteSeason } from '../recordAthleteUrlState'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { RecordEventFilter } from '../components/RecordEventFilter'
import { RecordGroupList } from '../components/RecordGroupList'

type RecordAthleteRecordTabProps = {
  readonly isLoadingMore: boolean
  readonly onCloseRecord: () => void
  readonly onLoadMore: () => void
  readonly onOpenRecord: (recordId: string) => void
  readonly onSelectEvent: (eventKey: string | null) => void
  readonly onSelectSeason: (season: number) => void
  readonly preview: RecordWorkspacePreview
  readonly selectedEventKey: string | null
  readonly selectedRecordId: string | null
  readonly selectedSeason: number | null
}

function eventIndex(preview: RecordWorkspacePreview): readonly RecordEventGroup[] {
  const loadedByKey = new Map(groupRecords(preview.records).map((group) => [group.eventKey, group]))
  return preview.events.map((event) => ({
    eventKey: event.eventKey,
    eventLabel: event.eventLabel,
    recordCount: event.recordCount,
    seasons: loadedByKey.get(event.eventKey)?.seasons ?? [],
  }))
}

function correctionHref(record: PublicRecord | null) {
  if (!record) return undefined
  const params = new URLSearchParams({
    type: 'correction',
    recordId: record.id,
    sourceId: record.source.sourceId,
  })
  return `/data-request?${params.toString()}`
}

export function RecordAthleteRecordTab({
  isLoadingMore,
  onCloseRecord,
  onLoadMore,
  onOpenRecord,
  onSelectEvent,
  onSelectSeason,
  preview,
  selectedEventKey,
  selectedRecordId,
  selectedSeason,
}: RecordAthleteRecordTabProps) {
  const groups = useMemo(() => eventIndex(preview), [preview])
  const selectedGroup = groups.find((group) => group.eventKey === selectedEventKey) ?? null
  const [sortOrder, setSortOrder] = useState<RecordSortOrder>('newest')
  const [visibleCount, setVisibleCount] = useState(10)
  const selectedRecord = preview.records.find((record) => record.id === selectedRecordId) ?? null
  const activeSeason = resolveRecordAthleteSeason(
    selectedSeason,
    selectedGroup?.seasons.map((season) => season.season) ?? [],
  )

  useEffect(() => {
    setVisibleCount(10)
  }, [selectedEventKey, selectedSeason])

  if (!selectedEventKey) {
    return (
      <>
        <RecordEventFilter groups={groups} onSelectEvent={onSelectEvent} />
        {preview.coverage.hasMore && (
          <LoadMoreButton loading={isLoadingMore} onLoadMore={onLoadMore} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="min-h-11 border border-line px-4 text-body-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => onSelectEvent(null)}
      >
        종목 목록
      </button>

      {selectedGroup ? (
        <RecordGroupList
          key={selectedEventKey}
          group={selectedGroup}
          selectedSeason={activeSeason ?? 0}
          sortOrder={sortOrder}
          visibleCount={visibleCount}
          onOpenRecord={(record) => onOpenRecord(record.id)}
          onSeasonChange={(season) => {
            onSelectSeason(season)
            setVisibleCount(10)
          }}
          onShowMore={setVisibleCount}
          onSortOrderChange={(order) => {
            setSortOrder(order)
            setVisibleCount(10)
          }}
        />
      ) : (
        <p className="border border-line bg-surface px-4 py-5 text-body-sm text-ink-3">
          이 종목의 기록을 아직 불러오지 못했어요.
        </p>
      )}

      {preview.coverage.hasMore && (
        <LoadMoreButton loading={isLoadingMore} onLoadMore={onLoadMore} />
      )}

      <RecordDetailSheet
        dataRequestHref={correctionHref(selectedRecord)}
        open={selectedRecord !== null}
        record={selectedRecord}
        onOpenChange={(open) => {
          if (!open) onCloseRecord()
        }}
      />
    </div>
  )
}

function LoadMoreButton({
  loading,
  onLoadMore,
}: {
  readonly loading: boolean
  readonly onLoadMore: () => void
}) {
  return (
    <button
      type="button"
      className="min-h-11 w-full border border-brand px-4 text-body-sm font-semibold text-brand hover:bg-surface-2 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      disabled={loading}
      onClick={onLoadMore}
    >
      {loading ? '나머지 기록 불러오는 중' : '나머지 기록 불러오기'}
    </button>
  )
}
