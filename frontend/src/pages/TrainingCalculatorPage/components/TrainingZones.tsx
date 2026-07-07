import React from 'react';
import { formatPace, type TrainingPaces } from '../utils/vdotCalculations';
import { EnergyTag, type EnergySystem } from '../../../components/ui/trainoracle';

interface TrainingZonesProps {
  paces: TrainingPaces;
}

/**
 * 훈련 구역별 페이스 — TRAINORACLE 스타일.
 * - 그라데이션 배경 금지: hairline 행 + 에너지 dot/underline만 색 사용
 * - 상단에 페이스 스펙트럼(빠름 → 느림) 시각화: 얇은 축 위에 구역 마커
 * - 모든 숫자는 mono + tabular-nums
 */

type ZoneDef = {
  key: 'easy' | 'marathon' | 'threshold' | 'interval' | 'repetition';
  letter: string;
  name: string;
  energy: EnergySystem;
  energyName: string;
  description: string;
};

const ZONES: ZoneDef[] = [
  {
    key: 'repetition',
    letter: 'R',
    name: 'Repetition',
    energy: 'atp',
    energyName: 'Speed',
    description: '스피드·폼 | 최대 스피드의 95%+ | 완전 회복 후 반복',
  },
  {
    key: 'interval',
    letter: 'I',
    name: 'Interval',
    energy: 'vo2',
    energyName: 'VO2max',
    description: 'VO2max 향상 | 최대심박 95–100% | 3–8분 반복',
  },
  {
    key: 'threshold',
    letter: 'T',
    name: 'Threshold',
    energy: 'lt',
    energyName: 'Lactate',
    description: '젖산역치 | 최대심박 85–88% | 20–60분 유지',
  },
  {
    key: 'marathon',
    letter: 'M',
    name: 'Marathon',
    energy: 'base',
    energyName: 'Aerobic',
    description: '마라톤 페이스 | 최대심박 80–85% | 지속 가능한 페이스',
  },
  {
    key: 'easy',
    letter: 'E',
    name: 'Easy',
    energy: 'rest',
    energyName: 'Recovery',
    description: '회복·기초지구력 | 최대심박 65–79% | 편안한 대화 가능',
  },
];

const ENERGY_VAR: Record<EnergySystem, string> = {
  base: 'var(--e-base)',
  lt: 'var(--e-lt)',
  vo2: 'var(--e-vo2)',
  gly: 'var(--e-gly)',
  atp: 'var(--e-atp)',
  rest: 'var(--e-rest)',
};

function zonePace(paces: TrainingPaces, key: ZoneDef['key']): number {
  if (key === 'easy') return (paces.easy.min + paces.easy.max) / 2;
  return paces[key];
}

export const TrainingZones: React.FC<TrainingZonesProps> = ({ paces }) => {
  // 스펙트럼 축: 가장 빠른 페이스(R) → 가장 느린 페이스(E 최저)
  const fastest = paces.repetition;
  const slowest = paces.easy.min;
  const span = Math.max(slowest - fastest, 1);
  const positionOf = (secondsPerKm: number) =>
    Math.min(100, Math.max(0, ((secondsPerKm - fastest) / span) * 100));

  const paceDisplay = (key: ZoneDef['key']): string => {
    if (key === 'easy') return `${formatPace(paces.easy.max)}–${formatPace(paces.easy.min)}`;
    return formatPace(paces[key]);
  };

  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">훈련 구역별 페이스</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">
          FAST → SLOW
        </span>
      </div>

      {/* 페이스 스펙트럼 */}
      <div className="border border-line bg-surface px-5 pb-3 pt-6">
        <div className="relative mx-2 h-10">
          {/* 축 */}
          <div className="absolute left-0 right-0 top-[7px] h-px bg-line-2" aria-hidden />
          {ZONES.map((zone) => {
            const pct = positionOf(zonePace(paces, zone.key));
            return (
              <div
                key={zone.key}
                className="absolute flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pct}%` }}
              >
                <span
                  className="h-[9px] w-[9px] rounded-full border border-surface"
                  style={{ background: ENERGY_VAR[zone.energy] }}
                  aria-hidden
                />
                <span className="mt-1 font-mono text-[11px] font-semibold text-ink">{zone.letter}</span>
                <span className="mt-0.5 hidden font-mono text-[9.5px] text-ink-3 [font-variant-numeric:tabular-nums] sm:block">
                  {formatPace(zonePace(paces, zone.key)).replace('/km', '')}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 border-t border-hair pt-2 text-caption text-ink-4">
          내 기준 기록으로 계산한 구역별 목표 페이스 위치예요. 왼쪽일수록 빠른 페이스입니다.
        </p>
      </div>

      {/* 구역 표 */}
      <div className="border-x border-b border-line bg-surface">
        {ZONES.map((zone, index) => (
          <div
            key={zone.key}
            className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 px-5 py-3.5 ${
              index > 0 ? 'border-t border-hair' : ''
            }`}
          >
            <div className="font-mono text-[22px] font-medium leading-none text-ink">{zone.letter}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-body-sm font-semibold text-ink">{zone.name}</span>
                <EnergyTag system={zone.energy} name={zone.energyName} />
              </div>
              <p className="mt-0.5 text-caption text-ink-3">{zone.description}</p>
            </div>
            <div className="text-right font-mono text-[15px] font-medium text-ink [font-variant-numeric:tabular-nums]">
              {paceDisplay(zone.key)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
