import React from 'react';

/**
 * CalcSection — 훈련 계산기 입력 단계 래퍼 (TRAINORACLE Scientific Minimalism)
 * - hairline 보더, 각진 모서리, 모노 스텝 라벨
 * - 색은 정보 전달용으로만, 장식 금지
 */
interface CalcSectionProps {
  step: string; // '01' | '02' | '03'
  title: string;
  hint?: string;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export const CalcSection: React.FC<CalcSectionProps> = ({ step, title, hint, children, sectionRef }) => {
  return (
    <section ref={sectionRef} className="mb-4 rounded-sm border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
            STEP {step}
          </p>
          <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {hint && <p className="hidden text-body-sm text-ink-3 sm:block">{hint}</p>}
      </div>
      {children}
    </section>
  );
};

/** FieldLabel — 모노 대문자 필드 라벨 */
export const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3"
  >
    {children}
  </label>
);

/** selectClass — 공통 셀렉트 스타일 */
export const selectClass =
  'h-11 w-full rounded-sm border border-line bg-surface px-3 text-body-sm text-ink transition-colors focus:border-ink focus:outline-none';

export default CalcSection;
