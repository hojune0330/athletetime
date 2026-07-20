import { apiClient } from './client';

export const MAGAZINE_SECTION_KEYS = [
  'competition-preview',
  'record-story',
  'international',
  'road-marathon',
  'indoor',
  'archive',
] as const;

export type MagazineSectionKey = (typeof MAGAZINE_SECTION_KEYS)[number];

export type MagazineSource = {
  readonly id: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly publisher: string | null;
};

export type MagazineIssue = {
  readonly id: string;
  readonly slug: string;
  readonly postId: number;
  readonly title: string;
  readonly content: string;
  readonly summary: string;
  readonly discussionQuestion: string;
  readonly sectionKey: MagazineSectionKey;
  readonly publishedAt: string;
  readonly commentsCount: number;
  readonly sources: readonly MagazineSource[];
};

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Magazine ${field} is missing`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Magazine ${field} is invalid`);
  }
  return value;
}

function sectionKey(value: unknown): MagazineSectionKey {
  const match = typeof value === 'string'
    ? MAGAZINE_SECTION_KEYS.find((key) => key === value)
    : undefined;
  if (match) return match;
  throw new TypeError('Magazine section is invalid');
}

function parseSource(value: unknown): MagazineSource {
  if (!isObject(value)) throw new TypeError('Magazine source is invalid');
  return {
    id: requiredString(value.id, 'source id'),
    sourceUrl: requiredString(value.sourceUrl, 'source URL'),
    title: requiredString(value.title, 'source title'),
    publisher: nullableString(value.publisher),
  };
}

function parseIssue(value: unknown): MagazineIssue {
  if (!isObject(value)) throw new TypeError('Magazine issue is invalid');
  const sources = Array.isArray(value.sources) ? value.sources.map(parseSource) : [];
  return {
    id: requiredString(value.id, 'id'),
    slug: requiredString(value.slug, 'slug'),
    postId: requiredNumber(value.postId, 'post id'),
    title: requiredString(value.title, 'title'),
    content: requiredString(value.content, 'content'),
    summary: requiredString(value.summary, 'summary'),
    discussionQuestion: requiredString(value.discussionQuestion, 'discussion question'),
    sectionKey: sectionKey(value.sectionKey),
    publishedAt: requiredString(value.publishedAt, 'published date'),
    commentsCount: Math.max(0, requiredNumber(value.commentsCount, 'comment count')),
    sources,
  };
}

export async function getMagazineIssues(limit = 20): Promise<readonly MagazineIssue[]> {
  const response = await apiClient.get<unknown>('/api/editorial/magazine', { params: { limit } });
  if (!isObject(response.data) || !Array.isArray(response.data.issues)) {
    throw new TypeError('Magazine response is invalid');
  }
  return response.data.issues.map(parseIssue);
}
