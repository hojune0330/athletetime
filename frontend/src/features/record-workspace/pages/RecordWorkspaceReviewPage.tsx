import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { WorkspaceRecoveryState } from '../components/WorkspaceRecoveryState'
import { WorkspaceReviewContent } from '../components/WorkspaceReviewContent'
import { reconcileRecordWorkspaceSubjectKeys } from '../recordWorkspacePreviewPages'
import { useRecordWorkspacePreview } from '../useRecordWorkspacePreview'
import { useRecordWorkspaceStore } from '../useRecordWorkspaceStore'
import { workspaceCreatedNavigation, workspaceResetToSearchNavigation } from '../workspaceNavigation'

const EMPTY_SUBJECT_KEYS: readonly string[] = []

export default function RecordWorkspaceReviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const store = useRecordWorkspaceStore()
  const draft = store.workspaceDraft
  const subjectKeys = draft?.subjectKeys ?? EMPTY_SUBJECT_KEYS
  const saveWorkspaceDraft = store.saveWorkspaceDraft
  const previewQuery = useRecordWorkspacePreview(subjectKeys)
  const preview = previewQuery.preview
  const reconciledSubjectKeys = useMemo(
    () => preview
      ? reconcileRecordWorkspaceSubjectKeys(subjectKeys, preview.resolvedSubjectKeys)
      : subjectKeys,
    [preview, subjectKeys],
  )
  const [title, setTitle] = useState('기록 모음')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const workspaceDraftQuery = readWorkspaceDraftQuery(location.state)

  useEffect(() => {
    if (!preview || reconciledSubjectKeys === subjectKeys) return
    saveWorkspaceDraft(reconciledSubjectKeys)
  }, [preview, reconciledSubjectKeys, saveWorkspaceDraft, subjectKeys])

  const clearSelectionAndSearch = () => {
    store.clearWorkspaceDraft()
    navigate(workspaceResetToSearchNavigation.to, {
      replace: workspaceResetToSearchNavigation.replace,
      state: workspaceResetToSearchNavigation.state,
    })
  }

  if (!draft || subjectKeys.length === 0) {
    return (
      <ReviewShell onClearSelection={clearSelectionAndSearch}>
        <WorkspaceRecoveryState kind="corrupt" onBack={() => navigate('/records')} />
      </ReviewShell>
    )
  }
  if (previewQuery.isPending && !preview) {
    return <ReviewShell onClearSelection={clearSelectionAndSearch}><WorkspaceRecoveryState kind="loading" /></ReviewShell>
  }
  if (previewQuery.isError || !preview) {
    return (
      <ReviewShell onClearSelection={clearSelectionAndSearch}>
        <WorkspaceRecoveryState
          kind="network"
          onBack={() => navigate('/records')}
          onRetry={() => void previewQuery.refetch()}
        />
      </ReviewShell>
    )
  }

  const removeSubject = (subjectKey: string) => {
    const next = reconciledSubjectKeys.filter((key) => key !== subjectKey)
    if (next.length === 0) {
      store.clearWorkspaceDraft()
      navigate(workspaceResetToSearchNavigation.to, {
        replace: workspaceResetToSearchNavigation.replace,
        state: workspaceResetToSearchNavigation.state,
      })
      return
    }
    const result = saveWorkspaceDraft(next)
    setNotice(result.ok ? '선택에서 뺐어요.' : '선택을 바꾸지 못했어요.')
  }
  const confirmWorkspace = () => {
    setBusy(true)
    const result = store.createWorkspace({ subjectKeys: reconciledSubjectKeys, title: title.trim() })
    setBusy(false)
    if (!result.ok) {
      setNotice(result.reason === 'workspace_limit'
        ? '저장한 기록 모음이 20개예요. 기존 모음을 정리한 뒤 다시 시도해 주세요.'
        : '기록 모음을 저장하지 못했어요.')
      return
    }
    store.clearWorkspaceDraft()
    navigate(`/records/workspaces/${result.value.id}`, workspaceCreatedNavigation)
  }
  const continueSelection = () => {
    const params = new URLSearchParams({ flow: 'browse', browse: 'athlete' })
    if (workspaceDraftQuery) params.set('q', workspaceDraftQuery)
    navigate(`/records?${params.toString()}`, {
      replace: true,
      state: { focusSearch: true, workspaceSelection: true },
    })
  }

  return (
    <ReviewShell onClearSelection={clearSelectionAndSearch}>
      <WorkspaceReviewContent
        busy={busy}
        notice={notice}
        onClearSelection={clearSelectionAndSearch}
        onContinueSelection={continueSelection}
        onConfirm={confirmWorkspace}
        onRemoveSubject={removeSubject}
        onTitleChange={setTitle}
        preview={preview}
        subjectKeys={reconciledSubjectKeys}
        title={title}
      />
      {notice.includes('20개') && (
        <Link className="inline-flex min-h-11 items-center font-semibold text-brand" to="/records/workspaces">
          저장한 기록 모음 관리
        </Link>
      )}
    </ReviewShell>
  )
}

function readWorkspaceDraftQuery(state: unknown): string {
  if (typeof state !== 'object' || state === null) return ''
  const value = Reflect.get(state, 'workspaceDraftQuery')
  return typeof value === 'string' ? value.trim() : ''
}

function ReviewShell({
  children,
  onClearSelection,
}: {
  readonly children: ReactNode
  readonly onClearSelection: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <button className="inline-flex min-h-11 items-center font-semibold text-brand" type="button" onClick={onClearSelection}>
          선택을 비우고 새로 찾기
        </button>
        <Link className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand" to="/records/workspaces">
          기록 모음 목록
        </Link>
      </div>
      {children}
    </div>
  )
}
