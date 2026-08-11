import React from 'react';
import {
  TARGETS_5KM,
  TARGETS_10KM,
  TARGETS_FULL,
  TARGETS_HALF,
  calculate100mTime,
  calculate400mLap,
  calculatePaceFromTarget,
  calculateSpeed,
  formatPace,
  formatTime,
  type TargetRecord,
} from '../utils/paceCalculations';
import { ChartDownloadButtons } from './ChartDownloadButtons';

type Checkpoint = '100m' | '5km' | '10km' | 'half' | '30km';

type TargetTableProps = {
  readonly title: string;
  readonly distance: number;
  readonly targets: readonly TargetRecord[];
  readonly checkpoints: readonly Checkpoint[];
};

const TARGET_SECTIONS: readonly TargetTableProps[] = [
  { title: '5km 목표 기록', distance: 5000, targets: TARGETS_5KM, checkpoints: ['100m'] },
  { title: '10km 목표 기록', distance: 10000, targets: TARGETS_10KM, checkpoints: ['5km'] },
  { title: '하프마라톤 목표 기록', distance: 21097.5, targets: TARGETS_HALF, checkpoints: ['5km', '10km'] },
  { title: '풀코스 목표 기록', distance: 42195, targets: TARGETS_FULL, checkpoints: ['10km', 'half', '30km'] },
];

const CHECKPOINT_LABELS: Readonly<Record<Checkpoint, string>> = {
  '100m': '100m',
  '5km': '5km 통과',
  '10km': '10km 통과',
  half: '하프 통과',
  '30km': '30km 통과',
};

export const TargetPaceTable: React.FC<{ readonly id?: string }> = ({ id = 'chart2' }) => (
  <section className="border border-line bg-surface p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">TARGET TABLE</p>
        <h3 className="mt-1 text-h3 font-semibold tracking-tight text-ink">목표 기록별 페이스</h3>
        <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-ink-3">
          목표 기록을 정할 때 필요한 페이스와 주요 통과 시간을 비교해요. 실제 레이스 운영은 코스와 컨디션에 맞춰 조절해 주세요.
        </p>
      </div>
      <ChartDownloadButtons chartId={id} filename="목표_기록별_페이스" />
    </div>

    <div id={id} className="mt-5 space-y-5">
      {TARGET_SECTIONS.map((section) => <TargetTable key={section.title} {...section} />)}
    </div>
  </section>
);

function TargetTable({ title, distance, targets, checkpoints }: TargetTableProps) {
  return (
    <section className="border border-line bg-surface">
      <h4 className="border-b border-line bg-surface-2 px-3 py-2.5 text-body-sm font-semibold text-ink">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-body-sm" aria-label={title}>
          <thead className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest-2 text-ink-3">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">목표</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">km 페이스</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">400m</th>
              {checkpoints.map((checkpoint) => (
                <th key={checkpoint} scope="col" className="px-3 py-2.5 text-right font-medium">{CHECKPOINT_LABELS[checkpoint]}</th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-medium">속도</th>
              <th scope="col" className="px-3 py-2.5 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => <TargetRow key={`${title}-${target.time}`} target={target} distance={distance} checkpoints={checkpoints} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TargetRow({ target, distance, checkpoints }: {
  readonly target: TargetRecord;
  readonly distance: number;
  readonly checkpoints: readonly Checkpoint[];
}) {
  const pacePerKm = calculatePaceFromTarget(target.time, distance);
  const checkpointTimes: Readonly<Record<Checkpoint, number>> = {
    '100m': calculate100mTime(pacePerKm),
    '5km': pacePerKm * 5,
    '10km': pacePerKm * 10,
    half: pacePerKm * 21.0975,
    '30km': pacePerKm * 30,
  };

  return (
    <tr className={`border-b border-hair last:border-b-0 ${target.highlight ? 'bg-surface-2' : ''}`}>
      <th scope="row" className="px-3 py-2.5 text-left font-mono font-semibold text-ink [font-variant-numeric:tabular-nums]">{formatTime(target.time)}</th>
      <td className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">{formatPace(pacePerKm)}</td>
      <td className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">{formatTime(calculate400mLap(pacePerKm))}</td>
      {checkpoints.map((checkpoint) => (
        <td key={checkpoint} className="px-3 py-2.5 text-right font-mono text-ink [font-variant-numeric:tabular-nums]">
          {formatTime(checkpointTimes[checkpoint])}
        </td>
      ))}
      <td className="px-3 py-2.5 text-right font-mono text-ink-3 [font-variant-numeric:tabular-nums]">{calculateSpeed(distance, target.time).toFixed(1)}km/h</td>
      <td className="px-3 py-2.5 text-caption text-ink-3">{target.label}</td>
    </tr>
  );
}

export default TargetPaceTable;
