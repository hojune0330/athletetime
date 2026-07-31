import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WorkspaceRecoveryState } from '../components/WorkspaceRecoveryState'
import { WorkspaceReviewContent } from '../components/WorkspaceReviewContent'
import { useRecordWorkspacePreview } from '../useRecordWorkspacePreview'
import { useRecordWorkspaceStore } from '../useRecordWorkspaceStore'

export default function RecordWorkspaceReviewPage() {
  const navigate = useNavigate()
  const store = useRecordWorkspaceStore()
  const draft = store.workspaceDraft
  const subjectKeys = draft?.subjectKeys ?? []
  const previewQuery = useRecordWorkspacePreview(subjectKeys)
  const [title, setTitle] = useState('기록 모음')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (!draft || subjectKeys.length === 0) {
    return (
      <ReviewShell>
        <WorkspaceRecoveryState kind="corrupt" onBack={() => navigate('/records')} />
      </ReviewShell>
    )
  }
  if (previewQuery.isPending && !previewQuery.preview) {
    return <ReviewShell><WorkspaceRecoveryState kind="loading" /></ReviewShell>
  }
  if (previewQuery.isError || !previewQuery.preview) {
    return (
      <ReviewShell>
        <WorkspaceRecoveryState
          kind="network"
          onBack={() => navigate('/records')}
          onRetry={() => void previewQuery.refetch()}
        />
      </ReviewShell>
    )
  }

  const preview = previewQuery.preview
  const removeSubject = (subjectKey: string) => {
    const next = subjectKeys.filter((key) => key !== subjectKey)
    if (next.length === 0) {
      store.clearWorkspaceDraft()
      navigate('/records')
      return
    }
    const result = store.saveWorkspaceDraft(next)
    setNotice(result.ok ? '선택에서 뺐어요.' : '선택을 바꾸지 못했어요.')
  }
  const confirmWorkspace = () => {
    setBusy(true)
    const result = store.createWorkspace({ subjectKeys, title: title.trim() })
    setBusy(false)
    if (!result.ok) {
      setNotice(result.reason === 'workspace_limit'
        ? '저장한 모음이 20개예요. 기존 모음을 정리한 뒤 다시 시도해 주세요.'
        : '기록 모음을 저장하지 못했어요.')
      return
    }
    store.clearWorkspaceDraft()
    navigate(`/records/workspaces/${result.value.id}`)
  }
  const moveToComparison = () => {
    if (subjectKeys.length > 4) {
      const excessCount = subjectKeys.length - 4
      setNotice(`선수 비교는 4명까지 가능해요. 선택에서 ${excessCount}명 빼고 다시 시도해 주세요.`)
      return
    }
    const result = store.saveComparison({
      id: crypto.randomUUID(),
      state: 'setup',
      subjectKeys,
      updatedAt: new Date().toISOString(),
    })
    if (!result.ok) {
      setNotice('비교 준비로 옮기지 못했어요.')
      return
    }
    navigate('/records?flow=browse&browse=athlete', { state: { focusSearch: true } })
  }

  return (
    <ReviewShell>
      <WorkspaceReviewContent
        busy={busy}
        notice={notice}
        onCompare={moveToComparison}
        onConfirm={confirmWorkspace}
        onRemoveSubject={removeSubject}
        onTitleChange={setTitle}
        preview={preview}
        subjectKeys={subjectKeys}
        title={title}
      />
      {notice.includes('20개') && (
        <Link className="inline-flex min-h-11 items-center font-semibold text-brand" to="/records/workspaces">
          저장한 모음 관리
        </Link>
      )}
    </ReviewShell>
  )
}

function ReviewShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center font-semibold text-brand" to="/records">
          선택으로 돌아가기
        </Link>
        <Link className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand" to="/records/workspaces">
          저장한 모음
        </Link>
      </div>
      {children}
    </div>
  )
}
