import { useMemo, useState } from 'react';
import type { AthleteAnalyticsProfile, PublicRecord } from '../../api/recordAnalytics';
import { TRUST_NOTICE_COMBO } from '../../config/dataPolicy';

type Props = {
  profile: AthleteAnalyticsProfile;
};

type Period = 'all' | '3y' | '1y';

type TrailPoint = {
  id: string;
  date: string;
  season: number;
  value: number;
  record: string;
  competitionName: string;
  isComparable: boolean;
};

/**
 * 다종목 선수 기록 흐름 (종목 전환 + 기간 토글).
 *
 * 신뢰 원칙
 * - 종목마다 단위(초/거리/높이/점수)가 다르므로 **한 그래프에 섞지 않는다**.
 *   항상 "선택한 한 종목"만 그린다.
 * - "향상/하락/우열" 같은 평가어를 쓰지 않는다. 변화량은 사실값(예: +0.32)만, 색은 중립.
 * - 비교 가능한 기록이 2개 미만이면 그래프 대신 안내문.
 * - 모든 표시는 "AthleteTime이 모은 범위 안에서"임을 고지.
 *
 * 데이터 출처
 * - 현재는 profile.records[]를 종목별로 그룹핑해 클라이언트에서 추이를 만든다.
 *   (서버가 events[].trail 을 제공하면 그쪽으로 교체 가능 — 본 컴포넌트의 외부 계약은 동일)
 */
export function AthleteEventTrail({ profile }: Props) {
  const eventOptions = useMemo(() => buildEventOptions(profile), [profile]);
  const [selectedEventKey, setSelectedEventKey] = useState<string>(eventOptions[0]?.eventKey ?? '');
  const [period, setPeriod] = useState<Period>('all');

  const activeKey = selectedEventKey || eventOptions[0]?.eventKey || '';
  const isMultiEvent = eventOptions.length >= 2;

  const points = useMemo(
    () => buildTrailPoints(profile.records, activeKey, period),
    [profile.records, activeKey, period],
  );

  const activeLabel = eventOptions.find((opt) => opt.eventKey === activeKey)?.eventLabel ?? '';
  const delta = useMemo(() => computeDelta(points), [points]);

  return (
    <div className="space-y-4">
      {/* 종목 선택 — 다종목 선수일 때만 노출 */}
      {isMultiEvent && (
        <div>
          <p className="mb-2 text-xs text-ink-4">종목을 골라 그 종목의 기록 흐름을 볼 수 있어요.</p>
          <div className="flex flex-wrap gap-2">
            {eventOptions.map((opt) => {
              const active = opt.eventKey === activeKey;
              return (
                <button
                  key={opt.eventKey}
                  type="button"
                  onClick={() => setSelectedEventKey(opt.eventKey)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-sm transition',
                    active
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink',
                  ].join(' ')}
                >
                  {opt.eventLabel}
                  <span className={active ? 'ml-1.5 text-white/70' : 'ml-1.5 text-ink-4'}>{opt.recordCount}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 기간 토글 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {activeLabel ? `${activeLabel} 기록 흐름` : '기록 흐름'}
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {(['all', '3y', '1y'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                'px-3 py-1.5 text-xs transition',
                period === p ? 'bg-ink text-white' : 'bg-surface-2 text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              {p === 'all' ? '전체' : p === '3y' ? '최근 3년' : '최근 1년'}
            </button>
          ))}
        </div>
      </div>

      <TrailChart points={points} />

      {delta && (
        <p className="text-xs text-ink-4">
          이 종목의 처음 모은 기록과 최근 모은 기록 차이는 <span className="font-semibold text-ink">{delta.display}</span>예요.
          순위·평가가 아니라 모은 기록의 변화량이에요.
        </p>
      )}
      <p className="text-xs leading-5 text-ink-4">
        {TRUST_NOTICE_COMBO.trailFooterWithSnapshot}
      </p>
    </div>
  );
}

function TrailChart({ points }: { points: TrailPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-ink-4">이 종목으로 모은 기록이 아직 없어요.</p>;
  }
  if (points.length < 2) {
    const only = points[0];
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink-3">
        <p>비교할 기록이 아직 적어요. 모은 기록이 한 개예요.</p>
        <p className="mt-1 text-xs text-ink-4">
          <span className="font-semibold text-ink">{only.record}</span> · {only.date} · {only.competitionName}
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 720;
  const height = 180;
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / span) * (height - 30) - 15;
    return { x, y, point };
  });
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 min-w-[720px] border border-line bg-surface-2">
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand" />
        {coordinates.map(({ x, y, point }) => (
          <g key={point.id}>
            <circle cx={x} cy={y} r="4" className="fill-brand" />
            <text x={x} y={height - 8} textAnchor="middle" className="fill-ink-4 text-[10px]">
              {String(point.season)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {points.slice(-4).map((point) => (
          <div key={point.id} className="border border-line p-3 text-xs text-ink-3">
            <span className="font-semibold text-ink">{point.record}</span> · {point.date} · {point.competitionName}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildEventOptions(profile: AthleteAnalyticsProfile) {
  // events[]가 있으면 그것을 우선 사용(기록 많은 순). 없으면 records에서 유추.
  if (Array.isArray(profile.events) && profile.events.length > 0) {
    return profile.events
      .map((e) => ({ eventKey: e.eventKey, eventLabel: e.eventLabel, recordCount: e.recordCount }))
      .sort((a, b) => b.recordCount - a.recordCount);
  }
  const counts = new Map<string, { eventKey: string; eventLabel: string; recordCount: number }>();
  for (const r of profile.records) {
    const cur = counts.get(r.eventKey);
    if (cur) cur.recordCount += 1;
    else counts.set(r.eventKey, { eventKey: r.eventKey, eventLabel: r.eventLabel, recordCount: 1 });
  }
  return [...counts.values()].sort((a, b) => b.recordCount - a.recordCount);
}

function buildTrailPoints(records: PublicRecord[], eventKey: string, period: Period): TrailPoint[] {
  if (!eventKey) return [];
  const cutoff = periodCutoffSeason(records, period);
  return records
    .filter((r) => r.eventKey === eventKey && r.isComparable && r.season >= cutoff)
    .slice()
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map((r) => ({
      id: r.id,
      date: r.date,
      season: r.season,
      value: r.recordValue,
      record: r.record,
      competitionName: r.competitionName,
      isComparable: r.isComparable,
    }));
}

function periodCutoffSeason(records: PublicRecord[], period: Period): number {
  if (period === 'all') return -Infinity;
  const latest = records.reduce((m, r) => (r.season > m ? r.season : m), 0);
  if (!latest) return -Infinity;
  return period === '3y' ? latest - 2 : latest; // 최근 3년: latest 포함 3개 시즌, 최근 1년: latest 시즌만
}

function computeDelta(points: TrailPoint[]): { display: string } | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const raw = last.value - first.value;
  const sign = raw > 0 ? '+' : raw < 0 ? '-' : '±';
  return { display: `${sign}${Math.abs(raw).toFixed(2)}` };
}
