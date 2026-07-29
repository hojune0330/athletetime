import { describe, expect, it } from 'vitest'
import {
  LEGACY_STORAGE_KEYS,
  inspectLegacyMyAthlete,
  migrateLegacyMyAthlete,
} from './legacyMigration'
import { STORAGE_KEYS, createRecordWorkspaceStorage } from './storage'
import { TestStorage } from './storageTestSupport'

const KEY_A = '1111111111111111'
const KEY_B = '2222222222222222'

describe('legacy my-athlete migration boundary', () => {
  it('reads v2 before v1 without writing or deleting either legacy value', () => {
    // Given both legacy formats contain identity labels and valid public keys.
    const v1 = JSON.stringify({ athleteKey: KEY_A, name: '옛 이름', team: '옛 소속' })
    const v2 = JSON.stringify([
      { athleteKey: KEY_B, name: '자동 저장 이름', team: '자동 저장 소속', observedSeasons: [2025] },
      { athleteKey: KEY_A, name: '중복 이름', team: '중복 소속' },
    ])
    const local = new TestStorage({
      [LEGACY_STORAGE_KEYS.v1]: v1,
      [LEGACY_STORAGE_KEYS.v2]: v2,
    })

    // When the migration prompt inspects legacy storage.
    const inspection = inspectLegacyMyAthlete(local)

    // Then only public keys are returned and both byte strings remain untouched.
    expect(inspection).toEqual({
      hasLegacy: true,
      storageAvailable: true,
      subjectKeys: [KEY_B, KEY_A],
    })
    expect(local.getItem(LEGACY_STORAGE_KEYS.v1)).toBe(v1)
    expect(local.getItem(LEGACY_STORAGE_KEYS.v2)).toBe(v2)
    expect(local.getItem(STORAGE_KEYS.selfClaimDraft)).toBeNull()
  })

  it('deletes legacy values only after self draft and completion marker persist', () => {
    // Given a legacy v2 list selected explicitly for self migration.
    const local = new TestStorage({
      [LEGACY_STORAGE_KEYS.v2]: JSON.stringify([
        { athleteKey: KEY_A, name: '저장 금지 이름', team: '저장 금지 소속' },
        { athleteKey: KEY_B, name: '저장 금지 이름 2', team: '저장 금지 소속 2' },
      ]),
    })
    const store = createRecordWorkspaceStorage({
      local,
      session: new TestStorage(),
      now: () => '2026-07-29T02:00:00.000Z',
    })

    // When the user chooses to treat the legacy candidates as their own records.
    const result = migrateLegacyMyAthlete({ choice: 'self', local, store })

    // Then destination and marker persist before legacy labels are removed.
    expect(result).toEqual({ ok: true, destination: 'self', subjectKeys: [KEY_A, KEY_B] })
    expect(local.getItem(LEGACY_STORAGE_KEYS.v1)).toBeNull()
    expect(local.getItem(LEGACY_STORAGE_KEYS.v2)).toBeNull()
    expect(local.getItem(STORAGE_KEYS.migration)).toContain('"status":"completed"')
    const draftBytes = local.getItem(STORAGE_KEYS.selfClaimDraft) ?? ''
    expect(draftBytes).toContain(KEY_A)
    expect(draftBytes).toContain(KEY_B)
    expect(draftBytes).not.toContain('저장 금지')
  })

  it('preserves legacy bytes when the destination write cannot persist', () => {
    // Given local storage blocks the new self destination key.
    const legacyBytes = JSON.stringify([{ athleteKey: KEY_A, name: '남아야 하는 이름' }])
    const local = new TestStorage({ [LEGACY_STORAGE_KEYS.v2]: legacyBytes })
    local.failWritesFor.add(STORAGE_KEYS.selfClaimDraft)
    const store = createRecordWorkspaceStorage({ local, session: new TestStorage() })

    // When explicit migration tries to write the new self destination.
    const result = migrateLegacyMyAthlete({ choice: 'self', local, store })

    // Then migration stops and the legacy byte string remains recoverable.
    expect(result).toEqual({ ok: false, reason: 'storage_unavailable' })
    expect(local.getItem(LEGACY_STORAGE_KEYS.v2)).toBe(legacyBytes)
    expect(local.getItem(STORAGE_KEYS.migration)).toBeNull()
  })

  it('preserves legacy bytes when the completion marker cannot persist', () => {
    // Given destination writes work but the migration marker is blocked.
    const legacyBytes = JSON.stringify([{ athleteKey: KEY_A, team: '삭제되면 안 됨' }])
    const local = new TestStorage({ [LEGACY_STORAGE_KEYS.v2]: legacyBytes })
    local.failWritesFor.add(STORAGE_KEYS.migration)
    const store = createRecordWorkspaceStorage({ local, session: new TestStorage() })

    // When explicit migration reaches the completion marker step.
    const result = migrateLegacyMyAthlete({ choice: 'workspace', local, store })

    // Then cleanup does not run and the legacy source remains.
    expect(result).toEqual({ ok: false, reason: 'storage_unavailable' })
    expect(local.getItem(LEGACY_STORAGE_KEYS.v2)).toBe(legacyBytes)
  })

  it('keeps both legacy values when cleanup is blocked', () => {
    // Given both destination writes succeed but legacy removal is unavailable.
    const v1 = JSON.stringify({ athleteKey: KEY_A })
    const v2 = JSON.stringify([{ athleteKey: KEY_B }])
    const local = new TestStorage({
      [LEGACY_STORAGE_KEYS.v1]: v1,
      [LEGACY_STORAGE_KEYS.v2]: v2,
    })
    local.failRemovals = true
    const store = createRecordWorkspaceStorage({ local, session: new TestStorage() })

    // When the user explicitly chooses a general record workspace.
    const result = migrateLegacyMyAthlete({ choice: 'workspace', local, store })

    // Then cleanup fails closed without losing either recoverable source value.
    expect(result).toEqual({ ok: false, reason: 'storage_unavailable' })
    expect(local.getItem(LEGACY_STORAGE_KEYS.v1)).toBe(v1)
    expect(local.getItem(LEGACY_STORAGE_KEYS.v2)).toBe(v2)
  })
})
