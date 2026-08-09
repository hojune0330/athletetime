import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { RecordWorkspace, WorkspaceUpdate } from '../storage'
import { Button } from '@/components/ui/button'
import { AffiliationHistory } from '../components/AffiliationHistory'
import { RecordCoverageReceipt } from '../components/RecordCoverageReceipt'
import { RecordIdentityHeader } from '../components/RecordIdentityHeader'
import { WorkspaceRecoveryState } from '../components/WorkspaceRecoveryState'
import { WorkspaceSubjectList } from '../components/WorkspaceSubjectList'
import { selectInitialRecordEventKey } from '../recordAthleteDefaultEvent'
import { visibleWorkspaceRecords, useRecordWorkspaceEditor } from '../useRecordWorkspaceEditor'
import { useRecordWorkspacePreview } from '../useRecordWorkspacePreview'
import { useRecordWorkspaceStore } from '../useRecordWorkspaceStore'
import { RecordSourceList } from './RecordSourceList'
import { WorkspaceRecordTab } from './WorkspaceRecordTab'

type WorkspaceTab = 'affiliations' | 'records' | 'sources'

export default function RecordWorkspacePage() {
  const { workspaceId = '' } = useParams()
  const navigate = useNavigate()
  const store = useRecordWorkspaceStore()
  const workspace = store.workspaces.find((item) => item.id === workspaceId)

  if (!workspace) {
    return (
      <div className="mx-auto max-w-3xl">
        <WorkspaceRecoveryState kind="corrupt" onBack={() => navigate('/records/workspaces')} />
      </div>
    )
  }

  return (
    <LoadedWorkspacePage
      workspace={workspace}
      onUpdate={(changes) => store.updateWorkspace(workspace.id, changes).ok}
    />
  )
}

function LoadedWorkspacePage({
  onUpdate,
  workspace,
}: {
  readonly onUpdate: (changes: WorkspaceUpdate) => boolean
  readonly workspace: RecordWorkspace
}) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const editor = useRecordWorkspaceEditor({ workspace, onPersist: onUpdate })
  const previewQuery = useRecordWorkspacePreview(editor.state.subjectKeys)
  const preview = previewQuery.preview
  const tab = normalizeTab(params.get('tab'))
  const requestedEventKey = params.get('event')?.trim() || null
  const showEventIndex = params.get('eventIndex') === 'true'
  const selectedRecordId = params.get('record')?.trim() || null

  const updatePageState = (updates: Readonly<Record<string, string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  const focusRecordId = editor.state.focusRecordId

  useEffect(() => {
    if (!focusRecordId) return
    const target = [...document.querySelectorAll<HTMLElement>('[data-record-row]')]
      .find((element) => element.dataset.recordRow === focusRecordId)
    target?.focus({ preventScroll: true })
    editor.clearFocusRecord()
  }, [focusRecordId])

  if (previewQuery.isPending && !preview) {
    return <WorkspaceShell title={workspace.title}><WorkspaceRecoveryState kind="loading" /></WorkspaceShell>
  }
  if (previewQuery.isError || !preview) {
    return (
      <WorkspaceShell title={workspace.title}>
        <WorkspaceRecoveryState
          kind="network"
          onBack={() => navigate('/records/workspaces')}
          onRetry={() => void previewQuery.refetch()}
        />
      </WorkspaceShell>
    )
  }

  const visibleRecords = visibleWorkspaceRecords(preview.records, editor.state.excludedRecordIds)
  const selectedEventKey = showEventIndex ? null : selectInitialRecordEventKey(requestedEventKey, visibleRecords)
  const visibleCoverage = { ...preview.coverage, returned: visibleRecords.length }

  return (
    <WorkspaceShell title={workspace.title}>
      <section className="border border-line bg-surface p-5 sm:p-7">
        <RecordIdentityHeader
          affiliationCount={preview.affiliations.length}
          context="workspace"
          displayName={preview.identity.displayName}
          identityWarning={preview.identity.warning === 'none' && editor.state.subjectKeys.length > 1 ? 'same_name' : preview.identity.warning}
          recordCount={preview.coverage.totalMatched}
          subjectCount={editor.state.subjectKeys.length}
          visibleRecordCount={visibleRecords.length}
        />
        <p className="mt-4 text-body-sm leading-6 text-ink-3">
          숨긴 기록은 이 기기의 이 모음에서만 보이지 않아요. 원본 공개 기록은 바뀌지 않아요.
        </p>
      </section>

      {editor.state.announcement && (
        <section className="flex flex-col gap-3 border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <p className="text-body-sm font-medium text-ink-2">{editor.state.announcement}</p>
          {editor.state.undo && <Button className="min-h-11" type="button" variant="outline" onClick={editor.undo}>되돌리기</Button>}
        </section>
      )}

      <RecordCoverageReceipt context="workspace" coverage={visibleCoverage} subjectCount={editor.state.subjectKeys.length} />
      <WorkspaceTabs active={tab} onChange={(nextTab) => updatePageState({
        tab: nextTab === 'records' ? null : nextTab,
        event: null,
        eventIndex: null,
        record: null,
      })} />

      {tab === 'records' && (
        <WorkspaceRecordTab
          isLoadingMore={previewQuery.isFetchingNextPage}
          onCancelSelection={editor.cancelSelection}
          onCloseRecord={() => updatePageState({ record: null })}
          onHideSelected={editor.hideSelected}
          onLoadMore={() => void previewQuery.fetchNextPage()}
          onOpenRecord={(recordId) => updatePageState({ record: recordId })}
          onRestoreAll={editor.restoreAll}
          onSelectEvent={(eventKey) => updatePageState({
            event: eventKey,
            eventIndex: eventKey ? null : 'true',
            record: null,
          })}
          onStartSelection={editor.startSelection}
          onToggleRecord={editor.toggleRecord}
          preview={preview}
          records={visibleRecords}
          selectedEventKey={selectedEventKey}
          selectedRecordId={selectedRecordId}
          selectedRecordIds={editor.state.selectedRecordIds}
          selectionMode={editor.state.selectionMode}
        />
      )}
      {tab === 'affiliations' && (
        <div className="space-y-3">
          <AffiliationHistory context="workspace" items={preview.affiliations} />
          <WorkspaceSubjectList
            onRemove={editor.removeSubject}
            subjectKeys={editor.state.subjectKeys}
            subjects={preview.subjects}
            unavailableSubjectKeys={preview.unavailableSubjectKeys}
          />
        </div>
      )}
      {tab === 'sources' && <RecordSourceList records={visibleRecords} />}
    </WorkspaceShell>
  )
}

function WorkspaceShell({ children, title }: { readonly children: ReactNode; readonly title: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand" to="/records/workspaces">기록 모음 목록</Link>
        <span className="max-w-[55%] truncate text-body-sm font-semibold text-ink-3">{title}</span>
      </div>
      {children}
    </div>
  )
}

function WorkspaceTabs({ active, onChange }: { readonly active: WorkspaceTab; readonly onChange: (tab: WorkspaceTab) => void }) {
  return (
    <nav className="grid grid-cols-3 border border-line bg-surface p-1" aria-label="기록 모음 보기">
      {([
        ['records', '종목별 기록'],
        ['affiliations', '선수 후보·소속'],
        ['sources', '출처'],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={active === value}
          className={active === value
            ? 'min-h-11 bg-ink px-2 text-body-sm font-semibold text-white'
            : 'min-h-11 px-2 text-body-sm font-semibold text-ink-3 hover:bg-surface-2 hover:text-ink'}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

function normalizeTab(value: string | null): WorkspaceTab {
  return value === 'affiliations' || value === 'sources' ? value : 'records'
}
