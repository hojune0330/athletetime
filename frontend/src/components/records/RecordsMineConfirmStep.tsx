import type { AthleteSearchCard } from '../../api/recordAnalytics';
import { Button } from '../ui/button';
import { CandidateContextFacts } from './CandidateContextFacts';

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
  const hasSelectedAthletes = selectedAthletes.length > 0;

  return (
    <div className="flex min-h-[32rem] flex-col" data-records-step="mine-confirm">
      <div>
        <p className="text-sm font-semibold text-brand">3단계</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          {hasSelectedAthletes ? '이 사람들 맞나요?' : '선수를 골라주세요.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          선택한 후보의 공개 기록만 이 기기에서 함께 보여줘요. 다른 사람 기록이면 지금 빼세요.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {!hasSelectedAthletes ? (
          <div role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
            선택한 선수가 없어요. 후보 화면으로 돌아가서 선수를 골라주세요.
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
                <CandidateContextFacts athlete={athlete} />
                <span className="mt-3 block text-xs text-ink-3">공개 기록 {athlete.recordCount}건</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand">빼기</span>
            </button>
          ))
        )}
      </div>

      {hasSelectedAthletes ? (
        <div className="sticky bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] mt-auto grid gap-2 border-t border-hair bg-surface py-4 sm:grid-cols-[auto_1fr] md:bottom-0" data-records-sticky-cta="mine-confirm">
          <Button type="button" variant="outline" size="lg" onClick={onBackToCandidates}>
            다시 고르기
          </Button>
          <Button type="button" size="lg" onClick={onConfirm}>
            선택한 선수 담기
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] mt-auto border-t border-hair bg-surface py-4 md:bottom-0" data-records-sticky-cta="mine-confirm">
          <Button className="w-full sm:w-auto" type="button" size="lg" onClick={onBackToCandidates}>
            선수 고르기
          </Button>
        </div>
      )}
    </div>
  );
}
