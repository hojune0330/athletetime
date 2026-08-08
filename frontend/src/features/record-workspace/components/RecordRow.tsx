import type { PublicRecord } from '@/api/recordAnalytics'
import { resolveRecordDisplay } from '@/lib/recordStatus'
import { cn } from '@/lib/utils'

type RecordRowMode = 'browse' | 'select'

type RecordRowProps = {
  readonly mode: RecordRowMode
  readonly onOpen?: (record: PublicRecord) => void
  readonly onToggleSelection?: (record: PublicRecord) => void
  readonly record: PublicRecord
  readonly selected?: boolean
  readonly showSubjectContext?: boolean
}

function rankLabel(rank: number | null) {
  return rank === null ? '순위 미상' : `${rank}위`
}

export function RecordRow({
  mode,
  onOpen,
  onToggleSelection,
  record,
  selected = false,
  showSubjectContext = false,
}: RecordRowProps) {
  const display = resolveRecordDisplay(record.record, record.note)
  const selectionMode = mode === 'select'
  const onClick = () => {
    if (selectionMode) {
      onToggleSelection?.(record)
      return
    }
    onOpen?.(record)
  }

  return (
    <button
      type="button"
      aria-label={selectionMode
        ? `${record.competitionName} 기록 ${selected ? '선택 해제' : '선택'}`
        : `${record.competitionName} 기록 상세 보기`}
      aria-pressed={selectionMode ? selected : undefined}
      className={cn(
        'grid min-h-11 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-left',
        'transition-colors hover:bg-surface-2 active:bg-hair',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
        'motion-reduce:transition-none',
        selected && 'bg-surface-2',
      )}
      data-record-kind={display.hasMark ? 'mark' : 'status'}
      data-record-row={record.id}
      onClick={onClick}
    >
      <span className="min-w-0 truncate text-body-sm font-semibold text-ink">
        {record.competitionName}
      </span>
      <span className={cn(
        showSubjectContext ? 'row-span-3' : 'row-span-2',
        'flex shrink-0 flex-col items-end justify-center font-mono',
        '[font-variant-numeric:tabular-nums]',
      )}>
        {!display.hasMark && (
          <span className="mb-0.5 border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
            경기 상태
          </span>
        )}
        <span className={cn(
          'text-[15px] font-semibold',
          display.hasMark ? 'text-ink' : 'text-ink-2',
        )}>
          {display.text}
        </span>
      </span>
      {showSubjectContext && (
        <span className="min-w-0 truncate text-caption text-ink-3">
          {record.name} · {record.team || '소속 확인 안 됨'}
        </span>
      )}
      <span className="flex min-w-0 items-center gap-2 font-mono text-[12px] text-ink-3 [font-variant-numeric:tabular-nums]">
        <span>{record.date || '날짜 미상'}</span>
        <span aria-hidden="true">·</span>
        <span>{rankLabel(record.rank)}</span>
        {selectionMode && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-sans font-medium">{selected ? '선택됨' : '선택 안 됨'}</span>
          </>
        )}
      </span>
    </button>
  )
}
