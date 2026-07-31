import type { PublicRecord } from '@/api/recordAnalytics'
import { Button } from '@/components/ui/button'
import {
  getRecordSeasonPage,
  type RecordEventGroup,
  type RecordSortOrder,
} from '../groupRecords'
import { RecordRow } from './RecordRow'

type RecordGroupListProps = {
  readonly group: RecordEventGroup
  readonly onOpenRecord: (record: PublicRecord) => void
  readonly onSeasonChange: (season: number) => void
  readonly onShowMore: (nextVisibleCount: number) => void
  readonly onSortOrderChange: (sortOrder: RecordSortOrder) => void
  readonly onToggleSelection?: (record: PublicRecord) => void
  readonly selectedRecordIds?: readonly string[]
  readonly selectedSeason: number
  readonly selectionMode?: boolean
  readonly sortOrder: RecordSortOrder
  readonly visibleCount: number
}

export function RecordGroupList({
  group,
  onOpenRecord,
  onSeasonChange,
  onShowMore,
  onSortOrderChange,
  onToggleSelection,
  selectedRecordIds = [],
  selectedSeason,
  selectionMode = false,
  sortOrder,
  visibleCount,
}: RecordGroupListProps) {
  const fallbackSeason = group.seasons[0]?.season ?? selectedSeason
  const activeSeason = group.seasons.some((item) => item.season === selectedSeason)
    ? selectedSeason
    : fallbackSeason
  const page = getRecordSeasonPage(group, activeSeason, sortOrder, visibleCount)

  return (
    <section className="border border-line bg-surface">
      <div className="border-b border-line px-4 py-4">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">RECORDS</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-h3 font-semibold text-ink">{group.eventLabel}</h2>
            <p className="mt-1 text-body-sm text-ink-3">{group.recordCount}개 기록에서 확인했어요.</p>
          </div>
          {selectionMode && (
            <p className="text-body-sm font-medium text-ink-2" role="status">
              숨길 기록을 선택하세요.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="mb-1 block text-caption font-medium text-ink-3">시즌</span>
            <select
              aria-label="기록 시즌"
              className="min-h-11 w-full border border-line bg-surface px-3 text-body-sm text-ink"
              value={activeSeason}
              onChange={(event) => onSeasonChange(Number(event.target.value))}
            >
              {group.seasons.map((season) => (
                <option key={season.season} value={season.season}>
                  {season.season} · {season.recordCount}개
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-caption font-medium text-ink-3">날짜 순서</span>
            <select
              aria-label="기록 날짜 순서"
              className="min-h-11 w-full border border-line bg-surface px-3 text-body-sm text-ink"
              value={sortOrder}
              onChange={(event) => onSortOrderChange(
                event.target.value === 'oldest' ? 'oldest' : 'newest',
              )}
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </label>
        </div>
      </div>

      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[12px] font-semibold text-ink-2 [font-variant-numeric:tabular-nums]">
          {activeSeason} 시즌 · {page.totalCount}개
        </p>
      </div>

      {page.records.length === 0 ? (
        <p className="px-4 py-5 text-body-sm text-ink-3">이 시즌에서 확인된 기록이 없어요.</p>
      ) : (
        <ol>
          {page.records.map((record) => (
            <li key={record.id} className="border-b border-hair last:border-b-0">
              <RecordRow
                mode={selectionMode ? 'select' : 'browse'}
                record={record}
                selected={selectedRecordIds.includes(record.id)}
                onOpen={onOpenRecord}
                onToggleSelection={onToggleSelection}
              />
            </li>
          ))}
        </ol>
      )}

      {page.hasMore && (
        <div className="border-t border-line px-4 py-3">
          <Button
            className="min-h-11 w-full"
            type="button"
            variant="outline"
            onClick={() => onShowMore(page.nextVisibleCount)}
          >
            10개 더 보기
          </Button>
        </div>
      )}
    </section>
  )
}
