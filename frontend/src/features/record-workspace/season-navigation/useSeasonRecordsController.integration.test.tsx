import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsFilters, SeasonRecordTable } from '../../../api/recordAnalytics';
import { useSeasonRecordsController } from './useSeasonRecordsController';

type GetSeasonRecordTable = typeof import('../../../api/recordAnalytics').getSeasonRecordTable;

const api = vi.hoisted(() => ({
  getSeasonRecordTable: vi.fn<GetSeasonRecordTable>(),
}));

vi.mock('../../../api/recordAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/recordAnalytics')>();
  return {
    ...actual,
    getSeasonRecordTable: api.getSeasonRecordTable,
  };
});

const filters: AnalyticsFilters = {
  seasons: [2026, 2025],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [
    { key: 'men-all', label: '남자 전체', gender: 'men', level: 'all' },
    { key: 'women-high', label: '여자 고등부', gender: 'women', level: 'high' },
  ],
  genderOptions: [{ key: 'men', label: '남자' }, { key: 'women', label: '여자' }],
  levelOptions: [{ key: 'all', label: '전체' }, { key: 'high', label: '고등부' }],
  defaultSeasonSelection: {
    season: 2026,
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-all',
    divisionLabel: '남자 전체',
    genderKey: 'men',
    divisionLevel: 'all',
    rowCount: 1,
  },
  availableSeasonCombinations: [
    { season: 2026, eventKey: '100m', divisionKey: 'men-all' },
    { season: 2026, eventKey: '100m', divisionKey: 'women-high' },
    { season: 2025, eventKey: '200m', divisionKey: 'men-all' },
  ],
};

const table: SeasonRecordTable = {
  season: 2026,
  eventKey: '100m',
  divisionKey: 'women-high',
  eventLabel: '100m',
  divisionLabel: '여자 고등부',
  totalIndexedAthletes: 0,
  rows: [],
  filters: {
    seasons: filters.seasons,
    events: filters.events,
    divisions: filters.divisions,
    genderOptions: filters.genderOptions,
    levelOptions: filters.levelOptions,
    defaultSeasonSelection: filters.defaultSeasonSelection,
  },
  disclaimer: '모은 공개 기록 기준입니다.',
};

type BoundaryProps = {
  readonly observedSearch: { current: string };
};

function RecordsPageControllerBoundary({ observedSearch }: BoundaryProps) {
  const location = useLocation();
  useEffect(() => {
    observedSearch.current = location.search;
  }, [location.search, observedSearch]);

  useSeasonRecordsController({
    filters,
    athleteKey: '',
  });
  return null;
}

function installMinimalDom(): HTMLElement {
  class TestHTMLElement {}
  class TestHTMLIFrameElement {}
  const documentObject = {
    nodeType: 9,
    defaultView: globalThis,
    activeElement: null,
    addEventListener() {},
    removeEventListener() {},
  };
  const body = {
    nodeType: 1,
    nodeName: 'BODY',
    tagName: 'BODY',
    ownerDocument: documentObject,
    firstChild: null,
    lastChild: null,
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(documentObject, 'body', { value: body });
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: TestHTMLElement,
  });
  Object.defineProperty(globalThis, 'HTMLIFrameElement', {
    configurable: true,
    value: TestHTMLIFrameElement,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'node' },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: documentObject,
  });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
  return document.body;
}

describe('RecordsPage season controller boundary', () => {
  beforeEach(() => {
    api.getSeasonRecordTable.mockReset();
  });

  it('canonicalizes an invalid deep link before one valid table request', async () => {
    // Given an invalid tuple alongside unrelated query state.
    const observedSearch = { current: '' };
    const fetchedSearches: string[] = [];
    api.getSeasonRecordTable.mockImplementation(async () => {
      fetchedSearches.push(observedSearch.current);
      return table;
    });
    const root = createRoot(installMinimalDom());

    // When the RecordsPage controller boundary mounts and settles its effects.
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?flow=browse&q=kim&keep=1&season=2099&event=missing&division=women-high',
          ]}
        >
          <RecordsPageControllerBoundary observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    // Then replacement is canonical before fetch, preserves unrelated params,
    // and the replacement render does not trigger a second request.
    expect(api.getSeasonRecordTable).toHaveBeenCalledTimes(1);
    expect(api.getSeasonRecordTable).toHaveBeenCalledWith({
      season: 2026,
      eventKey: '100m',
      divisionKey: 'women-high',
      limit: 100,
    });
    expect(fetchedSearches).toHaveLength(1);
    const fetchedParams = new URLSearchParams(fetchedSearches[0] ?? '');
    expect(fetchedParams.get('season')).toBe('2026');
    expect(fetchedParams.get('event')).toBe('100m');
    expect(fetchedParams.get('division')).toBe('women-high');
    expect(fetchedParams.get('flow')).toBe('browse');
    expect(fetchedParams.get('q')).toBe('kim');
    expect(fetchedParams.get('keep')).toBe('1');

    await act(async () => {
      root.unmount();
    });
  });
});
