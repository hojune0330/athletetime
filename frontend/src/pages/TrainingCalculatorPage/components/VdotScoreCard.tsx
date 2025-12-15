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
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-6 mb-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold">{vdot}</div>
          <div className="text-sm opacity-90 mt-1">VDOT 점수</div>
          {adjustmentNote && (
            <div className="text-xs opacity-75 mt-1">{adjustmentNote}</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-3xl font-semibold">{performanceLevel}</div>
          <div className="text-sm opacity-90 mt-1">수준 평가</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">{vo2max}</div>
          <div className="text-sm opacity-90 mt-1">예상 VO₂max (ml/kg/min)</div>
        </div>
      </div>
    </div>
  );
};
