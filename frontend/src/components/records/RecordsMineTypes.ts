export type MineStep = 'name' | 'candidates' | 'confirm' | 'done';
export type RecordsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export function normalizeMineStep(value: string | null): MineStep {
  if (value === 'candidates' || value === 'confirm' || value === 'done') return value;
  return 'name';
}
