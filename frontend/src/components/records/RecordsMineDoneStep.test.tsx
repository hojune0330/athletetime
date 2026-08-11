import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DoneStep } from './RecordsMineDoneStep';

describe('record collection completion empty state', () => {
  it('offers one clear collection action after the last saved athlete is removed', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DoneStep
          entries={[]}
          onAddMore={() => undefined}
          onRemoveMyAthlete={() => undefined}
          onSeasonForMine={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('기록 모음이 비었어요.');
    expect(markup).toContain('기록 담기');
    expect(markup).not.toContain('시즌 기록표 보기');
    expect(markup).not.toContain('선수 기록 자세히 보기');
  });

  it('keeps each selected candidate separate instead of choosing the first candidate', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DoneStep
          entries={[
            { athleteKey: 'candidate-1', name: '선수 1', team: '테스트고', savedAt: '2026-08-09T00:00:00.000Z' },
            { athleteKey: 'candidate-2', name: '선수 2', team: '테스트대', savedAt: '2026-08-09T00:00:00.000Z' },
          ]}
          onAddMore={() => undefined}
          onRemoveMyAthlete={() => undefined}
          onSeasonForMine={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('이 기기에서 고른 선수 후보');
    expect(markup).toContain('href="/records/athletes/candidate-1"');
    expect(markup).toContain('href="/records/athletes/candidate-2"');
    expect(markup).toContain('선수 1');
    expect(markup).toContain('선수 2');
    expect(markup).not.toContain('선수 기록 보기');
  });

  it('does not offer another selection flow once the device collection reaches its limit', () => {
    // Given: this device already holds the maximum six separate athlete candidates.
    const entries = Array.from({ length: 6 }, (_, index) => ({
      athleteKey: `candidate-${index + 1}`,
      name: `선수 ${index + 1}`,
      team: '테스트고',
      savedAt: '2026-08-09T00:00:00.000Z',
    }));
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DoneStep
          entries={entries}
          onAddMore={() => undefined}
          onRemoveMyAthlete={() => undefined}
          onSeasonForMine={() => undefined}
        />
      </MemoryRouter>,
    );

    // When: the completion screen opens.
    // Then: it explains how to make space instead of leading to a silently capped action.
    expect(markup).toContain('기록 모음은 6명까지예요.')
    expect(markup).toContain('목록에서 먼저 한 명을 빼 주세요.')
    expect(markup).not.toContain('후보 더 고르기')
  });
});
