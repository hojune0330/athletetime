import { cn } from '@/lib/utils'

export type RecordViewContext = 'athlete' | 'comparison' | 'self' | 'workspace'

const CONTEXT_LABELS: Readonly<Record<RecordViewContext, string>> = {
  athlete: '선수 기록',
  comparison: '기록 비교',
  self: '이 기기에서 선택한 선수 후보',
  workspace: '기록 모음',
}

type RecordContextBadgeProps = {
  readonly className?: string
  readonly context: RecordViewContext
}

export function RecordContextBadge({
  className,
  context,
}: RecordContextBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-sm border border-line bg-surface-2 px-2',
        'font-mono text-[11px] font-semibold tracking-wide text-ink-2',
        className,
      )}
      data-record-context={context}
    >
      {CONTEXT_LABELS[context]}
    </span>
  )
}
