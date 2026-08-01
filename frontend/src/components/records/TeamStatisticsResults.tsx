import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { teamCategoryLabel } from '../../features/team-performance/TeamCategoryFilter'
import type { TeamSearchSummary } from '../../features/team-performance/teamPerformanceContracts'

type Props = {
  readonly teams: readonly TeamSearchSummary[]
  readonly query: string
}

export function TeamStatisticsResults({ teams, query }: Props) {
  return (
    <section className="space-y-3" aria-label={`${query} 소속 검색 결과`}>
      <div className="flex items-baseline justify-between gap-4 px-1">
        <div>
          <h2 className="text-lg font-semibold text-ink">소속 {teams.length}곳을 찾았어요</h2>
          <p className="mt-1 text-xs leading-5 text-ink-4">같은 이름도 유형별로 나눠 계산했어요.</p>
        </div>
        <span className="font-mono text-xs text-ink-4">{query}</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {teams.map((team) => (
          <TeamResultCard key={`${team.teamKey}-${team.selectedCategory}`} team={team} query={query} />
        ))}
      </div>
    </section>
  )
}

function TeamResultCard({ team, query }: { readonly team: TeamSearchSummary; readonly query: string }) {
  const category = team.selectedCategory ?? team.primaryCategory
  const destination = `/records/teams/${team.teamKey}?category=${category}&from=${encodeURIComponent(query)}`
  return (
    <Link
      to={destination}
      className="group border border-line bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_12px_30px_rgba(25,33,38,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      aria-label={`${team.teamLabel} 팀 통계 보기`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-brand">
            {teamCategoryLabel(category)}
          </span>
          <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-ink">{team.teamLabel}</h3>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-ink-4 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
      </div>

      <dl className="mt-5 grid grid-cols-3 border-l border-t border-line">
        <CompactMetric label="대회" value={`${team.competitionCount}개`} />
        <CompactMetric label="확인된 입상" value={`${team.confirmedPodiumCount}건`} />
        <CompactMetric label="최고 갱신" value={`${team.indexedImprovementCount}건`} />
      </dl>
      <p className="mt-4 text-xs text-ink-4">
        {formatSeasonRange(team.firstSeason, team.latestSeason)} · 모은 기록 {team.resultCount}건
      </p>
    </Link>
  )
}

function CompactMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-b border-r border-line p-3">
      <dt className="text-[10px] font-semibold text-ink-4">{label}</dt>
      <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function formatSeasonRange(first: number | null, latest: number | null): string {
  if (!first || !latest) return '확인 시즌 미상'
  return first === latest ? `${first} 시즌` : `${first}-${latest}`
}
