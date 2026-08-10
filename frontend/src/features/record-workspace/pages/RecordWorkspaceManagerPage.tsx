import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WorkspaceManagerCard } from '../components/WorkspaceManagerCard'
import { StorageStatusNotice } from '../components/StorageStatusNotice'
import type { RecordWorkspace } from '../storage'
import { useRecordWorkspaceStore } from '../useRecordWorkspaceStore'

export default function RecordWorkspaceManagerPage() {
  const store = useRecordWorkspaceStore()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<RecordWorkspace | null>(null)
  const [notice, setNotice] = useState('')
  const workspaces = useMemo(
    () => [...store.workspaces].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [store.workspaces],
  )

  const deleteWorkspace = (workspaceId: string) => {
    const result = store.deleteWorkspace(workspaceId)
    setConfirmingId(null)
    if (!result.ok) {
      setNotice('기록 모음을 삭제하지 못했어요.')
      return
    }
    setDeleted(result.value)
    setNotice('기록 모음을 삭제했어요. 다음 삭제 전까지 되돌릴 수 있어요.')
  }
  const undoDelete = () => {
    if (!deleted) return
    const result = store.restoreWorkspace(deleted)
    if (!result.ok) {
      setNotice('삭제한 기록 모음을 복구하지 못했어요.')
      return
    }
    setDeleted(null)
    setNotice('삭제한 기록 모음을 복구했어요.')
  }
  const renameWorkspace = (workspaceId: string, title: string) => {
    const result = store.updateWorkspace(workspaceId, { title })
    setNotice(result.ok ? '모음 이름을 바꿨어요.' : '모음 이름을 바꾸지 못했어요.')
    return result.ok
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-24">
      <header className="border border-line bg-surface p-5 sm:p-7">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">기록 모음 목록</p>
        <h1 className="mt-2 text-h1 font-semibold text-ink">저장한 기록 모음</h1>
        <p className="mt-2 max-w-2xl text-body-sm leading-6 text-ink-3">
          이 기기에서 직접 만든 모음이에요. 공개 기록 원본이나 선수 신원을 합치지 않아요.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[12px] text-ink-3">{workspaces.length}/20개</span>
          <Link className="inline-flex min-h-11 items-center font-semibold text-brand" to="/records">
            새 기록 찾기
          </Link>
        </div>
      </header>

      {notice && (
        <section className="flex flex-col gap-3 border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <p className="text-body-sm font-medium text-ink-2">{notice}</p>
          {deleted && <Button className="min-h-11" type="button" variant="outline" onClick={undoDelete}>되돌리기</Button>}
        </section>
      )}

      {workspaces.length === 0 ? (
        <section className="border border-line bg-surface p-6 sm:p-8">
          <h2 className="text-h2 font-semibold text-ink">저장한 기록 모음이 없어요</h2>
          <p className="mt-2 text-body-sm leading-6 text-ink-3">선수 기록에서 함께 볼 기록을 골라 새 모음을 만들 수 있어요.</p>
          <Button asChild className="mt-5 min-h-11"><Link to="/records">기록 찾기</Link></Button>
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {workspaces.map((workspace) => (
            <WorkspaceManagerCard
              key={workspace.id}
              confirmingDelete={confirmingId === workspace.id}
              workspace={workspace}
              onCancelDelete={() => setConfirmingId(null)}
              onDelete={() => deleteWorkspace(workspace.id)}
              onRename={(title) => renameWorkspace(workspace.id, title)}
              onRequestDelete={() => {
                setConfirmingId(workspace.id)
              }}
            />
          ))}
        </div>
      )}

      <StorageStatusNotice status={store.status} />
    </div>
  )
}
