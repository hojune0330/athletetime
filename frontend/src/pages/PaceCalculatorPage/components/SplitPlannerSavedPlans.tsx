import { useState } from 'react';
import type { SavedPacePlan } from '../hooks/usePaceCalculator';

type SplitPlannerSavedPlansProps = {
  readonly plans: readonly SavedPacePlan[];
  readonly canSave: boolean;
  readonly onSave: (name: string) => void;
  readonly onApply: (plan: SavedPacePlan) => void;
  readonly onDelete: (id: string) => void;
};

export function SplitPlannerSavedPlans({ plans, canSave, onSave, onApply, onDelete }: SplitPlannerSavedPlansProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
    setIsNaming(false);
  };

  return (
    <section className="border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">ON THIS DEVICE</p>
          <h2 className="mt-1 text-body font-semibold text-ink">자주 쓰는 설정</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsNaming(true)}
          disabled={!canSave}
          className="h-9 border border-line bg-surface px-3 text-body-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-ink-4"
        >
          현재 설정 저장
        </button>
      </div>
      <p className="mt-2 text-caption text-ink-3">이 기기에만 저장돼요. 다른 사람에게는 보이지 않아요.</p>

      {isNaming && (
        <div className="mt-4 flex flex-col gap-2 border border-line bg-surface-2 p-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="저장할 설정 이름"
            placeholder="예: 가을 하프 목표"
            maxLength={80}
            className="h-10 min-w-0 flex-1 border border-line bg-surface px-3 text-body-sm text-ink focus:border-ink focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsNaming(false)} className="h-10 border border-line bg-surface px-3 text-body-sm text-ink-2 hover:bg-surface-2">취소</button>
            <button type="button" onClick={save} className="h-10 bg-ink px-3 text-body-sm font-medium text-bg hover:bg-ink-2">저장</button>
          </div>
        </div>
      )}

      {plans.length > 0 ? (
        <ul className="mt-4 divide-y divide-hair border-y border-hair">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center gap-3 py-3">
              <button type="button" onClick={() => onApply(plan)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-body-sm font-medium text-ink">{plan.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-ink-4">{plan.distance}km · {formatPlanTime(plan.targetTime)}</span>
              </button>
              <button type="button" onClick={() => onDelete(plan.id)} className="h-9 border border-line px-2.5 text-caption text-ink-3 hover:bg-surface-2">삭제</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-y border-hair py-4 text-body-sm text-ink-3">저장한 설정이 없어요.</p>
      )}
    </section>
  );
}

function formatPlanTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
