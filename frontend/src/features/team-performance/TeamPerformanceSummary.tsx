import type { TeamPerformanceDetail } from './teamPerformanceContracts'

type Props = {
  readonly detail: TeamPerformanceDetail
}

export function TeamPerformanceSummary({ detail }: Props) {
  const { summary, coverage } = detail
  return (
    <section aria-labelledby="team-summary-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.1em] text-brand">소속 기록 요약</p>
          <h2 id="team-summary-heading" className="mt-2 text-xl font-semibold text-ink">이 소속 기록 한눈에 보기</h2>
        </div>
        <span className="text-xs text-ink-4">{formatScope(coverage.appliedScope, coverage.appliedSeason)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-4">
        자료 기준 {formatObservedPeriod(coverage.firstSeason, coverage.latestSeason)} · 마지막 자료 {coverage.latestDate ?? '확인 안 됨'}
      </p>
      <dl className="mt-4 grid grid-cols-2 border-l border-t border-line">
        <Metric label="출전이 확인된 대회" value={`${summary.competitionCount}개`} />
        <Metric label="모은 기록에서 확인한 입상" value={`${summary.confirmedPodiumCount}건`} />
        <Metric label="기록 개선 확인" value={`${summary.indexedImprovementCount}건`} />
        <Metric label="확인한 종목" value={`${summary.eventCount}종목`} />
      </dl>
      <div className="mt-4 border-l-2 border-brand bg-surface-2 px-4 py-3 text-xs leading-5 text-ink-3">
        소속 선수 명단이 아니라, AthleteTime이 모은 공개 기록의 통계예요. 모든 대회를 뜻하지는 않아요.
      </div>
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-r border-line p-4 sm:p-5">
      <dt className="text-xs font-semibold text-ink-4">{label}</dt>
      <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">{value}</dd>
    </div>
  )
}

function formatScope(scope: 'latest' | 'all' | 'season', season: number | null): string {
  if (scope === 'all') return '모은 전체 기간'
  if (scope === 'season' && season) return `${season} 시즌`
  return '최근 확인 시즌'
}

function formatObservedPeriod(firstSeason: number | null, latestSeason: number | null): string {
  if (firstSeason && latestSeason) return firstSeason === latestSeason ? `${firstSeason} 시즌` : `${firstSeason}-${latestSeason} 시즌`
  return '확인 시즌 미상'
}
