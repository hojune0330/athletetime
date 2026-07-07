import React from 'react';
import type { Workout } from '../utils/trainingPlans';
import { MainMark } from '../../../components/ui/trainoracle';

interface WorkoutDetailsViewProps {
  workouts: Workout[];
}

/**
 * 핵심 훈련 세션 — TRAINORACLE 세션 카드 문법.
 * 2px 잉크 좌측 보더 본문, 점선 상단 페이스 스트립.
 */
export const WorkoutDetailsView: React.FC<WorkoutDetailsViewProps> = ({ workouts }) => {
  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">핵심 훈련 세션</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">KEY SESSIONS</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {workouts.map((workout, index) => (
          <article key={index} className="border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <MainMark />
              <h4 className="text-body font-semibold text-ink">{workout.title}</h4>
            </div>

            <div className="mt-3.5 space-y-2.5 border-l-2 border-ink pl-3.5">
              <SessionRow label="WARM-UP" value={workout.warmup} />
              <SessionRow label="MAIN SET" value={workout.main} strong />
              <SessionRow label="COOL-DOWN" value={workout.cooldown} />
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line pt-3">
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-widest-2 text-ink-3">
                Target pace
              </span>
              <span className="font-mono text-[14px] font-medium text-ink [font-variant-numeric:tabular-nums]">
                {workout.pace}
              </span>
            </div>

            <p className="mt-2.5 text-caption leading-relaxed text-ink-3">{workout.tips}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

function SessionRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] font-medium uppercase tracking-widest-2 text-ink-4">{label}</div>
      <div className={`mt-0.5 text-body-sm leading-relaxed ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>
        {value}
      </div>
    </div>
  );
}
