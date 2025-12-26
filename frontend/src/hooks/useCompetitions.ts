/**
 * 대회 및 경기결과 React Query 훅
 * 
 * ⚠️ 현재 Mock 데이터 사용 중 (DB 마이그레이션 전)
 * TODO: DB 마이그레이션 후 USE_MOCK = false로 변경
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/competitions';
import type { Competition, MatchResult, MatchResultItem, CompetitionsResponse, MatchResultsResponse } from '../api/competitions';

// ⚠️ Mock 모드 플래그 - DB 준비되면 false로 변경
const USE_MOCK = false;

// ============================================
// Mock 데이터
// ============================================

const MOCK_COMPETITIONS: Competition[] = [
  {
    id: 1,
    name: '제39회 전국체육고등학교체육대회(육상경기)',
    type: '국내경기',
    category: '트랙 및 필드',
    start_date: '2025-04-05',
    end_date: '2025-04-06',
    year: 2025,
    month: 4,
    location: '대구',
    results_count: 24,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '제106회 전국체육대회 (육상경기)',
    type: '국내경기',
    category: '트랙 및 필드',
    start_date: '2025-10-19',
    end_date: '2025-10-22',
    year: 2025,
    month: 10,
    location: '부산',
    results_count: 48,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: '2025 조선일보 하프마라톤대회',
    type: '국내경기',
    category: '로드레이스',
    start_date: '2025-10-26',
    end_date: '2025-10-26',
    year: 2025,
    month: 10,
    location: '춘천',
    results_count: 12,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: '2025 JTBC서울하프마라톤대회',
    type: '국내경기',
    category: '로드레이스',
    start_date: '2025-11-02',
    end_date: '2025-11-02',
    year: 2025,
    month: 11,
    location: '서울',
    results_count: 8,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: '2025 인천마라톤대회',
    type: '국내경기',
    category: '단일종목경기',
    start_date: '2025-11-23',
    end_date: '2025-11-23',
    year: 2025,
    month: 11,
    location: '인천',
    results_count: 6,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 6,
    name: '2025 인천하프마라톤대회',
    type: '국내경기',
    category: '단일종목경기',
    start_date: '2025-11-23',
    end_date: '2025-11-23',
    year: 2025,
    month: 11,
    location: '인천',
    results_count: 4,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 7,
    name: '2024 세계육상선수권대회',
    type: '국제경기',
    category: '트랙 및 필드',
    start_date: '2024-08-15',
    end_date: '2024-08-24',
    year: 2024,
    month: 8,
    location: '도쿄',
    results_count: 36,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const MOCK_MATCH_RESULTS: MatchResult[] = [
  {
    id: 1,
    competition_id: 1,
    event: '100m',
    division: '남자부',
    round: '예선',
    results: [
      { rank: 1, athlete_name: '김민수', team: '서울체고', record: '10.52', note: '' },
      { rank: 2, athlete_name: '이준호', team: '부산체고', record: '10.58', note: '' },
      { rank: 3, athlete_name: '박성진', team: '대구체고', record: '10.63', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    competition_id: 1,
    event: '100m',
    division: '남자부',
    round: '준결승',
    results: [
      { rank: 1, athlete_name: '김민수', team: '서울체고', record: '10.48', note: 'PB' },
      { rank: 2, athlete_name: '이준호', team: '부산체고', record: '10.55', note: '' },
      { rank: 3, athlete_name: '박성진', team: '대구체고', record: '10.59', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    competition_id: 1,
    event: '100m',
    division: '남자부',
    round: '결승',
    results: [
      { rank: 1, athlete_name: '김민수', team: '서울체고', record: '10.35', note: 'PB' },
      { rank: 2, athlete_name: '이준호', team: '부산체고', record: '10.42', note: 'SB' },
      { rank: 3, athlete_name: '박성진', team: '대구체고', record: '10.51', note: '' },
      { rank: 4, athlete_name: '최영훈', team: '인천체고', record: '10.58', note: '' },
      { rank: 5, athlete_name: '정우성', team: '광주체고', record: '10.62', note: '' },
      { rank: 6, athlete_name: '강동원', team: '대전체고', record: '10.71', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4,
    competition_id: 1,
    event: '100m',
    division: '여자부',
    round: '예선',
    results: [
      { rank: 1, athlete_name: '김서연', team: '서울체고', record: '11.82', note: '' },
      { rank: 2, athlete_name: '이수진', team: '부산체고', record: '11.95', note: '' },
      { rank: 3, athlete_name: '박지민', team: '대구체고', record: '12.03', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 5,
    competition_id: 1,
    event: '100m',
    division: '여자부',
    round: '결승',
    results: [
      { rank: 1, athlete_name: '김서연', team: '서울체고', record: '11.68', note: 'PB' },
      { rank: 2, athlete_name: '이수진', team: '부산체고', record: '11.79', note: '' },
      { rank: 3, athlete_name: '박지민', team: '대구체고', record: '11.92', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 6,
    competition_id: 1,
    event: '200m',
    division: '남자부',
    round: '예선',
    results: [
      { rank: 1, athlete_name: '김민수', team: '서울체고', record: '21.25', note: '' },
      { rank: 2, athlete_name: '이준호', team: '부산체고', record: '21.38', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 7,
    competition_id: 1,
    event: '200m',
    division: '남자부',
    round: '결승',
    results: [
      { rank: 1, athlete_name: '김민수', team: '서울체고', record: '20.98', note: 'PB' },
      { rank: 2, athlete_name: '이준호', team: '부산체고', record: '21.15', note: '' },
      { rank: 3, athlete_name: '박성진', team: '대구체고', record: '21.32', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 8,
    competition_id: 1,
    event: '200m',
    division: '여자부',
    round: '예선',
    results: [
      { rank: 1, athlete_name: '김서연', team: '서울체고', record: '24.15', note: '' },
      { rank: 2, athlete_name: '이수진', team: '부산체고', record: '24.32', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 9,
    competition_id: 1,
    event: '200m',
    division: '여자부',
    round: '결승',
    results: [
      { rank: 1, athlete_name: '김서연', team: '서울체고', record: '23.85', note: 'PB' },
      { rank: 2, athlete_name: '이수진', team: '부산체고', record: '24.02', note: '' },
      { rank: 3, athlete_name: '박지민', team: '대구체고', record: '24.28', note: '' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// ============================================
// Mock API 함수
// ============================================

async function getMockCompetitions(params?: { type?: string; year?: number; category?: string }): Promise<CompetitionsResponse> {
  // 시뮬레이션 딜레이
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filtered = [...MOCK_COMPETITIONS];
  
  if (params?.type) {
    filtered = filtered.filter(c => c.type === params.type);
  }
  if (params?.year) {
    filtered = filtered.filter(c => c.year === params.year);
  }
  if (params?.category) {
    filtered = filtered.filter(c => c.category === params.category);
  }
  
  // 월 순으로 정렬
  filtered.sort((a, b) => a.month - b.month);
  
  const grouped: Record<string, Competition[]> = {};
  filtered.forEach(comp => {
    if (!grouped[comp.category]) {
      grouped[comp.category] = [];
    }
    grouped[comp.category].push(comp);
  });
  
  return {
    success: true,
    competitions: filtered,
    grouped,
    filters: {
      type: params?.type || '',
      year: params?.year || new Date().getFullYear(),
      category: params?.category || '',
    },
  };
}

async function getMockCompetition(id: number): Promise<Competition> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const comp = MOCK_COMPETITIONS.find(c => c.id === id);
  if (!comp) throw new Error('대회를 찾을 수 없습니다.');
  return comp;
}

async function getMockMatchResults(competitionId: number, params?: { event?: string; division?: string; round?: string }): Promise<MatchResultsResponse> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const competition = MOCK_COMPETITIONS.find(c => c.id === competitionId);
  if (!competition) throw new Error('대회를 찾을 수 없습니다.');
  
  let filtered = MOCK_MATCH_RESULTS.filter(r => r.competition_id === competitionId);
  
  if (params?.event) {
    filtered = filtered.filter(r => r.event === params.event);
  }
  if (params?.division) {
    filtered = filtered.filter(r => r.division === params.division);
  }
  if (params?.round) {
    filtered = filtered.filter(r => r.round === params.round);
  }
  
  // 필터 옵션 추출
  const allResults = MOCK_MATCH_RESULTS.filter(r => r.competition_id === competitionId);
  const events = [...new Set(allResults.map(r => r.event))];
  const divisions = [...new Set(allResults.map(r => r.division))];
  const rounds = [...new Set(allResults.map(r => r.round))];
  
  return {
    success: true,
    competition,
    results: filtered.map(r => ({ ...r, athletes_count: r.results.length })),
    filters: { events, divisions, rounds },
  };
}

async function getMockMatchResult(id: number): Promise<MatchResult> {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const result = MOCK_MATCH_RESULTS.find(r => r.id === id);
  if (!result) throw new Error('경기 결과를 찾을 수 없습니다.');
  
  const competition = MOCK_COMPETITIONS.find(c => c.id === result.competition_id);
  
  return {
    ...result,
    competition_name: competition?.name,
    competition_location: competition?.location,
    competition_start_date: competition?.start_date,
    competition_end_date: competition?.end_date,
  };
}

// ============================================
// Query Keys
// ============================================

export const competitionKeys = {
  all: ['competitions'] as const,
  list: (params?: { type?: string; year?: number; category?: string }) => 
    ['competitions', 'list', params] as const,
  detail: (id: number) => ['competitions', 'detail', id] as const,
};

export const matchResultKeys = {
  all: ['matchResults'] as const,
  byCompetition: (competitionId: number, params?: { event?: string; division?: string; round?: string }) => 
    ['matchResults', 'competition', competitionId, params] as const,
  detail: (id: number) => ['matchResults', 'detail', id] as const,
};

// ============================================
// 대회 훅
// ============================================

export function useCompetitions(params?: { type?: string; year?: number; category?: string }) {
  return useQuery({
    queryKey: competitionKeys.list(params),
    queryFn: () => USE_MOCK ? getMockCompetitions(params) : api.getCompetitions(params),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

export function useCompetition(id: number) {
  return useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => USE_MOCK ? getMockCompetition(id) : api.getCompetition(id),
    enabled: !!id,
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Competition, 'id' | 'year' | 'month' | 'results_count' | 'created_at' | 'updated_at'>) => {
      if (USE_MOCK) {
        // Mock: 등록 시뮬레이션
        return Promise.resolve({
          ...data,
          id: Date.now(),
          year: new Date(data.start_date).getFullYear(),
          month: new Date(data.start_date).getMonth() + 1,
          results_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Competition);
      }
      return api.createCompetition(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Competition> }) => {
      if (USE_MOCK) {
        return Promise.resolve({ ...data, id } as Competition);
      }
      return api.updateCompetition(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
      queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.id) });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (USE_MOCK) {
        return Promise.resolve();
      }
      return api.deleteCompetition(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
    },
  });
}

// ============================================
// 경기 결과 훅
// ============================================

export function useMatchResults(competitionId: number, params?: { event?: string; division?: string; round?: string }) {
  return useQuery({
    queryKey: matchResultKeys.byCompetition(competitionId, params),
    queryFn: () => USE_MOCK ? getMockMatchResults(competitionId, params) : api.getMatchResults(competitionId, params),
    enabled: !!competitionId,
  });
}

export function useMatchResult(id: number) {
  return useQuery({
    queryKey: matchResultKeys.detail(id),
    queryFn: () => USE_MOCK ? getMockMatchResult(id) : api.getMatchResult(id),
    enabled: !!id,
  });
}

export function useCreateMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      competition_id: number;
      event: string;
      division: string;
      round: string;
      results: MatchResultItem[];
      event_date?: string;
      notes?: string;
    }) => {
      if (USE_MOCK) {
        return Promise.resolve({
          ...data,
          id: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as MatchResult);
      }
      return api.createMatchResult(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.byCompetition(variables.competition_id) });
    },
  });
}

export function useUpdateMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MatchResult> }) => {
      if (USE_MOCK) {
        return Promise.resolve({ ...data, id } as MatchResult);
      }
      return api.updateMatchResult(id, data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.all });
      queryClient.invalidateQueries({ queryKey: matchResultKeys.detail(result.id) });
    },
  });
}

export function useDeleteMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (USE_MOCK) {
        return Promise.resolve();
      }
      return api.deleteMatchResult(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.all });
    },
  });
}
