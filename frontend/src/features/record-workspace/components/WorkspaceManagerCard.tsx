import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { RecordWorkspace } from '../storage'
import { useRecordWorkspacePreview } from '../useRecordWorkspacePreview'
import { Button } from '@/components/ui/button'

type WorkspaceManagerCardProps = {
  readonly confirmingDelete: boolean
  readonly onCancelDelete: () => void
  readonly onDelete: () => void
  readonly onRename: (title: string) => boolean
  readonly onRequestDelete: () => void
  readonly workspace: RecordWorkspace
}

export function WorkspaceManagerCard({
  confirmingDelete,
  onCancelDelete,
  onDelete,
  onRename,
  onRequestDelete,
  workspace,
}: WorkspaceManagerCardProps) {
  const previewQuery = useRecordWorkspacePreview(workspace.subjectKeys)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(workspace.title)
  const preview = previewQuery.preview
  const saveTitle = () => {
    if (!onRename(title.trim())) return
    setEditing(false)
  }

  return (
    <article className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="max-w-md">
              <label className="text-caption font-medium text-ink-3" htmlFor={`workspace-title-${workspace.id}`}>
                모음 이름
              </label>
              <input
                id={`workspace-title-${workspace.id}`}
                className="mt-1 min-h-11 w-full border border-line px-3 text-body-sm text-ink focus:border-brand focus:outline-none"
                maxLength={40}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button className="min-h-11" type="button" disabled={title.trim().length === 0} onClick={saveTitle}>저장</Button>
                <Button className="min-h-11" type="button" variant="outline" onClick={() => {
                  setTitle(workspace.title)
                  setEditing(false)
                }}>취소</Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="truncate text-h3 font-semibold text-ink">{workspace.title}</h2>
              <p className="mt-1 font-mono text-[12px] text-ink-3">
                선택 {workspace.subjectKeys.length}묶음 · 마지막 사용 {formatDate(workspace.updatedAt)}
              </p>
            </>
          )}
        </div>
        {!editing && (
          <Button className="min-h-11 shrink-0" type="button" variant="outline" onClick={() => setEditing(true)}>
            이름 바꾸기
          </Button>
        )}
      </div>

      <div className="mt-4 border-y border-hair py-3">
        {preview ? (
          <>
            <p className="text-body-sm font-semibold text-ink">{preview.identity.displayName}</p>
            <p className="mt-1 text-caption leading-5 text-ink-3">
              {preview.affiliations.slice(0, 2).map((item) => item.label).join(' · ') || '소속 확인 안 됨'}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink-3">
              확인 {preview.coverage.totalMatched}개 · {preview.coverage.observedSeasons.length}개 시즌
            </p>
          </>
        ) : previewQuery.isError ? (
          <p className="text-body-sm text-ink-3">현재 기록 정보를 불러오지 못했어요. 저장한 과거 이름·소속은 대신 보여주지 않아요.</p>
        ) : (
          <p className="text-body-sm text-ink-3">현재 공개 기록을 확인하고 있어요.</p>
        )}
      </div>

      {confirmingDelete ? (
        <div className="mt-4 border-l-2 border-warn bg-[#F7EDE0] p-3">
          <p className="text-body-sm font-semibold text-ink">이 기록 모음을 삭제할까요?</p>
          <p className="mt-1 text-caption leading-5 text-ink-3">원본 공개 기록은 삭제되지 않아요.</p>
          <div className="mt-3 flex gap-2">
            <Button className="min-h-11" type="button" onClick={onDelete}>삭제</Button>
            <Button className="min-h-11" type="button" variant="outline" onClick={onCancelDelete}>취소</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="min-h-11">
            <Link to={`/records/workspaces/${workspace.id}`}>열기</Link>
          </Button>
          <Button className="min-h-11" type="button" variant="outline" onClick={onRequestDelete}>삭제</Button>
        </div>
      )}
    </article>
  )
}

function formatDate(value: string) {
  return value.slice(0, 10).replaceAll('-', '.')
}
