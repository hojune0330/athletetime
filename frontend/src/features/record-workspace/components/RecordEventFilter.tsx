import { ChevronRight } from 'lucide-react'
import type { RecordEventGroup } from '../groupRecords'
import { cn } from '@/lib/utils'

type RecordEventFilterProps = {
  readonly className?: string
  readonly groups: readonly RecordEventGroup[]
  readonly onSelectEvent: (eventKey: string) => void
  readonly selectedEventKey?: string
}

export function RecordEventFilter({
  className,
  groups,
  onSelectEvent,
  selectedEventKey,
}: RecordEventFilterProps) {
  return (
    <section className={cn('border border-line bg-surface', className)}>
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">EVENT INDEX</p>
        <h2 className="mt-1 text-body font-semibold text-ink">종목 목록</h2>
        <p className="mt-1 text-body-sm leading-5 text-ink-3">
          종목을 고르면 시즌별 기록을 짧게 나눠서 보여드려요.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-5 text-body-sm text-ink-3">확인된 종목이 없어요.</p>
      ) : (
        <ul>
          {groups.map((group) => {
            const selected = group.eventKey === selectedEventKey
            return (
              <li key={group.eventKey} className="border-b border-hair last:border-b-0">
                <button
                  type="button"
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left',
                    'transition-colors hover:bg-surface-2 active:bg-hair',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
                    'motion-reduce:transition-none',
                    selected && 'bg-surface-2',
                  )}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => onSelectEvent(group.eventKey)}
                >
                  <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink">
                    {group.eventLabel}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-ink-3 [font-variant-numeric:tabular-nums]">
                    {group.recordCount}개
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
