import React from 'react';

interface VdotScoreCardProps {
  vdot: number;
  performanceLevel: string;
  vo2max: number;
  adjustmentNote?: string;
}

export const VdotScoreCard: React.FC<VdotScoreCardProps> = ({
  vdot,
  performanceLevel,
  vo2max,
  adjustmentNote,
}) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6 shadow-sm">
      <h3 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        분석 결과
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <div className="text-4xl font-bold text-primary-600">{vdot}</div>
          <div className="text-sm text-primary-600/80 mt-1">VDOT 점수</div>
          {adjustmentNote && (
            <div className="text-xs text-primary-500 mt-1">{adjustmentNote}</div>
          )}
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-semibold text-purple-600">{performanceLevel}</div>
          <div className="text-sm text-purple-600/80 mt-1">수준 평가</div>
        </div>
        <div className="text-center p-4 bg-pink-50 rounded-lg">
          <div className="text-2xl font-semibold text-pink-600">{vo2max}</div>
          <div className="text-sm text-pink-600/80 mt-1">예상 VO₂max (ml/kg/min)</div>
        </div>
      </div>
    </div>
  );
};
