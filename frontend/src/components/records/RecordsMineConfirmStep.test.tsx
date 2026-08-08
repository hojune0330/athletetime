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
});
