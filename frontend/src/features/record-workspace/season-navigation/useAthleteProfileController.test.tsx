import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AthleteAnalyticsProfile,
  AthleteSearchCard,
  PublicRecord,
} from '../../../api/recordAnalytics';
import {
  useAthleteProfileController,
  type AthleteProfileController,
} from './useAthleteProfileController';
import { useCanonicalAthleteProfileParam } from './useCanonicalAthleteProfileParam';

type GetAthleteAnalytics = typeof import('../../../api/recordAnalytics').getAthleteAnalytics;

const api = vi.hoisted(() => ({
  getAthleteAnalytics: vi.fn<GetAthleteAnalytics>(),
}));

vi.mock('../../../api/recordAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/recordAnalytics')>();
  return {
    ...actual,
    getAthleteAnalytics: api.getAthleteAnalytics,
  };
});

function candidate(athleteKey: string): AthleteSearchCard {
  return {
    athleteKey,
    name: athleteKey === 'athlete-b' ? '선수 B' : '선수 A',
    team: '테스트 팀',
    teams: ['테스트 팀'],
    years: [2026],
    events: ['100m'],
    divisions: ['남자 일반부'],
    recordCount: 1,
    ambiguity: 'name_team',
    note: '소속과 연도를 확인해 주세요.',
  };
}

function profile(athleteKey: string): AthleteAnalyticsProfile {
  const athlete = candidate(athleteKey);
  const record: PublicRecord = {
    id: `record-${athleteKey}`,
    athleteKey,
    name: athlete.name,
    team: athlete.team,
    season: 2026,
    competitionName: '테스트 대회',
    date: '2026-05-01',
    venue: '테스트 경기장',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-general',
    divisionLabel: '남자 일반부',
    gender: 'men',
    divisionLevel: 'general',
    divisionDetail: null,
    sourceDivisionLabel: '남자부',
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
  return {
    athlete,
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
      id: record.id,
      date: record.date,
      season: record.season,
      value: record.recordValue,
      record: record.record,
      eventLabel: record.eventLabel,
      competitionName: record.competitionName,
      isComparable: record.isComparable,
    }],
    records: [record],
  };
}

type MutableCell<T> = { current: T };

type CanonicalParamControl = {
  readonly locationSearch: string;
  readonly navigateBack: () => void;
  readonly profileKey: string | null;
};

function ProfileBoundary({
  athleteKey,
  control,
}: {
  readonly athleteKey: string;
  readonly control: MutableCell<AthleteProfileController | null>;
}) {
  control.current = useAthleteProfileController(athleteKey);
  return null;
}

function CanonicalParamBoundary({
  control,
  controller,
}: {
  readonly control: MutableCell<CanonicalParamControl | null>;
  readonly controller: AthleteProfileController;
}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedAthleteParam = (params.get('athlete') || '').trim();
  const selectedProfile = useCanonicalAthleteProfileParam(selectedAthleteParam, controller);
  control.current = {
    locationSearch: location.search,
    navigateBack: () => void navigate(-1),
    profileKey: selectedProfile?.athlete.athleteKey ?? null,
  };
  return null;
}

function requireController(
  control: MutableCell<AthleteProfileController | null>,
): AthleteProfileController {
  if (!control.current) throw new Error('Profile controller has not rendered');
  return control.current;
}

function requireCanonicalParamControl(
  control: MutableCell<CanonicalParamControl | null>,
): CanonicalParamControl {
  if (!control.current) throw new Error('Canonical parameter boundary has not rendered');
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

describe('athlete profile controller', () => {
  beforeEach(() => {
    api.getAthleteAnalytics.mockReset();
  });

  it('keeps athlete B when athlete A fails after B has loaded', async () => {
    // Given athlete A is pending and the page changes to athlete B.
    const requestA = deferred<Awaited<ReturnType<GetAthleteAnalytics>>>();
    const requestB = deferred<Awaited<ReturnType<GetAthleteAnalytics>>>();
    api.getAthleteAnalytics.mockImplementation((athleteKey) =>
      athleteKey === 'athlete-a' ? requestA.promise : requestB.promise,
    );
    const control: MutableCell<AthleteProfileController | null> = { current: null };
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(<ProfileBoundary athleteKey="athlete-a" control={control} />);
      await Promise.resolve();
    });

    // When B resolves before A's late error.
    await act(async () => {
      root.render(<ProfileBoundary athleteKey="athlete-b" control={control} />);
      await Promise.resolve();
    });
    await act(async () => {
      requestB.resolve({ kind: 'profile', profile: profile('athlete-b') });
      await requestB.promise;
    });
    await act(async () => {
      requestA.reject(new Error('late A failure'));
      await requestA.promise.catch(() => undefined);
    });

    // Then only B remains ready.
    expect(requireController(control).state).toBe('ready');
    expect(requireController(control).profile?.athlete.athleteKey).toBe('athlete-b');
    expect(requireController(control).candidates).toEqual([]);
    expect(requireController(control).requestedAthleteKey).toBe('athlete-b');

    await act(async () => root.unmount());
  });

  it('exposes ambiguity without selecting the first candidate', async () => {
    // Given an ambiguous profile response.
    const candidates = [candidate('athlete-a'), candidate('athlete-b')];
    api.getAthleteAnalytics.mockResolvedValue({ kind: 'ambiguous', candidates });
    const control: MutableCell<AthleteProfileController | null> = { current: null };
    const root = createRoot(installMinimalDom());

    // When the response settles.
    await act(async () => {
      root.render(<ProfileBoundary athleteKey="legacy-name" control={control} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Then candidates are visible but no profile is auto-selected.
    expect(requireController(control).state).toBe('ambiguous');
    expect(requireController(control).profile).toBeNull();
    expect(requireController(control).candidates).toEqual(candidates);
    expect(requireController(control).requestedAthleteKey).toBe('legacy-name');

    await act(async () => root.unmount());
  });

  it('returns to idle when the URL athlete key is cleared', async () => {
    // Given a loaded athlete profile.
    api.getAthleteAnalytics.mockResolvedValue({ kind: 'profile', profile: profile('athlete-a') });
    const control = { current: null };
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(<ProfileBoundary athleteKey="athlete-a" control={control} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(requireController(control).state).toBe('ready');

    // When clean navigation removes the athlete key.
    await act(async () => {
      root.render(<ProfileBoundary athleteKey="" control={control} />);
      await Promise.resolve();
    });

    // Then no later in-memory athlete survives.
    expect(requireController(control).state).toBe('idle');
    expect(requireController(control).profile).toBeNull();
    expect(requireController(control).candidates).toEqual([]);
    expect(requireController(control).requestedAthleteKey).toBe('');

    await act(async () => root.unmount());
  });

  it('accepts a canonical profile for a unique legacy alias and replaces its URL entry', async () => {
    // Given a legacy URL whose completed request uniquely resolved to a canonical athlete key.
    const legacyKey = 'at_legacy_runner';
    const canonicalKey = 'aaaaaaaaaaaaaaaa';
    const controller: AthleteProfileController = {
      candidates: [],
      profile: profile(canonicalKey),
      requestedAthleteKey: legacyKey,
      state: 'ready',
    };
    const control: MutableCell<CanonicalParamControl | null> = { current: null };
    const root = createRoot(installMinimalDom());

    // When the canonical profile is consumed by the URL boundary.
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?flow=browse',
            `/records?athlete=${legacyKey}&flow=browse`,
          ]}
          initialIndex={1}
        >
          <CanonicalParamBoundary control={control} controller={controller} />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Then unrelated params survive and Back skips the replaced legacy entry.
    expect(requireCanonicalParamControl(control).locationSearch).toBe(`?athlete=${canonicalKey}&flow=browse`);
    expect(requireCanonicalParamControl(control).profileKey).toBe(canonicalKey);
    await act(async () => {
      requireCanonicalParamControl(control).navigateBack();
      await Promise.resolve();
    });
    expect(requireCanonicalParamControl(control).locationSearch).toBe('?flow=browse');

    await act(async () => root.unmount());
  });

  it('does not let a late legacy response override Back navigation', async () => {
    // Given a legacy request that is still loading at a URL with a previous clean entry.
    const legacyKey = 'at_legacy_runner';
    const canonicalKey = 'aaaaaaaaaaaaaaaa';
    const loadingController: AthleteProfileController = {
      candidates: [],
      profile: null,
      requestedAthleteKey: legacyKey,
      state: 'loading',
    };
    const control: MutableCell<CanonicalParamControl | null> = { current: null };
    const root = createRoot(installMinimalDom());
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?flow=browse',
            `/records?athlete=${legacyKey}&flow=browse`,
          ]}
          initialIndex={1}
        >
          <CanonicalParamBoundary control={control} controller={loadingController} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    // When Back clears the athlete before the legacy response is presented.
    await act(async () => {
      requireCanonicalParamControl(control).navigateBack();
      await Promise.resolve();
    });
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/records?flow=browse',
            `/records?athlete=${legacyKey}&flow=browse`,
          ]}
          initialIndex={1}
        >
          <CanonicalParamBoundary
            control={control}
            controller={{
              candidates: [],
              profile: profile(canonicalKey),
              requestedAthleteKey: legacyKey,
              state: 'ready',
            }}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Then the clean URL remains authoritative.
    expect(requireCanonicalParamControl(control).locationSearch).toBe('?flow=browse');
    expect(requireCanonicalParamControl(control).profileKey).toBeNull();

    await act(async () => root.unmount());
  });

  it('keeps an ambiguous legacy alias in the URL without choosing a candidate', async () => {
    // Given an ambiguous legacy response with explicit candidates only.
    const legacyKey = 'at_ambiguous_runner';
    const controller: AthleteProfileController = {
      candidates: [candidate('athlete-a'), candidate('athlete-b')],
      profile: null,
      requestedAthleteKey: legacyKey,
      state: 'ambiguous',
    };
    const control: MutableCell<CanonicalParamControl | null> = { current: null };
    const root = createRoot(installMinimalDom());

    // When the ambiguity reaches the URL boundary.
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/records?athlete=${legacyKey}&flow=browse`]}>
          <CanonicalParamBoundary control={control} controller={controller} />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Then neither the URL nor selected profile is rewritten.
    expect(requireCanonicalParamControl(control).locationSearch).toBe(`?athlete=${legacyKey}&flow=browse`);
    expect(requireCanonicalParamControl(control).profileKey).toBeNull();

    await act(async () => root.unmount());
  });
});
