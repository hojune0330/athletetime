import type { AthleteSearchCard } from '../../api/recordAnalytics';
import { Button } from '../ui/button';

export function ConfirmStep({
  selectedAthletes,
  onToggleDraft,
  onBackToCandidates,
  onConfirm,
}: {
  readonly selectedAthletes: readonly AthleteSearchCard[];
  readonly onToggleDraft: (athlete: AthleteSearchCard) => void;
  readonly onBackToCandidates: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-[32rem] flex-col" data-records-step="mine-confirm">
      <div>
        <p className="text-sm font-semibold text-brand">3단계</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">같은 사람 묶음을 확인하세요.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          이 기록들도 회원님 것 같아요. 기본으로 모두 합치되, 아니면 이 화면에서 빼세요.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {selectedAthletes.length === 0 ? (
          <div role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
            선택한 후보가 없어요. 후보 화면으로 돌아가서 내 기록을 골라주세요.
          </div>
        ) : (
          selectedAthletes.map((athlete) => (
            <button
              key={athlete.athleteKey}
              type="button"
              aria-pressed
              onClick={() => onToggleDraft(athlete)}
              className="flex w-full items-center justify-between gap-4 border border-brand bg-brand/5 p-4 text-left"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{athlete.name}</span>
                <span className="mt-1 block truncate text-sm text-ink-3">
                  {athlete.team || '소속 미상'} · {formatYearRange(athlete.years)} · 기록 {athlete.recordCount}건
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand">빼기</span>
            </button>
          ))
        )}
      </div>

      <div className="sticky bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] mt-auto grid gap-2 border-t border-hair bg-surface py-4 sm:grid-cols-[auto_1fr] md:bottom-0" data-records-sticky-cta="mine-confirm">
        <Button type="button" variant="outline" size="lg" onClick={onBackToCandidates}>
          다시 고르기
        </Button>
        <Button type="button" size="lg" disabled={selectedAthletes.length === 0} onClick={onConfirm}>
          이대로 합치기
        </Button>
      </div>
    </div>
  );
}

function formatYearRange(years: readonly number[]) {
  if (!years.length) return '연도 미상';
  if (years.length === 1) return String(years[0]);
  return `${years[0]}-${years[years.length - 1]}`;
}
