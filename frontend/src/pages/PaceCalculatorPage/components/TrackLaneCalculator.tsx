import React from 'react';
import { MetricCell } from '../../../components/ui/trainoracle';
import { useTrackLaneCalculator } from '../hooks/usePaceCalculator';
import { LANE_COLORS, formatPace, type LaneData } from '../utils/paceCalculations';

const LANES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const TrackLaneCalculator: React.FC<{ id?: string }> = ({ id = 'lane-calculator' }) => {
  const {
    selectedLane,
    setSelectedLane,
    targetTime,
    setTargetTime,
    hasValidTargetTime,
    lanesData,
    selectedLaneData,
  } = useTrackLaneCalculator();

  return (
    <div id={id} className="space-y-4">
      <section className="border border-line bg-surface p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">TRACK LANE</p>
            <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">400m 레인 비교</h2>
          </div>
          <p className="max-w-md text-body-sm leading-relaxed text-ink-3">
            선택한 레인의 목표 시간으로 속도를 계산해, 각 레인 한 바퀴의 참고 시간을 보여줘요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <label htmlFor="lane-target-time" className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">
              선택 레인 400m 목표 시간
            </label>
            <div className="flex items-center gap-2">
              <input
                id="lane-target-time"
                type="number"
                value={Number.isFinite(targetTime) ? targetTime : ''}
                onChange={(event) => setTargetTime(event.currentTarget.valueAsNumber)}
                min="0.1"
                step="0.1"
                inputMode="decimal"
                aria-label="400m 목표 시간 (초)"
                aria-describedby={hasValidTargetTime ? 'lane-time-help' : 'lane-time-error'}
                className="h-11 w-40 border border-line bg-surface px-3 text-center font-mono text-base text-ink [font-variant-numeric:tabular-nums] focus:border-ink focus:outline-none"
              />
              <span className="font-mono text-body-sm text-ink-3">초</span>
            </div>
            {hasValidTargetTime ? (
              <p id="lane-time-help" className="mt-2 text-caption text-ink-4">소수점까지 입력할 수 있어요.</p>
            ) : (
              <p id="lane-time-error" role="alert" className="mt-2 text-body-sm text-err">
                목표 시간은 0보다 크게 입력해 주세요.
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-3">선택 레인</legend>
            <div className="grid grid-cols-4 border border-line bg-line sm:grid-cols-8">
              {LANES.map((lane) => {
                const selected = lane === selectedLane;
                return (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => setSelectedLane(lane)}
                    aria-pressed={selected}
                    className={`h-11 font-mono text-[12px] font-medium transition-colors ${
                      selected ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    {lane}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-caption text-ink-4">선택한 레인과 같은 속도로 다른 레인을 달렸을 때의 값이에요.</p>
          </fieldset>
        </div>
      </section>

      {hasValidTargetTime && selectedLaneData ? (
        <LaneResults selectedLaneData={selectedLaneData} lanesData={lanesData} />
      ) : (
        <section className="border border-line bg-surface px-5 py-8 text-center text-body-sm text-ink-3" aria-live="polite">
          목표 시간을 입력하면 레인별 거리와 통과 시간을 보여드려요.
        </section>
      )}
    </div>
  );
};

function LaneResults({ selectedLaneData, lanesData }: {
  readonly selectedLaneData: LaneData;
  readonly lanesData: readonly LaneData[];
}) {
  const firstLaneTime = lanesData[0]?.adjustedTime ?? selectedLaneData.adjustedTime;

  return (
    <>
      <section className="border border-line bg-surface p-5 sm:p-6" aria-live="polite">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">LANE OUTPUT</p>
            <h3 className="mt-1 text-h3 font-semibold tracking-tight text-ink">{selectedLaneData.lane}레인 기준</h3>
          </div>
          <span className="font-mono text-[10px] tracking-widest-2 text-ink-4">400M</span>
        </div>

        <div className="grid border-y border-ink sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell label="레인 거리" value={selectedLaneData.distance.toFixed(2)} unit="m" />
          <MetricCell label="목표 시간" value={selectedLaneData.adjustedTime.toFixed(2)} unit="초" />
          <MetricCell label="평균 속도" value={selectedLaneData.speedKMH.toFixed(2)} unit="km/h" />
          <MetricCell label="km 환산 페이스" value={formatPace(selectedLaneData.pacePerKm)} unit="/km" />
        </div>

        <div className="mt-5 grid border border-line sm:grid-cols-4">
          <SectionMetric label="직선 1" value={selectedLaneData.sectionTimes.straight1} />
          <SectionMetric label="곡선 1" value={selectedLaneData.sectionTimes.curve1} />
          <SectionMetric label="직선 2" value={selectedLaneData.sectionTimes.straight2} />
          <SectionMetric label="곡선 2" value={selectedLaneData.sectionTimes.curve2} />
        </div>
      </section>

      <section className="border border-line bg-surface p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className="text-h3 font-semibold tracking-tight text-ink">레인별 비교</h3>
          <p className="text-caption text-ink-4">1레인 기준 차이</p>
        </div>
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[540px] border-collapse text-body-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10px] uppercase tracking-widest-2 text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium">레인</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">거리</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">스타거</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">한 바퀴</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">1레인과 차이</th>
              </tr>
            </thead>
            <tbody>
              {lanesData.map((lane) => {
                const difference = lane.adjustedTime - firstLaneTime;
                return (
                  <tr key={lane.lane} className={`border-b border-hair last:border-b-0 ${lane.isSelected ? 'bg-surface-2' : ''}`}>
                    <td className="border-l-2 px-3 py-2.5 font-semibold text-ink" style={{ borderLeftColor: LANE_COLORS[lane.lane - 1] }}>
                      {lane.lane}레인{lane.isSelected ? ' · 선택' : ''}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">{lane.distance.toFixed(2)}m</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-3 [font-variant-numeric:tabular-nums]">{lane.stagger > 0 ? `+${lane.stagger.toFixed(2)}m` : '0.00m'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink [font-variant-numeric:tabular-nums]">{lane.adjustedTime.toFixed(2)}초</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-3 [font-variant-numeric:tabular-nums]">{difference === 0 ? '-' : `+${difference.toFixed(2)}초`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-l-2 border-ink pl-3 text-body-sm leading-relaxed text-ink-3">
          표준 400m 트랙의 측정선 기준 참고값이에요. 실제 경기에서는 레인별 스타거 출발이 적용돼요.
        </p>
      </section>
    </>
  );
}

function SectionMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="border-b border-hair px-3.5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[9.5px] font-medium uppercase tracking-widest-2 text-ink-3">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-medium tracking-tighter-2 text-ink [font-variant-numeric:tabular-nums]">
        {value.toFixed(2)}<span className="ml-0.5 text-[11px] font-normal text-ink-3">초</span>
      </p>
    </div>
  );
}

export default TrackLaneCalculator;
