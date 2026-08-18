import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('./client', () => ({ apiClient: api }))

import {
  previewRecordWorkspace,
  RecordWorkspaceApiBoundaryError,
} from './recordWorkspace'

const LEGACY_KEY = 'at_legacy_runner'
const CANONICAL_KEY = 'aaaaaaaaaaaaaaaa'
const OTHER_CANONICAL_KEY = 'bbbbbbbbbbbbbbbb'

function previewPayload(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    subjects: [{
      athleteKey: CANONICAL_KEY,
      name: '가람',
      team: '서울고',
      teams: ['서울고'],
      years: [2026],
      events: ['100m'],
      divisions: ['남자 고등부'],
      recordCount: 1,
      ambiguity: 'name_team',
      note: '',
    }],
    resolvedSubjectKeys: [{ requestedSubjectKey: LEGACY_KEY, athleteKey: CANONICAL_KEY }],
    unavailableSubjectKeys: [],
    identity: { displayName: '가람', distinctNames: ['가람'], warning: 'none' },
    affiliations: [],
    coverage: {
      totalMatched: 0,
      returned: 0,
      hasMore: false,
      nextCursor: null,
      observedSeasons: [],
      competitionCount: 0,
      sourceCount: 0,
      lastCapturedAt: null,
      qualityState: 'visible_index',
    },
    events: [],
    records: [],
    ...changes,
  }
}

function response(data: unknown): { readonly data: unknown } {
  return { data: { success: true, data } }
}

function workspaceRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'record-1',
    athleteKey: CANONICAL_KEY,
    name: '가람',
    team: '서울고',
    season: 2026,
    competitionName: '전국체전',
    date: '2026-05-01',
    venue: '주경기장',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    gender: 'men',
    divisionLevel: 'high',
    divisionDetail: null,
    sourceDivisionLabel: '남고',
    phase: 'final',
    record: '10.50',
    recordValue: 10.5,
    direction: 'lower',
    rank: 1,
    wind: null,
    windLegal: true,
    isComparable: true,
    note: '',
    source: {
      provider: 'KAAF',
      sourceType: 'public_result',
      sourceLabel: '공개 경기결과',
      sourceUrl: 'https://example.test/result',
      capturedAt: '2026-05-01T00:00:00.000Z',
    },
    ...overrides,
  }
}

describe('record workspace API boundary', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  it('returns a strictly parsed preview and preserves the requested-to-canonical mapping', async () => {
    api.post.mockResolvedValue(response(previewPayload()))

    const parsed = await previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })

    expect(parsed.resolvedSubjectKeys).toEqual([{
      requestedSubjectKey: LEGACY_KEY,
      athleteKey: CANONICAL_KEY,
    }])
    expect(parsed.subjects[0]?.athleteKey).toBe(CANONICAL_KEY)
  })

  it('parses direct and unique-alias mappings together', async () => {
    api.post.mockResolvedValue(response(previewPayload({
      subjects: [
        {
          athleteKey: CANONICAL_KEY,
          name: '가람',
          team: '서울고',
          teams: ['서울고'],
          years: [2026],
          events: ['100m'],
          divisions: ['남자 고등부'],
          recordCount: 1,
          ambiguity: 'name_team',
          note: '',
        },
        {
          athleteKey: OTHER_CANONICAL_KEY,
          name: '나래',
          team: '부산고',
          teams: ['부산고'],
          years: [2026],
          events: ['200m'],
          divisions: ['여자 고등부'],
          recordCount: 1,
          ambiguity: 'name_team',
          note: '',
        },
      ],
      resolvedSubjectKeys: [
        { requestedSubjectKey: CANONICAL_KEY, athleteKey: CANONICAL_KEY },
        { requestedSubjectKey: LEGACY_KEY, athleteKey: OTHER_CANONICAL_KEY },
      ],
    })))

    const parsed = await previewRecordWorkspace({ subjectKeys: [CANONICAL_KEY, LEGACY_KEY] })

    expect(parsed.resolvedSubjectKeys).toEqual([
      { requestedSubjectKey: CANONICAL_KEY, athleteKey: CANONICAL_KEY },
      { requestedSubjectKey: LEGACY_KEY, athleteKey: OTHER_CANONICAL_KEY },
    ])
  })

  it('rejects a mapping whose requested key was not submitted', async () => {
    api.post.mockResolvedValue(response(previewPayload({
      resolvedSubjectKeys: [{ requestedSubjectKey: 'at_other_runner', athleteKey: CANONICAL_KEY }],
    })))

    const read = previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })

    await expect(read).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
    await expect(read).rejects.toMatchObject({ endpoint: '/api/card-studio/analytics/record-workspaces/preview' })
  })

  it('rejects a mapping whose canonical key is not an existing athlete key', async () => {
    api.post.mockResolvedValue(response(previewPayload({
      resolvedSubjectKeys: [{ requestedSubjectKey: LEGACY_KEY, athleteKey: 'not-a-key' }],
    })))

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it('rejects duplicate requested-to-canonical mappings', async () => {
    api.post.mockResolvedValue(response(previewPayload({
      resolvedSubjectKeys: [
        { requestedSubjectKey: LEGACY_KEY, athleteKey: CANONICAL_KEY },
        { requestedSubjectKey: LEGACY_KEY, athleteKey: CANONICAL_KEY },
      ],
    })))

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it('rejects extra fields instead of dropping them at the preview boundary', async () => {
    api.post.mockResolvedValue(response(previewPayload({
      resolvedSubjectKeys: [{ requestedSubjectKey: LEGACY_KEY, athleteKey: CANONICAL_KEY, extra: 'drop-me' }],
    })))

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it('rejects a submitted key with an invalid athlete-key format', async () => {
    const malformedKey = 'not-an-athlete-key'
    api.post.mockResolvedValue(response(previewPayload({
      resolvedSubjectKeys: [{ requestedSubjectKey: malformedKey, athleteKey: CANONICAL_KEY }],
    })))

    await expect(previewRecordWorkspace({ subjectKeys: [malformedKey] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it('rejects version-skewed envelopes instead of accepting extra fields', async () => {
    api.post.mockResolvedValue({ data: { success: true, version: 2, data: previewPayload() } })

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it('accepts a valid canonical division and constrained provenance label', async () => {
    api.post.mockResolvedValue(response(previewPayload({ records: [workspaceRecord()] })))

    const parsed = await previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })

    expect(parsed.records[0]?.divisionKey).toBe('men-high')
    expect(parsed.records[0]?.sourceDivisionLabel).toBe('남고')
  })

  it.each([
    ['aggregate division key', { divisionKey: 'men-all' }],
    ['arbitrary division key', { divisionKey: 'men-open-invitational' }],
  ])('rejects a %s at the workspace boundary', async (_caseName, overrides) => {
    api.post.mockResolvedValue(response(previewPayload({ records: [workspaceRecord(overrides)] })))

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })

  it.each([
    ['overlong', '남고'.repeat(21)],
    ['free-text', '남고 경기 결과 홍길동'],
    ['identity-bearing', '남고 athlete@example.test'],
  ])('rejects %s source division provenance', async (_caseName, sourceDivisionLabel) => {
    api.post.mockResolvedValue(response(previewPayload({ records: [workspaceRecord({ sourceDivisionLabel })] })))

    await expect(previewRecordWorkspace({ subjectKeys: [LEGACY_KEY] })).rejects.toBeInstanceOf(RecordWorkspaceApiBoundaryError)
  })
})
