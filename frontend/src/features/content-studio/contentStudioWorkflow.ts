import type { AthleteAnalyticsProfile } from '@/api/recordAnalytics';
import { z } from 'zod';

function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

const contentStudioDraftSchema = z.strictObject({
  athleteName: z.string().trim().min(1).max(80),
  team: z.string().trim().max(120),
  eventLabel: z.string().trim().min(1).max(80),
  record: z.string().trim().min(1).max(80),
  competitionName: z.string().trim().min(1).max(160),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceProvider: z.string().trim().min(1).max(120),
  sourceUrl: z.string().max(2_048).refine((value) => value === '' || isSafePublicUrl(value)),
  headline: z.string().max(48),
  body: z.string().max(220),
  credit: z.string().max(80),
  rightsConfirmed: z.boolean(),
});

export type ContentStudioDraft = z.infer<typeof contentStudioDraftSchema>;
export type ContentStudioCopy = Pick<ContentStudioDraft, 'headline' | 'body'>;

const contentCopySchema = z.strictObject({
  headline: z.string().trim().min(1).max(48),
  body: z.string().trim().min(1).max(220),
});

export function parseStoredContentStudioDraft(raw: string | null): ContentStudioDraft | null {
  if (!raw || raw.length > 16_384) return null;
  try {
    const parsed = contentStudioDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createContentStudioDraft(
  profile: AthleteAnalyticsProfile,
): ContentStudioDraft | null {
  const record = profile.summary.indexedBest
    ?? profile.summary.seasonBest
    ?? profile.summary.latest;
  if (!record) return null;

  return {
    athleteName: profile.athlete.name,
    team: record.team || profile.athlete.team,
    eventLabel: record.eventLabel,
    record: record.record,
    competitionName: record.competitionName,
    recordDate: record.date,
    sourceProvider: record.source.provider,
    sourceUrl: isSafePublicUrl(record.source.sourceUrl) ? record.source.sourceUrl : '',
    headline: `${profile.athlete.name} ${record.eventLabel} ${record.record}`,
    body: `${record.date} ${record.competitionName}에서 확인된 공개 기록입니다.`,
    credit: 'AthleteTime 편집팀',
    rightsConfirmed: false,
  };
}

export function getContentStudioQa(draft: ContentStudioDraft): readonly string[] {
  const issues: string[] = [];
  if (!contentCopySchema.safeParse({ headline: draft.headline, body: draft.body }).success) {
    issues.push('제목과 본문 길이를 확인해 주세요.');
  }
  if (!draft.credit.trim()) {
    issues.push('제작 크레딧을 입력해 주세요.');
  }
  if (!draft.sourceProvider.trim() || !isSafePublicUrl(draft.sourceUrl)) {
    issues.push('공개 출처 URL을 확인해 주세요.');
  }
  if (!draft.rightsConfirmed) {
    issues.push('제작 권한 확인이 필요합니다.');
  }
  return issues;
}

export function buildAgentWorkPacket(draft: ContentStudioDraft): string {
  return JSON.stringify({
    task: 'athletetime_record_card_copy',
    sourceFacts: {
      athleteName: draft.athleteName,
      team: draft.team,
      eventLabel: draft.eventLabel,
      record: draft.record,
      competitionName: draft.competitionName,
      recordDate: draft.recordDate,
      sourceProvider: draft.sourceProvider,
      sourceUrl: draft.sourceUrl,
    },
    currentCopy: {
      headline: draft.headline,
      body: draft.body,
    },
    constraints: {
      factsOnly: true,
      headlineMax: 48,
      bodyMax: 220,
      output: 'strict_json',
    },
    responseSchema: { headline: 'string', body: 'string' },
  }, null, 2);
}

export function parseAgentResult(raw: string): ContentStudioCopy {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('AI 결과 JSON 형식을 확인해 주세요.');
  }
  const parsed = contentCopySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error('AI 결과 JSON 형식을 확인해 주세요.');
}
