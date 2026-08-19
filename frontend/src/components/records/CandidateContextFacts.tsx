import type { AthleteSearchCard } from '../../api/recordAnalytics';

type CandidateContextFactsProps = {
  readonly athlete: Pick<AthleteSearchCard, 'divisions' | 'events' | 'team' | 'years'>;
};

export function CandidateContextFacts({ athlete }: CandidateContextFactsProps) {
  return (
    <dl className="mt-3 grid gap-1.5 text-xs leading-5 text-ink-3 sm:grid-cols-2" data-candidate-context>
      <CandidateFact label="기록에 적힌 소속" value={athlete.team.trim() || '소속 미상'} />
      <CandidateFact label="확인된 기간" value={formatObservedYears(athlete.years)} />
      <CandidateFact label="종목" value={formatObservedLabels(athlete.events, '종목 미상')} />
      <CandidateFact label="경기 부문" value={formatObservedLabels(athlete.divisions, '부문 미상')} />
      <CandidateFact label="출처 범위" value="공개 경기 결과" />
    </dl>
  );
}

function CandidateFact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex min-w-0 gap-1.5 border-l-2 border-hair pl-2">
      <dt className="shrink-0 font-semibold text-ink-3">{label}</dt>
      <dd className="min-w-0 break-keep [text-wrap:pretty] text-ink">{value}</dd>
    </div>
  );
}

function formatObservedLabels(labels: readonly string[], fallback: string) {
  const observedLabels = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  return observedLabels.join(' · ') || fallback;
}

function formatObservedYears(years: readonly number[]) {
  const observedYears = [...new Set(years)].sort((left, right) => left - right);
  const firstYear = observedYears[0];
  const lastYear = observedYears[observedYears.length - 1];

  if (firstYear === undefined || lastYear === undefined) return '연도 미상';
  if (firstYear === lastYear) return String(firstYear);
  return `${firstYear}-${lastYear}`;
}
