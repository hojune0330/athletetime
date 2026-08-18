import { describe, expect, it } from 'vitest'
import { reconcileRecordWorkspaceSubjectKeys } from './recordWorkspacePreviewPages'

describe('record workspace preview subject reconciliation', () => {
  it('expands one ambiguous legacy key to every canonical candidate', () => {
    const reconciled = reconcileRecordWorkspaceSubjectKeys(
      ['at_ambiguous_runner'],
      [
        { requestedSubjectKey: 'at_ambiguous_runner', athleteKey: '1111111111111111' },
        { requestedSubjectKey: 'at_ambiguous_runner', athleteKey: '2222222222222222' },
      ],
    )

    expect(reconciled).toEqual(['1111111111111111', '2222222222222222'])
  })

  it('canonicalizes successful legacy aliases, dedupes them, and preserves unresolved keys', () => {
    // Given two successful legacy aliases for one athlete and one unresolved alias.
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

    // Then only successful mappings change; the unavailable alias stays available for recovery.
    expect(reconciled).toEqual([canonicalKey, ambiguousKey])
  })
})
