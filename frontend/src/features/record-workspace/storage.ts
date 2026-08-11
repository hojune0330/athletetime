import type { z, ZodType } from 'zod'
import {
  ComparisonEnvelopeSchema,
  MigrationStateSchema,
  RecordComparisonSchema,
  SelfClaimDraftSchema,
  STORAGE_KEYS,
  WORKSPACE_LIMITS,
  WorkspaceDraftSchema,
  type MigrationState,
  type RecordComparison,
  type RecordWorkspace,
  type RecordWorkspaceDraft,
  type SelfClaimDraft,
} from './model'
import {
  StorageBoundary,
  type StorageLike,
  type StorageMode,
  type StorageStatus,
} from './storageBoundary'
import {
  BYTE_LIMITS,
  ComparisonReadyProbeSchema,
  ComparisonSubjectProbeSchema,
  type RecordWorkspaceStorageOptions,
  type SaveResult,
  type WorkspaceInput,
  type WorkspaceUpdate,
} from './storageContracts'
import { WorkspaceRepository } from './workspaceRepository'

export { STORAGE_KEYS }
export type { RecordComparison, RecordWorkspace, RecordWorkspaceDraft, SelfClaimDraft }
export type { StorageLike, StorageStatus }
export type { SaveResult, WorkspaceUpdate } from './storageContracts'

const RECORD_DEVICE_LOCAL_STORAGE_KEYS = [
  STORAGE_KEYS.selfClaimDraft,
  STORAGE_KEYS.workspaces,
  'athletetime.my-athlete.v1',
  'athletetime.my-athlete.v2',
  'athletetime.compareTray.v1',
] as const

const RECORD_DEVICE_SESSION_STORAGE_KEYS = [
  STORAGE_KEYS.workspaceDraft,
  STORAGE_KEYS.comparison,
] as const

export class RecordWorkspaceStorage {
  readonly #local: StorageLike
  readonly #session: StorageLike
  readonly #createUuid: () => string
  readonly #now: () => string
  readonly #boundary = new StorageBoundary()
  readonly #workspaces: WorkspaceRepository

  constructor(options: RecordWorkspaceStorageOptions) {
    this.#local = options.local
    this.#session = options.session
    this.#createUuid = options.createUuid ?? (() => globalThis.crypto.randomUUID())
    this.#now = options.now ?? (() => new Date().toISOString())
    this.#workspaces = new WorkspaceRepository({
      area: this.#local,
      boundary: this.#boundary,
      createUuid: this.#createUuid,
      now: this.#now,
      storageKey: STORAGE_KEYS.workspaces,
    })
  }

  getStatus(): StorageStatus {
    return this.#boundary.getStatus()
  }

  getWorkspaceDraft(): RecordWorkspaceDraft | null {
    return this.#read(this.#session, STORAGE_KEYS.workspaceDraft, WorkspaceDraftSchema, BYTE_LIMITS.workspaceDraft)
  }

  saveWorkspaceDraft(subjectKeys: readonly string[]): SaveResult<RecordWorkspaceDraft> {
    if (new Set(subjectKeys).size > WORKSPACE_LIMITS.workspaceDraftSubjects) {
      return { ok: false, reason: 'subject_limit' }
    }
    return this.#saveParsed(
      this.#session,
      STORAGE_KEYS.workspaceDraft,
      WorkspaceDraftSchema,
      { version: 1, subjectKeys, updatedAt: this.#now() },
      BYTE_LIMITS.workspaceDraft,
    )
  }

  clearWorkspaceDraft(): StorageMode {
    return this.#boundary.remove(this.#session, STORAGE_KEYS.workspaceDraft)
  }

  clearRecordDeviceData(): StorageMode {
    const results = [
      ...RECORD_DEVICE_LOCAL_STORAGE_KEYS.map((key) => this.#boundary.remove(this.#local, key)),
      ...RECORD_DEVICE_SESSION_STORAGE_KEYS.map((key) => this.#boundary.remove(this.#session, key)),
    ]
    return results.every((result) => result === 'persistent') ? 'persistent' : 'volatile'
  }

  getSelfClaimDraft(): SelfClaimDraft | null {
    return this.#read(this.#local, STORAGE_KEYS.selfClaimDraft, SelfClaimDraftSchema, BYTE_LIMITS.selfClaimDraft)
  }

  saveSelfClaimDraft(subjectKeys: readonly string[]): SaveResult<SelfClaimDraft> {
    if (new Set(subjectKeys).size > WORKSPACE_LIMITS.selfClaimSubjects) {
      return { ok: false, reason: 'subject_limit' }
    }
    return this.#saveParsed(
      this.#local,
      STORAGE_KEYS.selfClaimDraft,
      SelfClaimDraftSchema,
      { version: 1, subjectKeys, updatedAt: this.#now() },
      BYTE_LIMITS.selfClaimDraft,
    )
  }

  listWorkspaces(): readonly RecordWorkspace[] {
    return this.#workspaces.list()
  }

  createWorkspace(input: WorkspaceInput): SaveResult<RecordWorkspace> {
    return this.#workspaces.create(input)
  }

  updateWorkspace(workspaceId: string, changes: WorkspaceUpdate): SaveResult<RecordWorkspace> {
    return this.#workspaces.update(workspaceId, changes)
  }

  deleteWorkspace(workspaceId: string): SaveResult<RecordWorkspace> {
    return this.#workspaces.delete(workspaceId)
  }

  restoreWorkspace(workspace: RecordWorkspace): SaveResult<RecordWorkspace> {
    return this.#workspaces.restore(workspace)
  }

  getComparison(): RecordComparison | null {
    return this.#read(
      this.#session,
      STORAGE_KEYS.comparison,
      ComparisonEnvelopeSchema,
      BYTE_LIMITS.comparison,
    )?.value ?? null
  }

  getMigrationState(): MigrationState | null {
    return this.#read(
      this.#local,
      STORAGE_KEYS.migration,
      MigrationStateSchema,
      BYTE_LIMITS.migration,
    )
  }

  saveComparison(input: unknown): SaveResult<RecordComparison> {
    const subjectProbe = ComparisonSubjectProbeSchema.safeParse(input)
    if (
      subjectProbe.success
      && new Set(subjectProbe.data.subjectKeys).size > WORKSPACE_LIMITS.comparisonSubjects
    ) {
      return { ok: false, reason: 'subject_limit' }
    }
    const readyProbe = ComparisonReadyProbeSchema.safeParse(input)
    if (readyProbe.success && (
      readyProbe.data.subjectKeys.length < 2
      || readyProbe.data.eventKey.trim().length === 0
    )) {
      return { ok: false, reason: 'comparison_not_ready' }
    }
    return this.#saveParsed(
      this.#session,
      STORAGE_KEYS.comparison,
      RecordComparisonSchema,
      input,
      BYTE_LIMITS.comparison,
      (value) => ({ version: 1, value }),
    )
  }

  saveMigrationCompletion(): SaveResult<MigrationState> {
    return this.#saveParsed(
      this.#local,
      STORAGE_KEYS.migration,
      MigrationStateSchema,
      { version: 1, status: 'completed', completedAt: this.#now() },
      BYTE_LIMITS.migration,
    )
  }

  #saveParsed<T>(
    area: StorageLike,
    key: string,
    schema: ZodType<T>,
    input: unknown,
    maximumBytes: number,
    envelope: (value: T) => unknown = (value) => value,
  ): SaveResult<T> {
    const parsed = schema.safeParse(input)
    if (!parsed.success) return { ok: false, reason: 'invalid_data' }
    const persistence = this.#write(area, key, JSON.stringify(envelope(parsed.data)), maximumBytes)
    return { ok: true, value: parsed.data, persistence }
  }

  #read<T>(area: StorageLike, key: string, schema: z.ZodType<T>, maximumBytes: number): T | null {
    return this.#boundary.read(area, key, schema, maximumBytes)
  }

  #write(area: StorageLike, key: string, raw: string, maximumBytes: number): StorageMode {
    return this.#boundary.write(area, key, raw, maximumBytes)
  }
}

export function createRecordWorkspaceStorage(options: RecordWorkspaceStorageOptions): RecordWorkspaceStorage {
  return new RecordWorkspaceStorage(options)
}
