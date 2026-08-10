export type ComparisonRequestOutcome =
  | {
      readonly kind: 'loading';
    }
  | {
      readonly kind: 'complete';
      readonly requestedCount: number;
      readonly loadedCount: number;
      readonly unavailableCount: 0;
    }
  | {
      readonly kind: 'partial';
      readonly requestedCount: number;
      readonly loadedCount: number;
      readonly unavailableCount: number;
    }
  | {
      readonly kind: 'one-available';
      readonly requestedCount: number;
      readonly loadedCount: 1;
      readonly unavailableCount: number;
    }
  | {
      readonly kind: 'unavailable';
      readonly requestedCount: number;
      readonly loadedCount: 0;
      readonly unavailableCount: number;
    };

export function resolveComparisonRequestOutcome(
  requestedCount: number,
  loadedCount: number,
): ComparisonRequestOutcome {
  const unavailableCount = Math.max(requestedCount - loadedCount, 0);

  if (loadedCount >= 2) {
    return unavailableCount === 0
      ? { kind: 'complete', requestedCount, loadedCount, unavailableCount: 0 }
      : { kind: 'partial', requestedCount, loadedCount, unavailableCount };
  }

  if (loadedCount === 1) {
    return { kind: 'one-available', requestedCount, loadedCount, unavailableCount };
  }

  return { kind: 'unavailable', requestedCount, loadedCount: 0, unavailableCount: requestedCount };
}

export function assertComparisonOutcomeIsExhaustive(outcome: never): never {
  throw new Error(`Unhandled comparison request outcome: ${String(outcome)}`);
}
