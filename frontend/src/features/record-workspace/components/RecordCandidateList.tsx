import { useState } from 'react'
import type { AthleteSearchCard } from '@/api/recordAnalytics'
import { WORKSPACE_LIMITS } from '../model'
import { RecordCandidateCard } from './RecordCandidateCard'
import { WorkspaceDraftTray } from './WorkspaceDraftTray'

export type WorkspaceDraftSelectionResult =
  | {
    readonly kind: 'limit'
    readonly subjectKeys: readonly string[]
  }
  | {
    readonly kind: 'updated'
    readonly subjectKeys: readonly string[]
  }

type RecordCandidateListProps = {
  readonly athletes: readonly AthleteSearchCard[]
  readonly draftSubjectKeys: readonly string[]
  readonly onDraftChange: (subjectKeys: readonly string[]) => void
  readonly onEnterSelectionMode: () => void
  readonly onExitSelectionMode: () => void
  readonly onOpenAthlete: (athleteKey: string) => void
  readonly onReviewDraft: () => void
  readonly selectionMode: boolean
}

export function nextWorkspaceDraftSelection(
  currentSubjectKeys: readonly string[],
  athleteKey: string,
): WorkspaceDraftSelectionResult {
  const subjectKeys = [...new Set(currentSubjectKeys)]
  if (subjectKeys.includes(athleteKey)) {
    return {
      kind: 'updated',
      subjectKeys: subjectKeys.filter((key) => key !== athleteKey),
    }
  }
  if (subjectKeys.length >= WORKSPACE_LIMITS.workspaceDraftSubjects) {
    return { kind: 'limit', subjectKeys }
  }
  return { kind: 'updated', subjectKeys: [...subjectKeys, athleteKey] }
}

export function RecordCandidateList({
  athletes,
  draftSubjectKeys,
  onDraftChange,
  onEnterSelectionMode,
  onExitSelectionMode,
  onOpenAthlete,
  onReviewDraft,
  selectionMode,
}: RecordCandidateListProps) {
  const [notice, setNotice] = useState('')
  const selectedKeys = new Set(draftSubjectKeys)

  const activateCandidate = (athlete: AthleteSearchCard) => {
    if (!selectionMode) {
      onOpenAthlete(athlete.athleteKey)
      return
    }
    const result = nextWorkspaceDraftSelection(draftSubjectKeys, athlete.athleteKey)
    if (result.kind === 'limit') {
      setNotice(`한 모음에는 ${WORKSPACE_LIMITS.workspaceDraftSubjects}명까지 담을 수 있어요.`)
      return
    }
    setNotice('')
    onDraftChange(result.subjectKeys)
  }

  return (
    <section className={selectionMode ? 'pb-28' : undefined}>
      <header className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">
            SEARCH RESULTS
          </p>
          <h2 className="mt-1 text-h3 font-semibold text-ink">
            {selectionMode ? '함께 볼 선수를 선택하세요' : `선수 ${athletes.length}명`}
          </h2>
          <p className="mt-1 text-body-sm text-ink-3">
            {selectionMode
              ? `소속과 시즌을 확인하고 최대 ${WORKSPACE_LIMITS.workspaceDraftSubjects}명까지 담을 수 있어요.`
              : '카드를 누르면 이 선수 후보의 기록을 열어요.'}
          </p>
        </div>
        {!selectionMode && athletes.length > 0 && (
          <button
            type="button"
            className="min-h-11 shrink-0 border border-line px-4 text-body-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onEnterSelectionMode}
          >
            선수 기록 모아 보기
          </button>
        )}
      </header>

      {athletes.length === 0 ? (
        <p className="border border-dashed border-line bg-surface-2 px-4 py-6 text-body-sm text-ink-3" role="status">
          검색 조건에 맞는 선수를 찾지 못했어요.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {athletes.map((athlete) => (
            <RecordCandidateCard
              key={athlete.athleteKey}
              athlete={athlete}
              mode={selectionMode ? 'collect' : 'browse'}
              selected={selectedKeys.has(athlete.athleteKey)}
              onActivate={activateCandidate}
            />
          ))}
        </div>
      )}

      {selectionMode && (
        <WorkspaceDraftTray
          notice={notice}
          selectedCount={selectedKeys.size}
          onCancel={() => {
            setNotice('')
            onExitSelectionMode()
          }}
          onContinue={onReviewDraft}
        />
      )}
    </section>
  )
}
