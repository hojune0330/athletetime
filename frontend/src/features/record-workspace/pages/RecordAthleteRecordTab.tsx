import { useEffect, useMemo, useState } from 'react'
import type { PublicRecord } from '@/api/recordAnalytics'
import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { groupRecords, type RecordEventGroup, type RecordSortOrder } from '../groupRecords'
import { resolveRecordAthleteSeason } from '../recordAthleteUrlState'
import { recordMatchesId } from '../recordWorkspacePreviewPages'
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
  const params = new URLSearchParams({ type: 'correction', athlete: record.name })
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
  const loadedGroups = useMemo(() => groupRecords(preview.records), [preview.records])
  const groups = useMemo(() => eventIndex(preview), [preview])
  const selectedEvent = preview.events.find((event) => event.eventKey === selectedEventKey) ?? null
  const selectedGroup = loadedGroups.find((group) => group.eventKey === selectedEventKey) ?? null
  const [sortOrder, setSortOrder] = useState<RecordSortOrder>('newest')
  const [visibleCount, setVisibleCount] = useState(10)
  const selectedRecord = preview.records.find((record) => recordMatchesId(record, selectedRecordId)) ?? null
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

  if (selectedEvent && !selectedGroup) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="min-h-11 border border-line px-4 text-body-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => onSelectEvent(null)}
        >
          종목 목록
        </button>
        <section className="border border-line bg-surface px-4 py-5">
          <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">MORE RECORDS</p>
          <h2 className="mt-1 text-h3 font-semibold text-ink">{selectedEvent.eventLabel}</h2>
          <p className="mt-2 text-body-sm leading-5 text-ink-3">
            이 종목의 기록은 나머지 목록에 있어요. 더 불러온 뒤에 시즌별로 확인할 수 있어요.
          </p>
        </section>
        {preview.coverage.hasMore && <LoadMoreButton loading={isLoadingMore} onLoadMore={onLoadMore} />}
      </div>
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
          이 종목 정보를 다시 확인해 주세요.
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
