import React from 'react';
import { MetricCell } from '../../../components/ui/trainoracle';
import { formatTime } from '../utils/paceCalculations';
import type { PaceResult, SteepleSplitDetails, WaterJumpPlacement } from './targetPaceTypes';

type TargetPaceResultProps = {
  readonly distanceKm: string;
  readonly isSteeple: boolean;
  readonly onReset: () => void;
  readonly result: PaceResult;
  readonly steepleSplits: SteepleSplitDetails | null;
  readonly waterJump: WaterJumpPlacement;
};

export const TargetPaceResult: React.FC<TargetPaceResultProps> = ({
  distanceKm,
  isSteeple,
  onReset,
  result,
  steepleSplits,
  waterJump,
}) => (
  <section className="border border-line bg-surface p-5 md:p-6">
    <div className="mb-4 flex items-baseline justify-between">
      <h3 className="text-h3 font-semibold tracking-tight text-ink">계산 결과</h3>
      <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">PACE OUTPUT</span>
    </div>

    <div className="grid border-y border-ink bg-surface sm:grid-cols-2 lg:grid-cols-3">
      <MetricCell label="km 페이스" value={result.pacePerKm} unit="/km" />
      {steepleSplits ? (
        <MetricCell label={`SC 랩 (${steepleSplits.spec.lapDistance.toFixed(1)}m)`} value={formatTime(steepleSplits.lapTime)} unit="초" />
      ) : (
        <MetricCell label="400m 랩" value={result.pace400m} unit="초" />
      )}
      <MetricCell label="100m" value={result.pace100m} unit="초" />
      <MetricCell label="속도" value={result.speedKmh} unit="km/h" />
      <MetricCell label="거리" value={distanceKm} unit="km" />
      <MetricCell label="완주 시간" value={result.finishTime} />
    </div>

    {steepleSplits && (
      <div className="mt-4 border border-line">
        <div className="flex items-baseline justify-between border-b border-line bg-surface-2 px-3 py-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-3">
            SC LAP SPLITS · {waterJump === 'INSIDE' ? '트랙 안쪽' : '트랙 바깥쪽'}
          </p>
          <p className="font-mono text-[10px] text-ink-4 [font-variant-numeric:tabular-nums]">
            스타트 {steepleSplits.spec.startDistance.toFixed(1)}m · 랩 {steepleSplits.spec.lapDistance.toFixed(1)}m
          </p>
        </div>
        <div className="divide-y divide-hair">
          {steepleSplits.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 px-3 py-1.5">
              <span className="text-body-sm text-ink-2">{row.label}</span>
              <span className="font-mono text-[11px] text-ink-4 [font-variant-numeric:tabular-nums]">{row.distance.toFixed(1)}m</span>
              <span className="font-mono text-body-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{formatTime(row.cumulative)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="mt-4 border-l-2 border-ink pl-3 text-body-sm leading-relaxed text-ink-3">
      {isSteeple
        ? '균등 페이스 기준 참고값이에요. 장애물 넘기·물웅덩이 감속은 반영되지 않았으니 실제 랩은 조금 느려질 수 있어요. 경기장의 물웅덩이 위치를 꼭 확인하세요.'
        : '균등 페이스 기준 참고값이에요. 실제 레이스에서는 코스, 날씨, 급수 지점에 따라 달라질 수 있어요.'}
    </div>

    <button
      type="button"
      onClick={onReset}
      className="mt-4 h-11 w-full border border-line bg-surface font-mono text-[11px] font-semibold uppercase tracking-widest-2 text-ink transition-colors hover:bg-surface-2"
    >
      초기화
    </button>
  </section>
);
