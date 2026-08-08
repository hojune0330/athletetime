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
});
