import { useCallback, useState } from 'react'
import {
  createRecordWorkspaceStorage,
  type RecordComparison,
  type RecordWorkspace,
  type RecordWorkspaceDraft,
  type SaveResult,
  type SelfClaimDraft,
  type StorageLike,
  type StorageStatus,
  type WorkspaceUpdate,
} from './storage'

type StoreSnapshot = {
  readonly comparison: RecordComparison | null
  readonly selfClaimDraft: SelfClaimDraft | null
  readonly status: StorageStatus
  readonly workspaceDraft: RecordWorkspaceDraft | null
  readonly workspaces: readonly RecordWorkspace[]
}

class MemoryStorage implements StorageLike {
  readonly #values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }

  removeItem(key: string): void {
    this.#values.delete(key)
  }
}

function createBrowserStore() {
  if (typeof window === 'undefined') {
    return createRecordWorkspaceStorage({
      local: new MemoryStorage(),
      session: new MemoryStorage(),
    })
  }
  return createRecordWorkspaceStorage({
    local: window.localStorage,
    session: window.sessionStorage,
  })
}

let sharedBrowserStore: ReturnType<typeof createBrowserStore> | null = null

function getBrowserStore() {
  sharedBrowserStore ??= createBrowserStore()
  return sharedBrowserStore
}

function readSnapshot(store: ReturnType<typeof createBrowserStore>): StoreSnapshot {
  return {
    comparison: store.getComparison(),
    selfClaimDraft: store.getSelfClaimDraft(),
    workspaceDraft: store.getWorkspaceDraft(),
    workspaces: store.listWorkspaces(),
    status: store.getStatus(),
  }
}

export function useRecordWorkspaceStore() {
  const [store] = useState(getBrowserStore)
  const [snapshot, setSnapshot] = useState(() => readSnapshot(store))
  const refresh = useCallback(() => setSnapshot(readSnapshot(store)), [store])

  const createWorkspace = useCallback((
    input: Parameters<typeof store.createWorkspace>[0],
  ): SaveResult<RecordWorkspace> => {
    const result = store.createWorkspace(input)
    refresh()
    return result
  }, [refresh, store])

  const saveSelfClaimDraft = useCallback((
    subjectKeys: readonly string[],
  ): SaveResult<SelfClaimDraft> => {
    const result = store.saveSelfClaimDraft(subjectKeys)
    refresh()
    return result
  }, [refresh, store])

  const saveWorkspaceDraft = useCallback((
    subjectKeys: readonly string[],
  ): SaveResult<RecordWorkspaceDraft> => {
    const result = store.saveWorkspaceDraft(subjectKeys)
    refresh()
    return result
  }, [refresh, store])

  const saveComparison = useCallback((input: unknown): SaveResult<RecordComparison> => {
    const result = store.saveComparison(input)
    refresh()
    return result
  }, [refresh, store])

  const clearWorkspaceDraft = useCallback(() => {
    const persistence = store.clearWorkspaceDraft()
    refresh()
    return persistence
  }, [refresh, store])

  const updateWorkspace = useCallback((
    workspaceId: string,
    changes: WorkspaceUpdate,
  ): SaveResult<RecordWorkspace> => {
    const result = store.updateWorkspace(workspaceId, changes)
    refresh()
    return result
  }, [refresh, store])

  const deleteWorkspace = useCallback((workspaceId: string): SaveResult<RecordWorkspace> => {
    const result = store.deleteWorkspace(workspaceId)
    refresh()
    return result
  }, [refresh, store])

  const restoreWorkspace = useCallback((workspace: RecordWorkspace): SaveResult<RecordWorkspace> => {
    const result = store.restoreWorkspace(workspace)
    refresh()
    return result
  }, [refresh, store])

  return {
    ...snapshot,
    clearWorkspaceDraft,
    createWorkspace,
    deleteWorkspace,
    refresh,
    restoreWorkspace,
    saveComparison,
    saveSelfClaimDraft,
    saveWorkspaceDraft,
    storage: store,
    updateWorkspace,
  }
}
