import React from 'react';
import type { DayPlan, DayIntensity } from '../utils/trainingPlans';

interface WeeklyPlanViewProps {
  plan: DayPlan[];
}

/**
 * 주간 마이크로사이클 — TRAINORACLE CycleRail 스타일 7일 레일.
 * - 셀은 hairline로 분리, 강도는 상단 2px 컬러 스트립 + 라벨로만 표시
 * - 고강도 날은 잉크 반전(레일의 MAIN 셀 문법)
 */

const INTENSITY: Record<DayIntensity, { label: string; color: string }> = {
  low: { label: 'LOW', color: 'var(--e-base)' },
  medium: { label: 'MED', color: 'var(--e-lt)' },
  high: { label: 'HIGH', color: 'var(--e-gly)' },
  rest: { label: 'REST', color: 'var(--e-rest)' },
};

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({ plan }) => {
  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">주간 마이크로사이클</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">7 DAYS</span>
      </div>

      <div className="grid grid-cols-2 border border-line bg-surface sm:grid-cols-4 md:grid-cols-7">
        {plan.map((day, index) => {
          const meta = INTENSITY[day.intensity];
          const isKey = day.intensity === 'high';
          return (
            <div
              key={index}
              className={`relative flex min-h-[120px] flex-col border-hair p-3 ${
                index > 0 ? 'border-l max-sm:[&:nth-child(odd)]:border-l-0 sm:max-md:[&:nth-child(4n+1)]:border-l-0' : ''
              } ${index >= 2 ? 'max-sm:border-t' : ''} ${index >= 4 ? 'sm:max-md:border-t' : ''} ${
                isKey ? 'bg-ink text-bg' : ''
              }`}
            >
              {/* 강도 스트립 */}
              <span
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: meta.color }}
                aria-hidden
              />
              <div className="flex items-baseline justify-between">
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest-2 ${isKey ? 'text-bg/70' : 'text-ink-4'}`}>
                  {day.day}
                </span>
                <span
                  className="font-mono text-[9px] font-semibold uppercase tracking-widest-2"
                  style={{ color: isKey ? 'var(--bg, #FAFAF7)' : meta.color }}
                >
                  {meta.label}
                </span>
              </div>
              <div className={`mt-2 whitespace-pre-line text-body-sm font-semibold leading-snug ${isKey ? 'text-bg' : 'text-ink'}`}>
                {day.type}
              </div>
              <div className={`mt-1 whitespace-pre-line font-mono text-[10.5px] [font-variant-numeric:tabular-nums] ${isKey ? 'text-bg/70' : 'text-ink-3'}`}>
                {day.duration}
              </div>
              <div className={`mt-auto pt-1.5 text-caption leading-snug ${isKey ? 'text-bg/60' : 'text-ink-4'}`}>
                {day.description}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-ink-3">
        고강도(HIGH) 날은 검게 표시했어요. 연속 고강도 배치는 피하는 걸 권장해요.
      </p>
    </div>
  );
};
