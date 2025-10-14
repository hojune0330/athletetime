import { useQuery } from '@tanstack/react-query'
import { fetchCompetitionTimetables } from './api'

export function useCompetitionTimetables(params?: { includePast?: boolean; limit?: number }) {
  const includePast = params?.includePast ?? true
  const limit = params?.limit

  return useQuery({
    queryKey: ['competition-timetables', includePast, limit ?? null],
    queryFn: () =>
      fetchCompetitionTimetables(
        typeof limit === 'number'
          ? { includePast, limit }
          : { includePast },
      ),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}
