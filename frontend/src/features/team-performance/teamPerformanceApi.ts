import { apiClient } from '../../api/client'
import {
  parseTeamDetailResponse,
  parseTeamSearchResponse,
} from './teamPerformanceContracts'
import type {
  TeamCategory,
  TeamDetailPeriod,
  TeamKey,
  TeamPerformanceDetail,
  TeamSearchSummary,
} from './teamPerformanceContracts'

const BASE = '/api/card-studio/analytics/teams'

export type TeamSearchInput = {
  readonly query: string
  readonly category: TeamCategory | null
  readonly limit?: 5 | 10 | 20 | 30
}

export type TeamDetailInput = {
  readonly teamKey: TeamKey
  readonly category: TeamCategory | null
  readonly period: TeamDetailPeriod
}

export async function searchTeamPerformance(input: TeamSearchInput): Promise<readonly TeamSearchSummary[]> {
  const response = await apiClient.get<unknown>(`${BASE}/search`, {
    params: {
      q: input.query,
      limit: input.limit ?? 20,
      ...(input.category ? { category: input.category } : {}),
    },
  })
  return parseTeamSearchResponse(response.data)
}

export async function getTeamPerformance(input: TeamDetailInput): Promise<TeamPerformanceDetail> {
  const response = await apiClient.get<unknown>(`${BASE}/${encodeURIComponent(input.teamKey)}`, {
    params: detailParams(input.category, input.period),
  })
  return parseTeamDetailResponse(response.data)
}

function detailParams(category: TeamCategory | null, period: TeamDetailPeriod) {
  const categoryParam = category ? { category } : {}
  switch (period.kind) {
    case 'latest':
      return { ...categoryParam, scope: 'latest' }
    case 'all':
      return { ...categoryParam, scope: 'all' }
    case 'season':
      return { ...categoryParam, season: period.season }
  }
}
