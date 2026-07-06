/**
 * PaceRise API 클라이언트 (실업 대회 데이터 연동)
 * 
 * pace-rise-node.com 데이터를 AthleteTime 백엔드 프록시를 통해 조회합니다.
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface PrCompetition {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: string;
  status_label: string;
  federation: string;
  federation_label: string;
  video_url: string;
  created_at: string;
}

export interface PrEvent {
  id: number;
  name: string;
  category: string;
  category_label: string;
  gender: string;
  gender_label: string;
  round_type: string;
  round_label: string;
  round_status: string;
  status_label: string;
  heat_count: number;
  video_url: string;
  memo: string;
  sort_order: number;
}

export interface PrAthleteResult {
  rank: number;
  name: string;
  bib_number: string;
  team: string;
  record: string;
  record_raw: number | null;
  wind: string | null;
  remark: string;
  status_code: string;
  attempts?: Array<{
    attempt: number;
    distance: number | null;
    wind: number | null;
    isFoul: boolean;
  }>;
}

export interface PrEventResult {
  event_id: number;
  event_name: string;
  category: string;
  category_label: string;
  gender: string;
  round_type: string;
  round_label: string;
  round_status: string;
  status_label: string;
  heat_number: number;
  heat_name: string;
  wind: string | null;
  video_url: string;
  memo: string;
  results: PrAthleteResult[];
  athletes_count: number;
}

export interface PrScheduleEntry {
  event_id: number;
  event_name: string;
  category: string;
  category_label: string;
  gender: string;
  gender_label: string;
  round_type: string;
  round_label: string;
  round_status: string;
  status_label: string;
  scheduled_time: string | null;
  memo: string;
  division: string;
  heat_count: number;
  video_url: string;
  created_at: string;
}

export interface PrAthlete {
  id: number;
  name: string;
  bib_number: string | null;
  team: string;
  gender: string;
  gender_label: string;
  barcode: string;
  personal_best: string;
}

export interface PrLiveCompetition {
  competition: PrCompetition;
  progress: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    percentage: number;
  };
  current_events: Array<{
    id: number;
    name: string;
    gender: string;
    category: string;
    round_type: string;
  }>;
  recent_results: Array<{
    event_name: string;
    gender: string;
    gender_label: string;
    round_type: string;
    category: string;
    wind: string | null;
    top3: PrAthleteResult[];
  }>;
}

// ============================================
// API Functions
// ============================================

/** PaceRise 연결 상태 확인 */
export async function getPaceriseHealth(): Promise<{
  status: string;
  latency_ms: number;
  competitions_count: number;
}> {
  const res = await apiClient.get('/api/pacerise/health');
  return res.data;
}

/** 대회 목록 조회 */
export async function getPrCompetitions(params?: {
  status?: string;
  federation?: string;
}): Promise<{
  competitions: PrCompetition[];
  total: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.federation) queryParams.append('federation', params.federation);
  const url = `/api/pacerise/competitions${queryParams.toString() ? `?${queryParams}` : ''}`;
  const res = await apiClient.get(url);
  return res.data;
}

/** 대회 상세 (종목 목록 포함) */
export async function getPrCompetitionDetail(id: number, params?: {
  category?: string;
  gender?: string;
  round_type?: string;
  round_status?: string;
}): Promise<{
  competition: PrCompetition;
  events: PrEvent[];
  by_category: Record<string, PrEvent[]>;
  summary: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.round_type) queryParams.append('round_type', params.round_type);
  if (params?.round_status) queryParams.append('round_status', params.round_status);
  const url = `/api/pacerise/competitions/${id}${queryParams.toString() ? `?${queryParams}` : ''}`;
  const res = await apiClient.get(url);
  return res.data;
}

/** 대회 전체 결과 */
export async function getPrCompetitionResults(id: number, params?: {
  finals_only?: boolean;
  category?: string;
  gender?: string;
  status?: string;
}): Promise<{
  competition: PrCompetition;
  events: PrEventResult[];
  summary: {
    total_events: number;
    total_athletes: number;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
  };
  fetched_at: string;
}> {
  const queryParams = new URLSearchParams();
  if (params?.finals_only) queryParams.append('finals_only', 'true');
  if (params?.category) queryParams.append('category', params.category);
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.status) queryParams.append('status', params.status);
  const url = `/api/pacerise/competitions/${id}/results${queryParams.toString() ? `?${queryParams}` : ''}`;
  const res = await apiClient.get(url);
  return res.data;
}

/** 대회 시간표 */
export async function getPrCompetitionSchedule(id: number): Promise<{
  competition: PrCompetition;
  schedule: PrScheduleEntry[];
  by_date: Record<string, PrScheduleEntry[]>;
  by_category: Record<string, PrScheduleEntry[]>;
  has_multiple_dates: boolean;
  total_events: number;
  fetched_at: string;
}> {
  const res = await apiClient.get(`/api/pacerise/competitions/${id}/schedule`);
  return res.data;
}

/** 대회 선수 명단 */
export async function getPrCompetitionAthletes(id: number, params?: {
  team?: string;
  gender?: string;
}): Promise<{
  competition: PrCompetition;
  athletes: PrAthlete[];
  teams: string[];
  by_team: Record<string, PrAthlete[]>;
  total_athletes: number;
  total_teams: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.team) queryParams.append('team', params.team);
  if (params?.gender) queryParams.append('gender', params.gender);
  const url = `/api/pacerise/competitions/${id}/athletes${queryParams.toString() ? `?${queryParams}` : ''}`;
  const res = await apiClient.get(url);
  return res.data;
}

/** 현재 진행중 대회 (실시간) */
export async function getPrLiveCompetitions(): Promise<{
  has_live: boolean;
  competitions: PrLiveCompetition[];
  fetched_at: string;
}> {
  const res = await apiClient.get('/api/pacerise/live');
  return res.data;
}

/** 특정 종목 결과 */
export async function getPrEventResults(eventId: number): Promise<{
  event_id: number;
  heats: Array<{
    heat_id: number;
    heat_number: number;
    heat_name: string;
    wind: string | null;
    results: any[];
    athletes_count: number;
  }>;
  total_results: number;
}> {
  const res = await apiClient.get(`/api/pacerise/events/${eventId}/results`);
  return res.data;
}
