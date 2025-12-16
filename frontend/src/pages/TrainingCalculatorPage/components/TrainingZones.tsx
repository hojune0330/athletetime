import React from 'react';
import type { TrainingPaces, formatPace } from '../utils/vdotCalculations';

interface TrainingZonesProps {
  paces: TrainingPaces;
}

const zones = [
  {
    key: 'easy',
    name: 'Easy (E) - 회복/기초지구력',
    description: '최대심박수의 65-79% | 편안한 대화 가능',
    colorClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  },
  {
    key: 'marathon',
    name: 'Marathon (M) - 마라톤 페이스',
    description: '최대심박수의 80-85% | 지속 가능한 페이스',
    colorClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  {
    key: 'threshold',
    name: 'Threshold (T) - 젖산역치',
    description: '최대심박수의 85-88% | 20-60분 유지 가능',
    colorClass: 'bg-gradient-to-r from-amber-500 to-amber-600',
  },
  {
    key: 'interval',
    name: 'Interval (I) - VO₂max 향상',
    description: '최대심박수의 95-100% | 3-8분 반복',
    colorClass: 'bg-gradient-to-r from-red-500 to-red-600',
  },
  {
    key: 'repetition',
    name: 'Repetition (R) - 스피드/폼',
    description: '최대 스피드의 95%+ | 완전 회복 필요',
    colorClass: 'bg-gradient-to-r from-purple-500 to-purple-600',
  },
];

export const TrainingZones: React.FC<TrainingZonesProps> = ({ paces }) => {
  const getPaceDisplay = (key: string): string => {
    if (key === 'easy') {
      return `${formatPace(paces.easy.max)} - ${formatPace(paces.easy.min)}`;
    }
    return formatPace(paces[key as keyof Omit<TrainingPaces, 'easy'>] as number);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">훈련 구역별 페이스</h3>
      
      <div className="space-y-3">
        {zones.map(zone => (
          <div key={zone.key} className={`${zone.colorClass} text-white p-4 rounded-lg`}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-bold text-lg">{zone.name}</div>
                <div className="text-sm opacity-90">{zone.description}</div>
              </div>
              <div className="text-2xl font-bold">{getPaceDisplay(zone.key)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
