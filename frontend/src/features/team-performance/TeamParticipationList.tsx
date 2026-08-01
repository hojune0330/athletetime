import type { TeamPerformanceDetail } from './teamPerformanceContracts'
import { SectionTitle } from './TeamSeasonTrend'

type Props = {
  readonly rows: TeamPerformanceDetail['participation']
}

export function TeamParticipationList({ rows }: Props) {
  return (
    <section aria-labelledby="team-participation-heading">
      <SectionTitle id="team-participation-heading" title="참가 대회" meta={`${rows.length}개`} />
      {rows.length === 0 ? (
        <p className="mt-5 border border-dashed border-line p-6 text-center text-sm text-ink-4">확인된 대회가 없어요.</p>
      ) : (
        <ol className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li key={row.competitionKey} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{row.competitionName}</p>
                <p className="mt-1 text-xs text-ink-4">{formatCompetitionMeta(row.season, row.latestDate)}</p>
              </div>
              <p className="font-mono text-xs text-ink-3">
                기록 {row.resultCount} · 확인된 입상 {row.confirmedPodiumCount}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function formatCompetitionMeta(season: number | null, date: string | null): string {
  const seasonLabel = season ? `${season} 시즌` : '시즌 미상'
  const dateLabel = date ? date.slice(0, 10).replaceAll('-', '.') : '날짜 미상'
  return `${seasonLabel} · ${dateLabel}`
}
