import {
  RecordWorkspaceSchema,
  WORKSPACE_LIMITS,
  WorkspaceIdSchema,
  WorkspacesEnvelopeSchema,
  type RecordWorkspace,
} from './model'
import {
  BYTE_LIMITS,
  type SaveResult,
  type WorkspaceInput,
  type WorkspaceUpdate,
} from './storageContracts'
import { StorageBoundary, type StorageLike, type StorageMode } from './storageBoundary'

type WorkspaceRepositoryOptions = {
  readonly area: StorageLike
  readonly boundary: StorageBoundary
  readonly createUuid: () => string
  readonly now: () => string
  readonly storageKey: string
}

export class WorkspaceRepository {
  readonly #area: StorageLike
  readonly #boundary: StorageBoundary
  readonly #createUuid: () => string
  readonly #now: () => string
  readonly #storageKey: string

  constructor(options: WorkspaceRepositoryOptions) {
    this.#area = options.area
    this.#boundary = options.boundary
    this.#createUuid = options.createUuid
    this.#now = options.now
    this.#storageKey = options.storageKey
  }

  list(): readonly RecordWorkspace[] {
    return this.#boundary.read(
      this.#area,
      this.#storageKey,
      WorkspacesEnvelopeSchema,
      BYTE_LIMITS.workspaces,
    )?.items ?? []
  }

  create(input: WorkspaceInput): SaveResult<RecordWorkspace> {
    if (new Set(input.subjectKeys).size > WORKSPACE_LIMITS.workspaceDraftSubjects) {
      return { ok: false, reason: 'subject_limit' }
    }
    const workspaces = this.list()
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
    return this.#persist(parsed.data, [...workspaces, parsed.data])
  }

  update(workspaceId: string, changes: WorkspaceUpdate): SaveResult<RecordWorkspace> {
    const workspaces = this.list()
    const index = workspaces.findIndex((item) => item.id === workspaceId)
    const current = workspaces[index]
    if (!current) return { ok: false, reason: 'workspace_not_found' }
    const parsed = RecordWorkspaceSchema.safeParse({ ...current, ...changes, updatedAt: this.#now() })
    if (!parsed.success) return { ok: false, reason: 'invalid_data' }
    const next = workspaces.map((item, itemIndex) => itemIndex === index ? parsed.data : item)
    return this.#persist(parsed.data, next)
  }

  delete(workspaceId: string): SaveResult<RecordWorkspace> {
    const workspaces = this.list()
    const current = workspaces.find((item) => item.id === workspaceId)
    if (!current) return { ok: false, reason: 'workspace_not_found' }
    return this.#persist(current, workspaces.filter((item) => item.id !== workspaceId))
  }

  restore(workspace: RecordWorkspace): SaveResult<RecordWorkspace> {
    const parsed = RecordWorkspaceSchema.safeParse(workspace)
    if (!parsed.success) return { ok: false, reason: 'invalid_data' }
    const workspaces = this.list()
    const existingIndex = workspaces.findIndex((item) => item.id === parsed.data.id)
    if (existingIndex < 0 && workspaces.length >= WORKSPACE_LIMITS.workspaces) {
      return { ok: false, reason: 'workspace_limit' }
    }
    const next = existingIndex < 0
      ? [...workspaces, parsed.data]
      : workspaces.map((item, index) => index === existingIndex ? parsed.data : item)
    return this.#persist(parsed.data, next)
  }

  #persist(workspace: RecordWorkspace, items: readonly RecordWorkspace[]): SaveResult<RecordWorkspace> {
    const persistence = this.#write(items)
    return { ok: true, value: workspace, persistence }
  }

  #write(items: readonly RecordWorkspace[]): StorageMode {
    return this.#boundary.write(
      this.#area,
      this.#storageKey,
      JSON.stringify({ version: 1, items }),
      BYTE_LIMITS.workspaces,
    )
  }

  #newWorkspaceId(existing: ReadonlySet<string>): string | null {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const parsed = WorkspaceIdSchema.safeParse(this.#createUuid())
      if (parsed.success && !existing.has(parsed.data)) return parsed.data
    }
    return null
  }
}
