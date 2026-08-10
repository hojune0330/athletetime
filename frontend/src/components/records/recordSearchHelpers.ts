import type { AthleteSearchCard } from '../../api/recordAnalytics';
import type { RecordSearchFilterOption } from './RecordSearchFilterChips';

const unavailableFilterLabels: ReadonlySet<string> = new Set(['소속 미상', '종목 미상']);

export function buildRecordSearchOptions(values: readonly string[]): RecordSearchFilterOption[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label || unavailableFilterLabels.has(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ko-KR'));
}

export function countSameName(athletes: readonly AthleteSearchCard[], query: string): number {
  const normalizedQuery = normalizeName(query);
  if (normalizedQuery) {
    return athletes.filter((athlete) => normalizeName(athlete.name) === normalizedQuery).length;
  }

  const counts = new Map<string, number>();
  for (const athlete of athletes) {
    const name = normalizeName(athlete.name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, '').trim();
}
