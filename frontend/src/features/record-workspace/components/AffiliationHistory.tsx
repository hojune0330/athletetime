import { useId } from 'react'
import type { RecordWorkspaceAffiliation } from '@/api/recordWorkspace'
import { cn } from '@/lib/utils'
import type { RecordViewContext } from './RecordContextBadge'

type AffiliationHistoryProps = {
  readonly className?: string
  readonly context: RecordViewContext
  readonly items: readonly RecordWorkspaceAffiliation[]
}

const STATUS_LABELS: Readonly<Record<RecordWorkspaceAffiliation['status'], string>> = {
  latest_observed: '최근 확인 소속',
  past_observed: '이전 확인 소속',
  needs_review: '소속 구분 확인 필요',
}

function seasonRange(item: RecordWorkspaceAffiliation) {
  return item.firstObservedSeason === item.lastObservedSeason
    ? `${item.firstObservedSeason}`
    : `${item.firstObservedSeason}–${item.lastObservedSeason}`
}

export function AffiliationHistory({
  className,
  context,
  items,
}: AffiliationHistoryProps) {
  const titleId = useId()
  const isMultiRecordView = context === 'workspace' || context === 'comparison'
  const sectionTitle = isMultiRecordView ? '선택한 기록의 소속' : '기록에서 확인한 소속'

  if (items.length === 0) {
    return (
      <section
        aria-labelledby={titleId}
        className={cn('border border-line bg-surface px-4 py-4', className)}
      >
        <h2 id={titleId} className="text-body font-semibold text-ink">{sectionTitle}</h2>
        <p className="mt-2 text-body-sm leading-5 text-ink-3">확인된 소속 정보가 없어요.</p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn('border border-line bg-surface', className)}
    >
      <div className="border-b border-line px-4 py-3">
        <h2 id={titleId} className="text-body font-semibold text-ink">{sectionTitle}</h2>
        <p className="mt-1 text-body-sm leading-5 text-ink-3">
          {isMultiRecordView
            ? '각 기록에서 확인된 소속을 따로 보여드려요.'
            : '공개 기록에 적힌 소속을 관찰 연도 순으로 보여드려요.'}
        </p>
      </div>

      <ol>
        {items.map((item) => {
          const statusLabel = isMultiRecordView
            ? '선택한 기록에서 확인'
            : STATUS_LABELS[item.status]

          return (
            <li
              key={`${item.label}-${item.firstObservedSeason}-${item.lastObservedSeason}`}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7rem,9rem)] gap-3 border-b border-hair px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="break-words text-body-sm font-semibold leading-5 text-ink">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-[12px] leading-5 text-ink-3 [font-variant-numeric:tabular-nums]">
                  {seasonRange(item)} · 기록 {item.recordCount}개
                </p>
              </div>
              <p className="break-keep text-right text-body-sm font-medium leading-5 text-ink-3">
                {statusLabel}
              </p>
            </li>
          )
        })}
      </ol>

      {!isMultiRecordView && items.some((item) => item.status === 'needs_review') && (
        <p className="border-t border-warn bg-[#F7EDE0] px-4 py-3 text-body-sm leading-5 text-ink-2">
          소속이 바뀐 기록인지, 같은 이름의 다른 기록인지 직접 확인해 주세요.
        </p>
      )}
    </section>
  )
}
