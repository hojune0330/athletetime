import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  previewRecordWorkspace,
  type RecordWorkspacePreview,
} from '@/api/recordWorkspace'
import { RECORD_API_PAGE_SIZE } from './groupRecords'

export function mergeRecordAthletePreviewPages(
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

export function useRecordAthletePreview(athleteKey: string | null) {
  const query = useInfiniteQuery({
    queryKey: ['record-athlete-preview', athleteKey],
    queryFn: ({ pageParam }) => previewRecordWorkspace({
      subjectKeys: athleteKey ? [athleteKey] : [],
      cursor: pageParam || undefined,
      limit: RECORD_API_PAGE_SIZE,
    }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.coverage.nextCursor ?? undefined,
    enabled: athleteKey !== null,
  })
  const preview = useMemo(
    () => mergeRecordAthletePreviewPages(query.data?.pages ?? []),
    [query.data?.pages],
  )

  return { ...query, preview }
}
