import type {
  RecordWorkspacePreview,
  RecordWorkspaceResolvedSubjectKey,
} from '@/api/recordWorkspace'

export function reconcileRecordWorkspaceSubjectKeys(
  subjectKeys: readonly string[],
  resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[],
): readonly string[] {
  const canonicalKeyByRequestedKey = new Map(
    resolvedSubjectKeys.map(({ athleteKey, requestedSubjectKey }) => [requestedSubjectKey, athleteKey]),
  )
  const reconciled = [...new Set(subjectKeys.map(
    (subjectKey) => canonicalKeyByRequestedKey.get(subjectKey) ?? subjectKey,
  ))]
  return reconciled.length === subjectKeys.length
    && reconciled.every((subjectKey, index) => subjectKey === subjectKeys[index])
    ? subjectKeys
    : reconciled
}

export function mergeRecordWorkspacePreviewPages(
  pages: readonly RecordWorkspacePreview[],
): RecordWorkspacePreview | null {
  const first = pages[0]
  const last = pages.at(-1)
  if (!first || !last) return null

  const recordById = new Map(first.records.map((record) => [record.id, record]))
  const resolvedSubjectKeyByRequestedKey = new Map(
    first.resolvedSubjectKeys.map((resolution) => [resolution.requestedSubjectKey, resolution]),
  )
  for (const page of pages.slice(1)) {
    for (const record of page.records) {
      if (!recordById.has(record.id)) recordById.set(record.id, record)
    }
    for (const resolution of page.resolvedSubjectKeys) {
      if (!resolvedSubjectKeyByRequestedKey.has(resolution.requestedSubjectKey)) {
        resolvedSubjectKeyByRequestedKey.set(resolution.requestedSubjectKey, resolution)
      }
    }
  }
  const records = [...recordById.values()]

  return {
    ...first,
    resolvedSubjectKeys: [...resolvedSubjectKeyByRequestedKey.values()],
    coverage: {
      ...first.coverage,
      returned: records.length,
      hasMore: last.coverage.hasMore,
      nextCursor: last.coverage.nextCursor,
    },
    records,
  }
}
