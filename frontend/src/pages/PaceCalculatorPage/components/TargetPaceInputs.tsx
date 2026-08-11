import React from 'react';
import { STEEPLECHASE_SPECS } from '../utils/paceCalculations';
import type { TimeValue, WaterJumpPlacement } from './targetPaceTypes';

const QUICK_DISTANCES = [
  { label: '800m', value: 800 },
  { label: '1500m', value: 1500 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '하프', value: 21097.5 },
  { label: '풀코스', value: 42195 },
] as const;

const numberInputClass =
  'h-11 rounded-sm border border-line bg-surface px-3 text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] transition-colors focus:border-ink focus:outline-none';

type TargetPaceInputsProps = {
  readonly canCalculate: boolean;
  readonly customDistance: string;
  readonly distance: number;
  readonly distanceKm: string;
  readonly hasValidDistance: boolean;
  readonly hours: TimeValue;
  readonly isCustom: boolean;
  readonly isSteeple: boolean;
  readonly minutes: TimeValue;
  readonly onCalculate: () => void;
  readonly onCustomDistanceChange: (value: string) => void;
  readonly onDistanceSelect: (distance: number) => void;
  readonly onHoursChange: (value: TimeValue) => void;
  readonly onMinutesChange: (value: TimeValue) => void;
  readonly onSecondsChange: (value: TimeValue) => void;
  readonly onStartCustomDistance: () => void;
  readonly onSteepleSelect: () => void;
  readonly onWaterJumpChange: (placement: WaterJumpPlacement) => void;
  readonly seconds: TimeValue;
  readonly validationError: string;
  readonly waterJump: WaterJumpPlacement;
};

export const TargetPaceInputs: React.FC<TargetPaceInputsProps> = ({
  canCalculate,
  customDistance,
  distance,
  distanceKm,
  hasValidDistance,
  hours,
  isCustom,
  isSteeple,
  minutes,
  onCalculate,
  onCustomDistanceChange,
  onDistanceSelect,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  onStartCustomDistance,
  onSteepleSelect,
  onWaterJumpChange,
  seconds,
  validationError,
  waterJump,
}) => (
  <section className="border border-line bg-surface p-5 md:p-6">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">PACE INPUT</p>
        <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">목표 페이스 계산기</h2>
      </div>
      <p className="max-w-md text-body-sm leading-relaxed text-ink-3">목표 거리와 완주 시간을 넣으면 km·400m·100m 기준 페이스를 바로 계산해요.</p>
    </div>

    {validationError && (
      <div role="alert" className="mt-4 border border-err/40 border-l-2 border-l-err bg-surface px-3 py-2 text-body-sm text-err">
        {validationError}
      </div>
    )}

    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div>
        <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">Distance</label>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {QUICK_DISTANCES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDistanceSelect(option.value)}
              aria-pressed={!isCustom && !isSteeple && distance === option.value}
              className={`h-11 font-mono text-[12px] font-medium transition-colors ${
                !isCustom && !isSteeple && distance === option.value ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onSteepleSelect}
            aria-pressed={isSteeple}
            className={`h-11 font-mono text-[12px] font-medium transition-colors ${
              isSteeple ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
            }`}
          >
            3000mSC
          </button>
          <button
            type="button"
            onClick={onStartCustomDistance}
            aria-pressed={isCustom}
            className={`h-11 font-mono text-[12px] font-medium transition-colors ${
              isCustom ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
            }`}
          >
            직접
          </button>
        </div>

        {isSteeple && (
          <div className="mt-3 border border-line bg-surface-2 p-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-3">Water jump · 물웅덩이 위치</p>
            <div className="mt-2 grid grid-cols-2 gap-px border border-line bg-line">
              {(['INSIDE', 'OUTSIDE'] as const).map((placement) => (
                <button
                  key={placement}
                  type="button"
                  onClick={() => onWaterJumpChange(placement)}
                  aria-pressed={waterJump === placement}
                  className={`flex h-12 flex-col items-center justify-center font-mono text-[11px] transition-colors ${
                    waterJump === placement ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  <span className="font-semibold">{placement === 'INSIDE' ? '트랙 안쪽' : '트랙 바깥쪽'}</span>
                  <span className="text-[10px] opacity-70 [font-variant-numeric:tabular-nums]">랩 {STEEPLECHASE_SPECS[placement].lapDistance.toFixed(1)}m</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-ink-4">
              안쪽({STEEPLECHASE_SPECS.INSIDE.description}): 스타트 {STEEPLECHASE_SPECS.INSIDE.startDistance.toFixed(1)}m + 7랩 × {STEEPLECHASE_SPECS.INSIDE.lapDistance.toFixed(1)}m · 바깥쪽({STEEPLECHASE_SPECS.OUTSIDE.description}): 스타트 {STEEPLECHASE_SPECS.OUTSIDE.startDistance.toFixed(1)}m + 7랩 × {STEEPLECHASE_SPECS.OUTSIDE.lapDistance.toFixed(1)}m
            </p>
          </div>
        )}

        {isCustom && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              value={customDistance}
              onChange={(event) => onCustomDistanceChange(event.target.value)}
              min="0.1"
              step="0.1"
              className={`${numberInputClass} w-28`}
              aria-label="직접 거리 (km)"
              placeholder="거리"
            />
            <span className="text-body-sm text-ink-3">km</span>
          </div>
        )}
        <p className="mt-2 font-mono text-[11px] text-ink-4 [font-variant-numeric:tabular-nums]">
          SELECTED {isSteeple ? '3000M STEEPLECHASE' : hasValidDistance ? `${distanceKm}KM` : '거리 선택 전'}
        </p>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">Finish time</p>
        <div className="flex items-start gap-1.5">
          <TimeField label="시간" value={hours} max={12} invalid={Boolean(validationError)} onChange={onHoursChange} />
          <Separator />
          <TimeField label="분" value={minutes} max={59} invalid={Boolean(validationError)} onChange={onMinutesChange} />
          <Separator />
          <TimeField label="초" value={seconds} max={59} invalid={Boolean(validationError)} onChange={onSecondsChange} />
        </div>
        {validationError && <p id="target-time-error" role="alert" className="mt-2 text-body-sm text-err">{validationError}</p>}
      </div>
    </div>

    <button
      type="button"
      onClick={onCalculate}
      disabled={!canCalculate}
      className="mt-6 h-12 w-full bg-ink font-mono text-[12px] font-semibold uppercase tracking-widest-2 text-bg transition-colors hover:bg-brand-ink disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-4"
    >
      페이스 계산하기
    </button>
  </section>
);

type TimeFieldProps = {
  readonly invalid: boolean;
  readonly label: string;
  readonly max: number;
  readonly onChange: (value: TimeValue) => void;
  readonly value: TimeValue;
};

const TimeField: React.FC<TimeFieldProps> = ({ label, value, max, invalid, onChange }) => (
  <div className="flex flex-1 flex-col items-center">
    <input
      type="number"
      value={value ?? ''}
      onChange={(event) => {
        const nextValue = event.currentTarget.valueAsNumber;
        onChange(Number.isFinite(nextValue) ? nextValue : null);
      }}
      aria-label={label}
      aria-describedby={invalid ? 'target-time-error' : undefined}
      min="0"
      max={max}
      step="1"
      inputMode="numeric"
      className={`${numberInputClass} w-full`}
    />
    <span className="mt-1 text-caption text-ink-4">{label}</span>
  </div>
);

const Separator: React.FC = () => (
  <span className="pt-2.5 font-mono text-lg text-ink-4" aria-hidden>
    :
  </span>
);
