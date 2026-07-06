/**
 * 대회 및 경기결과 API
 * 
 * Card Studio와 PaceRise 데이터를 통합합니다.
 * /api/card-studio/competitions 엔드포인트 연동
 */

import { apiClient } from './client';

// ============================================
// Types - Card Studio 데이터 구조
// ============================================

/** Card Studio 원본 대회 데이터 구조 */
export interface CardStudioCompetition {
  id: string;               // e.g., "2026-track-field-001"
  kaafSeq: number;
  name: string;
  period: {
    start: string;           // "2026-04-02"
    end: string;             // "2026-04-03"
  };
  venue: string;
  section: string;           // "트랙 및 필드"
  category: string;          // "track_field"
  kaafUrl: string;
  source: string;
  // 아래는 서버에서 실시간 계산되는 필드
  shortName?: string;
  status?: 'live' | 'upcoming' | 'finished';
  dday?: {
    text: string;
    sub: string;
    isLive: boolean;
  };
  periodLabel?: string;
  categoryColor?: string;
  categoryLabel?: string;
}

/** 프론트엔드에서 사용하는 정규화된 대회 타입 */
export interface Competition {
  id: string;
  name: string;
  type: string;             // '국내경기' | '국제경기'
  category: string;         // card-studio category key: track_field, road, etc.
  categoryLabel: string;    // 한글 라벨: 트랙&필드, 도로경기 등
  categoryColor: string;
  start_date: string;
  end_date: string;
  year: number;
  month: number;
  location: string;
  description?: string;
  results_count?: number;
  status?: string;
  dday?: {
    text: string;
    sub: string;
    isLive: boolean;
  };
  periodLabel?: string;
  shortName?: string;
  kaafUrl?: string;
  kaafSeq?: number;
  created_at: string;
  updated_at: string;
}

export interface MatchResultItem {
  rank: number;
  athlete_name: string;
  team: string;
  record: string;
  note?: string;
}

export interface MatchResult {
  id: number;
  competition_id: number | string;
  event: string;
  division: string;
  round: string;
  results: MatchResultItem[];
  event_date?: string;
  notes?: string;
  athletes_count?: number;
  competition_name?: string;
  competition_start_date?: string;
  competition_end_date?: string;
  competition_location?: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitionsResponse {
  success: boolean;
  competitions: Competition[];
  grouped: Record<string, Competition[]>;
  filters: {
    type: string;
    year: number;
    category: string;
  };
}

export interface MatchResultsResponse {
  success: boolean;
  competition: Competition;
  results: MatchResult[];
  filters: {
    events: string[];
    divisions: string[];
    rounds: string[];
  };
}

// ============================================
// 카테고리 매핑
// ============================================

const CATEGORY_LABELS: Record<string, string> = {
  track_field: '트랙&필드',
  road: '도로경기',
  single_event: '단일종목',
  corporate: '실업연맹',
  university: '대학연맹',
  junior: '중고연맹'
};

const CATEGORY_COLORS: Record<string, string> = {
  track_field: '#c8ff00',
  road: '#4ecdc4',
  single_event: '#ff6b6b',
  corporate: '#a78bfa',
  university: '#60a5fa',
  junior: '#f59e0b'
};

// ============================================
// Card Studio 원본 데이터 → 프론트엔드 Competition 변환
// ============================================

function mapCardStudioToCompetition(comp: CardStudioCompetition): Competition {
  const startDate = comp.period?.start || '';
  const endDate = comp.period?.end || startDate;
  const year = startDate ? parseInt(startDate.split('-')[0]) : new Date().getFullYear();
  const month = startDate ? parseInt(startDate.split('-')[1]) : 1;

  return {
    id: comp.id,
    name: comp.name,
    type: '국내경기',  // 기본적으로 국내 데이터
    category: comp.category,
    categoryLabel: comp.categoryLabel || CATEGORY_LABELS[comp.category] || comp.section || comp.category,
    categoryColor: comp.categoryColor || CATEGORY_COLORS[comp.category] || '#888',
    start_date: startDate,
    end_date: endDate,
    year,
    month,
    location: comp.venue,
    status: comp.status,
    dday: comp.dday,
    periodLabel: comp.periodLabel,
    shortName: comp.shortName,
    kaafUrl: comp.kaafUrl,
    kaafSeq: comp.kaafSeq,
    created_at: '',
    updated_at: '',
  };
}

// ============================================
// 대회 API - Card Studio 연동
// ============================================

export async function getCompetitions(params?: {
  type?: string;
  year?: number;
  category?: string;
  status?: string;
  search?: string;
}): Promise<CompetitionsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.category) queryParams.append('category', params.category);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  
  const url = `/api/card-studio/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<{ success: boolean; year: number; total: number; data: CardStudioCompetition[] }>(url);
  
  const competitions = (response.data.data || []).map(mapCardStudioToCompetition);
  
  // 카테고리별 그룹핑
  const grouped: Record<string, Competition[]> = {};
  competitions.forEach(comp => {
    const key = comp.categoryLabel;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(comp);
  });
  
  return {
    success: true,
    competitions,
    grouped,
    filters: {
      type: params?.type || '',
      year: params?.year || new Date().getFullYear(),
      category: params?.category || '',
    },
  };
}

export async function getCompetition(id: string): Promise<Competition> {
  const response = await apiClient.get<{ success: boolean; data: CardStudioCompetition }>(
    `/api/card-studio/competitions/${id}`
  );
  return mapCardStudioToCompetition(response.data.data);
}

export async function getCompetitionsCurrent(year?: number): Promise<{
  live: Competition[];
  previous: Competition | null;
  next: Competition | null;
}> {
  const queryParams = year ? `?year=${year}` : '';
  const response = await apiClient.get<{ success: boolean; data: {
    live: CardStudioCompetition[];
    previous: CardStudioCompetition | null;
    next: CardStudioCompetition | null;
  } }>(`/api/card-studio/competitions/current${queryParams}`);
  
  const data = response.data.data;
  return {
    live: (data.live || []).map(mapCardStudioToCompetition),
    previous: data.previous ? mapCardStudioToCompetition(data.previous) : null,
    next: data.next ? mapCardStudioToCompetition(data.next) : null,
  };
}

export async function getCompetitionsCalendar(year?: number): Promise<{
  month: number;
  label: string;
  competitions: Competition[];
}[]> {
  const queryParams = year ? `?year=${year}` : '';
  const response = await apiClient.get<{ success: boolean; data: {
    month: number;
    label: string;
    competitions: CardStudioCompetition[];
  }[] }>(`/api/card-studio/competitions/calendar${queryParams}`);
  
  return (response.data.data || []).map(monthData => ({
    ...monthData,
    competitions: monthData.competitions.map(mapCardStudioToCompetition),
  }));
}

// 대회 등록/수정/삭제는 Card Studio 관리자가 원본 데이터에서 import하므로
// 프론트엔드에서 직접 생성하지 않음. 아래 함수들은 호환성을 위해 유지.
export async function createCompetition(_data: any): Promise<Competition> {
  throw new Error('대회 등록은 Card Studio 관리자 기능을 사용해주세요.');
}

export async function updateCompetition(_id: string, _data: Partial<Competition>): Promise<Competition> {
  throw new Error('대회 수정은 Card Studio 관리자 기능을 사용해주세요.');
}

export async function deleteCompetition(_id: string): Promise<void> {
  throw new Error('대회 삭제는 Card Studio 관리자 기능을 사용해주세요.');
}

// ============================================
// 경기 결과 API - Card Studio 결과 데이터
// ============================================

/** 결과 보유 대회 */
export interface ResultCompetition {
  filename: string;
  competition: string;
  year: string;
  period: string;
  venue: string;
  source?: 'kaaf' | 'pacerise';
  sourceLabel?: string;
  collectedAt?: string;
}

/** 대회 결과 종목 */
export interface ResultEvent {
  event: string;
  division: string | null;
  date: string;
  wind: string | null;
  hasWind: boolean;
  eventType: string; // 'track' | 'field' | 'hurdle' | etc
  tableType?: string;
  resultsStatus?: string;
  qualityHold?: boolean;
  qualityMessage?: string;
  heldResultCount?: number;
  results: ResultAthleteRecord[];
  totalAthletes: number;
}

/** 대회 볼거리 (규칙 기반 하이라이트) */
export interface CompetitionHighlight {
  type:
    | 'record'
    | 'series_best'
    | 'streak'
    | 'vs_last'
    | 'photo_finish'
    | 'champion'
    | 'sweep'
    | 'multi_winner'
    | 'crowd';
  title: string;
  stat?: string;
  detail: string;
  eventName: string;
}

/** 선수 기록 행 */
export interface ResultAthleteRecord {
  rank: number;
  name: string;
  affiliation: string;
  record: string;
  wind: string | null;
  note: string;
  newRecord: string;
  athleteId?: string;
  provenance?: ProvenanceMeta;
}

/** 대회 결과 메타 */
export interface ResultMeta {
  competition: string;
  year: string;
  period: string;
  venue: string;
  source?: 'kaaf' | 'pacerise';
  sourceLabel?: string;
  sourceUrl: string;
  collectedAt: string;
}

/** 검색 결과 섹션 */
export interface SearchSection {
  event: string;
  eventType: string;
  bestMatchRank: number;
  subSections: SearchSubSection[];
}

export interface SearchSubSection {
  label: string;
  gender: string;
  round: string;
  division: string;
  date: string;
  wind: string | null;
  hasWind: boolean;
  compName: string;
  provenance?: ProvenanceMeta;
  totalAthletes: number;
  results: SearchResultRow[];
  allResults: SearchResultRow[];
  hasMore: boolean;
}

export interface ProvenanceMeta {
  provider?: string;
  sourceType?: 'public_result' | 'live_result' | 'collected_public_record' | string;
  sourceId?: string;
  sourceUrl?: string;
  capturedAt?: string;
  sourceLabel?: string;
}

export interface SearchResultRow {
  rank?: number;
  name?: string;
  affiliation?: string;
  record?: string;
  wind?: string | null;
  note?: string;
  newRecord?: string;
  isMatch?: boolean;
  isSeparator?: boolean;
  skipped?: number;
  _index?: number;
  athleteId?: string;
  provenance?: ProvenanceMeta;
}

/** 결과 보유 대회 목록 조회 */
export async function getResultCompetitions(year?: string): Promise<{
  data: ResultCompetition[];
  years: string[];
  total: number;
}> {
  const params = year ? `?year=${year}` : '';
  const response = await apiClient.get<{
    success: boolean;
    data: ResultCompetition[];
    years: string[];
    total: number;
  }>(`/api/card-studio/results/competitions${params}`);
  return response.data;
}

/** 대회별 전 종목 결과 조회 */
export async function getResultEvents(filename: string, eventType?: string): Promise<{
  meta: ResultMeta;
  events: ResultEvent[];
  highlights?: CompetitionHighlight[];
  totalEvents: number;
  totalAthletes: number;
}> {
  const params = eventType ? `?eventType=${eventType}` : '';
  const response = await apiClient.get<{
    success: boolean;
    data: {
      meta: ResultMeta;
      events: ResultEvent[];
      highlights?: CompetitionHighlight[];
      totalEvents: number;
      totalAthletes: number;
    };
  }>(`/api/card-studio/results/${encodeURIComponent(filename)}/events${params}`);
  return response.data.data;
}

/** 선수/소속 통합 검색 */
export async function searchAthleteRecords(query: string, type: string = 'all'): Promise<{
  query: string;
  type: string;
  competitions: string[];
  totalMatches: number;
  totalEvents: number;
  sections: SearchSection[];
}> {
  const params = new URLSearchParams({ q: query, type });
  const response = await apiClient.get<{
    success: boolean;
    data: {
      query: string;
      type: string;
      competitions: string[];
      totalMatches: number;
      totalEvents: number;
      sections: SearchSection[];
    };
  }>(`/api/card-studio/search?${params.toString()}`);
  return response.data.data;
}

// ============================================
// 경기 결과 API (기존 유지 - 추후 연동)
// ============================================

export async function getMatchResults(competitionId: string | number, params?: {
  event?: string;
  division?: string;
  round?: string;
}): Promise<MatchResultsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.event) queryParams.append('event', params.event);
  if (params?.division) queryParams.append('division', params.division);
  if (params?.round) queryParams.append('round', params.round);
  
  const url = `/api/match-results/competition/${competitionId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<MatchResultsResponse>(url);
  return response.data;
}

export async function getMatchResult(id: number): Promise<MatchResult> {
  const response = await apiClient.get<{ success: boolean; matchResult: MatchResult }>(
    `/api/match-results/${id}`
  );
  return response.data.matchResult;
}

export async function createMatchResult(data: {
  competition_id: number | string;
  event: string;
  division: string;
  round: string;
  results: MatchResultItem[];
  event_date?: string;
  notes?: string;
}): Promise<MatchResult> {
  const response = await apiClient.post<{ success: boolean; matchResult: MatchResult }>(
    '/api/match-results',
    data
  );
  return response.data.matchResult;
}

export async function updateMatchResult(id: number, data: Partial<MatchResult>): Promise<MatchResult> {
  const response = await apiClient.put<{ success: boolean; matchResult: MatchResult }>(
    `/api/match-results/${id}`,
    data
  );
  return response.data.matchResult;
}

export async function deleteMatchResult(id: number): Promise<void> {
  await apiClient.delete(`/api/match-results/${id}`);
}
