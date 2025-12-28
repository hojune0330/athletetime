import React from 'react';
import { DISTANCE_OPTIONS } from '../utils/vdotCalculations';
import type { TimeInput } from '../hooks/useTrainingCalculator';

interface PerformanceInputProps {
  distance: string;
  time: TimeInput;
  onDistanceChange: (value: string) => void;
  onTimeChange: <K extends keyof TimeInput>(key: K, value: number) => void;
  distanceSelectRef?: React.RefObject<HTMLSelectElement>;
  timeInputRef?: React.RefObject<HTMLInputElement>;
}

export const PerformanceInput: React.FC<PerformanceInputProps> = ({
  distance,
  time,
  onDistanceChange,
  onTimeChange,
  distanceSelectRef,
  timeInputRef,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <span className="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg">
          2
        </span>
        기준 기록 입력
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">종목 선택</label>
          <select
            ref={distanceSelectRef}
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
            className="w-full p-3 border rounded-lg bg-white"
          >
            <option value="">종목을 선택하세요</option>
            {DISTANCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">기록 입력</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              ref={timeInputRef}
              type="number"
              placeholder="시"
              min={0}
              max={23}
              value={time.hours || ''}
              onChange={(e) => onTimeChange('hours', parseInt(e.target.value) || 0)}
              className="p-3 border rounded-lg text-center"
            />
            <input
              type="number"
              placeholder="분"
              min={0}
              max={59}
              value={time.minutes || ''}
              onChange={(e) => onTimeChange('minutes', parseInt(e.target.value) || 0)}
              className="p-3 border rounded-lg text-center"
            />
            <input
              type="number"
              placeholder="초"
              min={0}
              max={59}
              step={0.1}
              value={time.seconds || ''}
              onChange={(e) => onTimeChange('seconds', parseFloat(e.target.value) || 0)}
              className="p-3 border rounded-lg text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
