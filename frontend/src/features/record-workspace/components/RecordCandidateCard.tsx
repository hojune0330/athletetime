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
  if (first === last) return String(first) + ' 시즌'
  return String(first) + '-' + String(last) + ' 시즌'
}

export function RecordCandidateCard({
  athlete,
  mode,
  onActivate,
  selected,
}: RecordCandidateCardProps) {
  const collecting = mode === 'collect'
  const suppliedNote = athlete.note.trim()
  const sameNameCaution = suppliedNote
    || '같은 이름의 다른 선수일 수 있어요. 소속과 시즌을 확인해 주세요.'
  const teamLabel = athlete.team.trim() || '소속 확인 안 됨'
  const seasonText = seasonLabel(athlete.years)
  const divisionLabels = [...new Set(
    athlete.divisions.map((division) => division.trim()).filter(Boolean),
  )]
  const divisionText = divisionLabels.join(' · ') || '확인 안 됨'
  const eventText = [...new Set(athlete.events.map((event) => event.trim()).filter(Boolean))]
    .join(' · ') || '확인 안 됨'
  const accessibleContext = athlete.name + ' · ' + teamLabel + ' · ' + seasonText
    + ' · 부문 ' + divisionText + ' · 종목 ' + eventText
  const actionLabel = collecting
    ? '선수 후보 ' + (selected ? '선택 해제' : '선택')
    : '기록 보기'
  const ariaLabel = accessibleContext + ' ' + actionLabel + '. ' + sameNameCaution

  return (
    <button
      type="button"
      aria-label={ariaLabel}
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
          {teamLabel}
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

      <span className="col-span-2 min-w-0 break-keep [text-wrap:pretty] text-caption text-ink-3">
        부문 · {divisionText}
      </span>
      <span className="col-span-2 min-w-0 break-keep [text-wrap:pretty] text-caption text-ink-3">
        종목 · {eventText}
      </span>
      <span className="col-span-2 font-mono text-caption text-ink-3 [font-variant-numeric:tabular-nums]">
        {seasonText}
      </span>
      <span className="col-span-2 border-l-2 border-warn pl-2 break-keep [text-wrap:pretty] text-caption leading-5 text-ink-3" role="note">
        {suppliedNote ? sameNameCaution : (
          <>
            같은 이름의 다른 선수일 수 있어요.{' '}
            <span className="whitespace-nowrap">소속과 시즌을 확인해 주세요.</span>
          </>
        )}
      </span>
    </button>
  )
}
