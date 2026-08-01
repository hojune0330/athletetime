import { apiClient } from './client'
import type { AthleteSearchCard, PublicRecord } from './recordAnalytics'

const BASE = '/api/card-studio/analytics/record-workspaces'

type ApiItemResponse<T> = {
  readonly success: boolean
  readonly data: T
}

export type RecordWorkspacePreviewRequest = {
  readonly subjectKeys: readonly string[]
  readonly cursor?: string
  readonly limit?: number
}

export type RecordWorkspaceSubject = AthleteSearchCard

export type RecordWorkspaceAffiliation = {
  readonly label: string
  readonly firstObservedSeason: number
  readonly lastObservedSeason: number
  readonly recordCount: number
  readonly status: 'latest_observed' | 'past_observed' | 'needs_review'
}

export type RecordWorkspaceEvent = {
  readonly eventKey: string
  readonly eventLabel: string
  readonly recordCount: number
  readonly best: PublicRecord | null
}

export type RecordWorkspaceCoverage = {
  readonly totalMatched: number
  readonly returned: number
  readonly hasMore: boolean
  readonly nextCursor: string | null
  readonly observedSeasons: readonly number[]
  readonly competitionCount: number
  readonly sourceCount: number
  readonly lastCapturedAt: string | null
  readonly qualityState: 'visible_index' | 'partial_source'
}

export type RecordWorkspaceIdentity = {
  readonly displayName: string
  readonly distinctNames: readonly string[]
  readonly warning: 'none' | 'same_name' | 'different_names'
}

export type RecordWorkspacePreview = {
  readonly subjects: readonly RecordWorkspaceSubject[]
  readonly unavailableSubjectKeys: readonly string[]
  readonly identity: RecordWorkspaceIdentity
  readonly affiliations: readonly RecordWorkspaceAffiliation[]
  readonly coverage: RecordWorkspaceCoverage
  readonly events: readonly RecordWorkspaceEvent[]
  readonly records: readonly PublicRecord[]
}

export async function previewRecordWorkspace(
  request: RecordWorkspacePreviewRequest,
): Promise<RecordWorkspacePreview> {
  const { data } = await apiClient.post<ApiItemResponse<RecordWorkspacePreview>>(
    `${BASE}/preview`,
    request,
  )
  return data.data
}
