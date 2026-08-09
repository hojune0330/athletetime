import { useLocation, useNavigate } from 'react-router-dom'
import type { AthleteSearchCard } from '@/api/recordAnalytics'
import { createRecordAthleteReturnState } from '../recordAthleteNavigationState'
import { RecordCandidateList } from './RecordCandidateList'

type RecordCandidatesSurfaceProps = {
  readonly athletes: readonly AthleteSearchCard[]
  readonly draftSubjectKeys: readonly string[]
  readonly onDraftChange: (subjectKeys: readonly string[]) => void
  readonly onEnterSelectionMode: () => void
  readonly onExitSelectionMode: () => void
  readonly onReviewDraft: () => void
  readonly selectionMode: boolean
}

export function RecordCandidatesSurface({
  athletes,
  draftSubjectKeys,
  onDraftChange,
  onEnterSelectionMode,
  onExitSelectionMode,
  onReviewDraft,
  selectionMode,
}: RecordCandidatesSurfaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const returnState = createRecordAthleteReturnState(location)

  return (
    <RecordCandidateList
      athletes={athletes}
      draftSubjectKeys={draftSubjectKeys}
      selectionMode={selectionMode}
      onDraftChange={onDraftChange}
      onEnterSelectionMode={onEnterSelectionMode}
      onExitSelectionMode={onExitSelectionMode}
      onOpenAthlete={(athleteKey) => navigate(`/records/athletes/${athleteKey}`, { state: returnState })}
      onReviewDraft={onReviewDraft}
    />
  )
}
