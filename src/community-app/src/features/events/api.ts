import { apiRequest } from '../../lib/api/client'
import type { CompetitionTimetable, ListResponse } from '../../lib/types'

export type FetchCompetitionTimetablesParams = {
  includePast?: boolean
  limit?: number
}

function createEmptyListResponse(): ListResponse<CompetitionTimetable> {
  return {
    data: [],
    meta: {
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 1,
    },
  }
}

export async function fetchCompetitionTimetables(
  params: FetchCompetitionTimetablesParams = {},
): Promise<ListResponse<CompetitionTimetable>> {
  const searchParams = new URLSearchParams()

  if (params.includePast) {
    searchParams.set('includePast', 'true')
  }

  if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    searchParams.set('limit', String(params.limit))
  }

  const query = searchParams.toString()
  const path = query.length > 0 ? `/events/timetables?${query}` : '/events/timetables'

  try {
    const response = await apiRequest<ListResponse<CompetitionTimetable>>(path)
    if (!response || !Array.isArray(response.data)) {
      return createEmptyListResponse()
    }

    return response
  } catch (error) {
    console.warn('경기 시간표 데이터를 불러오지 못했습니다:', error)
    return createEmptyListResponse()
  }
}
