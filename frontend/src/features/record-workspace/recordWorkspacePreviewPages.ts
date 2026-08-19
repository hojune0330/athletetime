import type {
  RecordWorkspacePreview,
  RecordWorkspaceRecord,
  RecordWorkspaceResolvedSubjectKey,
} from '@/api/recordWorkspace'

export function reconcileRecordWorkspaceSubjectKeys(
  subjectKeys: readonly string[],
  resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[],
): readonly string[] {
  const canonicalKeysByRequestedKey = new Map<string, string[]>()
  for (const { athleteKey, requestedSubjectKey } of resolvedSubjectKeys) {
    const canonicalKeys = canonicalKeysByRequestedKey.get(requestedSubjectKey) ?? []
    canonicalKeysByRequestedKey.set(requestedSubjectKey, [...canonicalKeys, athleteKey])
  }
  const reconciled = [...new Set(subjectKeys.flatMap(
    (subjectKey) => canonicalKeysByRequestedKey.get(subjectKey) ?? [subjectKey],
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
  const resolvedSubjectKeyByPair = new Map(
    first.resolvedSubjectKeys.map((resolution) => [
      JSON.stringify([resolution.requestedSubjectKey, resolution.athleteKey]),
      resolution,
    ]),
  )
  for (const page of pages.slice(1)) {
    for (const record of page.records) {
      if (!recordById.has(record.id)) recordById.set(record.id, record)
    }
    for (const resolution of page.resolvedSubjectKeys) {
      const pair = JSON.stringify([resolution.requestedSubjectKey, resolution.athleteKey])
      if (!resolvedSubjectKeyByPair.has(pair)) {
        resolvedSubjectKeyByPair.set(pair, resolution)
      }
    }
  }
  const records = [...recordById.values()]

  return {
    ...first,
    resolvedSubjectKeys: [...resolvedSubjectKeyByPair.values()],
    coverage: {
      ...first.coverage,
      returned: records.length,
      hasMore: last.coverage.hasMore,
      nextCursor: last.coverage.nextCursor,
    },
    records,
  }
}

export function recordMatchesId(record: RecordWorkspaceRecord, recordId: string | null): boolean {
  return recordId !== null && (record.id === recordId || record.recordIdAliases.includes(recordId))
}
