import type { ReactNode } from 'react';
import type { MineStep } from './RecordsMineTypes';

const STEP_META: readonly { readonly key: MineStep; readonly label: string }[] = [
  { key: 'name', label: '이름 입력' },
  { key: 'candidates', label: '후보 선택' },
  { key: 'confirm', label: '묶음 확인' },
  { key: 'done', label: '완료' },
] as const;

export function WizardFrame({
  step,
  onBack,
  onQuit,
  children,
}: {
  readonly step: MineStep;
  readonly onBack: () => void;
  readonly onQuit: () => void;
  readonly children: ReactNode;
}) {
  const currentIndex = STEP_META.findIndex((item) => item.key === step);

  return (
    <div className="min-h-[calc(100dvh-9rem)] border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-hair px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-3 transition hover:border-line-2 hover:text-ink"
        >
          뒤로
        </button>
        <div className="flex items-center gap-1.5" aria-label={`내 기록 찾기 ${currentIndex + 1}/4 단계`}>
          {STEP_META.map((item, index) => (
            <span
              key={item.key}
              data-records-progress-dot={item.key}
              title={item.label}
              className={`h-2 w-2 rounded-full ${index <= currentIndex ? 'bg-brand' : 'bg-hair'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onQuit}
          className="px-3 py-2 text-sm font-semibold text-ink-4 transition hover:text-ink"
        >
          그만두기
        </button>
      </div>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">{children}</div>
    </div>
  );
}
