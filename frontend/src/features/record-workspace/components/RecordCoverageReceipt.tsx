import { useId } from 'react'
import type { RecordWorkspaceCoverage } from '@/api/recordWorkspace'
import { cn } from '@/lib/utils'
import type { RecordViewContext } from './RecordContextBadge'

type RecordCoverageReceiptProps = {
  readonly className?: string
  readonly context: RecordViewContext
  readonly coverage: RecordWorkspaceCoverage
  readonly subjectCount?: number
}

type ReceiptCellProps = {
  readonly label: string
  readonly value: string
}

function formatObservedSeasons(seasons: readonly number[]) {
  const ordered = [...new Set(seasons)].sort((left, right) => right - left)
  if (ordered.length === 0) return '확인된 시즌 없음'

  const ranges: string[] = []
  let start = ordered[0]
  let end = ordered[0]

  for (const season of ordered.slice(1)) {
    if (season === end - 1) {
      end = season
      continue
    }

    ranges.push(start === end ? `${start}` : `${end}–${start}`)
    start = season
    end = season
  }

  ranges.push(start === end ? `${start}` : `${end}–${start}`)
  return ranges.join(', ')
}

function formatCapturedDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}.${match[2]}.${match[3]}` : '확인 안 됨'
}

function ReceiptCell({ label, value }: ReceiptCellProps) {
  return (
    <div className="min-w-0 border-b border-r border-hair px-3 py-3 last:border-r-0 sm:border-b-0">
      <dt className="text-caption font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 break-words font-mono text-[13px] font-semibold leading-5 text-ink [font-variant-numeric:tabular-nums]">
        {value}
      </dd>
    </div>
  )
}

export function RecordCoverageReceipt({
  className,
  context,
  coverage,
  subjectCount = 1,
}: RecordCoverageReceiptProps) {
  const titleId = useId()
  const isWorkspace = context === 'workspace'
  const scopeCopy = isWorkspace
    ? `선택한 선수 후보 ${subjectCount}명에서 확인된 ${coverage.totalMatched}개`
    : `AthleteTime에서 확인된 ${coverage.totalMatched}개`

  return (
    <section
      aria-labelledby={titleId}
      className={cn('border border-line bg-surface', className)}
    >
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">RECORD SCOPE</p>
        <h2 id={titleId} className="mt-1 text-body font-semibold text-ink">기록 확인 범위</h2>
        <p className="mt-1 text-body-sm leading-5 text-ink-3">{scopeCopy}</p>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4">
        <ReceiptCell label="표시" value={`${coverage.returned}개`} />
        <ReceiptCell label="대회" value={`${coverage.competitionCount}개`} />
        <ReceiptCell label="출처" value={`${coverage.sourceCount}곳`} />
        <ReceiptCell label="관찰 시즌" value={formatObservedSeasons(coverage.observedSeasons)} />
      </dl>

      <div className="border-t border-line px-4 py-3">
        {coverage.hasMore && (
          <p className="text-body-sm font-medium leading-5 text-ink-2">
            확인된 {coverage.totalMatched}개 중 {coverage.returned}개를 먼저 보여드려요
          </p>
        )}
        <p className={cn(
          'font-mono text-[12px] leading-5 text-ink-3 [font-variant-numeric:tabular-nums]',
          coverage.hasMore && 'mt-1',
        )}>
          마지막 수집 {formatCapturedDate(coverage.lastCapturedAt)}
        </p>
        {coverage.qualityState === 'partial_source' && (
          <p className="mt-1 border-l-2 border-warn pl-3 text-body-sm leading-5 text-ink-2">
            일부 출처만 확인된 범위예요. 빠진 대회가 있을 수 있어요.
          </p>
        )}
      </div>
    </section>
  )
}
