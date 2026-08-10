import { MetricCell } from '../../../components/ui/trainoracle';
import type { SplitData, PaceStrategy } from '../utils/paceCalculations';
import { formatPace, formatTime } from '../utils/paceCalculations';
import { SPLIT_STRATEGIES } from './splitPlannerContent';

type SplitPlannerResultsProps = {
  readonly distance: number;
  readonly targetTimeSeconds: number;
  readonly averagePace: string;
  readonly speedKmh: string;
  readonly strategy: PaceStrategy;
  readonly splits: readonly SplitData[];
  readonly onReset: () => void;
};

export function SplitPlannerResults({
  distance,
  targetTimeSeconds,
  averagePace,
  speedKmh,
  strategy,
  splits,
  onReset,
}: SplitPlannerResultsProps) {
  return (
    <section className="border border-line bg-surface p-5 sm:p-6" aria-live="polite">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">SPLIT OUTPUT</p>
          <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">구간별 목표</h2>
        </div>
        <span className="font-mono text-[10px] tracking-widest-2 text-ink-4">{SPLIT_STRATEGIES[strategy].label}</span>
      </div>

      <div className="grid border-y border-ink sm:grid-cols-2 lg:grid-cols-4">
        <MetricCell label="거리" value={distance.toFixed(3)} unit="km" />
        <MetricCell label="완주 시간" value={formatTime(targetTimeSeconds)} />
        <MetricCell label="기준 페이스" value={averagePace} unit="/km" />
        <MetricCell label="평균 속도" value={speedKmh} unit="km/h" />
      </div>

      <div className="mt-5 overflow-x-auto border border-line">
        <table className="w-full min-w-[520px] border-collapse text-body-sm">
          <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10px] uppercase tracking-widest-2 text-ink-3">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">구간</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">페이스</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">구간 시간</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">누적 통과</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">누적 거리</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((split) => (
              <tr key={`${split.km}-${split.cumulativeDistance}`} className="border-b border-hair last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-ink">{split.km}km</td>
                <td className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">{formatPace(split.pace)}/km</td>
                <td className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">{formatTime(split.lapTime)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink [font-variant-numeric:tabular-nums]">{formatTime(split.cumulativeTime)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-ink-3 [font-variant-numeric:tabular-nums]">{split.cumulativeDistance.toFixed(2)}km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 border-l-2 border-ink pl-3 text-body-sm leading-relaxed text-ink-3">
        기준 페이스를 나눈 참고값이에요. 코스와 날씨, 급수 지점에 따라 실제 레이스 운영은 달라질 수 있어요.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 h-11 w-full border border-line bg-surface font-mono text-[11px] font-semibold uppercase tracking-widest-2 text-ink transition-colors hover:bg-surface-2"
      >
        새로 계산하기
      </button>
    </section>
  );
}
