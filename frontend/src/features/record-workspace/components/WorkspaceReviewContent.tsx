import type { RecordWorkspacePreview } from '@/api/recordWorkspace'
import { Button } from '@/components/ui/button'
import { RecordCoverageReceipt } from './RecordCoverageReceipt'
import { RecordIdentityHeader } from './RecordIdentityHeader'
import { WorkspaceSubjectList } from './WorkspaceSubjectList'

type WorkspaceReviewContentProps = {
  readonly busy: boolean
  readonly notice: string
  readonly onCompare: () => void
  readonly onConfirm: () => void
  readonly onRemoveSubject: (subjectKey: string) => void
  readonly onTitleChange: (title: string) => void
  readonly preview: RecordWorkspacePreview
  readonly subjectKeys: readonly string[]
  readonly title: string
}

export function WorkspaceReviewContent({
  busy,
  notice,
  onCompare,
  onConfirm,
  onRemoveSubject,
  onTitleChange,
  preview,
  subjectKeys,
  title,
}: WorkspaceReviewContentProps) {
  const differentNames = preview.identity.warning === 'different_names'

  return (
    <div className="space-y-4">
      <section className="border border-line bg-surface p-5 sm:p-7">
        <RecordIdentityHeader
          affiliationCount={preview.affiliations.length}
          context="workspace"
          displayName={preview.identity.displayName}
          identityWarning={preview.identity.warning}
          recordCount={preview.coverage.totalMatched}
          subjectCount={subjectKeys.length}
          visibleRecordCount={preview.coverage.returned}
        />
        <label className="mt-5 block max-w-xl">
          <span className="mb-1 block text-caption font-medium text-ink-3">모음 이름</span>
          <input
            className="min-h-11 w-full border border-line bg-surface px-3 text-body-sm text-ink focus:border-brand focus:outline-none"
            maxLength={40}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <span className="mt-1 block text-right font-mono text-[11px] text-ink-4">{title.length}/40</span>
        </label>
      </section>

      <RecordCoverageReceipt
        context="workspace"
        coverage={preview.coverage}
        subjectCount={subjectKeys.length}
      />
      <WorkspaceSubjectList
        onRemove={onRemoveSubject}
        subjectKeys={subjectKeys}
        subjects={preview.subjects}
        unavailableSubjectKeys={preview.unavailableSubjectKeys}
      />

      <section className="border border-line bg-surface p-4 sm:p-5">
        {differentNames ? (
          <>
            <h2 className="text-body font-semibold text-ink">한 사람의 기록 모음으로 저장할 수 없어요</h2>
            <p className="mt-1 text-body-sm leading-5 text-ink-3">
              서로 다른 이름은 기록을 합치지 않고 선수 비교로 옮겨야 해요.
            </p>
            <Button className="mt-4 min-h-11" type="button" onClick={onCompare}>선수 비교로 옮기기</Button>
          </>
        ) : (
          <>
            <h2 className="text-body font-semibold text-ink">선택을 확인했나요?</h2>
            <p className="mt-1 text-body-sm leading-5 text-ink-3">
              같은 이름이어도 같은 사람으로 확인됐다는 뜻은 아니에요. 화면에서만 함께 보여드려요.
            </p>
            <Button
              className="mt-4 min-h-11"
              type="button"
              disabled={busy || title.trim().length === 0}
              onClick={onConfirm}
            >
              {busy ? '저장 중' : '기록 모음 만들기'}
            </Button>
          </>
        )}
        <p className="mt-3 min-h-5 text-body-sm text-ink-3" role="status" aria-live="polite">{notice}</p>
      </section>
    </div>
  )
}
