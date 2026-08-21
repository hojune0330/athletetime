import { describe, expect, it } from 'vitest';
import type { AthleteAnalyticsProfile, PublicRecord } from '@/api/recordAnalytics';
import {
  buildAgentWorkPacket,
  createContentStudioDraft,
  getContentStudioQa,
  parseAgentResult,
  parseStoredContentStudioDraft,
} from './contentStudioWorkflow';

const indexedBest = {
  id: 'record-01',
  athleteKey: 'at_athlete01',
  name: '김선수',
  team: '진도군청',
  season: 2026,
  competitionName: '전국육상선수권',
  date: '2026-06-01',
  venue: '목포종합경기장',
  eventKey: '100m',
  eventLabel: '100m',
  divisionKey: 'men-general',
  divisionLabel: '남자 일반부',
  gender: 'men',
  divisionLevel: 'general',
  divisionDetail: null,
  sourceDivisionLabel: '남자 일반부',
  phase: 'final',
  record: '10.31',
  recordValue: 10.31,
  direction: 'lower',
  rank: 1,
  wind: '+1.2',
  windLegal: true,
  isComparable: true,
  note: '',
  source: {
    provider: '대한육상연맹',
    sourceType: 'official_result',
    sourceUrl: 'https://example.com/results/record-01',
    capturedAt: '2026-06-02T00:00:00.000Z',
  },
} satisfies PublicRecord;

const profile = {
  athlete: {
    athleteKey: 'at_athlete01',
    name: '김선수',
    team: '진도군청',
    teams: ['진도군청'],
    years: [2026],
    events: ['100m'],
    divisions: ['남자 일반부'],
    recordCount: 1,
    ambiguity: 'none',
    note: '',
  },
  summary: {
    indexedBest,
    seasonBest: indexedBest,
    latest: indexedBest,
    delta: null,
    indexedResultCount: 1,
    comparableResultCount: 1,
    sourceScope: '공개 경기 결과',
    disclaimer: '공개 기록 기반',
  },
  events: [{ eventKey: '100m', eventLabel: '100m', recordCount: 1, best: indexedBest }],
  recordTrail: [],
  records: [indexedBest],
} satisfies AthleteAnalyticsProfile;

describe('content studio workflow', () => {
  it('creates a truthful draft from the indexed public best', () => {
    expect(createContentStudioDraft(profile)).toEqual({
      athleteName: '김선수',
      team: '진도군청',
      eventLabel: '100m',
      record: '10.31',
      competitionName: '전국육상선수권',
      recordDate: '2026-06-01',
      sourceProvider: '대한육상연맹',
      sourceUrl: 'https://example.com/results/record-01',
      headline: '김선수 100m 10.31',
      body: '2026-06-01 전국육상선수권에서 확인된 공개 기록입니다.',
      credit: 'AthleteTime 편집팀',
      rightsConfirmed: false,
    });
  });

  it('requires safe provenance and a human rights check', () => {
    const draft = createContentStudioDraft(profile);
    expect(draft).not.toBeNull();
    if (!draft) return;

    expect(getContentStudioQa({ ...draft, sourceUrl: 'javascript:alert(1)' })).toEqual([
      '공개 출처 URL을 확인해 주세요.',
      '제작 권한 확인이 필요합니다.',
    ]);
    expect(getContentStudioQa({ ...draft, rightsConfirmed: true })).toEqual([]);
  });

  it('does not carry an unsafe source URL into the UI draft', () => {
    const unsafeRecord = {
      ...indexedBest,
      source: { ...indexedBest.source, sourceUrl: 'javascript:alert(1)' },
    } satisfies PublicRecord;
    const unsafeProfile = {
      ...profile,
      summary: {
        ...profile.summary,
        indexedBest: unsafeRecord,
        seasonBest: null,
        latest: null,
      },
    } satisfies AthleteAnalyticsProfile;

    expect(createContentStudioDraft(unsafeProfile)?.sourceUrl).toBe('');
  });

  it('builds a bounded work packet from public facts', () => {
    const draft = createContentStudioDraft(profile);
    expect(draft).not.toBeNull();
    if (!draft) return;

    expect(JSON.parse(buildAgentWorkPacket(draft))).toEqual({
      task: 'athletetime_record_card_copy',
      sourceFacts: {
        athleteName: '김선수',
        team: '진도군청',
        eventLabel: '100m',
        record: '10.31',
        competitionName: '전국육상선수권',
        recordDate: '2026-06-01',
        sourceProvider: '대한육상연맹',
        sourceUrl: 'https://example.com/results/record-01',
      },
      currentCopy: {
        headline: '김선수 100m 10.31',
        body: '2026-06-01 전국육상선수권에서 확인된 공개 기록입니다.',
      },
      constraints: {
        factsOnly: true,
        headlineMax: 48,
        bodyMax: 220,
        output: 'strict_json',
      },
      responseSchema: { headline: 'string', body: 'string' },
    });
  });

  it('accepts only the two editable copy fields from an AI result', () => {
    expect(parseAgentResult('{"headline":"새 제목","body":"검증된 본문"}')).toEqual({
      headline: '새 제목',
      body: '검증된 본문',
    });
    expect(() => parseAgentResult('{"headline":"새 제목","body":"본문","record":"9.99"}'))
      .toThrow('AI 결과 JSON 형식을 확인해 주세요.');
  });

  it('restores only a complete, strict content draft', () => {
    const draft = createContentStudioDraft(profile);
    expect(draft).not.toBeNull();
    if (!draft) return;

    expect(parseStoredContentStudioDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parseStoredContentStudioDraft('{not-json')).toBeNull();
    expect(parseStoredContentStudioDraft(JSON.stringify({ ...draft, record: '9.99', extra: true }))).toBeNull();
    expect(parseStoredContentStudioDraft(JSON.stringify({ ...draft, sourceUrl: 'javascript:alert(1)' }))).toBeNull();
  });
});
