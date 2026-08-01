import type { TeamPerformanceDetail } from './teamPerformanceContracts'
import { SectionTitle } from './TeamSeasonTrend'

type Props = {
  readonly rows: TeamPerformanceDetail['eventBreakdown']
}

export function TeamEventBreakdown({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="border border-dashed border-line p-6 text-center text-sm text-ink-4">종목 통계가 없어요.</p>
  }
  const max = Math.max(1, ...rows.map((row) => row.resultCount))
  return (
    <section aria-labelledby="team-event-heading">
      <SectionTitle id="team-event-heading" title="종목 구성" meta={`${rows.length}개 종목`} />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <article key={row.eventKey} className="border border-line bg-surface-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate font-semibold text-ink">{row.eventLabel}</h3>
              <span className="font-mono text-xs text-ink-3">{row.resultCount}건</span>
            </div>
            <div className="mt-3 h-1 bg-surface-3" aria-hidden="true">
              <div className="h-full bg-ink" style={{ width: `${Math.max(4, (row.resultCount / max) * 100)}%` }} />
            </div>
            <p className="mt-3 text-xs text-ink-4">
              대회 {row.competitionCount}개 · 입상 {row.confirmedPodiumCount}건 · 최고 갱신 {row.indexedImprovementCount}건
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
