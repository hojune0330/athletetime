/**
 * 대회 및 경기결과 React Query 훅
 * 
 * Card Studio의 대회 데이터를 사용합니다.
 * /api/card-studio/competitions 엔드포인트 연동
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/competitions';
import type { Competition, MatchResult, MatchResultItem } from '../api/competitions';

// ============================================
// Query Keys
// ============================================

export const competitionKeys = {
  all: ['competitions'] as const,
  list: (params?: { type?: string; year?: number; category?: string; status?: string; search?: string }) => 
    ['competitions', 'list', params] as const,
  detail: (id: string) => ['competitions', 'detail', id] as const,
  current: (year?: number) => ['competitions', 'current', year] as const,
  calendar: (year?: number) => ['competitions', 'calendar', year] as const,
};

export const matchResultKeys = {
  all: ['matchResults'] as const,
  byCompetition: (competitionId: string | number, params?: { event?: string; division?: string; round?: string }) => 
    ['matchResults', 'competition', competitionId, params] as const,
  detail: (id: number) => ['matchResults', 'detail', id] as const,
};

// ============================================
// 대회 훅
// ============================================

export function useCompetitions(params?: { type?: string; year?: number; category?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: competitionKeys.list(params),
    queryFn: () => api.getCompetitions(params),
    staleTime: 60 * 1000, // 1분 캐시
    refetchOnMount: true,
  });
}

export function useCompetition(id: string) {
  return useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => api.getCompetition(id),
    enabled: !!id,
  });
}

export function useCompetitionsCurrent(year?: number) {
  return useQuery({
    queryKey: competitionKeys.current(year),
    queryFn: () => api.getCompetitionsCurrent(year),
    staleTime: 60 * 1000,
  });
}

export function useCompetitionsCalendar(year?: number) {
  return useQuery({
    queryKey: competitionKeys.calendar(year),
    queryFn: () => api.getCompetitionsCalendar(year),
    staleTime: 60 * 1000,
  });
}

// 대회 등록/수정/삭제는 Card Studio 관리자 기능이므로 비활성화
export function useCreateCompetition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_data: any) => api.createCompetition(_data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competition> }) => 
      api.updateCompetition(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
      queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.id) });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
    },
  });
}

// ============================================
// 경기 결과 훅
// ============================================

export function useMatchResults(competitionId: string | number, params?: { event?: string; division?: string; round?: string }) {
  return useQuery({
    queryKey: matchResultKeys.byCompetition(competitionId, params),
    queryFn: () => api.getMatchResults(competitionId, params),
    enabled: !!competitionId,
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });
}

export function useMatchResult(id: number) {
  return useQuery({
    queryKey: matchResultKeys.detail(id),
    queryFn: () => api.getMatchResult(id),
    enabled: !!id,
  });
}

export function useCreateMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      competition_id: number | string;
      event: string;
      division: string;
      round: string;
      results: MatchResultItem[];
      event_date?: string;
      notes?: string;
    }) => api.createMatchResult(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['matchResults', 'competition', variables.competition_id],
      });
      queryClient.invalidateQueries({ queryKey: matchResultKeys.all });
    },
  });
}

export function useUpdateMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MatchResult> }) => 
      api.updateMatchResult(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.all });
      queryClient.invalidateQueries({ queryKey: matchResultKeys.detail(result.id) });
    },
  });
}

export function useDeleteMatchResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => api.deleteMatchResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.all });
    },
  });
}
