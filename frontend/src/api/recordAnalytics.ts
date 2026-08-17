import { apiClient } from './client';
import {
  analyticsFiltersSchema,
  athleteAnalyticsResultSchema,
  athleteSearchCardsSchema,
  parseAnalyticsResponse,
  parseSeasonAvailabilityResponse,
  seasonRecordTableSchema,
} from './recordAnalyticsSchemas';
import type {
  AnalyticsFilters,
  AthleteAnalyticsResult,
  AthleteSearchCard,
  SeasonAvailability,
  SeasonRecordTable,
} from './recordAnalyticsSchemas';

export { AnalyticsApiBoundaryError } from './recordAnalyticsSchemas';
export type {
  AnalyticsFilterOption,
  AnalyticsFilters,
  AthleteAnalyticsProfile,
  AthleteAnalyticsResult,
  AthleteSearchCard,
  DefaultSeasonSelection,
  DivisionFilterOption,
  PublicRecord,
  RecordDelta,
  RecordTrailPoint,
  SeasonAvailability,
  SeasonRecordRow,
  SeasonRecordTable,
} from './recordAnalyticsSchemas';

const BASE = '/api/card-studio/analytics';

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  total?: number;
};

type ApiItemResponse<T> = {
  success: boolean;
  data: T;
};

export type TeamSeasonStatistic = {
  season: number;
  athleteCount: number;
  resultCount: number;
  competitionCount: number;
  topThreeCount: number;
};

export type TeamEventStatistic = {
  eventKey: string;
  eventLabel: string;
  athleteCount: number;
  resultCount: number;
};

export type TeamStatistics = {
  teamKey: string;
  teamLabel: string;
  athleteCount: number;
  resultCount: number;
  competitionCount: number;
  eventCount: number;
  firstSeason: number | null;
  latestSeason: number | null;
  latestDate: string | null;
  rankCounts: { first: number; second: number; third: number; topThree: number };
  seasonStats: TeamSeasonStatistic[];
  eventStats: TeamEventStatistic[];
  disclaimer: string;
};

export type PopularEvent = {
  key: string;
  label: string;
  recordCount: number;
  athleteCount: number;
};

export type PopularEvents = {
  season: number;
  events: PopularEvent[];
  note: string;
};

export async function getAnalyticsFilters(): Promise<AnalyticsFilters> {
  const { data } = await apiClient.get<unknown>(`${BASE}/filters`);
  return parseAnalyticsResponse(data, analyticsFiltersSchema, '/filters');
}

export async function getSeasonAvailability(): Promise<SeasonAvailability> {
  const { data } = await apiClient.get<unknown>(`${BASE}/season-availability`);
  return parseSeasonAvailabilityResponse(data);
}

export async function getPopularEvents(params: { season?: number; limit?: number } = {}): Promise<PopularEvents> {
  const { data } = await apiClient.get<ApiItemResponse<PopularEvents>>(`${BASE}/popular-events`, {
    params,
  });
  return data.data;
}

export type EventConcentration = {
  eventKey: string;
  eventLabel: string;
  recordCount: number;
};

export type RegionActivity = {
  regionCode: string;
  regionLabel: string;
  recordCount: number;
  eventCount: number;
};

export type SeasonPulseBucket = {
  weekStart: string;
  weekEnd: string;
  recordCount: number;
};

export type SeasonPulse = {
  windowDays: number;
  from?: string;
  to?: string;
  buckets: SeasonPulseBucket[];
};

export type AnonymousInsights = {
  generatedAt: string;
  scope: string;
  privacy: {
    includesNames: boolean;
    includesTeams: boolean;
    includesAthleteKeys: boolean;
    minGroupSize: number;
  };
  season: number;
  eventConcentration: EventConcentration[];
  regionActivity: RegionActivity[];
  seasonPulse: SeasonPulse;
};

export async function getAnonymousInsights(
  params: { season?: number; limit?: number; minGroupSize?: number; windowDays?: number } = {},
): Promise<AnonymousInsights> {
  const { data } = await apiClient.get<ApiItemResponse<AnonymousInsights>>(`${BASE}/insights`, {
    params,
  });
  return data.data;
}

export type ShadowClusterSegment = {
  athleteKey: string;
  teamLabel: string;
  teamStage: string;
  years: number[];
  fromYear: number | null;
  toYear: number | null;
  recordCount: number;
  eventCount: number;
};

export type ShadowCluster = {
  clusterId: string;
  status: string;
  confidence: number;
  confidenceBand: 'low' | 'medium';
  reasonCodes: string[];
  athleteKeys: string[];
  segments: ShadowClusterSegment[];
  disclaimer: string;
};

export type ShadowClusterResponse = {
  generatedAt: string;
  scope: string;
  policy: {
    noAutoMerge: boolean;
    estimateOnly: boolean;
    personNoUsed: boolean;
    personNoStored: boolean;
    bulkPersonNoCleanupAllowed: boolean;
    sourcePolicy: string;
  };
  summary: {
    totalNames: number;
    multiTeamNames: number;
    homonymNames: number;
    shadowClusterNames: number;
    shadowClusterAthleteKeys: number;
    policy: string;
  };
  cluster: ShadowCluster | null;
};

// 추정 전용(estimate-only). 확정 병합 아님 · person_no 미사용/미저장.
// 특정 선수 화면에서만 "같은 선수로 추정되는 기록" 제안에 사용.
export async function getShadowCluster(athleteKey: string): Promise<ShadowClusterResponse> {
  const { data } = await apiClient.get<ApiItemResponse<ShadowClusterResponse>>(
    `${BASE}/identity/shadow-cluster`,
    { params: { athleteKey } },
  );
  return data.data;
}

export type SearchAthletesOptions = {
  readonly limit?: number;
  readonly divisionKey?: string;
};

export async function searchAthletes(
  query: string,
  options: SearchAthletesOptions = {},
): Promise<AthleteSearchCard[]> {
  const params: { q: string; limit: number; divisionKey?: string } = {
    q: query,
    limit: options.limit ?? 12,
  };
  if (options.divisionKey !== undefined) params.divisionKey = options.divisionKey;
  const { data } = await apiClient.get<unknown>(`${BASE}/records/search`, { params });
  return parseAnalyticsResponse(data, athleteSearchCardsSchema, '/records/search');
}

export async function searchRecordAthletes(query: string, limit = 12): Promise<AthleteSearchCard[]> {
  return searchAthletes(query, { limit });
}

export async function searchTeamStatistics(query: string, limit = 20): Promise<TeamStatistics[]> {
  const { data } = await apiClient.get<ApiListResponse<TeamStatistics>>(`${BASE}/teams/search`, {
    params: { q: query, limit },
  });
  return data.data;
}

export async function getAthleteAnalytics(athleteKey: string): Promise<AthleteAnalyticsResult> {
  const { data } = await apiClient.get<unknown>(
    `${BASE}/athletes/${encodeURIComponent(athleteKey)}`,
  );
  return parseAnalyticsResponse(data, athleteAnalyticsResultSchema, '/athletes/:athleteKey');
}

export async function getSeasonRecordTable(params: {
  season?: number;
  eventKey?: string;
  divisionKey?: string;
  athleteKey?: string;
  limit?: number;
}): Promise<SeasonRecordTable> {
  const { data } = await apiClient.get<unknown>(`${BASE}/season-records`, {
    params,
  });
  return parseAnalyticsResponse(data, seasonRecordTableSchema, '/season-records');
}
