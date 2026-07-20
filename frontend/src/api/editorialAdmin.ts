import axios from 'axios';
import { apiClient } from './client';

const EDITORIAL_ADMIN_BASE = '/api/admin/editorial';

export const EDITORIAL_SECTIONS = [
  'competition-preview',
  'record-story',
  'international',
  'road-marathon',
  'indoor',
  'archive',
] as const;

export type EditorialSectionKey = (typeof EDITORIAL_SECTIONS)[number];

export type EditorialCalendarEntry = {
  readonly id: string;
  readonly seasonYear: number;
  readonly competitionId: number | null;
  readonly packageRole: string | null;
  readonly sectionKey: EditorialSectionKey;
  readonly slot: number;
  readonly state: string;
  readonly scheduledFor: string | null;
  readonly skipReason: string | null;
  readonly version: number;
  readonly updatedAt: string | null;
};

export type EditorialSource = {
  readonly id: string;
  readonly issueId: string | null;
  readonly issueVersion: number | null;
  readonly sourceUrl: string;
  readonly sourceKind: string;
  readonly title: string;
  readonly publisher: string | null;
  readonly capturedAt: string | null;
};

export type EditorialIssue = {
  readonly id: string;
  readonly slug: string;
  readonly calendarId: string;
  readonly status: string;
  readonly version: number;
  readonly title: string;
  readonly content: string;
  readonly summary: string;
  readonly whyNow: string;
  readonly discussionQuestion: string;
  readonly relatedUrl: string;
  readonly subjectAgeGroup: string;
  readonly sectionKey: EditorialSectionKey;
  readonly scheduledFor: string | null;
  readonly publishedAt: string | null;
  readonly updatedAt: string | null;
  readonly sources: readonly EditorialSource[];
};

export type EditorialRevision = {
  readonly id: number;
  readonly revisionNumber: number;
  readonly title: string;
  readonly content: string;
  readonly reviewNote: string;
  readonly createdAt: string;
};

export type EditorialDraftInput = {
  readonly title: string;
  readonly content: string;
  readonly summary: string;
  readonly whyNow: string;
  readonly discussionQuestion: string;
  readonly relatedUrl: string;
  readonly subjectAgeGroup: string;
};

export type EditorialSourceInput = {
  readonly sourceUrl: string;
  readonly sourceKind: string;
  readonly title: string;
  readonly publisher?: string;
};

export type EditorialCalendarInput = {
  readonly seasonYear: number;
  readonly sectionKey: EditorialSectionKey;
  readonly slot: number;
};

export class EditorialApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly reasons: readonly string[];

  constructor(message: string, code = 'EDITORIAL_REQUEST_FAILED', status: number | null = null, reasons: readonly string[] = []) {
    super(message);
    this.name = 'EditorialApiError';
    this.code = code;
    this.status = status;
    this.reasons = reasons;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new EditorialApiError(`${label} 응답 형식이 올바르지 않습니다.`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new EditorialApiError(`${label} 값이 올바르지 않습니다.`);
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EditorialApiError(`${label} 값이 올바르지 않습니다.`);
  }
  return value;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseSection(value: unknown): EditorialSectionKey {
  const section = typeof value === 'string'
    ? EDITORIAL_SECTIONS.find((candidate) => candidate === value)
    : undefined;
  if (!section) {
    throw new EditorialApiError('편집 섹션 값이 올바르지 않습니다.');
  }
  return section;
}

function parseSource(value: unknown): EditorialSource {
  const source = requiredRecord(value, '출처');
  return {
    id: requiredString(source.id, '출처 ID'),
    issueId: optionalString(source.issueId),
    issueVersion: optionalNumber(source.issueVersion),
    sourceUrl: requiredString(source.sourceUrl, '출처 주소'),
    sourceKind: requiredString(source.sourceKind, '출처 종류'),
    title: requiredString(source.title, '출처 제목'),
    publisher: optionalString(source.publisher),
    capturedAt: optionalString(source.capturedAt),
  };
}

function parseCalendar(value: unknown): EditorialCalendarEntry {
  const entry = requiredRecord(value, '캘린더');
  return {
    id: requiredString(entry.id, '캘린더 ID'),
    seasonYear: requiredNumber(entry.seasonYear, '시즌'),
    competitionId: optionalNumber(entry.competitionId),
    packageRole: optionalString(entry.packageRole),
    sectionKey: parseSection(entry.sectionKey),
    slot: requiredNumber(entry.slot, '슬롯'),
    state: requiredString(entry.state, '상태'),
    scheduledFor: optionalString(entry.scheduledFor),
    skipReason: optionalString(entry.skipReason),
    version: requiredNumber(entry.version, '버전'),
    updatedAt: optionalString(entry.updatedAt),
  };
}

function parseIssue(value: unknown): EditorialIssue {
  const issue = requiredRecord(value, '원고');
  const sources = Array.isArray(issue.sources) ? issue.sources.map(parseSource) : [];
  return {
    id: requiredString(issue.id, '원고 ID'),
    slug: requiredString(issue.slug, '슬러그'),
    calendarId: requiredString(issue.calendarId, '캘린더 ID'),
    status: requiredString(issue.status, '상태'),
    version: requiredNumber(issue.version, '버전'),
    title: requiredString(issue.title, '제목'),
    content: requiredString(issue.content, '본문'),
    summary: requiredString(issue.summary, '요약'),
    whyNow: requiredString(issue.whyNow, '왜 지금인가'),
    discussionQuestion: requiredString(issue.discussionQuestion, '대화 질문'),
    relatedUrl: requiredString(issue.relatedUrl, '관련 링크'),
    subjectAgeGroup: requiredString(issue.subjectAgeGroup, '연령 구분'),
    sectionKey: parseSection(issue.sectionKey),
    scheduledFor: optionalString(issue.scheduledFor),
    publishedAt: optionalString(issue.publishedAt),
    updatedAt: optionalString(issue.updatedAt),
    sources,
  };
}

function parseRevision(value: unknown): EditorialRevision {
  const revision = requiredRecord(value, '수정 이력');
  return {
    id: requiredNumber(revision.id, '수정 ID'),
    revisionNumber: requiredNumber(revision.revisionNumber, '수정 번호'),
    title: requiredString(revision.title, '수정 제목'),
    content: requiredString(revision.content, '수정 본문'),
    reviewNote: requiredString(revision.reviewNote, '수정 메모'),
    createdAt: requiredString(revision.createdAt, '수정 시각'),
  };
}

function responseField(value: unknown, field: string): unknown {
  return requiredRecord(value, '서버')[field];
}

function responseList(value: unknown, field: string): readonly unknown[] {
  const result = responseField(value, field);
  if (!Array.isArray(result)) throw new EditorialApiError(`${field} 목록을 읽지 못했습니다.`);
  return result;
}

function normalizeError(error: unknown): never {
  if (error instanceof EditorialApiError) throw error;
  if (axios.isAxiosError(error)) {
    const body = isRecord(error.response?.data) ? error.response.data : {};
    const rawReasons = Array.isArray(body.reasons) ? body.reasons : [];
    const reasons = rawReasons
      .map((item) => isRecord(item) && typeof item.message === 'string' ? item.message : null)
      .filter((item): item is string => item !== null);
    throw new EditorialApiError(
      typeof body.error === 'string' ? body.error : '편집 요청을 처리하지 못했습니다.',
      typeof body.code === 'string' ? body.code : 'EDITORIAL_REQUEST_FAILED',
      error.response?.status ?? null,
      reasons,
    );
  }
  throw error;
}

export function kstDateTimeToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) {
    throw new EditorialApiError('예약 날짜와 시간을 확인해 주세요.');
  }
  const date = new Date(`${value}:00+09:00`);
  if (Number.isNaN(date.getTime())) throw new EditorialApiError('예약 날짜와 시간을 확인해 주세요.');
  return date.toISOString();
}

export async function listEditorialCalendar(): Promise<readonly EditorialCalendarEntry[]> {
  try {
    const response = await apiClient.get<unknown>(`${EDITORIAL_ADMIN_BASE}/calendar`);
    return responseList(response.data, 'calendar').map(parseCalendar);
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function listEditorialIssues(): Promise<readonly EditorialIssue[]> {
  try {
    const response = await apiClient.get<unknown>(`${EDITORIAL_ADMIN_BASE}/issues`);
    return responseList(response.data, 'issues').map(parseIssue);
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function createEditorialCalendar(input: EditorialCalendarInput): Promise<EditorialCalendarEntry> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/calendar`, input);
    return parseCalendar(responseField(response.data, 'calendar'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function skipEditorialCalendar(entry: EditorialCalendarEntry, reason: string): Promise<EditorialCalendarEntry> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/calendar/${entry.id}/skip`, {
      expectedVersion: entry.version,
      note: reason,
    });
    return parseCalendar(responseField(response.data, 'calendar'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function getEditorialIssue(issueId: string): Promise<EditorialIssue> {
  try {
    const response = await apiClient.get<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issueId}`);
    return parseIssue(responseField(response.data, 'issue'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function listEditorialRevisions(issueId: string): Promise<readonly EditorialRevision[]> {
  try {
    const response = await apiClient.get<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issueId}/revisions`);
    return responseList(response.data, 'revisions').map(parseRevision);
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function createEditorialIssue(calendar: EditorialCalendarEntry, draft: EditorialDraftInput): Promise<EditorialIssue> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/issues`, {
      seasonYear: calendar.seasonYear,
      competitionId: calendar.competitionId ?? undefined,
      packageRole: calendar.packageRole ?? undefined,
      slot: calendar.slot,
      calendarId: calendar.id,
      expectedCalendarVersion: calendar.version,
      sectionKey: calendar.sectionKey,
      author: '애타 편집팀',
      ...draft,
    });
    return parseIssue(responseField(response.data, 'issue'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function reviseEditorialIssue(issue: EditorialIssue, draft: EditorialDraftInput, reviewNote: string): Promise<EditorialIssue> {
  try {
    const response = await apiClient.patch<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issue.id}`, {
      expectedVersion: issue.version,
      ...draft,
      reviewNote,
    });
    return parseIssue(responseField(response.data, 'issue'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function addEditorialSource(issue: EditorialIssue, source: EditorialSourceInput): Promise<number> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issue.id}/sources`, {
      expectedVersion: issue.version,
      ...source,
    });
    const parsed = parseSource(responseField(response.data, 'source'));
    if (parsed.issueVersion === null) throw new EditorialApiError('갱신된 원고 버전을 확인하지 못했습니다.');
    return parsed.issueVersion;
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function deleteEditorialSource(issue: EditorialIssue, sourceId: string): Promise<number> {
  try {
    const response = await apiClient.delete<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issue.id}/sources/${sourceId}`, {
      data: { expectedVersion: issue.version },
    });
    const result = requiredRecord(responseField(response.data, 'result'), '삭제 결과');
    return requiredNumber(result.issueVersion, '갱신 버전');
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function runEditorialAction(issue: EditorialIssue, action: 'check' | 'approve'): Promise<EditorialIssue> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issue.id}/${action}`, {
      expectedVersion: issue.version,
    });
    return parseIssue(responseField(response.data, 'issue'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}

export async function scheduleEditorialIssue(issue: EditorialIssue, localKstDateTime: string): Promise<EditorialIssue> {
  try {
    const response = await apiClient.post<unknown>(`${EDITORIAL_ADMIN_BASE}/issues/${issue.id}/schedule`, {
      expectedVersion: issue.version,
      scheduledFor: kstDateTimeToIso(localKstDateTime),
    });
    return parseIssue(responseField(response.data, 'issue'));
  } catch (error: unknown) {
    normalizeError(error);
  }
}
