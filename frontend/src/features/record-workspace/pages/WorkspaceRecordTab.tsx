import { useEffect, useMemo, useState } from 'react'
import type { PublicRecord } from '@/api/recordAnalytics'
import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { Button } from '@/components/ui/button'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { RecordEventFilter } from '../components/RecordEventFilter'
import { RecordGroupList } from '../components/RecordGroupList'
import { RecordSelectionBar } from '../components/RecordSelectionBar'
import { groupRecords, type RecordSortOrder } from '../groupRecords'

type WorkspaceRecordTabProps = {
  readonly isLoadingMore: boolean
  readonly onCancelSelection: () => void
  readonly onCloseRecord: () => void
  readonly onHideSelected: () => void
  readonly onLoadMore: () => void
  readonly onOpenRecord: (recordId: string) => void
  readonly onRestoreAll: () => void
  readonly onSelectEvent: (eventKey: string | null) => void
  readonly onStartSelection: () => void
  readonly onToggleRecord: (recordId: string) => void
  readonly preview: RecordWorkspacePreview
  readonly records: readonly PublicRecord[]
  readonly selectedEventKey: string | null
  readonly selectedRecordId: string | null
  readonly selectedRecordIds: readonly string[]
  readonly selectionMode: boolean
}

export function WorkspaceRecordTab({
  isLoadingMore,
  onCancelSelection,
  onCloseRecord,
  onHideSelected,
  onLoadMore,
  onOpenRecord,
  onRestoreAll,
  onSelectEvent,
  onStartSelection,
  onToggleRecord,
  preview,
  records,
  selectedEventKey,
  selectedRecordId,
  selectedRecordIds,
  selectionMode,
}: WorkspaceRecordTabProps) {
  const groups = useMemo(() => groupRecords(records), [records])
  const selectedGroup = groups.find((group) => group.eventKey === selectedEventKey) ?? null
  const [selectedSeason, setSelectedSeason] = useState(selectedGroup?.seasons[0]?.season ?? 0)
  const [sortOrder, setSortOrder] = useState<RecordSortOrder>('newest')
  const [visibleCount, setVisibleCount] = useState(10)
  const selectedRecord = records.find((record) => record.id === selectedRecordId) ?? null

  useEffect(() => {
    setSelectedSeason(selectedGroup?.seasons[0]?.season ?? 0)
    setVisibleCount(10)
  }, [selectedEventKey, selectedGroup?.eventKey, selectedGroup?.seasons[0]?.season])

  if (records.length === 0) {
    return (
      <section className="border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-h2 font-semibold text-ink">이 모음에서 모든 기록을 숨겼어요</h2>
        <p className="mt-2 text-body-sm leading-6 text-ink-3">원본 기록은 그대로예요. 이 기기의 모음에서만 보이지 않아요.</p>
        <Button className="mt-5 min-h-11" type="button" onClick={onRestoreAll}>다시 모두 보기</Button>
      </section>
    )
  }

  if (!selectedEventKey) {
    return (
      <div className="space-y-3">
        <RecordEventFilter groups={groups} onSelectEvent={onSelectEvent} />
        {preview.coverage.hasMore && <LoadMoreButton loading={isLoadingMore} onLoadMore={onLoadMore} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button className="min-h-11" type="button" variant="outline" onClick={() => onSelectEvent(null)}>종목 목록</Button>
        {!selectionMode && <Button className="min-h-11" type="button" variant="outline" onClick={onStartSelection}>기록 고르기</Button>}
      </div>
      {selectedGroup ? (
        <RecordGroupList
          key={selectedEventKey}
          group={selectedGroup}
          selectedRecordIds={selectedRecordIds}
          selectedSeason={selectedSeason}
          selectionMode={selectionMode}
          sortOrder={sortOrder}
          visibleCount={visibleCount}
          onOpenRecord={(record) => onOpenRecord(record.id)}
          onSeasonChange={(season) => {
            setSelectedSeason(season)
            setVisibleCount(10)
          }}
          onShowMore={setVisibleCount}
          onSortOrderChange={(order) => {
            setSortOrder(order)
            setVisibleCount(10)
          }}
          onToggleSelection={(record) => onToggleRecord(record.id)}
        />
      ) : (
        <p className="border border-line bg-surface px-4 py-5 text-body-sm text-ink-3">이 종목의 기록을 아직 불러오지 못했어요.</p>
      )}
      {preview.coverage.hasMore && <LoadMoreButton loading={isLoadingMore} onLoadMore={onLoadMore} />}
      {selectionMode && (
        <RecordSelectionBar
          confirmLabel="이 모음에서 숨기기"
          onCancel={onCancelSelection}
          onConfirm={onHideSelected}
          selectedCount={selectedRecordIds.length}
        />
      )}
      <RecordDetailSheet
        dataRequestHref={selectedRecord ? correctionHref(selectedRecord) : undefined}
        open={selectedRecord !== null}
        record={selectedRecord}
        onOpenChange={(open) => {
          if (!open) onCloseRecord()
        }}
      />
    </div>
  )
}

function correctionHref(record: PublicRecord) {
  return `/data-request?${new URLSearchParams({
    type: 'correction',
    recordId: record.id,
    sourceId: record.source.sourceId,
  }).toString()}`
}

function LoadMoreButton({ loading, onLoadMore }: { readonly loading: boolean; readonly onLoadMore: () => void }) {
  return (
    <Button className="min-h-11 w-full" type="button" variant="outline" disabled={loading} onClick={onLoadMore}>
      {loading ? '나머지 기록 불러오는 중' : '나머지 기록 불러오기'}
    </Button>
  )
}
