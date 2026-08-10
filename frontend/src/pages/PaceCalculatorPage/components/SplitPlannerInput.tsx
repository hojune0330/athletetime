import type { PaceStrategy } from '../utils/paceCalculations';
import { SPLIT_DISTANCE_OPTIONS, SPLIT_STRATEGIES, SPLIT_TIME_PRESETS } from './splitPlannerContent';

type SplitPlannerInputProps = {
  readonly distance: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly strategy: PaceStrategy;
  readonly hasValidInput: boolean;
  readonly averagePace: string;
  readonly speedKmh: string;
  readonly onDistanceChange: (distance: number) => void;
  readonly onHoursChange: (hours: number) => void;
  readonly onMinutesChange: (minutes: number) => void;
  readonly onSecondsChange: (seconds: number) => void;
  readonly onStrategyChange: (strategy: PaceStrategy) => void;
  readonly onCalculate: () => void;
};

const inputClass = 'h-11 w-full rounded-sm border border-line bg-surface px-3 text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] focus:border-ink focus:outline-none';

export function SplitPlannerInput({
  distance,
  hours,
  minutes,
  seconds,
  strategy,
  hasValidInput,
  averagePace,
  speedKmh,
  onDistanceChange,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  onStrategyChange,
  onCalculate,
}: SplitPlannerInputProps) {
  const presets = SPLIT_TIME_PRESETS[distance] ?? [];

  return (
    <>
      <section className="border border-line bg-surface p-5 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">STEP 01</p>
            <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">목표 기록</h2>
          </div>
          <p className="hidden text-body-sm text-ink-3 sm:block">거리와 완주 시간을 넣어 주세요</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="split-distance" className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">목표 거리</label>
            <div className="grid grid-cols-4 border border-line bg-line">
              {SPLIT_DISTANCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onDistanceChange(option.value)}
                  aria-pressed={distance === option.value}
                  className={`h-11 font-mono text-[11px] font-medium transition-colors ${
                    distance === option.value ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="split-distance"
                type="number"
                min="0.1"
                step="0.1"
                value={Number.isFinite(distance) ? distance : ''}
                onChange={(event) => onDistanceChange(Number(event.target.value))}
                aria-label="목표 거리 (km)"
                className={`${inputClass} max-w-32`}
              />
              <span className="font-mono text-sm text-ink-3">km</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">완주 시간</p>
            {presets.length > 0 && (
              <div className="mb-3 flex gap-1.5" aria-label="완주 시간 빠른 선택">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onHoursChange(preset.hours);
                      onMinutesChange(preset.minutes);
                      onSecondsChange(0);
                    }}
                    className="h-8 border border-line bg-surface px-2.5 font-mono text-[10px] text-ink-2 transition-colors hover:border-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-start gap-1.5">
              <TimeInput label="시간" value={hours} max={12} onChange={onHoursChange} />
              <TimeSeparator />
              <TimeInput label="분" value={minutes} max={59} onChange={onMinutesChange} />
              <TimeSeparator />
              <TimeInput label="초" value={seconds} max={59} onChange={onSecondsChange} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid border-y border-ink sm:grid-cols-2">
          <PreviewMetric label="기준 페이스" value={hasValidInput ? averagePace : '-'} unit="/km" />
          <PreviewMetric label="평균 속도" value={hasValidInput ? speedKmh : '-'} unit="km/h" />
        </div>
      </section>

      <section className="border border-line bg-surface p-5 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">STEP 02</p>
            <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">페이스 전략</h2>
          </div>
          <p className="hidden text-body-sm text-ink-3 sm:block">기준 페이스를 어떻게 나눌지 고르세요</p>
        </div>

        <div className="grid border border-line bg-line sm:grid-cols-3">
          {(Object.keys(SPLIT_STRATEGIES) as PaceStrategy[]).map((key) => {
            const option = SPLIT_STRATEGIES[key];
            const selected = strategy === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onStrategyChange(key)}
                aria-pressed={selected}
                className={`min-h-20 p-3 text-left transition-colors ${selected ? 'bg-ink text-bg' : 'bg-surface text-ink hover:bg-surface-2'}`}
              >
                <span className="block text-body-sm font-semibold">{option.label}</span>
                <span className={`mt-1 block text-caption leading-snug ${selected ? 'text-bg/70' : 'text-ink-3'}`}>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-body-sm text-ink-3">{SPLIT_STRATEGIES[strategy].description}</p>

        <button
          type="button"
          onClick={onCalculate}
          className="mt-6 h-12 w-full bg-ink font-mono text-[12px] font-semibold uppercase tracking-widest-2 text-bg transition-colors hover:bg-ink-2"
        >
          스플릿 계산하기
        </button>
      </section>
    </>
  );
}

function TimeInput({ label, value, max, onChange }: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <input
        type="number"
        min="0"
        max={max}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className={inputClass}
      />
      <span className="mt-1 text-caption text-ink-4">{label}</span>
    </div>
  );
}

function TimeSeparator() {
  return <span className="pt-2.5 font-mono text-lg text-ink-4" aria-hidden>:</span>;
}

function PreviewMetric({ label, value, unit }: { readonly label: string; readonly value: string; readonly unit: string }) {
  return (
    <div className="border-b border-hair px-3.5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[9.5px] font-medium uppercase tracking-widest-2 text-ink-3">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-medium tracking-tighter-2 text-ink [font-variant-numeric:tabular-nums]">
        {value}<span className="ml-0.5 text-[11px] font-normal text-ink-3">{unit}</span>
      </p>
    </div>
  );
}
