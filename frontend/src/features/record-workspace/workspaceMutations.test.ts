import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS, createRecordWorkspaceStorage } from './storage'
import { TestStorage } from './storageTestSupport'

const KEY_A = '1111111111111111'
const KEY_B = '2222222222222222'
const WORKSPACE_ID = '10000000-0000-4000-8000-000000000001'

function createStore() {
  return createRecordWorkspaceStorage({
    local: new TestStorage(),
    session: new TestStorage(),
    createUuid: () => WORKSPACE_ID,
    now: () => '2026-07-31T01:00:00.000Z',
  })
}

describe('record workspace reversible persistence', () => {
  it('updates title, subjects, and excluded records without touching other contexts', () => {
    // Given a saved workspace and an independent self-claim draft.
    const store = createStore()
    const self = store.saveSelfClaimDraft([KEY_A])
    const created = store.createWorkspace({ subjectKeys: [KEY_A, KEY_B] })
    expect(self.ok && created.ok).toBe(true)

    // When the workspace is renamed and one record is locally excluded.
    const updated = store.updateWorkspace(WORKSPACE_ID, {
      title: '2026 시즌 확인',
      subjectKeys: [KEY_A],
      excludedRecordIds: ['record-1'],
    })

    // Then only that workspace changes and the self-claim remains intact.
    expect(updated.ok && updated.value.title).toBe('2026 시즌 확인')
    expect(updated.ok && updated.value.subjectKeys).toEqual([KEY_A])
    expect(updated.ok && updated.value.excludedRecordIds).toEqual(['record-1'])
    expect(store.getSelfClaimDraft()?.subjectKeys).toEqual([KEY_A])
  })

  it('deletes and restores the same workspace without silently evicting another one', () => {
    // Given one persisted workspace.
    const store = createStore()
    const created = store.createWorkspace({ subjectKeys: [KEY_A] })
    expect(created.ok).toBe(true)

    // When it is deleted and then restored from the returned value.
    const deleted = store.deleteWorkspace(WORKSPACE_ID)
    expect(store.listWorkspaces()).toEqual([])
    const restored = deleted.ok ? store.restoreWorkspace(deleted.value) : deleted

    // Then the original identifier and data are restored exactly once.
    expect(deleted.ok).toBe(true)
    expect(restored.ok && restored.value.id).toBe(WORKSPACE_ID)
    expect(store.listWorkspaces()).toHaveLength(1)
  })

  it('clears only the review draft after a workspace is confirmed', () => {
    // Given draft keys in session storage and an unrelated comparison.
    const session = new TestStorage()
    const local = new TestStorage()
    const store = createRecordWorkspaceStorage({ local, session })
    store.saveWorkspaceDraft([KEY_A, KEY_B])
    store.saveComparison({
      id: '20000000-0000-4000-8000-000000000001',
      state: 'setup',
      subjectKeys: [KEY_A],
      updatedAt: '2026-07-31T01:00:00.000Z',
    })

    // When the review draft is cleared.
    store.clearWorkspaceDraft()

    // Then only the draft key is removed.
    expect(session.getItem(STORAGE_KEYS.workspaceDraft)).toBeNull()
    expect(store.getComparison()?.subjectKeys).toEqual([KEY_A])
  })
})
