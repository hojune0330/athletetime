import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnalyticsFilters, SeasonRecordTable } from '../../../api/recordAnalytics';
import { SeasonRecordsPanel } from './SeasonRecordsPanel';

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
    { season: 2025, eventKey: '100m', divisionKey: 'men-all' },
  ],
};

const emptyTable: SeasonRecordTable = {
  season: 2026,
  eventKey: '100m',
  divisionKey: 'men-all',
  eventLabel: '100m',
  divisionLabel: '남자 전체',
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

describe('season records panel', () => {
  it('uses named native controls in dependency order and exposes pressed gender state', () => {
    // Given a valid season selection.
    const html = renderToStaticMarkup(
      <SeasonRecordsPanel
        filters={filters}
        selection={{ season: 2026, eventKey: '100m', divisionKey: 'men-all' }}
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
        selection={{ season: 2026, eventKey: '100m', divisionKey: 'men-all' }}
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
    expect(html).toContain('<span class="whitespace-nowrap">다른 조건으로 바꾸지 않아요.</span>');
    expect(html).toContain('가장 가까운 시즌 보기');
    expect(html).toContain('href="/about-data"');
  });
});
