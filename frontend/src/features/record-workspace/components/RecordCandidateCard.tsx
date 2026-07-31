import type { AthleteSearchCard } from '@/api/recordAnalytics'
import { cn } from '@/lib/utils'

export type RecordCandidateCardMode = 'browse' | 'collect'

type RecordCandidateCardProps = {
  readonly athlete: AthleteSearchCard
  readonly mode: RecordCandidateCardMode
  readonly onActivate: (athlete: AthleteSearchCard) => void
  readonly selected: boolean
}

function seasonLabel(years: readonly number[]) {
  const seasons = [...new Set(years)].sort((left, right) => left - right)
  const first = seasons[0]
  const last = seasons[seasons.length - 1]
  if (first === undefined || last === undefined) return '시즌 확인 안 됨'
  if (first === last) return `${first} 시즌`
  return `${first}-${last} 시즌`
}

export function RecordCandidateCard({
  athlete,
  mode,
  onActivate,
  selected,
}: RecordCandidateCardProps) {
  const collecting = mode === 'collect'

  return (
    <button
      type="button"
      aria-label={collecting
        ? `${athlete.name} 기록 ${selected ? '선택 해제' : '선택'}`
        : `${athlete.name} 기록 보기`}
      aria-pressed={collecting ? selected : undefined}
      className={cn(
        'grid min-h-11 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border bg-surface p-4 text-left',
        'transition-colors hover:bg-surface-2 active:bg-hair',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'motion-reduce:transition-none',
        selected ? 'border-brand bg-surface-2' : 'border-line',
      )}
      data-candidate-key={athlete.athleteKey}
      data-candidate-mode={mode}
      onClick={() => onActivate(athlete)}
    >
      <span className="min-w-0">
        <span className="block truncate text-h3 font-semibold text-ink">{athlete.name}</span>
        <span className="mt-1 block truncate text-body-sm text-ink-3">
          {athlete.team.trim() || '소속 확인 안 됨'}
        </span>
      </span>

      <span className="flex flex-col items-end gap-1 font-mono text-[12px] [font-variant-numeric:tabular-nums]">
        <span className="font-semibold text-ink">기록 {athlete.recordCount}건</span>
        {collecting && (
          <span className={cn(
            'border px-1.5 py-0.5 font-sans text-[10px] font-semibold',
            selected
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-surface text-ink-3',
          )}>
            {selected ? '선택됨' : '선택'}
          </span>
        )}
      </span>

      <span className="col-span-2 font-mono text-[12px] text-ink-3 [font-variant-numeric:tabular-nums]">
        {seasonLabel(athlete.years)}
      </span>
    </button>
  )
}
