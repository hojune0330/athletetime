import { TEAM_CATEGORIES } from './teamPerformanceContracts'
import type { TeamCategory } from './teamPerformanceContracts'

const LABELS: Readonly<Record<TeamCategory, string>> = {
  corporate: '실업팀',
  university: '대학팀',
  high: '고등부',
  middle: '중등부',
  elementary: '초등부',
  unclassified: '분류 확인 중',
}

type Props = {
  readonly selected: TeamCategory
  readonly onSelect: (category: TeamCategory) => void
}

export function TeamCategoryFilter({ selected, onSelect }: Props) {
  return (
    <fieldset className="mt-6">
      <legend className="text-xs font-semibold text-ink-4">소속 유형</legend>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="소속 유형 선택">
        {TEAM_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected === category}
            onClick={() => onSelect(category)}
            className={categoryClass(selected === category)}
          >
            {LABELS[category]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function teamCategoryLabel(category: TeamCategory): string {
  return LABELS[category]
}

function categoryClass(active: boolean): string {
  return active
    ? 'shrink-0 border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white'
    : 'shrink-0 border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink-3 transition hover:border-ink hover:text-ink'
}
