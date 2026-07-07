import React from 'react';
import { DISTANCE_OPTIONS } from '../utils/vdotCalculations';
import type { TimeInput } from '../hooks/useTrainingCalculator';
import { CalcSection, FieldLabel, selectClass } from './CalcSection';

interface PerformanceInputProps {
  distance: string;
  time: TimeInput;
  onDistanceChange: (value: string) => void;
  onTimeChange: <K extends keyof TimeInput>(key: K, value: number) => void;
  distanceSelectRef?: React.RefObject<HTMLSelectElement | null>;
  timeInputRef?: React.RefObject<HTMLInputElement | null>;
}

const timeInputClass =
  'h-11 w-full rounded-sm border border-line bg-surface text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] transition-colors focus:border-ink focus:outline-none';

export const PerformanceInput: React.FC<PerformanceInputProps> = ({
  distance,
  time,
  onDistanceChange,
  onTimeChange,
  distanceSelectRef,
  timeInputRef,
}) => {
  return (
    <CalcSection step="02" title="기준 기록" hint="가장 최근의 대회 또는 타임트라이얼 기록">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="calc-distance">종목</FieldLabel>
          <select
            id="calc-distance"
            ref={distanceSelectRef}
            value={distance}
            onChange={(e) => onDistanceChange(e.target.value)}
            className={selectClass}
          >
            <option value="">종목을 선택하세요</option>
            {DISTANCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>기록 (시 : 분 : 초)</FieldLabel>
          <div className="flex items-center gap-1.5">
            <input
              ref={timeInputRef}
              type="number"
              placeholder="0"
              min={0}
              max={23}
              value={time.hours || ''}
              onChange={(e) => onTimeChange('hours', parseInt(e.target.value) || 0)}
              aria-label="시"
              className={timeInputClass}
            />
            <span className="font-mono text-lg text-ink-4" aria-hidden>:</span>
            <input
              type="number"
              placeholder="00"
              min={0}
              max={59}
              value={time.minutes || ''}
              onChange={(e) => onTimeChange('minutes', parseInt(e.target.value) || 0)}
              aria-label="분"
              className={timeInputClass}
            />
            <span className="font-mono text-lg text-ink-4" aria-hidden>:</span>
            <input
              type="number"
              placeholder="00"
              min={0}
              max={59}
              step={0.1}
              value={time.seconds || ''}
              onChange={(e) => onTimeChange('seconds', parseFloat(e.target.value) || 0)}
              aria-label="초"
              className={timeInputClass}
            />
          </div>
        </div>
      </div>
    </CalcSection>
  );
};
