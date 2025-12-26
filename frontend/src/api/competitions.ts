/**
 * 대회 및 경기결과 API
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface Competition {
  id: number;
  name: string;
  type: '국내경기' | '국제경기';
  category: '대한육상연맹사업' | '트랙 및 필드' | '로드레이스' | '단일종목경기';
  start_date: string;
  end_date: string;
  year: number;
  month: number;
  location: string;
  description?: string;
  results_count?: number;
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
  competition_id: number;
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
// 대회 API
// ============================================

export async function getCompetitions(params?: {
  type?: string;
  year?: number;
  category?: string;
}): Promise<CompetitionsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.type) queryParams.append('type', params.type);
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.category) queryParams.append('category', params.category);
  
  const url = `/api/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<CompetitionsResponse>(url);
  return response.data;
}

export async function getCompetition(id: number): Promise<Competition> {
  const response = await apiClient.get<{ success: boolean; competition: Competition }>(
    `/api/competitions/${id}`
  );
  return response.data.competition;
}

export async function createCompetition(data: Omit<Competition, 'id' | 'year' | 'month' | 'results_count' | 'created_at' | 'updated_at'>): Promise<Competition> {
  const response = await apiClient.post<{ success: boolean; competition: Competition }>(
    '/api/competitions',
    data
  );
  return response.data.competition;
}

export async function updateCompetition(id: number, data: Partial<Competition>): Promise<Competition> {
  const response = await apiClient.put<{ success: boolean; competition: Competition }>(
    `/api/competitions/${id}`,
    data
  );
  return response.data.competition;
}

export async function deleteCompetition(id: number): Promise<void> {
  await apiClient.delete(`/api/competitions/${id}`);
}

// ============================================
// 경기 결과 API
// ============================================

export async function getMatchResults(competitionId: number, params?: {
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
  competition_id: number;
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
