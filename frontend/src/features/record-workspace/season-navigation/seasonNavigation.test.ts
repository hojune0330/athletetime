import { describe, expect, it } from 'vitest';
import type { AnalyticsFilters } from '../../../api/recordAnalytics';
import {
  changeSeasonSelection,
  findNearestSeasonSelection,
  getSeasonNavigationOptions,
  readSeasonSelectionRequest,
  resolveAthleteSeasonSelection,
  resolveSeasonSelection,
  seasonSelectionParamsNeedRepair,
  updateSeasonSelectionParams,
  type SeasonSelection,
} from './seasonNavigation';

const filters: AnalyticsFilters = {
  seasons: [2026, 2025, 2024],
  events: [{ key: '100m', label: '100m' }, { key: '200m', label: '200m' }],
  divisions: [
    { key: 'men-all', label: '남자 전체', gender: 'men', level: 'all' },
    { key: 'men-high', label: '남자 고등부', gender: 'men', level: 'high' },
    { key: 'women-all', label: '여자 전체', gender: 'women', level: 'all' },
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
    rowCount: 2,
  },
  availableSeasonCombinations: [
    { season: 2026, eventKey: '100m', divisionKey: 'men-all' },
    { season: 2026, eventKey: '100m', divisionKey: 'women-high' },
    { season: 2026, eventKey: '200m', divisionKey: 'men-high' },
    { season: 2025, eventKey: '100m', divisionKey: 'men-all' },
    { season: 2025, eventKey: '200m', divisionKey: 'women-all' },
    { season: 2024, eventKey: '100m', divisionKey: 'women-high' },
  ],
};

const womenHigh2026: SeasonSelection = {
  season: 2026,
  eventKey: '100m',
  divisionKey: 'women-high',
};

describe('season navigation selection', () => {
  it('keeps a valid deep link and derives only context-valid controls', () => {
    // Given a complete valid tuple.
    const params = new URLSearchParams('flow=browse&season=2026&event=100m&division=women-high');

    // When it is resolved.
    const request = readSeasonSelectionRequest(params);
    const selection = resolveSeasonSelection(filters, request);
    const options = selection ? getSeasonNavigationOptions(filters, selection) : null;

    // Then only available children are advertised.
    expect(selection).toEqual(womenHigh2026);
    expect(options?.events.map((option) => option.key)).toEqual(['100m', '200m']);
    expect(options?.genders.map((option) => option.key)).toEqual(['men', 'women']);
    expect(options?.levels.map((option) => option.key)).toEqual(['high']);
    expect(seasonSelectionParamsNeedRepair(params, womenHigh2026)).toBe(false);
  });

  it('repairs invalid explicit state without dropping unrelated params', () => {
    // Given an unavailable year and event.
    const params = new URLSearchParams('flow=browse&q=kim&season=2099&event=missing&division=women-high');

    // When it is resolved and rewritten.
    const request = readSeasonSelectionRequest(params);
    const selection = resolveSeasonSelection(filters, request);
    const updated = selection ? updateSeasonSelectionParams(params, selection) : params;

    // Then nearest valid state is canonical and unrelated params survive.
    expect(selection).toEqual(womenHigh2026);
    expect(selection ? seasonSelectionParamsNeedRepair(params, selection) : false).toBe(true);
    expect(updated.get('q')).toBe('kim');
    expect(updated.get('flow')).toBe('browse');
    expect(updated.get('season')).toBe('2026');
    expect(updated.get('event')).toBe('100m');
    expect(updated.get('division')).toBe('women-high');
  });

  it('preserves a valid event and repairs only its unavailable child division', () => {
    // Given a 2026 tuple whose event but not division exists in 2025.
    const current: SeasonSelection = { season: 2026, eventKey: '200m', divisionKey: 'men-high' };

    // When the season changes.
    const updated = changeSeasonSelection(filters, current, { kind: 'season', season: 2025 });

    // Then only the child division falls back.
    expect(updated).toEqual({ season: 2025, eventKey: '200m', divisionKey: 'women-all' });
  });

  it('finds the closest alternate season for explicit empty recovery', () => {
    // Given the same event and division in an adjacent season.
    const current: SeasonSelection = { season: 2026, eventKey: '100m', divisionKey: 'men-all' };

    // When recovery is requested.
    const recovery = findNearestSeasonSelection(filters, current);

    // Then it returns the closest real tuple.
    expect(recovery).toEqual({ season: 2025, eventKey: '100m', divisionKey: 'men-all' });
  });

  it('serializes the resolved mine athlete tuple before browse navigation', async () => {
    // Given a mine action whose athlete record resolves after the current default tuple.
    const params = new URLSearchParams('flow=mine&step=done&q=kim&keep=1');
    const athleteRecord = {
      season: 2024,
      eventKey: '100m',
      divisionKey: 'women-high',
    };

    // When the async athlete result is resolved before URL navigation.
    const selection = await Promise.resolve(resolveAthleteSeasonSelection(filters, athleteRecord));
    if (!selection) throw new Error('Expected an athlete-derived season selection.');
    const next = updateSeasonSelectionParams(params, selection);
    next.set('flow', 'browse');
    next.set('browse', 'season');
    next.delete('step');

    // Then URL, displayed tuple, and preserved state all use the athlete-derived selection.
    expect(selection).toEqual({ season: 2024, eventKey: '100m', divisionKey: 'women-high' });
    expect(next.get('season')).toBe('2024');
    expect(next.get('event')).toBe('100m');
    expect(next.get('division')).toBe('women-high');
    expect(next.get('flow')).toBe('browse');
    expect(next.get('browse')).toBe('season');
    expect(next.get('q')).toBe('kim');
    expect(next.get('keep')).toBe('1');
    expect(next.has('step')).toBe(false);
  });
});
