import React from 'react';
import { usePaceChart } from '../hooks/usePaceCalculator';
import { ChartDownloadButtons } from './ChartDownloadButtons';

interface PaceChartTableProps {
  readonly id?: string;
}

const DISTANCE_HEADERS = ['100m', '200m', '400m', '800m', '1km', '3km', '5km', '10km', '15km', '하프', '30km', '풀코스'] as const;

export const PaceChartTable: React.FC<PaceChartTableProps> = ({ id = 'chart1' }) => {
  const { paceChartData } = usePaceChart();

  return (
    <section className="border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">DISTANCE TABLE</p>
          <h3 className="mt-1 text-h3 font-semibold tracking-tight text-ink">거리별 예상 시간</h3>
          <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-ink-3">
            km 페이스를 기준으로 각 거리의 예상 시간을 비교해요. 코스와 날씨, 급수 지점에 따라 실제 기록은 달라질 수 있어요.
          </p>
        </div>
        <ChartDownloadButtons chartId={id} filename="페이스_거리별_예상시간" />
      </div>

      <div id={id} className="mt-5 border border-line bg-surface">
        <div className="border-b border-line px-3 py-2 font-mono text-[10px] tracking-widest-2 text-ink-4">
          단위: 분:초
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-body-sm" aria-label="km 페이스별 거리 예상 시간">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10px] uppercase tracking-widest-2 text-ink-3">
              <tr>
                <th scope="col" className="sticky left-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 font-medium">km 페이스</th>
                {DISTANCE_HEADERS.map((header) => (
                  <th key={header} scope="col" className="px-3 py-2.5 text-right font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paceChartData.map((row) => (
                <tr key={row.paceSeconds} className={`border-b border-hair last:border-b-0 ${row.isHighlight ? 'bg-surface-2' : ''}`}>
                  <th scope="row" className="sticky left-0 z-10 border-r border-hair bg-inherit px-3 py-2.5 text-left font-mono font-semibold text-ink [font-variant-numeric:tabular-nums]">
                    {row.pace}
                  </th>
                  {row.times.map((time) => (
                    <td key={time.distance} className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">
                      {time.time}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default PaceChartTable;
