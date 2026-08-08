import type { RecordWorkspaceSubject } from '@/api/recordWorkspace'
import { Button } from '@/components/ui/button'

type WorkspaceSubjectListProps = {
  readonly onRemove: (subjectKey: string) => void
  readonly subjectKeys: readonly string[]
  readonly subjects: readonly RecordWorkspaceSubject[]
  readonly unavailableSubjectKeys: readonly string[]
}

export function WorkspaceSubjectList({
  onRemove,
  subjectKeys,
  subjects,
  unavailableSubjectKeys,
}: WorkspaceSubjectListProps) {
  return (
    <section className="border border-line bg-surface" aria-labelledby="workspace-subjects-title">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">선택한 기록 후보</p>
        <h2 id="workspace-subjects-title" className="mt-1 text-body font-semibold text-ink">모음에 담은 기록 후보</h2>
        <p className="mt-1 text-body-sm leading-5 text-ink-3">
          묶음을 빼도 원본 기록은 바뀌지 않아요.
        </p>
      </div>
      <ul>
        {subjects.map((subject) => (
          <li key={subject.athleteKey} className="flex items-center gap-3 border-b border-hair px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">{subject.name}</p>
              <p className="mt-1 truncate text-caption text-ink-3">
                {subject.team || '소속 확인 안 됨'} · 기록 {subject.recordCount}개
              </p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              type="button"
              variant="outline"
              disabled={subjectKeys.length <= 1}
              onClick={() => onRemove(subject.athleteKey)}
            >
              이 묶음에서 빼기
            </Button>
          </li>
        ))}
        {unavailableSubjectKeys.map((subjectKey) => (
          <li key={subjectKey} className="flex items-center gap-3 border-b border-hair px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-ink">선택한 기록 후보 하나를 불러오지 못했어요</p>
              <p className="mt-1 text-caption text-ink-3">과거 이름이나 소속으로 대신 표시하지 않아요.</p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              type="button"
              variant="outline"
              disabled={subjectKeys.length <= 1}
              onClick={() => onRemove(subjectKey)}
            >
              이 묶음에서 빼기
            </Button>
          </li>
        ))}
      </ul>
      {subjectKeys.length <= 1 && (
        <p className="border-t border-line px-4 py-3 text-caption leading-5 text-ink-3">
          마지막 기록 후보는 모음을 유지하기 위해 남겨둬요.
        </p>
      )}
    </section>
  )
}
