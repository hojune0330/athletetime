import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TeamStatistics } from '../../api/recordAnalytics';
import { TeamStatisticsResults } from './TeamStatisticsResults';

const team: TeamStatistics = {
  teamKey: 'team-jindo',
  teamLabel: '진도군청',
  athleteCount: 18,
  resultCount: 116,
  competitionCount: 31,
  eventCount: 12,
  firstSeason: 2017,
  latestSeason: 2026,
  latestDate: '2026-05-20',
  rankCounts: { first: 14, second: 12, third: 8, topThree: 34 },
  seasonStats: [
    { season: 2026, athleteCount: 5, resultCount: 18, competitionCount: 4, topThreeCount: 7 },
    { season: 2025, athleteCount: 12, resultCount: 54, competitionCount: 15, topThreeCount: 16 },
  ],
  eventStats: [
    { eventKey: '5000m', eventLabel: '5000m', athleteCount: 8, resultCount: 35 },
    { eventKey: '1500m', eventLabel: '1500m', athleteCount: 7, resultCount: 28 },
  ],
  disclaimer: 'AthleteTime이 모은 공개 기록을 기준으로 계산했어요.',
};

describe('team statistics results', () => {
  it('renders affiliation-level counts and distributions without individual record controls', () => {
    const html = renderToStaticMarkup(<TeamStatisticsResults teams={[team]} query="진도" />);

    expect(html).toContain('진도군청');
    expect(html).toContain('모은 선수');
    expect(html).toContain('시즌 흐름');
    expect(html).toContain('종목 구성');
    expect(html).toContain('1위 표기');
    expect(html).not.toContain('기록 담기');
    expect(html).not.toContain('비교에 담기');
  });
});

