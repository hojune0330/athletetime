import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { previewRecordWorkspace } from '@/api/recordWorkspace'
import { RECORD_API_PAGE_SIZE } from './groupRecords'
import { mergeRecordWorkspacePreviewPages } from './recordWorkspacePreviewPages'

export function useRecordWorkspacePreview(subjectKeys: readonly string[]) {
  const stableKeys = useMemo(() => [...new Set(subjectKeys)], [subjectKeys])
  const query = useInfiniteQuery({
    queryKey: ['record-workspace-preview', stableKeys],
    queryFn: ({ pageParam }) => previewRecordWorkspace({
      subjectKeys: stableKeys,
      cursor: pageParam || undefined,
      limit: RECORD_API_PAGE_SIZE,
    }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.coverage.nextCursor ?? undefined,
    enabled: stableKeys.length > 0,
  })
  const preview = useMemo(
    () => mergeRecordWorkspacePreviewPages(query.data?.pages ?? []),
    [query.data?.pages],
  )

  return { ...query, preview }
}
