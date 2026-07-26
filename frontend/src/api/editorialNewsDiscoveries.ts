import axios from 'axios';
import { apiClient } from './client';

const NEWS_DISCOVERIES_BASE = '/api/admin/editorial/news-discoveries';

export const NEWS_DISCOVERY_STATUSES = ['discovered', 'reviewing', 'source_confirmed', 'calendar_linked', 'dismissed'] as const;
export type NewsDiscoveryStatus = (typeof NEWS_DISCOVERY_STATUSES)[number];
export type NewsDiscoveryRange = 'today' | 'month';

export type NewsDiscovery = {
  readonly id: string; readonly originalUrl: string; readonly naverUrl: string | null; readonly title: string;
  readonly publishedAt: string; readonly queryKeys: readonly string[]; readonly relevanceTags: readonly string[];
  readonly subjectAgeGroup: string | null; readonly status: NewsDiscoveryStatus; readonly confirmedSourceUrl: string | null;
  readonly confirmedSourceTitle: string | null; readonly confirmedSourcePublisher: string | null;
  readonly confirmedSourceKind: string | null; readonly linkedCalendarId: string | null;
};

export type NewsDiscoveryRun = {
  readonly id: string; readonly status: 'running' | 'completed' | 'failed'; readonly startedAt: string;
  readonly completedAt: string | null; readonly apiCallCount: number; readonly resultCount: number;
  readonly insertedCount: number; readonly duplicateCount: number; readonly irrelevantCount: number;
  readonly safeErrorCode: string | null;
};
export type NewsDiscoveryPage = { readonly discoveries: readonly NewsDiscovery[]; readonly nextCursor: string | null; };

export type ConfirmNewsSourceInput = {
  readonly sourceUrl: string; readonly title: string; readonly publisher: string; readonly sourceKind: 'official' | 'primary' | 'secondary';
};

export class NewsDiscoveryApiError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) { super(message); this.name = 'NewsDiscoveryApiError'; this.status = status; }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new NewsDiscoveryApiError('소식 응답 형식이 올바르지 않습니다.');
  return Object.fromEntries(Object.entries(value));
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new NewsDiscoveryApiError(`${label} 값이 올바르지 않습니다.`);
  return value;
}
function nullableString(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function strings(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new NewsDiscoveryApiError(`${label} 값이 올바르지 않습니다.`);
  return value;
}
function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new NewsDiscoveryApiError(`${label} 값이 올바르지 않습니다.`);
  return value;
}
function status(value: unknown): NewsDiscoveryStatus {
  if (typeof value === 'string') {
    const matched = NEWS_DISCOVERY_STATUSES.find((candidate) => candidate === value);
    if (matched) return matched;
  }
  throw new NewsDiscoveryApiError('소식 상태 값이 올바르지 않습니다.');
}
function discovery(value: unknown): NewsDiscovery {
  const item = record(value);
  return { id: string(item.id, 'ID'), originalUrl: string(item.originalUrl, '원문 주소'), naverUrl: nullableString(item.naverUrl), title: string(item.title, '제목'), publishedAt: string(item.publishedAt, '발행 시각'), queryKeys: strings(item.queryKeys, '주제'), relevanceTags: strings(item.relevanceTags, '태그'), subjectAgeGroup: nullableString(item.subjectAgeGroup), status: status(item.status), confirmedSourceUrl: nullableString(item.confirmedSourceUrl), confirmedSourceTitle: nullableString(item.confirmedSourceTitle), confirmedSourcePublisher: nullableString(item.confirmedSourcePublisher), confirmedSourceKind: nullableString(item.confirmedSourceKind), linkedCalendarId: nullableString(item.linkedCalendarId) };
}
function run(value: unknown): NewsDiscoveryRun {
  const item = record(value); const runStatus = string(item.status, '실행 상태');
  if (runStatus !== 'running' && runStatus !== 'completed' && runStatus !== 'failed') throw new NewsDiscoveryApiError('실행 상태 값이 올바르지 않습니다.');
  return { id: string(item.id, '실행 ID'), status: runStatus, startedAt: string(item.startedAt, '시작 시각'), completedAt: nullableString(item.completedAt), apiCallCount: number(item.apiCallCount, '호출 수'), resultCount: number(item.resultCount, '결과 수'), insertedCount: number(item.insertedCount, '새 소식 수'), duplicateCount: number(item.duplicateCount, '중복 수'), irrelevantCount: number(item.irrelevantCount, '제외 수'), safeErrorCode: nullableString(item.safeErrorCode) };
}
function error(error: unknown): never {
  if (error instanceof NewsDiscoveryApiError) throw error;
  if (axios.isAxiosError(error)) {
    const body = error.response?.data; const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : '소식 요청을 처리하지 못했습니다.';
    throw new NewsDiscoveryApiError(message, error.response?.status ?? null);
  }
  throw error;
}
export async function listNewsDiscoveries(range: NewsDiscoveryRange, selectedStatus: NewsDiscoveryStatus | 'all', cursor: string | null = null): Promise<NewsDiscoveryPage> {
  try { const response = await apiClient.get<unknown>(NEWS_DISCOVERIES_BASE, { params: { range, ...(selectedStatus === 'all' ? {} : { status: selectedStatus }), ...(cursor ? { cursor } : {}), limit: 50 } }); const body = record(response.data); if (!Array.isArray(body.discoveries)) throw new NewsDiscoveryApiError('소식 목록 형식이 올바르지 않습니다.'); const nextCursor = body.nextCursor; if (nextCursor !== null && typeof nextCursor !== 'string') throw new NewsDiscoveryApiError('다음 소식 위치 값이 올바르지 않습니다.'); return { discoveries: body.discoveries.map(discovery), nextCursor }; } catch (caught: unknown) { return error(caught); }
}
export async function listNewsDiscoveryRuns(): Promise<readonly NewsDiscoveryRun[]> {
  try { const response = await apiClient.get<unknown>(`${NEWS_DISCOVERIES_BASE}/runs`, { params: { limit: 1 } }); const body = record(response.data); if (!Array.isArray(body.runs)) throw new NewsDiscoveryApiError('실행 목록 형식이 올바르지 않습니다.'); return body.runs.map(run); } catch (caught: unknown) { return error(caught); }
}
async function action(id: string, suffix: string, body: Record<string, unknown>): Promise<NewsDiscovery> {
  try { const response = await apiClient.post<unknown>(`${NEWS_DISCOVERIES_BASE}/${encodeURIComponent(id)}/${suffix}`, body); return discovery(record(response.data).discovery); } catch (caught: unknown) { return error(caught); }
}
export async function runNewsDiscovery(): Promise<NewsDiscoveryRun> { try { const response = await apiClient.post<unknown>(`${NEWS_DISCOVERIES_BASE}/run`, {}); return run(record(response.data).run); } catch (caught: unknown) { return error(caught); } }
export const startNewsReview = (id: string): Promise<NewsDiscovery> => action(id, 'start-review', {});
export const dismissNewsDiscovery = (id: string, reviewNote: string): Promise<NewsDiscovery> => action(id, 'dismiss', { reviewNote });
export const confirmNewsSource = (id: string, input: ConfirmNewsSourceInput): Promise<NewsDiscovery> => action(id, 'confirm-source', input);
export const linkNewsDiscoveryCalendar = (id: string, calendarId: string, expectedCalendarVersion: number): Promise<NewsDiscovery> => action(id, 'link-calendar', { calendarId, expectedCalendarVersion });
