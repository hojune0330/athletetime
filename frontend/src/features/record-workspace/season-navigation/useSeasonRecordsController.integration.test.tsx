import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeasonRecordTable } from '../../../api/recordAnalytics';
import {
  createSeasonNavigationCatalog,
  type SeasonNavigationCatalog,
  type SeasonSelection,
} from './seasonNavigation';
import {
  useSeasonRecordsController,
  type SeasonRecordsController,
} from './useSeasonRecordsController';

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

const catalog: SeasonNavigationCatalog = createSeasonNavigationCatalog({
  seasons: [2025, 2026],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [
    { key: 'men-general', label: '남자 일반부', gender: 'men', level: 'general' },
    { key: 'women-high', label: '여자 고등부', gender: 'women', level: 'high' },
  ],
  genderOptions: [{ key: 'men', label: '남자' }, { key: 'women', label: '여자' }],
  levelOptions: [{ key: 'general', label: '일반부' }, { key: 'high', label: '고등부' }],
  defaultSeasonSelection: {
    season: 2026,
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-general',
    divisionLabel: '남자 일반부',
    genderKey: 'men',
    divisionLevel: 'general',
    rowCount: 1,
  },
}, {
  seasonOrder: [2026, 2025],
  seasons: {
    '2026': { '100m': ['men-general', 'women-high'] },
    '2025': { '200m': ['men-general'] },
  },
});

function makeTable(selection: SeasonSelection): SeasonRecordTable {
  const divisionLabel = selection.divisionKey === 'women-high'
    ? '여자 고등부'
    : '남자 일반부';
  return {
    ...selection,
    eventLabel: selection.eventKey,
    divisionLabel,
    totalIndexedAthletes: 0,
    rows: [],
    filters: {
      seasons: catalog.seasons,
      events: catalog.events,
      divisions: catalog.divisions,
      genderOptions: catalog.genderOptions,
      levelOptions: catalog.levelOptions,
      defaultSeasonSelection: catalog.defaultSeasonSelection,
    },
    disclaimer: '모은 공개 기록 기준입니다.',
  };
}

type MutableCell<T> = { current: T };

type BoundaryControl = {
  readonly controller: SeasonRecordsController;
  readonly navigate: NavigateFunction;
  readonly setEnabled: (enabled: boolean) => void;
};

type BoundaryProps = {
  readonly control: MutableCell<BoundaryControl | null>;
  readonly observedSearch: MutableCell<string>;
  readonly initiallyEnabled?: boolean;
};

function RecordsPageControllerBoundary({
  control,
  observedSearch,
  initiallyEnabled = true,
}: BoundaryProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  observedSearch.current = location.search;
  const controller = useSeasonRecordsController({
    filters: catalog,
    athleteKey: '',
    enabled,
  });
  useEffect(() => {
    control.current = { controller, navigate, setEnabled };
    return () => {
      control.current = null;
    };
  }, [control, controller, navigate]);
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

function requireControl(control: MutableCell<BoundaryControl | null>): BoundaryControl {
  if (!control.current) throw new Error('Controller boundary has not mounted');
  return control.current;
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = (value) => {
    throw new Error('Deferred promise resolved before initialization: ' + String(value));
  };
  let reject: (reason?: unknown) => void = (reason) => {
    throw new Error('Deferred promise rejected before initialization: ' + String(reason));
  };
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function settleEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('RecordsPage season controller boundary', () => {
  beforeEach(() => {
    api.getSeasonRecordTable.mockReset();
  });

  it('canonicalizes an invalid deep link before one valid table request', async () => {
    // Given an invalid tuple alongside unrelated query state.
    const observedSearch = { current: '' };
    const control = { current: null };
    const fetchedSearches: string[] = [];
    api.getSeasonRecordTable.mockImplementation(async () => {
      fetchedSearches.push(observedSearch.current);
      return makeTable({ season: 2026, eventKey: '100m', divisionKey: 'women-high' });
    });
    const root = createRoot(installMinimalDom());

    // When the controller mounts and settles its replacement navigation.
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?flow=browse&q=kim&keep=1&season=2099&event=missing&division=women-high',
          ]}
        >
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    // Then the canonical URL exists before fetch and unrelated params survive.
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

    await act(async () => root.unmount());
  });

  it('writes a default tuple before the first request when browse URL has no tuple', async () => {
    // Given season browsing without selection params.
    const observedSearch = { current: '' };
    const control = { current: null };
    const fetchedSearches: string[] = [];
    api.getSeasonRecordTable.mockImplementation(async () => {
      fetchedSearches.push(observedSearch.current);
      return makeTable({ season: 2026, eventKey: '100m', divisionKey: 'men-general' });
    });
    const root = createRoot(installMinimalDom());

    // When the boundary mounts.
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/records?flow=browse&keep=1']}>
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    // Then no table request sees the pre-canonical URL.
    expect(api.getSeasonRecordTable).toHaveBeenCalledTimes(1);
    const fetchedParams = new URLSearchParams(fetchedSearches[0] ?? '');
    expect(fetchedParams.get('season')).toBe('2026');
    expect(fetchedParams.get('event')).toBe('100m');
    expect(fetchedParams.get('division')).toBe('men-general');
    expect(fetchedParams.get('keep')).toBe('1');

    await act(async () => root.unmount());
  });

  it('does not select or request a hidden default outside season browse mode', async () => {
    // Given a canonical tuple while the owning page is not in season mode.
    const observedSearch = { current: '' };
    const control = { current: null };
    const root = createRoot(installMinimalDom());

    // When the disabled controller mounts.
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/records?season=2026&event=100m&division=men-general']}>
          <RecordsPageControllerBoundary
            control={control}
            observedSearch={observedSearch}
            initiallyEnabled={false}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    // Then neither hidden selection state nor a table request exists.
    expect(api.getSeasonRecordTable).not.toHaveBeenCalled();
    expect(requireControl(control).controller.selection).toBeNull();
    expect(requireControl(control).controller.state).toBe('idle');

    await act(async () => root.unmount());
  });

  it('drops the later tuple when back navigation returns to a clean disabled URL', async () => {
    // Given a loaded season tuple.
    const observedSearch = { current: '' };
    const control = { current: null };
    api.getSeasonRecordTable.mockResolvedValue(
      makeTable({ season: 2026, eventKey: '100m', divisionKey: 'women-high' }),
    );
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?keep=1&season=2026&event=100m&division=women-high',
          ]}
        >
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    expect(requireControl(control).controller.selection?.divisionKey).toBe('women-high');

    // When page navigation leaves season mode and restores its clean URL.
    await act(async () => {
      const boundary = requireControl(control);
      boundary.setEnabled(false);
      boundary.navigate('/records?keep=1');
      await Promise.resolve();
    });

    // Then no in-memory tuple or table survives the URL transition.
    expect(requireControl(control).controller.selection).toBeNull();
    expect(requireControl(control).controller.table).toBeNull();
    expect(requireControl(control).controller.state).toBe('idle');
    expect(api.getSeasonRecordTable).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
  });

  it('replays URL selections through actual back and forward history navigation', async () => {
    // Given two valid season URLs in browser history with the later one active.
    const observedSearch = { current: '' };
    const control = { current: null };
    const requests: Array<[number, string, string]> = [];
    api.getSeasonRecordTable.mockImplementation(async (request) => {
      if (
        request.season === undefined
        || request.eventKey === undefined
        || request.divisionKey === undefined
      ) throw new TypeError('Expected a complete season request');
      const selection: SeasonSelection = {
        season: request.season,
        eventKey: request.eventKey,
        divisionKey: request.divisionKey,
      };
      requests.push([selection.season, selection.eventKey, selection.divisionKey]);
      return makeTable(selection);
    });
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?season=2026&event=100m&division=women-high',
            '/records?season=2025&event=200m&division=men-general',
          ]}
          initialIndex={1}
        >
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    await settleEffects();
    expect(requireControl(control).controller.selection?.season).toBe(2025);

    // When history moves back to A and forward to B.
    await act(async () => {
      requireControl(control).navigate(-1);
      await Promise.resolve();
    });
    await settleEffects();
    expect(requireControl(control).controller.selection).toEqual({
      season: 2026,
      eventKey: '100m',
      divisionKey: 'women-high',
    });
    await act(async () => {
      requireControl(control).navigate(1);
      await Promise.resolve();
    });
    await settleEffects();

    // Then each visible selection comes only from its restored URL.
    expect(requireControl(control).controller.selection).toEqual({
      season: 2025,
      eventKey: '200m',
      divisionKey: 'men-general',
    });
    expect(requests).toEqual([
      [2025, '200m', 'men-general'],
      [2026, '100m', 'women-high'],
      [2025, '200m', 'men-general'],
    ]);

    await act(async () => root.unmount());
  });

  it('keeps the newest table when an older athlete request fails late', async () => {
    // Given an A request that remains pending while the URL changes to B.
    const observedSearch = { current: '' };
    const control = { current: null };
    const requestA = deferred<SeasonRecordTable>();
    const requestB = deferred<SeasonRecordTable>();
    api.getSeasonRecordTable.mockImplementation((request) =>
      request.season === 2026 ? requestA.promise : requestB.promise,
    );
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?season=2026&event=100m&division=women-high',
          ]}
        >
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    expect(api.getSeasonRecordTable).toHaveBeenCalledTimes(1);

    // When B resolves first and the stale A request errors afterwards.
    await act(async () => {
      requireControl(control).controller.replaceSelection({
        season: 2025,
        eventKey: '200m',
        divisionKey: 'men-general',
      });
      await Promise.resolve();
    });
    expect(api.getSeasonRecordTable).toHaveBeenCalledTimes(2);
    await act(async () => {
      requestB.resolve(makeTable({
        season: 2025,
        eventKey: '200m',
        divisionKey: 'men-general',
      }));
      await requestB.promise;
    });
    await act(async () => {
      requestA.reject(new Error('late A failure'));
      await requestA.promise.catch(() => undefined);
    });

    // Then B remains ready and A cannot overwrite it with an error.
    expect(requireControl(control).controller.state).toBe('ready');
    expect(requireControl(control).controller.table?.season).toBe(2025);
    expect(requireControl(control).controller.table?.divisionKey).toBe('men-general');

    await act(async () => root.unmount());
  });

  it('keeps a valid empty table visible as ready data', async () => {
    // Given a successful response with zero rows.
    const observedSearch = { current: '' };
    const control = { current: null };
    api.getSeasonRecordTable.mockResolvedValue(
      makeTable({ season: 2026, eventKey: '100m', divisionKey: 'men-general' }),
    );
    const root = createRoot(installMinimalDom());

    // When the table settles.
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?season=2026&event=100m&division=men-general',
          ]}
        >
          <RecordsPageControllerBoundary control={control} observedSearch={observedSearch} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    await settleEffects();

    // Then empty data is ready, not an error or missing table.
    expect(requireControl(control).controller.state).toBe('ready');
    expect(requireControl(control).controller.table?.rows).toEqual([]);

    await act(async () => root.unmount());
  });
});
