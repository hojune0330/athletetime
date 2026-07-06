import { apiClient } from './client';

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

export type AnalyticsFilterOption = {
  key: string;
  label: string;
};

export type AnalyticsFilters = {
  seasons: number[];
  events: AnalyticsFilterOption[];
  divisions: AnalyticsFilterOption[];
};

export type AthleteSearchCard = {
  athleteKey: string;
  name: string;
  team: string;
  teams: string[];
  years: number[];
  events: string[];
  divisions: string[];
  recordCount: number;
  ambiguity: string;
  note: string;
};

export type PublicRecord = {
  id: string;
  athleteKey: string;
  name: string;
  team: string;
  season: number;
  competitionName: string;
  date: string;
  venue: string;
  eventKey: string;
  eventLabel: string;
  divisionKey: string;
  divisionLabel: string;
  phase: string;
  record: string;
  recordValue: number;
  direction: 'lower' | 'higher';
  rank: number | null;
  wind: string | null;
  windLegal: boolean;
  isComparable: boolean;
  note: string;
  source: {
    provider: string;
    sourceType: string;
    sourceId: string;
    sourceUrl: string;
    capturedAt: string;
  };
};

export type RecordDelta = {
  from: PublicRecord;
  to: PublicRecord;
  rawDelta: number;
  display: string;
  improved: boolean;
} | null;

export type RecordTrailPoint = {
  id: string;
  date: string;
  season: number;
  value: number;
  record: string;
  eventLabel: string;
  competitionName: string;
  isComparable: boolean;
};

export type AthleteAnalyticsProfile = {
  athlete: AthleteSearchCard;
  summary: {
    indexedBest: PublicRecord | null;
    seasonBest: PublicRecord | null;
    latest: PublicRecord | null;
    delta: RecordDelta;
    indexedResultCount: number;
    comparableResultCount: number;
    sourceScope: string;
    disclaimer: string;
  };
  events: Array<{
    eventKey: string;
    eventLabel: string;
    recordCount: number;
    best: PublicRecord | null;
  }>;
  recordTrail: RecordTrailPoint[];
  records: PublicRecord[];
};

export type SeasonRecordRow = {
  rank: number;
  athleteKey: string;
  name: string;
  team: string;
  record: string;
  recordValue: number;
  date: string;
  competitionName: string;
  wind: string | null;
  windLegal: boolean;
  highlighted: boolean;
};

export type SeasonRecordTable = {
  season: number;
  eventKey: string;
  divisionKey: string;
  eventLabel: string;
  divisionLabel: string;
  totalIndexedAthletes: number;
  rows: SeasonRecordRow[];
  filters: AnalyticsFilters;
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
  const { data } = await apiClient.get<ApiItemResponse<AnalyticsFilters>>(`${BASE}/filters`);
  return data.data;
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

export async function searchRecordAthletes(query: string, limit = 12): Promise<AthleteSearchCard[]> {
  const { data } = await apiClient.get<ApiListResponse<AthleteSearchCard>>(`${BASE}/records/search`, {
    params: { q: query, limit },
  });
  return data.data;
}

export async function getAthleteAnalytics(athleteKey: string): Promise<AthleteAnalyticsProfile> {
  const { data } = await apiClient.get<ApiItemResponse<AthleteAnalyticsProfile>>(
    `${BASE}/athletes/${encodeURIComponent(athleteKey)}`,
  );
  return data.data;
}

export async function getSeasonRecordTable(params: {
  season?: number;
  eventKey?: string;
  divisionKey?: string;
  athleteKey?: string;
  limit?: number;
}): Promise<SeasonRecordTable> {
  const { data } = await apiClient.get<ApiItemResponse<SeasonRecordTable>>(`${BASE}/season-records`, {
    params,
  });
  return data.data;
}
