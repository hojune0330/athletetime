import { describe, expect, it } from 'vitest';
import type { Competition } from '../api/competitions';
import { loadCurrentCompetitions } from './MainPage';

function createCompetition(id: string): Competition {
  return {
    id,
    name: `대회 ${id}`,
    type: 'domestic',
    category: 'track_field',
    categoryLabel: '트랙앤필드',
    categoryColor: '#000000',
    start_date: '2026-08-12',
    end_date: '2026-08-12',
    year: 2026,
    month: 8,
    location: '서울',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
}

describe('MainPage current competitions', () => {
  it('keeps successful, empty, rejected, and retried current-competition requests distinct', async () => {
    // Given the current-competitions endpoint rejects with a server error.
    const successfulRequest = async () => ({
      live: [createCompetition('live')],
      previous: null,
      next: createCompetition('next'),
    });
    const emptyRequest = async () => ({ live: [], previous: null, next: null });
    let retryCalls = 0;
    const rejectedThenSuccessfulRequest = async () => {
      retryCalls += 1;
      if (retryCalls === 1) {
        throw new Error('503 Service Unavailable: internal details must not reach visitors');
      }

      return { live: [], previous: null, next: createCompetition('retry') };
    };

    // When the home page loads the current competitions.
    const successfulState = await loadCurrentCompetitions(successfulRequest);
    const emptyState = await loadCurrentCompetitions(emptyRequest);
    const failedState = await loadCurrentCompetitions(rejectedThenSuccessfulRequest);
    const retriedState = await loadCurrentCompetitions(rejectedThenSuccessfulRequest);

    // Then it keeps the failure distinct from an empty schedule without exposing the error.
    expect(successfulState).toEqual({
      status: 'ready',
      liveComps: [createCompetition('live')],
      nextComp: createCompetition('next'),
    });
    expect(emptyState).toEqual({ status: 'ready', liveComps: [], nextComp: null });
    expect(failedState).toEqual({ status: 'failed' });
    expect(retriedState).toEqual({
      status: 'ready',
      liveComps: [],
      nextComp: createCompetition('retry'),
    });
    expect(retryCalls).toBe(2);
  });
});
