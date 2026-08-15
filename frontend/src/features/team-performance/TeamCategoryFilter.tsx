import { TEAM_CATEGORIES } from './teamPerformanceContracts'
import { teamCategoryLabel } from './teamCategoryLabels'
import type { TeamCategory } from './teamPerformanceContracts'

type Props = {
  readonly selected: TeamCategory | null
  readonly onSelect: (category: TeamCategory | null) => void
}

export function TeamCategoryFilter({ selected, onSelect }: Props) {
  return (
    <fieldset className="mt-6 min-w-0">
      <legend className="text-xs font-semibold text-ink-4">소속 유형</legend>
      <p className="mt-1 text-xs leading-5 text-ink-4">수집된 기록의 소속 표기를 바탕으로 추정하며 경기 부문과 다를 수 있어요.</p>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="소속 유형 선택">
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => onSelect(null)}
          className={categoryClass(selected === null)}
        >
          전체
        </button>
        {TEAM_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected === category}
            onClick={() => onSelect(category)}
            className={categoryClass(selected === category)}
          >
            {teamCategoryLabel(category)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function categoryClass(active: boolean): string {
  return active
    ? 'shrink-0 border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white'
    : 'shrink-0 border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink-3 transition hover:border-ink hover:text-ink'
}
