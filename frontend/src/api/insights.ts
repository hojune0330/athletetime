import { apiClient } from './client';
import type { AthleteProfile } from '../data/athleteRecords';

const BASE = '/api/card-studio/insights';

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  total?: number;
};

type ApiItemResponse<T> = {
  success: boolean;
  data: T;
};

export async function getFeaturedInsights(limit = 6): Promise<AthleteProfile[]> {
  const { data } = await apiClient.get<ApiListResponse<AthleteProfile>>(`${BASE}/featured`, {
    params: { limit },
  });
  return data.data;
}

export async function searchInsights(query: string, limit = 12): Promise<AthleteProfile[]> {
  const { data } = await apiClient.get<ApiListResponse<AthleteProfile>>(`${BASE}/search`, {
    params: { q: query, limit },
  });
  return data.data;
}

export async function getInsightProfile(id: string): Promise<AthleteProfile> {
  const { data } = await apiClient.get<ApiItemResponse<AthleteProfile>>(
    `${BASE}/athlete/${encodeURIComponent(id)}`,
  );
  return data.data;
}
