import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AthleteSearchCard } from '../../api/recordAnalytics';
import { RecordSearchFilterChips } from './RecordSearchFilterChips';
import { RecordSearchResultCard } from './RecordSearchResultCard';
import { RecordSearchResults } from './RecordSearchResults';
import { buildRecordSearchOptions, countSameName } from './recordSearchHelpers';

const athlete: AthleteSearchCard = {
  athleteKey: 'athlete-1',
  name: '김육상',
  team: '서울고',
  teams: ['서울고'],
  years: [2024, 2025],
  events: ['100m'],
  divisions: ['남자 고등부'],
  recordCount: 4,
  ambiguity: 'name',
  note: '',
};

describe('record search presentation', () => {
  it('Given unavailable labels when filter options are built Then only usable labels are counted', () => {
    // Given a mixed result list from public records.
    const labels = ['100m', '종목 미상', '', '100m', '200m'];

    // When filter options are derived.
    const options = buildRecordSearchOptions(labels);

    // Then unavailable labels never become a narrowing choice.
    expect(options).toEqual([
      { label: '100m', count: 2 },
      { label: '200m', count: 1 },
    ]);
  });

  it('Given same-name public candidates when their name matches the query Then they stay countable, not merged', () => {
    // Given two separately indexed candidates with the same name.
    const candidates = [athlete, { ...athlete, athleteKey: 'athlete-2', team: '부산고' }];

    // When the matching name is counted for the caution message.
    const count = countSameName(candidates, '김 육상');

    // Then the UI can warn about both candidates without asserting they are one person.
    expect(count).toBe(2);
  });

  it('Given same-name candidates when search results render Then each affiliation remains a separate card', () => {
    const candidates = [athlete, { ...athlete, athleteKey: 'athlete-2', team: '부산고' }];
    const html = renderToStaticMarkup(
      <RecordSearchResults
        athletes={candidates}
        query="김육상"
        selectedAthleteKey=""
        compareNotice=""
        isInCompareTray={() => false}
        onSelectAthlete={() => undefined}
        onToggleCompare={() => undefined}
        isMine={() => false}
        onToggleMine={() => undefined}
        myCount={0}
        onViewMyRecords={() => undefined}
      />,
    );

    expect(html).toContain('서울고');
    expect(html).toContain('부산고');
    expect(html).toContain('이름이 같은 선수가 2명 보여요.');
  });

  it('Given filters and an athlete card when rendered Then every action has a visible focus and touch target', () => {
    // Given one filter and one public-record candidate.
    const html = renderToStaticMarkup(
      <>
        <RecordSearchFilterChips
          title="종목으로 좁히기"
          options={[{ label: '100m', count: 1 }]}
          selected=""
          onSelect={() => undefined}
        />
        <RecordSearchResultCard
          athlete={athlete}
          selected={false}
          inTray={false}
          mine={false}
          onSelect={() => undefined}
          onToggleCompare={() => undefined}
          onToggleMine={() => undefined}
        />
      </>,
    );

    // When the presentation exposes its controls.
    const allButtons = html.match(/<button/g) ?? [];

    // Then the legacy surface remains actionable without implying ownership or merging people.
    expect(allButtons).toHaveLength(5);
    expect(html).toContain('min-h-11');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('같은 이름의 다른 선수일 수 있어요.');
    expect(html).toContain('이 선수 담기');
  });

  it('Given every canonical division when the filter renders Then the fieldset exposes all choices and a scoped reset', () => {
    // Given more than eight canonical division choices.
    const options = Array.from({ length: 10 }, (_, index) => ({
      value: `division-${index + 1}`,
      label: `경기 부문 ${index + 1}`,
    }));

    // When the search division filter renders with one selected choice.
    const html = renderToStaticMarkup(
      <RecordSearchFilterChips
        title="경기 부문으로 좁히기"
        options={options}
        selected="division-2"
        onSelect={() => undefined}
      />,
    );

    // Then native group semantics, every option, and one directly named reset remain available.
    expect(html).toContain('<fieldset')
    expect(html).toContain('<legend')
    expect(html).toContain('경기 부문 10')
    expect(html).toContain('aria-label="경기 부문으로 좁히기 전체"')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  });
});
