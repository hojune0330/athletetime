/**
 * 대회 및 경기결과 React Query 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/competitions';
import type { Competition, MatchResult, MatchResultItem } from '../api/competitions';

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
    queryFn: () => api.getCompetitions(params),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

export function useCompetition(id: number) {
  return useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => api.getCompetition(id),
    enabled: !!id,
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Competition, 'id' | 'year' | 'month' | 'results_count' | 'created_at' | 'updated_at'>) => 
      api.createCompetition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Competition> }) => 
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
    mutationFn: (id: number) => api.deleteCompetition(id),
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
    queryFn: () => api.getMatchResults(competitionId, params),
    enabled: !!competitionId,
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
      competition_id: number;
      event: string;
      division: string;
      round: string;
      results: MatchResultItem[];
      event_date?: string;
      notes?: string;
    }) => api.createMatchResult(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: matchResultKeys.byCompetition(variables.competition_id) });
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
