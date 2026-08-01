import { z } from 'zod'
import type { RecordWorkspace } from './model'
import type { StorageLike, StorageMode } from './storageBoundary'

export type SaveSuccess<T> = {
  readonly ok: true
  readonly value: T
  readonly persistence: StorageMode
}

export type SaveFailure = {
  readonly ok: false
  readonly reason:
    | 'comparison_not_ready'
    | 'invalid_data'
    | 'subject_limit'
    | 'uuid_collision'
    | 'workspace_limit'
    | 'workspace_not_found'
}

export type SaveResult<T> = SaveSuccess<T> | SaveFailure

export type RecordWorkspaceStorageOptions = {
  readonly local: StorageLike
  readonly session: StorageLike
  readonly createUuid?: () => string
  readonly now?: () => string
}

export type WorkspaceInput = {
  readonly subjectKeys: readonly string[]
  readonly title?: string
}

export type WorkspaceUpdate = {
  readonly excludedRecordIds?: readonly string[]
  readonly filter?: RecordWorkspace['filter']
  readonly subjectKeys?: readonly string[]
  readonly title?: string
}

export const BYTE_LIMITS = {
  comparison: 8_192,
  migration: 1_024,
  selfClaimDraft: 4_096,
  workspaceDraft: 4_096,
  workspaces: 65_536,
} as const

export const ComparisonSubjectProbeSchema = z.object({
  subjectKeys: z.array(z.unknown()),
})

export const ComparisonReadyProbeSchema = z.object({
  state: z.literal('ready'),
  subjectKeys: z.array(z.unknown()),
  eventKey: z.string().catch(''),
})
