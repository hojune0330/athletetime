import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ShareIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { AffiliationHistory } from '../components/AffiliationHistory'
import { RecordCoverageReceipt } from '../components/RecordCoverageReceipt'
import { RecordIdentityHeader } from '../components/RecordIdentityHeader'
import { WORKSPACE_LIMITS } from '../model'
import { addAthleteToWorkspaceDraft, buildAthleteComparisonSetup } from '../recordAthleteActions'
import { parseRecordAthleteSeason, updateRecordAthleteSeason } from '../recordAthleteUrlState'
import { useRecordAthletePreview } from '../useRecordAthletePreview'
import { useRecordWorkspaceStore } from '../useRecordWorkspaceStore'
import { RecordAthleteRecordTab } from './RecordAthleteRecordTab'
import { RecordSourceList } from './RecordSourceList'

type AthleteTab = 'affiliations' | 'records' | 'sources'

export default function RecordAthletePage() {
  const { athleteKey = '' } = useParams()
  const navigate = useNavigate()
  const [pageParams, setPageParams] = useSearchParams()
  const [actionNotice, setActionNotice] = useState('')
  const store = useRecordWorkspaceStore()
  const athlete = useRecordAthletePreview(athleteKey || null)
  const preview = athlete.preview
  const draftCount = store.workspaceDraft?.subjectKeys.length ?? 0
  const activeTab = normalizeTab(pageParams.get('tab'))
  const selectedEventKey = pageParams.get('event')?.trim() || null
  const selectedRecordId = pageParams.get('record')?.trim() || null
  const selectedSeason = parseRecordAthleteSeason(pageParams)

  const updatePageState = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(pageParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setPageParams(next)
  }

  if (!athleteKey) {
    return <PageNotice title="선수를 찾을 수 없어요" description="검색에서 선수를 다시 골라 주세요." />
  }
  if (athlete.isPending && !preview) {
    return <PageNotice title="기록을 불러오는 중" description="선수의 공개 기록을 정리하고 있어요." />
  }
  if (athlete.isError || !preview || preview.subjects.length === 0) {
    return (
      <PageNotice
        title="기록을 불러오지 못했어요"
        description="잠시 후 다시 시도하거나 검색으로 돌아가 주세요."
        actionLabel="다시 불러오기"
        onAction={() => void athlete.refetch()}
      />
    )
  }

  const subject = preview.subjects[0]
  const sameNameCaution = subject.note.trim()
    || '같은 이름의 다른 선수일 수 있어요. 소속·연도·종목을 확인해 주세요.'
  const shareRecord = async () => {
    const url = window.location.href
    const title = `${subject.name} 선수 기록`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setActionNotice('링크를 복사했어요. 공유할 곳에 붙여 넣어 주세요.')
    } catch {
      setActionNotice('주소를 복사하지 못했어요. 다시 시도해 주세요.')
    }
  }
  const addToDraft = () => {
    const current = store.workspaceDraft?.subjectKeys ?? []
    const next = addAthleteToWorkspaceDraft(current, athleteKey, WORKSPACE_LIMITS.workspaceDraftSubjects)
    if (next.kind === 'limit') {
      setActionNotice(`한 모음에는 ${WORKSPACE_LIMITS.workspaceDraftSubjects}명까지 담을 수 있어요.`)
      return
    }
    const result = store.saveWorkspaceDraft(next.subjectKeys)
    setActionNotice(result.ok
      ? next.kind === 'already_added' ? '이미 선수 후보 모음에 담겨 있어요.' : '선수 후보 모음에 담았어요.'
      : '이 기기에 선수 후보 모음을 저장하지 못했어요.')
  }
  const startComparison = () => {
    const comparison = buildAthleteComparisonSetup(athleteKey, crypto.randomUUID(), new Date().toISOString())
    const result = store.saveComparison(comparison)
    if (!result.ok) {
      setActionNotice('비교 준비를 저장하지 못했어요.')
      return
    }
    navigate(`/records?flow=browse&browse=athlete&q=${encodeURIComponent(subject.name)}`, {
      state: { focusSearch: true },
    })
  }
  const goBackToSearch = () => {
    const historyIndex = Number(window.history.state?.idx)
    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1)
      return
    }
    navigate('/records?flow=browse&browse=athlete', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-24">
      <button
        type="button"
        className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand"
        onClick={goBackToSearch}
      >
        검색으로 돌아가기
      </button>

      <section className="border border-line bg-surface p-5 sm:p-7">
        <RecordIdentityHeader
          affiliationCount={preview.affiliations.length}
          context="athlete"
          displayName={preview.identity.displayName}
          identityWarning={preview.identity.warning}
          recordCount={preview.coverage.totalMatched}
          visibleRecordCount={preview.coverage.returned}
        />
        <p
          className="mt-4 border-l-2 border-warn bg-[#F7EDE0] px-3 py-2 text-body-sm font-medium leading-5 text-ink-2"
          role="note"
        >
          {sameNameCaution}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={addToDraft}>이 선수 담기</Button>
          <Button type="button" variant="outline" onClick={startComparison}>다른 선수와 비교</Button>
          <Button type="button" variant="outline" onClick={shareRecord}>
            <ShareIcon className="h-4 w-4" aria-hidden="true" />
            공유
          </Button>
          {draftCount > 0 && (
            <Button asChild type="button" variant="outline">
              <Link to="/records/workspaces/new">선택한 선수 후보 보기 · {draftCount}명</Link>
            </Button>
          )}
          <Button asChild type="button" variant="ghost">
            <Link to="/records/workspaces">기록 모음 목록</Link>
          </Button>
        </div>
        {actionNotice && <p className="mt-3 text-body-sm text-ink-3" role="status">{actionNotice}</p>}
      </section>

      <RecordCoverageReceipt context="athlete" coverage={preview.coverage} />

      <nav className="grid grid-cols-3 border border-line bg-surface p-1" aria-label="선수 기록 보기">
        <TabButton active={activeTab === 'records'} onClick={() => updatePageState({ tab: null })}>종목별 기록</TabButton>
        <TabButton active={activeTab === 'affiliations'} onClick={() => updatePageState({ tab: 'affiliations', event: null, record: null, season: null })}>소속 이력</TabButton>
        <TabButton active={activeTab === 'sources'} onClick={() => updatePageState({ tab: 'sources', event: null, record: null, season: null })}>출처</TabButton>
      </nav>

      {activeTab === 'records' && (
        <RecordAthleteRecordTab
          isLoadingMore={athlete.isFetchingNextPage}
          onCloseRecord={() => updatePageState({ record: null })}
          onLoadMore={() => void athlete.fetchNextPage()}
          onOpenRecord={(recordId) => updatePageState({ record: recordId })}
          onSelectEvent={(eventKey) => {
            updatePageState({ event: eventKey, record: null, season: null })
          }}
          onSelectSeason={(season) => setPageParams(updateRecordAthleteSeason(pageParams, season))}
          preview={preview}
          selectedEventKey={selectedEventKey}
          selectedRecordId={selectedRecordId}
          selectedSeason={selectedSeason}
        />
      )}
      {activeTab === 'affiliations' && <AffiliationHistory context="athlete" items={preview.affiliations} />}
      {activeTab === 'sources' && <RecordSourceList records={preview.records} />}
    </div>
  )
}

function normalizeTab(value: string | null): AthleteTab {
  return value === 'affiliations' || value === 'sources' ? value : 'records'
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active
        ? 'min-h-11 bg-ink px-3 text-body-sm font-semibold text-white'
        : 'min-h-11 px-3 text-body-sm font-semibold text-ink-3 hover:bg-surface-2 hover:text-ink'}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PageNotice({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string
  description: string
  onAction?: () => void
  title: string
}) {
  return (
    <div className="mx-auto max-w-3xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-h2 font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-body-sm leading-6 text-ink-3">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" type="button" onClick={onAction}>{actionLabel}</Button>
      )}
      <Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand" to="/records">
        기록 검색으로 이동
      </Link>
    </div>
  )
}
