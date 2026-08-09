import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfirmStep } from './RecordsMineConfirmStep';

describe('record collection confirmation empty state', () => {
  it('offers one clear recovery action when every selected athlete was removed', () => {
    // Given the confirmation step after the user removes every selection.
    const markup = renderToStaticMarkup(
      <ConfirmStep
        selectedAthletes={[]}
        onBackToCandidates={() => undefined}
        onConfirm={() => undefined}
        onToggleDraft={() => undefined}
      />,
    );

    // Then the user gets one live route back to choosing candidates, not a disabled forward action.
    expect(markup).toContain('선수 고르기');
    expect(markup).not.toContain('선택한 선수 담기');
    expect(markup).not.toContain('disabled=""');
  });

  it('asks whether the selected candidate is right without claiming a verified identity', () => {
    const markup = renderToStaticMarkup(
      <ConfirmStep
        selectedAthletes={[{
          athleteKey: 'candidate-1',
          name: '선수 1',
          team: '테스트고',
          teams: ['테스트고'],
          years: [2026],
          events: ['100m'],
          divisions: ['남자 고등부'],
          recordCount: 1,
          ambiguity: 'name_team',
          note: '',
        }]}
        onBackToCandidates={() => undefined}
        onConfirm={() => undefined}
        onToggleDraft={() => undefined}
      />,
    );

    expect(markup).toContain('이 사람들 맞나요?');
    expect(markup).not.toContain('선택한 선수를 확인하세요.');
    expect(markup).not.toContain('인증');
  });
});
