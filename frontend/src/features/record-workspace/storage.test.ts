import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEYS,
  createRecordWorkspaceStorage,
} from './storage'
import { RecordWorkspaceSchema } from './model'
import { TestStorage } from './storageTestSupport'

const KEY_A = '1111111111111111'
const KEY_B = '2222222222222222'

function workspace(index: number) {
  return RecordWorkspaceSchema.parse({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: '기록 모음',
    subjectKeys: [KEY_A],
    excludedRecordIds: [],
    filter: {},
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  })
}

describe('record workspace storage boundaries', () => {
  it('keeps the self claim byte-identical when a general workspace is created', () => {
    // Given a saved self-claim draft in local storage.
    const selfBytes = JSON.stringify({ version: 1, subjectKeys: [KEY_A], updatedAt: '2026-07-29T00:00:00.000Z' })
    const local = new TestStorage({ [STORAGE_KEYS.selfClaimDraft]: selfBytes })
    const session = new TestStorage()
    const store = createRecordWorkspaceStorage({
      local,
      session,
      createUuid: () => '10000000-0000-4000-8000-000000000001',
      now: () => '2026-07-29T01:00:00.000Z',
    })

    // When a general record workspace is created.
    const result = store.createWorkspace({ subjectKeys: [KEY_B] })

    // Then the workspace succeeds without rewriting the self-claim bytes.
    expect(result.ok).toBe(true)
    expect(local.getItem(STORAGE_KEYS.selfClaimDraft)).toBe(selfBytes)
  })

  it('keeps workspace and self bytes unchanged when a comparison is saved', () => {
    // Given independent workspace and self-claim values.
    const workspaceBytes = JSON.stringify({ version: 1, items: [workspace(1)] })
    const selfBytes = JSON.stringify({ version: 1, subjectKeys: [KEY_A], updatedAt: '2026-07-29T00:00:00.000Z' })
    const local = new TestStorage({
      [STORAGE_KEYS.workspaces]: workspaceBytes,
      [STORAGE_KEYS.selfClaimDraft]: selfBytes,
    })
    const store = createRecordWorkspaceStorage({ local, session: new TestStorage() })

    // When a one-person comparison setup is saved.
    const result = store.saveComparison({
      id: '20000000-0000-4000-8000-000000000001',
      state: 'setup',
      subjectKeys: [KEY_B],
      returnContext: { kind: 'athlete', id: KEY_B, focusToken: 'record-card-1' },
      updatedAt: '2026-07-29T01:00:00.000Z',
    })

    // Then comparison storage changes alone.
    expect(result.ok).toBe(true)
    expect(local.getItem(STORAGE_KEYS.workspaces)).toBe(workspaceBytes)
    expect(local.getItem(STORAGE_KEYS.selfClaimDraft)).toBe(selfBytes)
  })

  it('continues in volatile memory when storage is blocked, corrupt, or oversized', () => {
    // Given blocked persistent stores and invalid persisted workspace data.
    const blockedLocal = new TestStorage()
    blockedLocal.failReads = true
    blockedLocal.failWritesFor.add(STORAGE_KEYS.workspaces)
    const corruptLocal = new TestStorage({ [STORAGE_KEYS.workspaces]: '{broken' })
    const oversizedLocal = new TestStorage({ [STORAGE_KEYS.workspaces]: 'x'.repeat(70_000) })
    const quotaLocal = new TestStorage()
    quotaLocal.failWritesFor.add(STORAGE_KEYS.workspaces)

    // When each store is opened and a workspace is created in the blocked store.
    const blocked = createRecordWorkspaceStorage({ local: blockedLocal, session: new TestStorage() })
    const corrupt = createRecordWorkspaceStorage({ local: corruptLocal, session: new TestStorage() })
    const oversized = createRecordWorkspaceStorage({ local: oversizedLocal, session: new TestStorage() })
    const quota = createRecordWorkspaceStorage({
      local: quotaLocal,
      session: new TestStorage(),
      createUuid: () => '00000000-0000-4000-8000-000000000099',
    })
    const result = blocked.createWorkspace({ subjectKeys: [KEY_A] })
    const quotaResult = quota.createWorkspace({ subjectKeys: [KEY_B] })

    // Then no exception escapes and each unsafe boundary reports volatile recovery.
    expect(result.ok).toBe(true)
    expect(blocked.listWorkspaces()).toHaveLength(1)
    expect(blocked.getStatus().mode).toBe('volatile')
    expect(corrupt.listWorkspaces()).toEqual([])
    expect(corrupt.getStatus().mode).toBe('volatile')
    expect(oversized.listWorkspaces()).toEqual([])
    expect(oversized.getStatus().mode).toBe('volatile')
    expect(quotaResult.ok).toBe(true)
    expect(quota.listWorkspaces()).toHaveLength(1)
    expect(quota.getStatus()).toEqual({ mode: 'volatile', reason: 'blocked' })
  })

  it('enforces workspace, self-claim, and comparison limits without silent truncation', () => {
    // Given twenty saved workspaces and empty self and comparison stores.
    const local = new TestStorage({
      [STORAGE_KEYS.workspaces]: JSON.stringify({
        version: 1,
        items: Array.from({ length: 20 }, (_, index) => workspace(index)),
      }),
    })
    const store = createRecordWorkspaceStorage({ local, session: new TestStorage() })

    // When each context is asked to exceed its own limit.
    const workspaceResult = store.createWorkspace({ subjectKeys: [KEY_B] })
    const selfResult = store.saveSelfClaimDraft(Array.from({ length: 7 }, (_, index) => `${index}`.repeat(16)))
    const comparisonResult = store.saveComparison({
      id: '30000000-0000-4000-8000-000000000001',
      state: 'setup',
      subjectKeys: [KEY_A, KEY_B, '3333333333333333', '4444444444444444', '5555555555555555'],
      updatedAt: '2026-07-29T01:00:00.000Z',
    })

    // Then every context returns its explicit limit error.
    expect(workspaceResult).toEqual({ ok: false, reason: 'workspace_limit' })
    expect(selfResult).toEqual({ ok: false, reason: 'subject_limit' })
    expect(comparisonResult).toEqual({ ok: false, reason: 'subject_limit' })
  })

  it('allows one target during setup but requires two targets and an event for ready state', () => {
    // Given a fresh comparison session store.
    const store = createRecordWorkspaceStorage({ local: new TestStorage(), session: new TestStorage() })

    // When setup, incomplete ready, and complete ready states are saved.
    const setup = store.saveComparison({
      id: '40000000-0000-4000-8000-000000000001',
      state: 'setup',
      subjectKeys: [KEY_A],
      updatedAt: '2026-07-29T01:00:00.000Z',
    })
    const incompleteReady = store.saveComparison({
      id: '40000000-0000-4000-8000-000000000001',
      state: 'ready',
      subjectKeys: [KEY_A],
      eventKey: '100m',
      updatedAt: '2026-07-29T01:00:00.000Z',
    })
    const completeReady = store.saveComparison({
      id: '40000000-0000-4000-8000-000000000001',
      state: 'ready',
      subjectKeys: [KEY_A, KEY_B],
      eventKey: '100m',
      updatedAt: '2026-07-29T01:00:00.000Z',
    })

    // Then only setup and the complete ready state are accepted.
    expect(setup.ok).toBe(true)
    expect(incompleteReady).toEqual({ ok: false, reason: 'comparison_not_ready' })
    expect(completeReady.ok).toBe(true)
  })

  it('clears record selections from this device without touching unrelated browser preferences', () => {
    const local = new TestStorage({
      [STORAGE_KEYS.selfClaimDraft]: JSON.stringify({ version: 1, subjectKeys: [KEY_A], updatedAt: '2026-07-29T00:00:00.000Z' }),
      [STORAGE_KEYS.workspaces]: JSON.stringify({ version: 1, items: [workspace(1)] }),
      [STORAGE_KEYS.migration]: JSON.stringify({ version: 1, status: 'completed', completedAt: '2026-07-29T00:00:00.000Z' }),
      'athletetime.my-athlete.v1': JSON.stringify({ athleteKey: KEY_A }),
      'athletetime.my-athlete.v2': JSON.stringify([{ athleteKey: KEY_A, name: '선수', team: '팀' }]),
      'athletetime.compareTray.v1': JSON.stringify([{ athleteKey: KEY_A, name: '선수', team: '팀' }]),
      'athletetime.home.shortcuts': JSON.stringify(['records']),
    })
    const session = new TestStorage({
      [STORAGE_KEYS.workspaceDraft]: JSON.stringify({ version: 1, subjectKeys: [KEY_A], updatedAt: '2026-07-29T00:00:00.000Z' }),
      [STORAGE_KEYS.comparison]: JSON.stringify({
        version: 1,
        value: {
          id: '40000000-0000-4000-8000-000000000001',
          state: 'setup',
          subjectKeys: [KEY_A],
          updatedAt: '2026-07-29T00:00:00.000Z',
        },
      }),
      'athletetime.auth.redirect': '/profile',
    })
    const store = createRecordWorkspaceStorage({ local, session })

    const persistence = store.clearRecordDeviceData()

    expect(persistence).toBe('persistent')
    for (const key of [
      STORAGE_KEYS.selfClaimDraft,
      STORAGE_KEYS.workspaces,
      'athletetime.my-athlete.v1',
      'athletetime.my-athlete.v2',
      'athletetime.compareTray.v1',
    ]) {
      expect(local.getItem(key)).toBeNull()
    }
    expect(session.getItem(STORAGE_KEYS.workspaceDraft)).toBeNull()
    expect(session.getItem(STORAGE_KEYS.comparison)).toBeNull()
    expect(local.getItem(STORAGE_KEYS.migration)).toContain('"status":"completed"')
    expect(local.getItem('athletetime.home.shortcuts')).toBe(JSON.stringify(['records']))
    expect(session.getItem('athletetime.auth.redirect')).toBe('/profile')
  })

  it('drops stored labels and unsafe return context at the parsing boundary', () => {
    // Given storage containing legacy labels and an unrestricted return URL.
    const session = new TestStorage({
      [STORAGE_KEYS.comparison]: JSON.stringify({
        version: 1,
        value: {
          id: '50000000-0000-4000-8000-000000000001',
          state: 'setup',
          subjectKeys: [KEY_A],
          name: '저장하면 안 되는 이름',
          team: '저장하면 안 되는 소속',
          observedSeasons: [2025],
          returnContext: { kind: 'external', id: 'https://example.test', focusToken: '../secret' },
          updatedAt: '2026-07-29T01:00:00.000Z',
        },
      }),
    })
    const store = createRecordWorkspaceStorage({ local: new TestStorage(), session })

    // When the comparison is loaded and saved again.
    const loaded = store.getComparison()
    const saved = loaded ? store.saveComparison(loaded) : { ok: false as const, reason: 'missing' as const }

    // Then unsafe context and automatic identity snapshots are absent from persisted JSON.
    expect(loaded?.returnContext).toBeUndefined()
    expect(saved.ok).toBe(true)
    const raw = session.getItem(STORAGE_KEYS.comparison) ?? ''
    expect(raw).not.toContain('저장하면 안 되는 이름')
    expect(raw).not.toContain('저장하면 안 되는 소속')
    expect(raw).not.toContain('observedSeasons')
    expect(raw).not.toContain('https://')
  })

  it('deduplicates subjects, retries UUID collisions, and rejects mismatched return IDs', () => {
    // Given a duplicate subject list and a UUID generator that collides once.
    const existing = workspace(1)
    const local = new TestStorage({
      [STORAGE_KEYS.workspaces]: JSON.stringify({ version: 1, items: [existing] }),
    })
    const session = new TestStorage()
    const uuids = [
      existing.id,
      '60000000-0000-4000-8000-000000000002',
    ]
    const store = createRecordWorkspaceStorage({
      local,
      session,
      createUuid: () => uuids.shift() ?? existing.id,
    })

    // When duplicate subjects are saved and athlete context receives a workspace UUID.
    const created = store.createWorkspace({
      subjectKeys: [KEY_A, KEY_A, KEY_B],
      title: '직접 정한 제목',
    })
    const comparison = store.saveComparison({
      id: '70000000-0000-4000-8000-000000000001',
      state: 'setup',
      subjectKeys: [KEY_A, KEY_A],
      returnContext: {
        kind: 'athlete',
        id: '60000000-0000-4000-8000-000000000002',
        focusToken: 'result-1',
      },
      updatedAt: '2026-07-29T01:00:00.000Z',
    })

    // Then unique subjects remain, the second UUID wins, and unsafe context is discarded.
    expect(created.ok && created.value.id).toBe('60000000-0000-4000-8000-000000000002')
    expect(created.ok && created.value.subjectKeys).toEqual([KEY_A, KEY_B])
    expect(comparison.ok && comparison.value.subjectKeys).toEqual([KEY_A])
    expect(comparison.ok && comparison.value.returnContext).toBeUndefined()
  })
})
