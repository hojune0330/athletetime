/**
 * 트렌드·숏폼·빠른 반응 API
 * 
 * 숏폼 콘텐츠 피드, 트렌딩 토픽, 이모지 리액션, 플래시 설문
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface TrendingTopic {
  tag: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

export interface HotRecord {
  id: number;
  athlete: string;
  event: string;
  record: string;
  competition: string;
  date: string;
  emoji: Record<string, number>;
}

export interface FlashPollOption {
  id: number;
  text: string;
  votes: number;
}

export interface FlashPoll {
  id: number;
  question: string;
  options: FlashPollOption[];
  totalVotes: number;
  voters: string[];
  expiresAt: string;
  createdAt: string;
  category: string;
}

export interface ShortFormItem {
  type: 'record_highlight' | 'flash_poll' | 'trending_topic';
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  emoji?: Record<string, number>;
  link?: string;
  pollData?: FlashPoll;
  trend?: string;
  category?: string;
  priority: number;
}

// ============================================
// API Functions
// ============================================

/** 트렌딩 토픽 조회 */
export async function getTrendingTopics(limit = 8): Promise<{ topics: TrendingTopic[]; updatedAt: string }> {
  const { data } = await apiClient.get('/api/trending/topics', { params: { limit } });
  return data;
}

/** HOT 기록 피드 */
export async function getHotRecords(limit = 6): Promise<{ records: HotRecord[]; total: number }> {
  const { data } = await apiClient.get('/api/trending/hot-records', { params: { limit } });
  return data;
}

/** 이모지 리액션 등록 */
export async function addReaction(targetId: string | number, targetType: string, emoji: string, visitorId?: string): Promise<{ reactions: Record<string, number> }> {
  const { data } = await apiClient.post('/api/reactions', { targetId, targetType, emoji, visitorId });
  return data;
}

/** 리액션 조회 */
export async function getReactions(targetType: string, targetId: string | number): Promise<{ reactions: Record<string, number> }> {
  const { data } = await apiClient.get(`/api/reactions/${targetType}/${targetId}`);
  return data;
}

/** 플래시 설문 목록 */
export async function getFlashPolls(): Promise<{ polls: FlashPoll[] }> {
  const { data } = await apiClient.get('/api/flash-polls');
  return data;
}

/** 플래시 설문 투표 */
export async function voteFlashPoll(pollId: number, optionId: number, visitorId?: string): Promise<{ poll: FlashPoll }> {
  const { data } = await apiClient.post(`/api/flash-polls/${pollId}/vote`, { optionId, visitorId });
  return data;
}

/** 숏폼 피드 */
export async function getShortFormFeed(limit = 10): Promise<{ items: ShortFormItem[]; total: number; updatedAt: string }> {
  const { data } = await apiClient.get('/api/feed/shortform', { params: { limit } });
  return data;
}
