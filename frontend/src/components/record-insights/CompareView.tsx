import { useEffect, useMemo, useState } from 'react';
import {
  getAthleteAnalytics,
  type AthleteAnalyticsProfile,
  type PublicRecord,
} from '../../api/recordAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { COMPARE_MAX } from './useCompareTray';
import { COMPARE_POLICY, TRUST_NOTICE } from '../../config/dataPolicy';

/**
 * 기록 나란히 보기 (Compare View) — P1-7-2.
 *
 * 결정(2026-06-12): 1:다수(최대 4명), 같은 종목·같은 단위 안에서만 비교.
 * 신뢰: "대결/순위/우열"이 아니라 "나란히 보기". 승자 강조 UI 금지(색으로만 구분).
 * 공통 종목 없음 / 표본 부족이면 그래프 대신 안내. 동명이인·출처·풍속 고지.
 *
 * 데이터: 현재는 선수별 profile을 개별 조회해 클라에서 공통 종목/추이를 계산.
 * Codex의 GET /analytics/compare(commonEvents 포함) 나오면 그 응답으로 교체 가능.
 */

// 비교 라인 색상은 중앙 정책(dataPolicy)에서 관리 — 패치 한 곳.
const LINE_COLORS = COMPARE_POLICY.lineColors;

type Loaded = {
  athleteKey: string;
  profile: AthleteAnalyticsProfile;
};

type EventPoint = { date: string; value: number; record: string; competitionName: string; windLegal: boolean };

function pointsFor(profile: AthleteAnalyticsProfile, eventKey: string): EventPoint[] {
  return profile.records
    .filter((r: PublicRecord) => r.eventKey === eventKey && r.isComparable && Number.isFinite(r.recordValue))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => ({
      date: r.date,
      value: r.recordValue,
      record: r.record,
      competitionName: r.competitionName,
      windLegal: r.windLegal,
    }));
}

function bestFor(points: EventPoint[], direction: 'lower' | 'higher'): EventPoint | null {
  if (points.length === 0) return null;
  return points.slice().sort((a, b) => (direction === 'lower' ? a.value - b.value : b.value - a.value))[0];
}

function directionFor(profile: AthleteAnalyticsProfile, eventKey: string): 'lower' | 'higher' {
  const r = profile.records.find((rr) => rr.eventKey === eventKey);
  return r?.direction === 'higher' ? 'higher' : 'lower';
}

export function CompareView({
  athleteKeys,
  onSelectAthlete,
  onClose,
}: {
  athleteKeys: string[];
  onSelectAthlete?: (athleteKey: string) => void;
  onClose?: () => void;
}) {
  const keys = useMemo(() => athleteKeys.slice(0, COMPARE_MAX), [athleteKeys]);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeEvent, setActiveEvent] = useState<string>('');

  useEffect(() => {
    let active = true;
    setState('loading');
    Promise.all(
      keys.map((k) =>
        getAthleteAnalytics(k)
          .then((profile) => ({ athleteKey: k, profile }))
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (!active) return;
        const ok = results.filter((r): r is Loaded => r !== null);
        setLoaded(ok);
        setState(ok.length >= 2 ? 'ready' : 'error');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [keys]);

  // 공통 종목 = 모든 선수가 가진 종목 (교집합). 단위 혼합 방지의 핵심.
  const commonEvents = useMemo(() => {
    if (loaded.length < 2) return [] as Array<{ eventKey: string; eventLabel: string }>;
    const sets = loaded.map((l) => new Set(l.profile.events.map((e) => e.eventKey)));
    const first = loaded[0].profile.events;
    return first
      .filter((e) => sets.every((s) => s.has(e.eventKey)))
      .map((e) => ({ eventKey: e.eventKey, eventLabel: e.eventLabel }));
  }, [loaded]);

  useEffect(() => {
    if (commonEvents.length > 0 && !commonEvents.some((e) => e.eventKey === activeEvent)) {
      setActiveEvent(commonEvents[0].eventKey);
    }
  }, [commonEvents, activeEvent]);

  if (state === 'loading') {
    return <NoticeBox title="기록을 나란히 정리하는 중이에요" />;
  }
  if (state === 'error') {
    return (
      <NoticeBox
        title="나란히 볼 기록을 불러오지 못했어요"
        body="비교에는 2명 이상이 필요해요. 다시 담아 주세요."
        onClose={onClose}
      />
    );
  }

  const direction = activeEvent ? directionFor(loaded[0].profile, activeEvent) : 'lower';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>기록 나란히 보기</CardTitle>
            <p className="mt-1 text-sm text-ink-3">
              모은 공개 기록을 나란히 둔 거예요. {COMPARE_POLICY.othersNotice}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface-2"
            >
              닫기
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 본인 중심(과거의 나) 권장 안내 — #5 */}
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-3">
          {COMPARE_POLICY.ownCentricNotice}
        </p>

        {/* 선수 칩 */}
        <div className="flex flex-wrap gap-2">
          {loaded.map((l, i) => (
            <button
              key={l.athleteKey}
              type="button"
              onClick={() => onSelectAthlete?.(l.athleteKey)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink transition hover:border-line-2"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
              {l.profile.athlete.name}
              {l.profile.athlete.team ? <span className="text-ink-4"> · {l.profile.athlete.team}</span> : null}
            </button>
          ))}
        </div>

        {commonEvents.length === 0 ? (
          <NoticeInline title="함께 가진 종목이 없어요" body="같은 종목·같은 단위에서만 나란히 볼 수 있어요." />
        ) : (
          <>
            {/* 공통 종목 선택 */}
            <div>
              <p className="mb-2 text-xs text-ink-4">함께 가진 종목 중에서 골라 나란히 볼 수 있어요.</p>
              <div className="flex flex-wrap gap-2">
                {commonEvents.map((e) => {
                  const active = e.eventKey === activeEvent;
                  return (
                    <button
                      key={e.eventKey}
                      type="button"
                      onClick={() => setActiveEvent(e.eventKey)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-sm transition',
                        active
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink',
                      ].join(' ')}
                    >
                      {e.eventLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 오버레이 추이 그래프 */}
            <CompareChart loaded={loaded} eventKey={activeEvent} direction={direction} />

            {/* 선수별 베스트 표 */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-4">
                    <th className="py-2 pr-3 font-medium">선수</th>
                    <th className="py-2 pr-3 font-medium">모은 기록 중 최고</th>
                    <th className="py-2 pr-3 font-medium">기록 수</th>
                    <th className="py-2 font-medium">기간</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded.map((l, i) => {
                    const pts = pointsFor(l.profile, activeEvent);
                    const best = bestFor(pts, direction);
                    const years = (l.profile.athlete.years || []).slice().sort((a, b) => a - b);
                    return (
                      <tr key={l.athleteKey} className="border-b border-hair">
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
                            />
                            {l.profile.athlete.name}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-semibold text-ink">
                          {best ? (
                            <>
                              {best.record}
                              {!best.windLegal ? (
                                <span className="ml-1.5 text-[11px] text-amber-700">참고용·풍속 초과</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-ink-4">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-ink-3">{pts.length}건</td>
                        <td className="py-2 text-ink-3">
                          {years.length ? `${years[0]}–${years[years.length - 1]}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-[11px] leading-4 text-ink-4">
          AthleteTime이 모은 공개 기록을 나란히 둔 거예요. {TRUST_NOTICE.notVersus} {TRUST_NOTICE.homonym}{' '}
          풍속·대회 조건이 달라요. {TRUST_NOTICE.snapshot}
        </p>
      </CardContent>
    </Card>
  );
}

function CompareChart({
  loaded,
  eventKey,
  direction,
}: {
  loaded: Loaded[];
  eventKey: string;
  direction: 'lower' | 'higher';
}) {
  const series = loaded.map((l, i) => ({
    name: l.profile.athlete.name,
    color: LINE_COLORS[i % LINE_COLORS.length],
    points: pointsFor(l.profile, eventKey),
  }));

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length < 2 || series.every((s) => s.points.length < 2)) {
    return (
      <NoticeInline
        title="흐름을 그리기엔 기록이 적어요"
        body="이 종목에서 비교 가능한 기록이 한쪽이라도 적어요. 표로만 보여드릴게요."
      />
    );
  }

  const W = 640;
  const H = 200;
  const PAD = 28;
  const dates = allPoints.map((p) => new Date(p.date).getTime()).filter((n) => Number.isFinite(n));
  const values = allPoints.map((p) => p.value);
  const minX = Math.min(...dates);
  const maxX = Math.max(...dates);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanX = maxX - minX || 1;
  const spanV = maxV - minV || 1;

  // y: 화면상 위가 "좋은 기록"이 되도록 방향 반영(평가가 아니라 가독성 목적, 색은 중립).
  const xFor = (t: number) => PAD + ((t - minX) / spanX) * (W - PAD * 2);
  const yFor = (v: number) => {
    const norm = (v - minV) / spanV; // 0..1
    const up = direction === 'lower' ? norm : 1 - norm;
    return PAD + up * (H - PAD * 2);
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="종목별 기록 흐름 비교">
        {series.map((s) => {
          const pts = s.points
            .map((p) => ({ x: xFor(new Date(p.date).getTime()), y: yFor(p.value) }))
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
          if (pts.length === 0) return null;
          const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return (
            <g key={s.name}>
              {pts.length >= 2 ? <path d={d} fill="none" stroke={s.color} strokeWidth={2} /> : null}
              {pts.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r={3} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function NoticeBox({ title, body, onClose }: { title: string; body?: string; onClose?: () => void }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-sm font-medium text-ink">{title}</p>
        {body ? <p className="mt-1 text-xs text-ink-3">{body}</p> : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface-2"
          >
            닫기
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NoticeInline({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 text-xs text-ink-3">{body}</p> : null}
    </div>
  );
}
