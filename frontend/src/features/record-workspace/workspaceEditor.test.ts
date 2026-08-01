import { describe, expect, it } from 'vitest'
import type { PublicRecord } from '@/api/recordAnalytics'
import { RecordWorkspaceSchema } from './model'
import {
  createWorkspaceEditorState,
  hideSelectedWorkspaceRecords,
  removeWorkspaceSubject,
  restoreAllWorkspaceRecords,
  toggleWorkspaceRecordSelection,
  undoWorkspaceEdit,
  visibleWorkspaceRecords,
} from './useRecordWorkspaceEditor'

const KEY_A = '1111111111111111'
const KEY_B = '2222222222222222'

const workspace = RecordWorkspaceSchema.parse({
  id: '10000000-0000-4000-8000-000000000001',
  title: '기록 모음',
  subjectKeys: [KEY_A, KEY_B],
  excludedRecordIds: [],
  filter: {},
  createdAt: '2026-07-31T01:00:00.000Z',
  updatedAt: '2026-07-31T01:00:00.000Z',
})

function record(id: string): PublicRecord {
  return {
    id,
    athleteKey: KEY_A,
    name: '김선수',
    team: '서울중',
    season: 2026,
    competitionName: '테스트 대회',
    date: '2026-04-10',
    venue: '테스트 경기장',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-middle',
    divisionLabel: '남자 중등부',
    gender: 'men',
    divisionLevel: 'middle',
    divisionDetail: null,
    rawDivision: '남자 중등부',
    phase: 'final',
    record: '11.20',
    recordValue: 11.2,
    direction: 'lower',
    rank: 1,
    wind: '+0.4',
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'fixture',
      sourceType: 'qa_fixture',
      sourceId: `source-${id}`,
      sourceUrl: '',
      capturedAt: '2026-07-31T01:00:00.000Z',
    },
  }
}

describe('record workspace editor state', () => {
  it('hides selected records locally and keeps undo until the next destructive action', () => {
    // Given two selected records in edit mode.
    const initial = createWorkspaceEditorState(workspace)
    const selectedOnce = toggleWorkspaceRecordSelection(initial, 'record-1')
    const selectedTwice = toggleWorkspaceRecordSelection(selectedOnce, 'record-2')

    // When the selected records are hidden.
    const hidden = hideSelectedWorkspaceRecords(selectedTwice)

    // Then both are excluded, selection closes, and an undo snapshot remains.
    expect(hidden.excludedRecordIds).toEqual(['record-1', 'record-2'])
    expect(hidden.selectedRecordIds).toEqual([])
    expect(hidden.selectionMode).toBe(false)
    expect(hidden.undo).not.toBeNull()
    expect(hidden.announcement).toContain('2개 숨김')
  })

  it('undoes the latest destructive action and returns focus to a restored record', () => {
    // Given a hidden record followed by a subject removal.
    const hidden = hideSelectedWorkspaceRecords(
      toggleWorkspaceRecordSelection(createWorkspaceEditorState(workspace), 'record-1'),
    )
    const removedSubject = removeWorkspaceSubject(hidden, KEY_B)

    // When undo is requested once.
    const undone = undoWorkspaceEdit(removedSubject)

    // Then only the subject removal is undone while the earlier hidden record remains.
    expect(undone.subjectKeys).toEqual([KEY_A, KEY_B])
    expect(undone.excludedRecordIds).toEqual(['record-1'])
    expect(undone.focusRecordId).toBeNull()
    expect(undone.undo).toBeNull()
  })

  it('restores an all-hidden empty state without mutating the source records', () => {
    // Given every loaded record excluded from this workspace.
    const records = [record('record-1'), record('record-2')]
    const hiddenState = hideSelectedWorkspaceRecords(
      toggleWorkspaceRecordSelection(
        toggleWorkspaceRecordSelection(createWorkspaceEditorState(workspace), 'record-1'),
        'record-2',
      ),
    )

    // When visibility is calculated and all exclusions are reset.
    const hiddenRecords = visibleWorkspaceRecords(records, hiddenState.excludedRecordIds)
    const restored = restoreAllWorkspaceRecords(hiddenState)

    // Then the empty state is recoverable and the original array remains complete.
    expect(hiddenRecords).toEqual([])
    expect(restored.excludedRecordIds).toEqual([])
    expect(restored.undo).not.toBeNull()
    expect(records).toHaveLength(2)
  })
})
