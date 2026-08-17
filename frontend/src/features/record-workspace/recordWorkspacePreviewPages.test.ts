import { describe, expect, it } from 'vitest'
import { reconcileRecordWorkspaceSubjectKeys } from './recordWorkspacePreviewPages'

describe('record workspace preview subject reconciliation', () => {
  it('canonicalizes successful legacy aliases, dedupes them, and preserves unresolved keys', () => {
    // Given two successful legacy aliases for one athlete and one ambiguous alias.
    const canonicalKey = 'aaaaaaaaaaaaaaaa'
    const ambiguousKey = 'at_ambiguous_runner'

    // When the successful preview mappings reconcile the stored request order.
    const reconciled = reconcileRecordWorkspaceSubjectKeys(
      ['at_legacy_one', 'at_legacy_two', canonicalKey, ambiguousKey],
      [
        { requestedSubjectKey: 'at_legacy_one', athleteKey: canonicalKey },
        { requestedSubjectKey: 'at_legacy_two', athleteKey: canonicalKey },
        { requestedSubjectKey: canonicalKey, athleteKey: canonicalKey },
      ],
    )

    // Then only successful mappings change; ambiguity is not auto-selected.
    expect(reconciled).toEqual([canonicalKey, ambiguousKey])
  })
})
