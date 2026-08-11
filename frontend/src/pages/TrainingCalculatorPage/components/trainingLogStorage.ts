import { z } from 'zod';

export const TRAINING_LOG_STORAGE_KEY = 'athletetime.training-log.v1';
export const MAX_TRAINING_LOG_ENTRIES = 60;

export type TrainingLogStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const trainingLogEntrySchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.string().min(1).max(40),
  distanceKm: z.number().positive().max(1_000).nullable(),
  feel: z.number().int().min(1).max(5),
  memo: z.string().max(120),
}).strict();

export type TrainingLogEntry = z.infer<typeof trainingLogEntrySchema>;

export type TrainingLogReadResult = Readonly<{
  entries: TrainingLogEntry[];
  status: 'ready' | 'recovered' | 'corrupt' | 'unavailable';
  discardedCount: number;
}>;

export function readTrainingLog(storage: TrainingLogStorage): TrainingLogReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(TRAINING_LOG_STORAGE_KEY);
  } catch {
    return { entries: [], status: 'unavailable', discardedCount: 0 };
  }

  if (!raw) {
    return { entries: [], status: 'ready', discardedCount: 0 };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { entries: [], status: 'corrupt', discardedCount: 0 };
    }

    const entries = parsed
      .map((item) => trainingLogEntrySchema.safeParse(item))
      .filter((result): result is z.ZodSafeParseSuccess<TrainingLogEntry> => result.success)
      .map((result) => result.data)
      .slice(0, MAX_TRAINING_LOG_ENTRIES);
    const discardedCount = parsed.length - entries.length;

    return {
      entries,
      status: discardedCount > 0 ? 'recovered' : 'ready',
      discardedCount,
    };
  } catch {
    return { entries: [], status: 'corrupt', discardedCount: 0 };
  }
}

export function saveTrainingLog(
  storage: TrainingLogStorage,
  entries: TrainingLogEntry[],
): Readonly<{ saved: boolean; entries: TrainingLogEntry[] }> {
  const boundedEntries = entries.slice(0, MAX_TRAINING_LOG_ENTRIES);
  try {
    storage.setItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(boundedEntries));
    return { saved: true, entries: boundedEntries };
  } catch {
    return { saved: false, entries: boundedEntries };
  }
}

export function clearTrainingLog(storage: TrainingLogStorage): boolean {
  try {
    storage.removeItem(TRAINING_LOG_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
