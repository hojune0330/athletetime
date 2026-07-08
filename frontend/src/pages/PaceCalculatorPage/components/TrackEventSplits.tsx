import React, { useMemo, useState } from 'react';
import { MetricCell } from '../../../components/ui/trainoracle';
import {
  STEEPLECHASE_SPECS,
  type SteepleVariant,
  type TrackSplit,
  calculateSteepleSplits,
  calculateTrackSplits,
  formatSplitTime,
  formatTime,
} from '../utils/paceCalculations';

/**
 * 트랙 종목 구간 계산 — 800m · 1500m · 3000mSC
 *
 * 3000mSC는 물웅덩이(water jump) 위치에 따라 랩 거리가 다르다:
 * - 안쪽(표준): 스타트 227.412m + 7 × 396.084m
 * - 바깥쪽(8레인 밖): 스타트 64.151m + 7 × 419.407m
 * 균등 페이스 기준 랩별 통과 목표 시간을 보여준다.
 */

type TrackEvent = '800m' | '1500m' | '3000mSC';

const EVENTS: Array<{ id: TrackEvent; label: string; hint: string }> = [
  { id: '800m', label: '800m', hint: '2 × 400m' },
  { id: '1500m', label: '1500m', hint: '300m + 3 × 400m' },
  { id: '3000mSC', label: '3000mSC', hint: '물웅덩이 위치별 랩' },
];

const numberInputClass =
  'h-11 rounded-sm border border-line bg-surface px-3 text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] transition-colors focus:border-ink focus:outline-none';

export const TrackEventSplits: React.FC = () => {
  const [event, setEvent] = useState<TrackEvent>('3000mSC');
  const [variant, setVariant] = useState<SteepleVariant>('INSIDE');
  const [minutes, setMinutes] = useState(9);
  const [seconds, setSeconds] = useState(30);

  const targetSeconds = minutes * 60 + seconds;

  const splits: TrackSplit[] = useMemo(() => {
    if (targetSeconds <= 0) return [];
    if (event === '3000mSC') return calculateSteepleSplits(targetSeconds, variant);
    return calculateTrackSplits(event === '800m' ? 800 : 1500, targetSeconds);
  }, [event, variant, targetSeconds]);

  const spec = STEEPLECHASE_SPECS[variant];
  const lapPace = splits.length > 0 ? splits[splits.length - 1].time : 0;
  const per400 = targetSeconds > 0 ? (targetSeconds / 3000) * 400 : 0;

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
              TRACK EVENTS
            </p>
            <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">트랙 종목 구간 계산</h2>
          </div>
          <p className="max-w-md text-body-sm leading-relaxed text-ink-3">
            800m·1500m·3000mSC 목표 기록을 넣으면 랩별 통과 목표를 계산해요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div>
            <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
              Event
            </label>
            <div className="grid grid-cols-3 border border-line bg-surface">
              {EVENTS.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setEvent(option.id)}
                  className={`h-11 border-hair font-mono text-[12px] font-medium transition-colors ${
                    index > 0 ? 'border-l' : ''
                  } ${event === option.id ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px] text-ink-4">
              {EVENTS.find((option) => option.id === event)?.hint}
            </p>

            {event === '3000mSC' && (
              <div className="mt-4">
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
                  Water jump
                </label>
                <div className="grid grid-cols-2 border border-line bg-surface">
                  {(Object.keys(STEEPLECHASE_SPECS) as SteepleVariant[]).map((key, index) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVariant(key)}
                      aria-pressed={variant === key}
                      className={`h-11 border-hair px-2 font-mono text-[11px] font-medium transition-colors ${
                        index > 0 ? 'border-l' : ''
                      } ${variant === key ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}
                    >
                      {STEEPLECHASE_SPECS[key].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-ink-4">{spec.description}</p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
              Target time
            </label>
            <div className="flex items-start gap-1.5">
              <div className="flex flex-1 flex-col items-center">
                <input
                  type="number"
                  value={minutes}
                  min="0"
                  max="30"
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className={`${numberInputClass} w-full`}
                />
                <span className="mt-1 text-caption text-ink-4">분</span>
              </div>
              <span className="pt-2.5 font-mono text-lg text-ink-4" aria-hidden>:</span>
              <div className="flex flex-1 flex-col items-center">
                <input
                  type="number"
                  value={seconds}
                  min="0"
                  max="59"
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  className={`${numberInputClass} w-full`}
                />
                <span className="mt-1 text-caption text-ink-4">초</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {splits.length > 0 && (
        <section className="border border-line bg-surface p-5 md:p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-h3 font-semibold tracking-tight text-ink">랩별 통과 목표</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">SPLIT OUTPUT</span>
          </div>

          <div className="grid border-y border-ink bg-surface sm:grid-cols-3">
            <MetricCell label="목표 기록" value={formatTime(targetSeconds)} />
            <MetricCell
              label={event === '3000mSC' ? `랩 페이스 (${spec.lapDistance}m)` : '랩 페이스 (400m)'}
              value={formatSplitTime(lapPace)}
            />
            <MetricCell label="400m 환산" value={event === '3000mSC' ? formatSplitTime(per400) : formatSplitTime((targetSeconds / (event === '800m' ? 800 : 1500)) * 400)} />
          </div>

          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead className="bg-surface-2 text-left text-xs text-ink-4">
                <tr>
                  <th className="p-2.5">구간</th>
                  <th className="p-2.5 text-right">거리</th>
                  <th className="p-2.5 text-right">누적 거리</th>
                  <th className="p-2.5 text-right">구간 시간</th>
                  <th className="p-2.5 text-right">누적 통과</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((split) => (
                  <tr key={split.label} className="border-t border-line">
                    <td className="p-2.5 font-medium text-ink">{split.label}</td>
                    <td className="p-2.5 text-right font-mono text-xs tabular-nums text-ink-3">{split.distance.toFixed(1)}m</td>
                    <td className="p-2.5 text-right font-mono text-xs tabular-nums text-ink-3">{split.cumulativeDistance.toFixed(1)}m</td>
                    <td className="p-2.5 text-right font-mono tabular-nums text-ink">{formatSplitTime(split.time)}</td>
                    <td className="p-2.5 text-right font-mono font-semibold tabular-nums text-ink">{formatSplitTime(split.cumulativeTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-l-2 border-ink pl-3 text-body-sm leading-relaxed text-ink-3">
            {event === '3000mSC'
              ? '균등 페이스 기준이에요. 물웅덩이 위치에 따라 랩 거리가 달라서 같은 목표 기록이라도 랩 통과 시간이 달라요. 장애물 감속은 반영하지 않은 참고값이에요.'
              : '균등 페이스 기준 참고값이에요. 실제 레이스 전략(선행/후행)에 따라 달라질 수 있어요.'}
          </div>
        </section>
      )}
    </div>
  );
};

export default TrackEventSplits;
