import React, { useMemo, useState } from 'react';
import { MetricCell } from '../../../components/ui/trainoracle';
import {
  formatTime,
  formatPace,
  calculatePaceFromTarget,
  calculate400mLap,
  calculate100mTime,
  calculateSpeed,
} from '../utils/paceCalculations';

type PaceResult = {
  readonly pacePerKm: string;
  readonly pace400m: string;
  readonly pace100m: string;
  readonly speedKmh: string;
  readonly finishTime: string;
};

const QUICK_DISTANCES = [
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '하프', value: 21097.5 },
  { label: '풀코스', value: 42195 },
] as const;

const numberInputClass =
  'h-11 rounded-sm border border-line bg-surface px-3 text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] transition-colors focus:border-ink focus:outline-none';

export const TargetPaceCalculator: React.FC = () => {
  const [distance, setDistance] = useState<number>(5000);
  const [customDistance, setCustomDistance] = useState<string>('5');
  const [isCustom, setIsCustom] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(20);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<PaceResult | null>(null);

  const targetTimeSeconds = useMemo(() => hours * 3600 + minutes * 60 + seconds, [hours, minutes, seconds]);
  const distanceKm = (distance / 1000).toFixed(3);

  const handleDistanceSelect = (selectedDistance: number) => {
    setDistance(selectedDistance);
    setIsCustom(false);
  };

  const handleCustomDistanceChange = (value: string) => {
    setCustomDistance(value);
    const nextDistanceKm = Number.parseFloat(value);
    if (Number.isFinite(nextDistanceKm) && nextDistanceKm > 0) {
      setDistance(nextDistanceKm * 1000);
    }
    setIsCustom(true);
  };

  const calculate = () => {
    if (targetTimeSeconds <= 0 || distance <= 0) {
      alert('거리와 시간을 입력해 주세요.');
      return;
    }

    const pacePerKm = calculatePaceFromTarget(targetTimeSeconds, distance);
    setResult({
      pacePerKm: formatPace(pacePerKm),
      pace400m: formatTime(calculate400mLap(pacePerKm)),
      pace100m: formatTime(calculate100mTime(pacePerKm)),
      speedKmh: calculateSpeed(distance, targetTimeSeconds).toFixed(2),
      finishTime: formatTime(targetTimeSeconds),
    });
  };

  const reset = () => {
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
              PACE INPUT
            </p>
            <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">목표 페이스 계산기</h2>
          </div>
          <p className="max-w-md text-body-sm leading-relaxed text-ink-3">
            목표 거리와 완주 시간을 넣으면 km·400m·100m 기준 페이스를 바로 계산해요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div>
            <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
              Distance
            </label>
            <div className="grid grid-cols-2 border border-line bg-surface sm:grid-cols-5">
              {QUICK_DISTANCES.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleDistanceSelect(option.value)}
                  className={`h-11 border-hair font-mono text-[12px] font-medium transition-colors ${
                    index > 0 ? 'border-l max-sm:[&:nth-child(odd)]:border-l-0' : ''
                  } ${!isCustom && distance === option.value ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`h-11 border-l border-hair font-mono text-[12px] font-medium transition-colors sm:col-auto ${
                  isCustom ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
                }`}
              >
                직접
              </button>
            </div>

            {isCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={customDistance}
                  onChange={(event) => handleCustomDistanceChange(event.target.value)}
                  min="0.1"
                  step="0.1"
                  className={`${numberInputClass} w-28`}
                  placeholder="거리"
                />
                <span className="text-body-sm text-ink-3">km</span>
              </div>
            )}
            <p className="mt-2 font-mono text-[11px] text-ink-4 [font-variant-numeric:tabular-nums]">
              SELECTED {distanceKm}KM
            </p>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
              Finish time
            </label>
            <div className="flex items-start gap-1.5">
              <TimeField label="시간" value={hours} max={12} onChange={setHours} />
              <Separator />
              <TimeField label="분" value={minutes} max={59} onChange={setMinutes} />
              <Separator />
              <TimeField label="초" value={seconds} max={59} onChange={setSeconds} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={calculate}
          className="mt-6 h-12 w-full bg-ink font-mono text-[12px] font-semibold uppercase tracking-widest-2 text-bg transition-colors hover:bg-brand-ink"
        >
          Calculate pace
        </button>
      </section>

      {result ? (
        <section className="border border-line bg-surface p-5 md:p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-h3 font-semibold tracking-tight text-ink">계산 결과</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">PACE OUTPUT</span>
          </div>

          <div className="grid border-y border-ink bg-surface sm:grid-cols-2 lg:grid-cols-3">
            <MetricCell label="km 페이스" value={result.pacePerKm} unit="/km" />
            <MetricCell label="400m 랩" value={result.pace400m} unit="초" />
            <MetricCell label="100m" value={result.pace100m} unit="초" />
            <MetricCell label="속도" value={result.speedKmh} unit="km/h" />
            <MetricCell label="거리" value={distanceKm} unit="km" />
            <MetricCell label="완주 시간" value={result.finishTime} />
          </div>

          <div className="mt-4 border-l-2 border-ink pl-3 text-body-sm leading-relaxed text-ink-3">
            균등 페이스 기준 참고값이에요. 실제 레이스에서는 코스, 날씨, 급수 지점에 따라 달라질 수 있어요.
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-4 h-11 w-full border border-line bg-surface font-mono text-[11px] font-semibold uppercase tracking-widest-2 text-ink transition-colors hover:bg-surface-2"
          >
            Reset
          </button>
        </section>
      ) : (
        <section className="border border-dashed border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
            WAITING INPUT
          </p>
          <h3 className="mt-2 text-body font-semibold text-ink">목표 기록을 넣으면 바로 계산해요.</h3>
          <p className="mt-1 text-body-sm text-ink-3">거리와 완주 시간을 입력한 뒤 계산 버튼을 누르세요.</p>
        </section>
      )}
    </div>
  );
};

type TimeFieldProps = {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
};

const TimeField: React.FC<TimeFieldProps> = ({ label, value, max, onChange }) => (
  <div className="flex flex-1 flex-col items-center">
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      min="0"
      max={max}
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

export default TargetPaceCalculator;
