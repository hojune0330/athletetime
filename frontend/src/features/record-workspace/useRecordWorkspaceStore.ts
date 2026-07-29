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

function readSnapshot(store: ReturnType<typeof createBrowserStore>): StoreSnapshot {
  return {
    comparison: store.getComparison(),
    selfClaimDraft: store.getSelfClaimDraft(),
    status: store.getStatus(),
    workspaceDraft: store.getWorkspaceDraft(),
    workspaces: store.listWorkspaces(),
  }
}

export function useRecordWorkspaceStore() {
  const [store] = useState(createBrowserStore)
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

  return {
    ...snapshot,
    createWorkspace,
    refresh,
    saveComparison,
    saveSelfClaimDraft,
    saveWorkspaceDraft,
    storage: store,
  }
}
