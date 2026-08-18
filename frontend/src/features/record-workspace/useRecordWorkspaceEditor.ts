import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecordWorkspaceRecord, RecordWorkspaceResolvedSubjectKey } from '@/api/recordWorkspace'
import { reconcileRecordWorkspaceSubjectKeys } from './recordWorkspacePreviewPages'
import type { RecordWorkspace, WorkspaceUpdate } from './storage'

type WorkspaceUndo = {
  readonly focusRecordId: string | null
  readonly previousExcludedRecordIds: readonly string[]
  readonly previousSubjectKeys: readonly string[]
}

export type WorkspaceEditorState = {
  readonly announcement: string
  readonly excludedRecordIds: readonly string[]
  readonly focusRecordId: string | null
  readonly selectedRecordIds: readonly string[]
  readonly selectionMode: boolean
  readonly subjectKeys: readonly string[]
  readonly undo: WorkspaceUndo | null
}

export function createWorkspaceEditorState(workspace: RecordWorkspace): WorkspaceEditorState {
  return {
    announcement: '',
    excludedRecordIds: workspace.excludedRecordIds,
    focusRecordId: null,
    selectedRecordIds: [],
    selectionMode: false,
    subjectKeys: workspace.subjectKeys,
    undo: null,
  }
}

export function toggleWorkspaceRecordSelection(state: WorkspaceEditorState, recordId: string): WorkspaceEditorState {
  const selected = new Set(state.selectedRecordIds)
  if (selected.has(recordId)) selected.delete(recordId)
  else selected.add(recordId)
  return {
    ...state,
    announcement: '',
    focusRecordId: null,
    selectedRecordIds: [...selected],
    selectionMode: true,
  }
}

export function hideSelectedWorkspaceRecords(state: WorkspaceEditorState): WorkspaceEditorState {
  if (state.selectedRecordIds.length === 0) return state
  const selected = new Set(state.selectedRecordIds)
  return {
    ...state,
    announcement: `최근 변경: ${selected.size}개 숨김 · 되돌릴 수 있어요.`,
    excludedRecordIds: [...new Set([...state.excludedRecordIds, ...selected])],
    focusRecordId: null,
    selectedRecordIds: [],
    selectionMode: false,
    undo: {
      focusRecordId: state.selectedRecordIds[0] ?? null,
      previousExcludedRecordIds: state.excludedRecordIds,
      previousSubjectKeys: state.subjectKeys,
    },
  }
}

export function removeWorkspaceSubject(state: WorkspaceEditorState, subjectKey: string): WorkspaceEditorState {
  if (!state.subjectKeys.includes(subjectKey)) return state
  if (state.subjectKeys.length <= 1) {
    return { ...state, announcement: '마지막 선수 후보는 모음에서 뺄 수 없어요.' }
  }
  return {
    ...state,
    announcement: '최근 변경: 선수 후보 1명 제외 · 되돌릴 수 있어요.',
    focusRecordId: null,
    selectedRecordIds: [],
    selectionMode: false,
    subjectKeys: state.subjectKeys.filter((key) => key !== subjectKey),
    undo: {
      focusRecordId: null,
      previousExcludedRecordIds: state.excludedRecordIds,
      previousSubjectKeys: state.subjectKeys,
    },
  }
}

export function reconcileWorkspaceEditorSubjectKeys(
  state: WorkspaceEditorState,
  resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[],
): WorkspaceEditorState {
  const subjectKeys = reconcileRecordWorkspaceSubjectKeys(state.subjectKeys, resolvedSubjectKeys)
  const previousSubjectKeys = state.undo
    ? reconcileRecordWorkspaceSubjectKeys(state.undo.previousSubjectKeys, resolvedSubjectKeys)
    : null
  if (
    subjectKeys === state.subjectKeys
    && (!state.undo || previousSubjectKeys === state.undo.previousSubjectKeys)
  ) return state

  return {
    ...state,
    subjectKeys,
    undo: state.undo && previousSubjectKeys
      ? { ...state.undo, previousSubjectKeys }
      : state.undo,
  }
}

export function undoWorkspaceEdit(state: WorkspaceEditorState): WorkspaceEditorState {
  if (!state.undo) return state
  return {
    ...state,
    announcement: '직전 변경을 되돌렸어요.',
    excludedRecordIds: state.undo.previousExcludedRecordIds,
    focusRecordId: state.undo.focusRecordId,
    selectedRecordIds: [],
    selectionMode: false,
    subjectKeys: state.undo.previousSubjectKeys,
    undo: null,
  }
}

export function restoreAllWorkspaceRecords(state: WorkspaceEditorState): WorkspaceEditorState {
  if (state.excludedRecordIds.length === 0) return state
  return {
    ...state,
    announcement: '숨긴 기록을 다시 모두 보여드려요.',
    excludedRecordIds: [],
    focusRecordId: state.excludedRecordIds[0] ?? null,
    selectedRecordIds: [],
    selectionMode: false,
    undo: {
      focusRecordId: null,
      previousExcludedRecordIds: state.excludedRecordIds,
      previousSubjectKeys: state.subjectKeys,
    },
  }
}

export function visibleWorkspaceRecords(
  records: readonly RecordWorkspaceRecord[],
  excludedRecordIds: readonly string[],
): readonly RecordWorkspaceRecord[] {
  const excluded = new Set(excludedRecordIds)
  return records.filter((record) => (
    !excluded.has(record.id)
    && !record.recordIdAliases.some((recordId) => excluded.has(recordId))
  ))
}

type UseRecordWorkspaceEditorOptions = {
  readonly onPersist: (changes: WorkspaceUpdate) => boolean
  readonly workspace: RecordWorkspace
}

export function useRecordWorkspaceEditor({ onPersist, workspace }: UseRecordWorkspaceEditorOptions) {
  const [state, setState] = useState(() => createWorkspaceEditorState(workspace))
  const latestWorkspaceRef = useRef(workspace)
  latestWorkspaceRef.current = workspace

  useEffect(() => {
    setState(createWorkspaceEditorState(latestWorkspaceRef.current))
  }, [workspace.id])

  const persist = useCallback((next: WorkspaceEditorState) => {
    if (onPersist({
      excludedRecordIds: next.excludedRecordIds,
      subjectKeys: next.subjectKeys,
    })) {
      setState(next)
      return true
    }
    setState((current) => ({ ...current, announcement: '변경을 저장하지 못했어요.' }))
    return false
  }, [onPersist])

  const reconcileSubjectKeys = useCallback((
    resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[],
  ) => {
    const next = reconcileWorkspaceEditorSubjectKeys(state, resolvedSubjectKeys)
    return next === state || persist(next)
  }, [persist, state])

  return {
    state,
    cancelSelection: () => setState((current) => ({
      ...current,
      announcement: '',
      selectedRecordIds: [],
      selectionMode: false,
    })),
    clearFocusRecord: () => setState((current) => ({ ...current, focusRecordId: null })),
    hideSelected: () => persist(hideSelectedWorkspaceRecords(state)),
    reconcileSubjectKeys,
    removeSubject: (
      subjectKey: string,
      resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[] = [],
    ) => persist(removeWorkspaceSubject(
      reconcileWorkspaceEditorSubjectKeys(state, resolvedSubjectKeys),
      subjectKey,
    )),
    restoreAll: () => persist(restoreAllWorkspaceRecords(state)),
    startSelection: () => setState((current) => ({ ...current, selectionMode: true })),
    toggleRecord: (recordId: string) => setState((current) => toggleWorkspaceRecordSelection(current, recordId)),
    undo: () => persist(undoWorkspaceEdit(state)),
  }
}
