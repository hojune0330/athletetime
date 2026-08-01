import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { getTeamPerformance, resolveTeamRequestError } from './teamPerformanceApi'
import type { TeamRequestErrorKind } from './teamPerformanceApi'
import {
  parseTeamDetailQuery,
  parseTeamKey,
} from './teamPerformanceContracts'
import type { TeamDetailPeriod, TeamPerformanceDetail } from './teamPerformanceContracts'
import { teamCategoryLabel } from './TeamCategoryFilter'
import { TeamEventBreakdown } from './TeamEventBreakdown'
import { TeamParticipationList } from './TeamParticipationList'
import { TeamPerformanceSummary } from './TeamPerformanceSummary'
import { TeamSeasonTrend } from './TeamSeasonTrend'

type View = 'seasons' | 'events' | 'competitions'
type PageState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly detail: TeamPerformanceDetail }
  | { readonly kind: 'error'; readonly error: TeamRequestErrorKind }

export default function TeamPerformancePage() {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [retry, setRetry] = useState(0)
  const teamKey = parseTeamKey(params.teamKey)
  const query = parseTeamDetailQuery(searchParams)
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  const category = query.kind === 'ready' ? query.value.category : null
  const period = query.kind === 'ready' ? query.value.period : null
  const periodKind = period?.kind ?? 'invalid'
  const periodSeason = period?.kind === 'season' ? period.season : null

  useEffect(() => {
    if (!teamKey || query.kind !== 'ready') return
    let active = true
    setState({ kind: 'loading' })
    getTeamPerformance({ teamKey, category: query.value.category, period: query.value.period })
      .then((detail) => {
        if (active) setState({ kind: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (active) setState({ kind: 'error', error: resolveTeamRequestError(error) })
      })
    return () => {
      active = false
    }
  }, [teamKey, category, periodKind, periodSeason, retry])

  if (!teamKey || query.kind === 'invalid') {
    return <InvalidTeamLink />
  }
  if (state.kind === 'loading') return <TeamLoading />
  if (state.kind === 'error') {
    return <TeamError kind={state.error} onRetry={() => setRetry((value) => value + 1)} />
  }

  const detail = state.detail
  const view = parseView(searchParams.get('view'))
  const backUrl = buildBackUrl(detail.identity.selectedCategory, searchParams.get('from'))
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-12" data-team-performance-page>
      <header className="border border-line bg-surface p-5 sm:p-8">
        <Link to={backUrl} state={{ focusSearch: true }} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          소속 검색으로
        </Link>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.1em] text-brand">
              {teamCategoryLabel(detail.identity.selectedCategory)} · TEAM PERFORMANCE
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">{detail.identity.teamLabel}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-3">
              개인 기록을 나열하지 않고, 이 소속으로 출전한 공개 기록의 흐름만 보여드려요.
            </p>
          </div>
          <PeriodFilter
            period={query.value.period}
            seasons={detail.coverage.availableSeasons}
            onChange={(nextPeriod) => setSearchParams(updatePeriod(searchParams, nextPeriod))}
          />
        </div>
      </header>

      <div className="border border-line bg-surface p-5 sm:p-8">
        <TeamPerformanceSummary detail={detail} />
      </div>

      <nav className="grid grid-cols-3 border border-line bg-surface" aria-label="팀 통계 보기">
        <ViewLink active={view === 'seasons'} label="시즌" onClick={() => setSearchParams(updateView(searchParams, 'seasons'))} />
        <ViewLink active={view === 'events'} label="종목" onClick={() => setSearchParams(updateView(searchParams, 'events'))} />
        <ViewLink active={view === 'competitions'} label="대회" onClick={() => setSearchParams(updateView(searchParams, 'competitions'))} />
      </nav>

      <div className="border border-line bg-surface p-5 sm:p-8">
        {view === 'seasons' && <TeamSeasonTrend rows={detail.seasonTrend} />}
        {view === 'events' && <TeamEventBreakdown rows={detail.eventBreakdown} />}
        {view === 'competitions' && <TeamParticipationList rows={detail.participation} />}
      </div>

      <CoverageNotice detail={detail} />
    </div>
  )
}

function PeriodFilter({ period, seasons, onChange }: {
  readonly period: TeamDetailPeriod
  readonly seasons: readonly number[]
  readonly onChange: (period: TeamDetailPeriod) => void
}) {
  return (
    <div className="grid grid-cols-[auto_auto_minmax(7rem,1fr)] border border-line bg-surface-2 p-1">
      <PeriodButton active={period.kind === 'latest'} label="최근" onClick={() => onChange({ kind: 'latest' })} />
      <PeriodButton active={period.kind === 'all'} label="전체" onClick={() => onChange({ kind: 'all' })} />
      <label className="sr-only" htmlFor="team-season">시즌 선택</label>
      <select
        id="team-season"
        value={period.kind === 'season' ? String(period.season) : ''}
        onChange={(event) => {
          const season = Number(event.target.value)
          if (Number.isInteger(season)) onChange({ kind: 'season', season })
        }}
        className="min-h-10 border-0 bg-transparent px-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand"
      >
        <option value="">시즌 선택</option>
        {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
      </select>
    </div>
  )
}

function PeriodButton({ active, label, onClick }: { readonly active: boolean; readonly label: string; readonly onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={active ? 'bg-ink px-4 py-2 text-sm font-semibold text-white' : 'px-4 py-2 text-sm font-semibold text-ink-3 hover:text-ink'}>{label}</button>
}

function ViewLink({ active, label, onClick }: { readonly active: boolean; readonly label: string; readonly onClick: () => void }) {
  return <button type="button" aria-current={active ? 'page' : undefined} onClick={onClick} className={active ? 'border-b-2 border-brand bg-brand/5 px-3 py-4 text-sm font-semibold text-ink' : 'border-b-2 border-transparent px-3 py-4 text-sm font-semibold text-ink-4 hover:text-ink'}>{label}</button>
}

function CoverageNotice({ detail }: { readonly detail: TeamPerformanceDetail }) {
  const excluded = detail.coverage.preliminaryPodiumRowsExcluded + detail.coverage.ambiguousPodiumCount
  return (
    <aside className="border border-line bg-surface-2 p-5 text-xs leading-5 text-ink-4">
      <p>{detail.coverage.disclaimer}</p>
      <p className="mt-2">단계가 확인되지 않은 1~3위 표기 {excluded}건은 합계에서 뺐어요. 최고 갱신은 같은 공개 프로필 조각 안에서 계산했어요.</p>
    </aside>
  )
}

function InvalidTeamLink() {
  return <StateCard title="팀 주소를 확인해 주세요" description="주소가 바뀌었거나 지원하지 않는 조건이에요." action={<Link className="font-semibold text-brand" to="/records?flow=browse&browse=team&category=corporate">소속 다시 찾기</Link>} />
}

function TeamLoading() {
  return <div className="border border-line bg-surface p-8" role="status"><p className="font-semibold text-ink">팀 통계를 불러오는 중이에요</p><div className="mt-6 h-32 animate-pulse bg-surface-3" /></div>
}

function TeamError({ kind, onRetry }: { readonly kind: TeamRequestErrorKind; readonly onRetry: () => void }) {
  const message = errorCopy(kind)
  return <StateCard title={message.title} description={message.description} action={<Button type="button" variant="outline" onClick={onRetry}><RotateCcw className="mr-2 size-4" aria-hidden="true" />다시 시도</Button>} />
}

function StateCard({ title, description, action }: { readonly title: string; readonly description: string; readonly action: React.ReactNode }) {
  return <section className="border border-line bg-surface p-8 text-center" role="status"><h1 className="text-2xl font-semibold text-ink">{title}</h1><p className="mt-3 text-sm text-ink-3">{description}</p><div className="mt-6">{action}</div></section>
}

function errorCopy(kind: TeamRequestErrorKind) {
  if (kind === 'not-found') return { title: '이 조건의 팀 통계가 없어요', description: '소속 유형이나 기간을 바꿔 다시 찾아보세요.' }
  if (kind === 'limited') return { title: '요청이 잠시 많아요', description: '잠시 쉬었다가 다시 불러와 주세요.' }
  if (kind === 'network') return { title: '네트워크 연결을 확인해 주세요', description: '연결이 돌아오면 같은 화면에서 다시 시도할 수 있어요.' }
  if (kind === 'invalid') return { title: '선택한 조건을 확인해 주세요', description: '기간이나 소속 유형이 올바르지 않아요.' }
  return { title: '팀 통계를 불러오지 못했어요', description: '잠시 후 같은 화면에서 다시 시도해 주세요.' }
}

function parseView(value: string | null): View {
  if (value === 'events' || value === 'competitions') return value
  return 'seasons'
}

function updatePeriod(params: URLSearchParams, period: TeamDetailPeriod): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('scope')
  next.delete('season')
  if (period.kind === 'season') next.set('season', String(period.season))
  else next.set('scope', period.kind)
  return next
}

function updateView(params: URLSearchParams, view: View): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set('view', view)
  return next
}

function buildBackUrl(category: TeamPerformanceDetail['identity']['selectedCategory'], query: string | null): string {
  const params = new URLSearchParams({ flow: 'browse', browse: 'team', category })
  if (query) params.set('q', query)
  return `/records?${params.toString()}`
}
