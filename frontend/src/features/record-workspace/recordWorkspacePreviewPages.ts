import type { RecordWorkspacePreview } from '@/api/recordWorkspace'

export function mergeRecordWorkspacePreviewPages(
  pages: readonly RecordWorkspacePreview[],
): RecordWorkspacePreview | null {
  const first = pages[0]
  const last = pages.at(-1)
  if (!first || !last) return null

  const recordById = new Map(first.records.map((record) => [record.id, record]))
  for (const page of pages.slice(1)) {
    for (const record of page.records) {
      if (!recordById.has(record.id)) recordById.set(record.id, record)
    }
  }
  const records = [...recordById.values()]

  return {
    ...first,
    coverage: {
      ...first.coverage,
      returned: records.length,
      hasMore: last.coverage.hasMore,
      nextCursor: last.coverage.nextCursor,
    },
    records,
  }
}
