import React from 'react';
import { MetricCell } from '../../../components/ui/trainoracle';

interface VdotScoreCardProps {
  vdot: number;
  performanceLevel: string;
  vo2max: number;
  adjustmentNote?: string;
}

/**
 * 분석 결과 요약 — TRAINORACLE MetricCell 스트립.
 * 상/하단 잉크 보더, 셀 사이 hairline, 모노 숫자.
 */
export const VdotScoreCard: React.FC<VdotScoreCardProps> = ({
  vdot,
  performanceLevel,
  vo2max,
  adjustmentNote,
}) => {
  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">분석 결과</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">
          VDOT · Jack Daniels
        </span>
      </div>
      <div className="flex border-y border-ink bg-surface">
        <MetricCell
          label="VDOT"
          value={vdot}
          sub={adjustmentNote || undefined}
          subKind="neutral"
        />
        <MetricCell label="수준" value={<span className="text-[17px]">{performanceLevel}</span>} />
        <MetricCell label="예상 VO2max" value={vo2max} unit="ml/kg/min" />
      </div>
      <p className="mt-2 text-caption text-ink-3">
        입력한 기록과 프로필로 계산한 참고치예요. 실제 훈련 반응에 따라 조정하세요.
      </p>
    </div>
  );
};
