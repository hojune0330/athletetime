import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('./client', () => ({ apiClient: api }));

import {
  AnalyticsApiBoundaryError,
  getAnalyticsFilters,
  getAthleteAnalytics,
  getSeasonAvailability,
  getSeasonRecordTable,
  searchAthletes,
} from './recordAnalytics';

const filters = {
  seasons: [2026],
  events: [{ key: '100m', label: '100m' }],
  divisions: [{ key: 'men-high', label: '남자 고등부', gender: 'men', level: 'high' }],
  genderOptions: [{ key: 'men', label: '남자' }],
  levelOptions: [{ key: 'high', label: '고등부' }],
  defaultSeasonSelection: {
    season: 2026,
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-high',
    divisionLabel: '남자 고등부',
    genderKey: 'men',
    divisionLevel: 'high',
    rowCount: 1,
  },
};

const record = {
  id: 'record-1',
  athleteKey: 'athlete-1',
  name: '홍길동',
  team: '학교',
  season: 2026,
  competitionName: '대회',
  date: '2026-05-01',
  venue: '운동장',
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
    provider: 'AthleteTime',
    sourceType: 'public',
    sourceUrl: 'https://example.test/source',
    capturedAt: '2026-05-02',
  },
};

const candidate = {
  athleteKey: 'athlete-1',
  name: '홍길동',
  team: '학교',
  teams: ['학교'],
  years: [2026],
  events: ['100m'],
  divisions: ['남자 고등부'],
  recordCount: 1,
  ambiguity: 'name_team',
  note: '소속과 연도를 확인해 주세요.',
};

const profile = {
  athlete: candidate,
  summary: {
    indexedBest: record,
    seasonBest: record,
    latest: record,
    delta: null,
    indexedResultCount: 1,
    comparableResultCount: 1,
    sourceScope: 'public',
    disclaimer: '공개 기록',
  },
  events: [{ eventKey: '100m', eventLabel: '100m', recordCount: 1, best: record }],
  recordTrail: [{
    id: 'record-1',
    date: '2026-05-01',
    season: 2026,
    value: 10.5,
    record: '10.50',
    eventLabel: '100m',
    competitionName: '대회',
    isComparable: true,
  }],
  records: [record],
};

function response(data: unknown): { data: unknown } {
  return { data: { success: true, data } };
}

describe('record analytics API boundary', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('Given current filters When the 200 envelope is parsed Then the typed filter contract is returned', async () => {
    api.get.mockResolvedValue(response(filters));

    const parsed = await getAnalyticsFilters();

    expect(parsed).toEqual(filters);
  });

  it('Given legacy filters with embedded availability When parsed Then a typed boundary error rejects them', async () => {
    api.get.mockResolvedValue(response({
      ...filters,
      availableSeasonCombinations: [{ season: 2026, eventKey: '100m', divisionKey: 'men-high' }],
    }));

    const read = getAnalyticsFilters();

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/filters' });
  });

  it('Given malformed filters When a successful envelope is parsed Then a typed boundary error identifies the endpoint', async () => {
    api.get.mockResolvedValue(response({ seasons: ['not-a-season'] }));

    const read = getAnalyticsFilters();

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/filters' });
  });

  it('Given nested availability When parsed Then lookup data is retained and numeric seasons are newest-first', async () => {
    api.get.mockResolvedValue(response({
      seasons: {
        '2024': { '100m': ['women-high'] },
        '2026': { '100m': ['men-high'] },
      },
    }));

    const parsed = await getSeasonAvailability();

    expect(parsed.seasons['2026']?.['100m']).toEqual(['men-high']);
    expect(parsed.seasonOrder).toEqual([2026, 2024]);
    expect(api.get).toHaveBeenCalledWith('/api/card-studio/analytics/season-availability');
  });

  it('Given noncanonical availability keys and ordering When parsed Then the endpoint contract is rejected', async () => {
    api.get.mockResolvedValue(response({
      seasons: { '02026': { '100m': ['women-high', 'men-high'] } },
    }));

    const read = getSeasonAvailability();

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/season-availability' });
  });

  it('Given a canonical division filter When athletes are searched Then the query and parsed candidates match the wire contract', async () => {
    api.get.mockResolvedValue(response([candidate]));

    const parsed = await searchAthletes('홍길동', { divisionKey: 'men-high', limit: 5 });

    expect(parsed[0]?.athleteKey).toBe('athlete-1');
    expect(api.get).toHaveBeenCalledWith('/api/card-studio/analytics/records/search', {
      params: { q: '홍길동', limit: 5, divisionKey: 'men-high' },
    });
  });

  it('Given a search candidate with private provenance When parsed Then the successful envelope is rejected', async () => {
    api.get.mockResolvedValue(response([{ ...candidate, rawDivision: '남자고등부' }]));

    const read = searchAthletes('홍길동', { divisionKey: 'men-high' });

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/records/search' });
  });

  it('Given an ambiguous athlete payload When parsed Then candidates use the explicit result variant', async () => {
    api.get.mockResolvedValue(response({ ambiguity: 'multiple_candidates', candidates: [candidate] }));

    const result = await getAthleteAnalytics('legacy-key');

    expect(result).toEqual({ kind: 'ambiguous', candidates: [candidate] });
    expect(api.get).toHaveBeenCalledWith('/api/card-studio/analytics/athletes/legacy-key');
  });

  it.each(['남자부', '여자 고등학교 3학년부', '남고 / 여고', '중 2학년부', 'U20', 'M45', '통합부', '구분 미상'])('Given safe taxonomy provenance %s When parsed Then it uses the profile result variant', async (sourceDivisionLabel) => {
    const safeProfile = { ...profile, records: [{ ...record, sourceDivisionLabel }] };
    api.get.mockResolvedValue(response(safeProfile));

    const result = await getAthleteAnalytics('athlete-1');

    expect(result).toEqual({ kind: 'profile', profile: safeProfile });
  });

  it.each([{ kind: 'email', value: '남고 athlete@example.test' }, { kind: 'URL', value: 'https://example.test/남고' }, { kind: 'phone', value: '남고 010-1234-5678' }, { kind: 'control character', value: '남고\u0000' }, { kind: 'free text', value: '남고 홍길동 선수' }])('Given identity-bearing $kind provenance When parsed Then the boundary rejects it', async ({ value: sourceDivisionLabel }) => {
    api.get.mockResolvedValue(response({ ...profile, records: [{ ...record, sourceDivisionLabel }] }));

    const read = getAthleteAnalytics('athlete-1');

    await expect(read).rejects.toMatchObject({ name: 'AnalyticsApiBoundaryError', endpoint: '/athletes/:athleteKey' });
  });

  it('Given raw provenance inside an athlete profile When parsed Then the successful envelope is rejected', async () => {
    api.get.mockResolvedValue(response({
      athlete: candidate,
      summary: {
        indexedBest: { ...record, rawDivision: '남자고등부' },
        seasonBest: record,
        latest: record,
        delta: null,
        indexedResultCount: 1,
        comparableResultCount: 1,
        sourceScope: 'public',
        disclaimer: '공개 기록',
      },
      events: [],
      recordTrail: [],
      records: [record],
    }));

    const read = getAthleteAnalytics('athlete-1');

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/athletes/:athleteKey' });
  });

  it('Given a valid season table When parsed Then rows and current filters cross the API boundary', async () => {
    const table = {
      season: 2026,
      eventKey: '100m',
      divisionKey: 'men-high',
      eventLabel: '100m',
      divisionLabel: '남자 고등부',
      totalIndexedAthletes: 1,
      rows: [{
        rank: 1,
        athleteKey: 'athlete-1',
        name: '홍길동',
        team: '학교',
        record: '10.50',
        recordValue: 10.5,
        date: '2026-05-01',
        competitionName: '대회',
        divisionKey: 'men-high',
        divisionLabel: '남자 고등부',
        divisionLevel: 'high',
        divisionDetail: null,
        wind: null,
        windLegal: true,
        source: record.source,
        highlighted: false,
      }],
      filters,
      disclaimer: '공개 기록',
    };
    api.get.mockResolvedValue(response(table));

    const parsed = await getSeasonRecordTable({ season: 2026, eventKey: '100m', divisionKey: 'men-high' });

    expect(parsed).toEqual(table);
  });

  it('Given a malformed season table When parsed Then a typed boundary error identifies the endpoint', async () => {
    api.get.mockResolvedValue(response({
      season: 2026,
      eventKey: '100m',
      divisionKey: 'men-high',
      eventLabel: '100m',
      divisionLabel: '남자 고등부',
      totalIndexedAthletes: 1,
      rows: [{ rank: 'first' }],
      filters,
      disclaimer: '공개 기록',
    }));

    const read = getSeasonRecordTable({ season: 2026, eventKey: '100m', divisionKey: 'men-high' });

    await expect(read).rejects.toBeInstanceOf(AnalyticsApiBoundaryError);
    await expect(read).rejects.toMatchObject({ endpoint: '/season-records' });
  });
});
