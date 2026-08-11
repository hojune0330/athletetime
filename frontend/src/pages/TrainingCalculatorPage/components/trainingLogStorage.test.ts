import { describe, expect, it } from 'vitest';
import {
  clearTrainingLog,
  readTrainingLog,
  saveTrainingLog,
  type TrainingLogEntry,
} from './trainingLogStorage';

const entry: TrainingLogEntry = {
  id: 'entry-1',
  date: '2026-08-11',
  kind: '조깅',
  distanceKm: 7.5,
  feel: 3,
  memo: '가볍게 달림',
};

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('training log storage', () => {
  it('keeps valid entries while isolating malformed entries', () => {
    const storage = createStorage({
      'athletetime.training-log.v1': JSON.stringify([entry, { id: 42, memo: 'broken' }]),
    });

    expect(readTrainingLog(storage)).toEqual({
      entries: [entry],
      status: 'recovered',
      discardedCount: 1,
    });
  });

  it('treats invalid JSON as corrupt instead of showing a false empty log', () => {
    const storage = createStorage({ 'athletetime.training-log.v1': '{not-json' });

    expect(readTrainingLog(storage)).toEqual({
      entries: [],
      status: 'corrupt',
      discardedCount: 0,
    });
  });

  it('does not report success when device storage rejects a save', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => undefined,
    };

    expect(saveTrainingLog(storage, [entry])).toEqual({ saved: false, entries: [entry] });
  });

  it('keeps no more than sixty local entries', () => {
    const storage = createStorage();
    const entries = Array.from({ length: 61 }, (_, index) => ({
      ...entry,
      id: `entry-${index}`,
    }));

    const result = saveTrainingLog(storage, entries);

    expect(result.saved).toBe(true);
    expect(result.entries).toHaveLength(60);
    expect(JSON.parse(storage.getItem('athletetime.training-log.v1') ?? '[]')).toHaveLength(60);
  });

  it('does not claim that shared-device cleanup worked when removal fails', () => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('storage blocked');
      },
    };

    expect(clearTrainingLog(storage)).toBe(false);
  });
});
