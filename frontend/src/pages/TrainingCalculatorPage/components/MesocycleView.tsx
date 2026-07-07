import React from 'react';
import type { WeekPlan } from '../utils/trainingPlans';

interface MesocycleViewProps {
  plan: WeekPlan[];
}

/**
 * 메조사이클(4주 블록) — 볼륨 흐름을 얇은 잉크 바로 시각화.
 * 색 장식 없이 잉크 농도와 hairline만으로 위계 표현.
 */
export const MesocycleView: React.FC<MesocycleViewProps> = ({ plan }) => {
  const volumes = plan.map((week) => parseInt(week.volume, 10) || 0);
  const maxVolume = Math.max(...volumes, 1);

  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">메조사이클</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">4-WEEK BLOCK</span>
      </div>

      <div className="grid grid-cols-2 border border-line bg-surface md:grid-cols-4">
        {plan.map((week, index) => {
          const volume = volumes[index];
          const heightPct = Math.round((volume / maxVolume) * 100);
          return (
            <div
              key={index}
              className={`flex flex-col p-4 ${index > 0 ? 'border-l border-hair max-md:[&:nth-child(odd)]:border-l-0' : ''} ${
                index >= 2 ? 'max-md:border-t max-md:border-hair' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
                  W{index + 1}
                </span>
                <span className="font-mono text-[15px] font-medium text-ink [font-variant-numeric:tabular-nums]">
                  {week.volume}
                </span>
              </div>

              {/* 볼륨 바 */}
              <div className="mt-2 flex h-14 items-end border-b border-hair">
                <div
                  className="w-full bg-ink/80 transition-[height]"
                  style={{ height: `${heightPct}%` }}
                  role="img"
                  aria-label={`${week.week} 볼륨 ${week.volume}`}
                />
              </div>

              <div className="mt-2.5 text-body-sm font-semibold text-ink">{week.focus}</div>
              <p className="mt-1 text-caption leading-snug text-ink-3">{week.keyWorkout}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-ink-3">
        볼륨은 최대 주 대비 비율이에요. 마지막 주는 회복을 위해 낮게 잡는 구조입니다.
      </p>
    </div>
  );
};
