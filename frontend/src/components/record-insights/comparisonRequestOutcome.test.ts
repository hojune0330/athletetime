import { describe, expect, it } from 'vitest';
import { resolveComparisonRequestOutcome } from './comparisonRequestOutcome';

describe('comparison request outcomes', () => {
  it('Given every selected profile loads When its outcome is resolved Then it is complete', () => {
    expect(resolveComparisonRequestOutcome(2, 2)).toEqual({
      kind: 'complete',
      requestedCount: 2,
      loadedCount: 2,
      unavailableCount: 0,
    });
  });

  it('Given enough profiles load but one is unavailable When its outcome is resolved Then it keeps the unavailable count', () => {
    expect(resolveComparisonRequestOutcome(3, 2)).toEqual({
      kind: 'partial',
      requestedCount: 3,
      loadedCount: 2,
      unavailableCount: 1,
    });
  });

  it('Given zero or one profile loads When its outcome is resolved Then comparison stays unavailable', () => {
    expect(resolveComparisonRequestOutcome(2, 1)).toMatchObject({ kind: 'one-available', unavailableCount: 1 });
    expect(resolveComparisonRequestOutcome(2, 0)).toMatchObject({ kind: 'unavailable', unavailableCount: 2 });
  });
});
