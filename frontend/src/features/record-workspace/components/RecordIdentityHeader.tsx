import { cn } from '@/lib/utils'
import {
  RecordContextBadge,
  type RecordViewContext,
} from './RecordContextBadge'

type IdentityWarning = 'different_names' | 'none' | 'same_name'

type RecordIdentityHeaderProps = {
  readonly affiliationCount?: number
  readonly className?: string
  readonly context: RecordViewContext
  readonly displayName: string
  readonly identityWarning?: IdentityWarning
  readonly recordCount: number
  readonly subjectCount?: number
  readonly visibleRecordCount?: number
}

const WARNING_COPY: Readonly<Record<Exclude<IdentityWarning, 'none'>, string>> = {
  different_names: '서로 다른 이름의 기록이 포함되어 있어요. 한 사람의 기록으로 볼 수 없어요.',
  same_name: '같은 이름의 기록을 함께 보고 있습니다. 같은 사람으로 확인된 것은 아닙니다.',
}

export function RecordIdentityHeader({
  affiliationCount,
  className,
  context,
  displayName,
  identityWarning = 'none',
  recordCount,
  subjectCount = 1,
  visibleRecordCount,
}: RecordIdentityHeaderProps) {
  const summary = context === 'workspace'
    ? `선택한 선수 ${subjectCount}명에서 확인된 ${recordCount}개`
    : context === 'comparison'
      ? `비교할 선수 ${subjectCount}명에서 확인된 ${recordCount}개`
      : `AthleteTime에서 확인된 ${recordCount}개`
  const displaySummary = visibleRecordCount !== undefined && visibleRecordCount < recordCount
    ? `${summary} · 현재 ${visibleRecordCount}개 표시`
    : summary
  const affiliationSummary = affiliationCount === undefined
    ? null
    : context === 'workspace'
      ? `선택한 선수의 소속 ${affiliationCount}곳`
      : context === 'comparison'
        ? `비교할 선수의 소속 ${affiliationCount}곳`
        : `공개 기록에서 소속 ${affiliationCount}곳 확인`

  return (
    <header className={cn('min-w-0 border-b border-line pb-5', className)}>
      <RecordContextBadge context={context} />
      <h1 className="mt-3 break-words text-h1 font-semibold text-ink">{displayName}</h1>
      <p className="mt-2 font-mono text-[12px] leading-5 text-ink-3 [font-variant-numeric:tabular-nums]">
        {displaySummary}
      </p>
      {affiliationSummary && (
        <p className="mt-1 text-body-sm text-ink-3">{affiliationSummary}</p>
      )}
      {identityWarning !== 'none' && (
        <p
          className="mt-4 border-l-2 border-warn bg-[#F7EDE0] px-3 py-2 text-body-sm font-medium leading-5 text-ink-2"
          role="note"
        >
          {WARNING_COPY[identityWarning]}
        </p>
      )}
    </header>
  )
}
