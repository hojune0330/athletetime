import { z, type ZodType } from 'zod'
import {
  ComparisonEnvelopeSchema,
  MigrationStateSchema,
  RecordComparisonSchema,
  RecordWorkspaceSchema,
  SelfClaimDraftSchema,
  STORAGE_KEYS,
  WORKSPACE_LIMITS,
  WorkspaceIdSchema,
  WorkspaceDraftSchema,
  WorkspacesEnvelopeSchema,
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

export { STORAGE_KEYS }
export type { RecordComparison, RecordWorkspace, RecordWorkspaceDraft, SelfClaimDraft }
export type { StorageLike, StorageStatus }

type SaveSuccess<T> = {
  readonly ok: true
  readonly value: T
  readonly persistence: StorageMode
}

type SaveFailure = {
  readonly ok: false
  readonly reason:
    | 'comparison_not_ready'
    | 'invalid_data'
    | 'subject_limit'
    | 'uuid_collision'
    | 'workspace_limit'
}

export type SaveResult<T> = SaveSuccess<T> | SaveFailure

type RecordWorkspaceStorageOptions = {
  readonly local: StorageLike
  readonly session: StorageLike
  readonly createUuid?: () => string
  readonly now?: () => string
}

type WorkspaceInput = {
  readonly subjectKeys: readonly string[]
  readonly title?: string
}

const BYTE_LIMITS = {
  comparison: 8_192,
  migration: 1_024,
  selfClaimDraft: 4_096,
  workspaceDraft: 4_096,
  workspaces: 65_536,
} as const

export class RecordWorkspaceStorage {
  readonly #local: StorageLike
  readonly #session: StorageLike
  readonly #createUuid: () => string
  readonly #now: () => string
  readonly #boundary = new StorageBoundary()

  constructor(options: RecordWorkspaceStorageOptions) {
    this.#local = options.local
    this.#session = options.session
    this.#createUuid = options.createUuid ?? (() => globalThis.crypto.randomUUID())
    this.#now = options.now ?? (() => new Date().toISOString())
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
    return this.#read(
      this.#local,
      STORAGE_KEYS.workspaces,
      WorkspacesEnvelopeSchema,
      BYTE_LIMITS.workspaces,
    )?.items ?? []
  }

  createWorkspace(input: WorkspaceInput): SaveResult<RecordWorkspace> {
    if (new Set(input.subjectKeys).size > WORKSPACE_LIMITS.workspaceDraftSubjects) {
      return { ok: false, reason: 'subject_limit' }
    }
    const workspaces = this.listWorkspaces()
    if (workspaces.length >= WORKSPACE_LIMITS.workspaces) return { ok: false, reason: 'workspace_limit' }
    const id = this.#newWorkspaceId(new Set(workspaces.map((item) => item.id)))
    if (!id) return { ok: false, reason: 'uuid_collision' }
    const timestamp = this.#now()
    const parsed = RecordWorkspaceSchema.safeParse({
      id,
      title: input.title ?? '기록 모음',
      subjectKeys: input.subjectKeys,
      excludedRecordIds: [],
      filter: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    if (!parsed.success) return { ok: false, reason: 'invalid_data' }
    const persistence = this.#write(
      this.#local,
      STORAGE_KEYS.workspaces,
      JSON.stringify({ version: 1, items: [...workspaces, parsed.data] }),
      BYTE_LIMITS.workspaces,
    )
    return { ok: true, value: parsed.data, persistence }
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

  #newWorkspaceId(existing: ReadonlySet<string>): string | null {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const parsed = WorkspaceIdSchema.safeParse(this.#createUuid())
      if (parsed.success && !existing.has(parsed.data)) return parsed.data
    }
    return null
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

const ComparisonSubjectProbeSchema = z.object({
  subjectKeys: z.array(z.unknown()),
})

const ComparisonReadyProbeSchema = z.object({
  state: z.literal('ready'),
  subjectKeys: z.array(z.unknown()),
  eventKey: z.string().catch(''),
})

export function createRecordWorkspaceStorage(options: RecordWorkspaceStorageOptions): RecordWorkspaceStorage {
  return new RecordWorkspaceStorage(options)
}
