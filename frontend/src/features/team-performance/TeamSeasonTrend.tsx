import type { TeamPerformanceDetail } from './teamPerformanceContracts'

type Props = {
  readonly rows: TeamPerformanceDetail['seasonTrend']
}

export function TeamSeasonTrend({ rows }: Props) {
  if (rows.length === 0) return <EmptySection title="시즌 흐름" />
  const max = Math.max(1, ...rows.map((row) => row.resultCount))
  return (
    <section aria-labelledby="team-season-heading">
      <SectionTitle id="team-season-heading" title="시즌 흐름" meta={`${rows.length}개 시즌`} />
      <div className="mt-5 space-y-5">
        {rows.map((row) => (
          <div key={row.season}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-sm font-semibold text-ink">{row.season}</span>
              <span className="font-mono text-xs text-ink-3">기록 {row.resultCount}건</span>
            </div>
            <div className="mt-2 h-1.5 bg-surface-3" aria-hidden="true">
              <div className="h-full bg-brand" style={{ width: `${Math.max(4, (row.resultCount / max) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-4">
              대회 {row.competitionCount}개 · 확인된 입상 {row.confirmedPodiumCount}건 · 최고 갱신 {row.indexedImprovementCount}건
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SectionTitle({ id, title, meta }: { readonly id: string; readonly title: string; readonly meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold text-ink">{title}</h2>
      <span className="font-mono text-[11px] text-ink-4">{meta}</span>
    </div>
  )
}

function EmptySection({ title }: { readonly title: string }) {
  return (
    <section className="border border-dashed border-line p-6 text-center">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-4">이 조건에서 확인된 통계가 없어요.</p>
    </section>
  )
}
