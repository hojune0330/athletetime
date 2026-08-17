import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnalyticsFilters, SeasonAvailability, SeasonRecordTable } from '../../../api/recordAnalytics';
import { createSeasonNavigationCatalog } from './seasonNavigation';
import { SeasonRecordsPanel } from './SeasonRecordsPanel';

const baseFilters: AnalyticsFilters = {
  seasons: [2026, 2025],
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
};

const availability: SeasonAvailability = {
  seasonOrder: [2026, 2025],
  seasons: {
    '2026': {
      '100m': ['men-general', 'women-high'],
      '200m': ['women-high'],
    },
    '2025': { '100m': ['men-general'] },
  },
};

const filters = createSeasonNavigationCatalog(baseFilters, availability);

const emptyTable: SeasonRecordTable = {
  season: 2026,
  eventKey: '100m',
  divisionKey: 'men-general',
  eventLabel: '100m',
  divisionLabel: '남자 일반부',
  totalIndexedAthletes: 0,
  rows: [],
  filters: {
    seasons: baseFilters.seasons,
    events: baseFilters.events,
    divisions: baseFilters.divisions,
    genderOptions: baseFilters.genderOptions,
    levelOptions: baseFilters.levelOptions,
    defaultSeasonSelection: baseFilters.defaultSeasonSelection,
  },
  disclaimer: '모은 공개 기록 기준입니다.',
};

const populatedTable: SeasonRecordTable = {
  ...emptyTable,
  totalIndexedAthletes: 1,
  rows: [{
    rank: 1,
    athleteKey: 'athlete-1',
    name: '김선수',
    team: '서울고',
    record: '10.50',
    recordValue: 10.5,
    date: '2026-06-01',
    competitionName: '테스트대회',
    divisionKey: 'men-general',
    divisionLabel: '남자 일반부',
    divisionLevel: 'general',
    divisionDetail: null,
    wind: null,
    windLegal: true,
    source: {
      provider: 'KAAF',
      sourceType: 'public_result',
      sourceUrl: 'https://example.com/result',
      capturedAt: '2026-06-02T00:00:00.000Z',
    },
    highlighted: false,
  }],
};

describe('season records panel', () => {
  it('uses named native controls in dependency order and exposes pressed gender state', () => {
    // Given a valid season selection.
    const html = renderToStaticMarkup(
      <SeasonRecordsPanel
        filters={filters}
        selection={{ season: 2026, eventKey: '100m', divisionKey: 'men-general' }}
        table={null}
        state="loading"
        highlightedRow={null}
        onSelectionChange={() => undefined}
        onRetry={() => undefined}
      />,
    );

    // When keyboard users traverse the native controls.
    const seasonIndex = html.indexOf('id="season-records-season"');
    const eventIndex = html.indexOf('id="season-records-event"');
    const genderIndex = html.indexOf('<fieldset');
    const divisionIndex = html.indexOf('id="season-records-division"');

    // Then semantics and DOM order describe the dependency chain.
    expect(html).toContain('for="season-records-season"');
    expect(html).toContain('for="season-records-event"');
    expect(html).toContain('<legend');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(seasonIndex).toBeGreaterThan(-1);
    expect(eventIndex).toBeGreaterThan(seasonIndex);
    expect(genderIndex).toBeGreaterThan(eventIndex);
    expect(divisionIndex).toBeGreaterThan(genderIndex);
  });

  it('announces a valid empty response and offers recovery without redirecting during render', () => {
    // Given a valid tuple whose API response contains no rows.
    let requestedSelection = '';

    // When the ready panel renders.
    const html = renderToStaticMarkup(
      <SeasonRecordsPanel
        filters={filters}
        selection={{ season: 2026, eventKey: '100m', divisionKey: 'men-general' }}
        table={emptyTable}
        state="ready"
        highlightedRow={null}
        onSelectionChange={(selection) => {
          requestedSelection = [selection.season, selection.eventKey, selection.divisionKey].join('|');
        }}
        onRetry={() => undefined}
      />,
    );

    // Then render has no side effect and the live state offers one-step recovery.
    expect(requestedSelection).toBe('');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('break-keep [text-wrap:pretty]');
    expect(html).toContain('whitespace-nowrap">중이에요</span>');
    expect(html).toContain('<span class="whitespace-nowrap">다른 조건으로 바꾸지 않아요.</span>');
    expect(html).toContain('가장 가까운 시즌 보기');
    expect(html).toContain('href="/about-data"');
  });

  it('labels a default-tuple recovery separately from a nearest-season recovery', () => {
    // Given a valid empty tuple that has no matching event and division in another season.
    const table: SeasonRecordTable = {
      ...emptyTable,
      eventKey: '200m',
      eventLabel: '200m',
      divisionKey: 'women-high',
      divisionLabel: '여자 고등부',
    };

    // When the ready panel offers its only available recovery.
    const html = renderToStaticMarkup(
      <SeasonRecordsPanel
        filters={filters}
        selection={{ season: 2026, eventKey: '200m', divisionKey: 'women-high' }}
        table={table}
        state="ready"
        highlightedRow={null}
        onSelectionChange={() => undefined}
        onRetry={() => undefined}
      />,
    );

    // Then the action tells the truth: it returns to the catalog default, not a nearby season.
    expect(html).toContain('기본 시즌 보기');
    expect(html).not.toContain('가장 가까운 시즌 보기');
  });

  it('names mobile row order and keeps every season control at a touch-safe height', () => {
    // Given one available record in a valid season table.
    const html = renderToStaticMarkup(
      <SeasonRecordsPanel
        filters={filters}
        selection={{ season: 2026, eventKey: '100m', divisionKey: 'men-general' }}
        table={populatedTable}
        state="ready"
        highlightedRow={null}
        onSelectionChange={() => undefined}
        onRetry={() => undefined}
      />,
    );

    // When the responsive desktop and mobile rows are emitted together.
    // Then mobile order is explicit and all four selectors meet the 44px target.
    expect(html).toContain('순서 1')
    expect(html.match(/h-11/gu)?.length ?? 0).toBeGreaterThanOrEqual(4)
  });
});
