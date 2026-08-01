import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  previewRecordWorkspace,
} from '@/api/recordWorkspace'
import { RECORD_API_PAGE_SIZE } from './groupRecords'
import { mergeRecordWorkspacePreviewPages } from './recordWorkspacePreviewPages'

export { mergeRecordWorkspacePreviewPages as mergeRecordAthletePreviewPages }

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
    () => mergeRecordWorkspacePreviewPages(query.data?.pages ?? []),
    [query.data?.pages],
  )

  return { ...query, preview }
}
