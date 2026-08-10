import { useEffect, useMemo, useState } from 'react';
import {
  getAthleteAnalytics,
  type AthleteAnalyticsProfile,
  type PublicRecord,
} from '../../api/recordAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { COMPARE_MAX } from './useCompareTray';
import { COMPARE_POLICY, TRUST_NOTICE } from '../../config/dataPolicy';
import { CompareChart, type CompareChartPoint, type RecordDirection } from './CompareChart';
import { CompareBestTable, type CompareBestRow } from './CompareBestTable';
import { CompareErrorNotice, CompareInlineNotice } from './CompareNotices';
import {
  assertComparisonOutcomeIsExhaustive,
  resolveComparisonRequestOutcome,
  type ComparisonRequestOutcome,
} from './comparisonRequestOutcome';

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

type EventPoint = CompareChartPoint & { record: string; competitionName: string; windLegal: boolean };

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
function bestFor(points: EventPoint[], direction: RecordDirection): EventPoint | null {
  if (points.length === 0) return null;
  return points.slice().sort((a, b) => (direction === 'lower' ? a.value - b.value : b.value - a.value))[0];
}
function directionFor(profile: AthleteAnalyticsProfile, eventKey: string): RecordDirection {
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
  const [outcome, setOutcome] = useState<ComparisonRequestOutcome>({ kind: 'loading' });
  const [activeEvent, setActiveEvent] = useState<string>('');

  useEffect(() => {
    let active = true;
    setLoaded([]);
    setOutcome({ kind: 'loading' });
    Promise.allSettled(
      keys.map((athleteKey) => getAthleteAnalytics(athleteKey).then((profile): Loaded => ({ athleteKey, profile }))),
    ).then((results) => {
      if (!active) return;
      const availableProfiles = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
      setLoaded(availableProfiles);
      setOutcome(resolveComparisonRequestOutcome(keys.length, availableProfiles.length));
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

  switch (outcome.kind) {
    case 'loading':
      return <CompareErrorNotice title="기록을 나란히 정리하는 중이에요" />;
    case 'one-available':
      return (
        <CompareErrorNotice
          title="한 명의 기록만 불러왔어요"
          body="나란히 보려면 두 명 이상의 기록이 필요해요. 다시 담아 주세요."
          onClose={onClose}
        />
      );
    case 'unavailable':
      return (
        <CompareErrorNotice
          title="나란히 볼 기록을 불러오지 못했어요"
          body="비교에는 2명 이상이 필요해요. 다시 담아 주세요."
          onClose={onClose}
        />
      );
    case 'complete':
    case 'partial':
      break;
    default:
      return assertComparisonOutcomeIsExhaustive(outcome);
  }

  const direction = activeEvent ? directionFor(loaded[0].profile, activeEvent) : 'lower';
  const chartSeries = loaded.map((item, index) => ({
    athleteKey: item.athleteKey,
    name: item.profile.athlete.name,
    color: LINE_COLORS[index % LINE_COLORS.length],
    points: pointsFor(item.profile, activeEvent),
  }));
  const chartPointCount = chartSeries.flatMap((item) => item.points).length;
  const canRenderChart = chartPointCount >= 2 && !chartSeries.every((item) => item.points.length < 2);
  const bestRows: CompareBestRow[] = loaded.map((item, index) => {
    const points = pointsFor(item.profile, activeEvent);
    const years = item.profile.athlete.years.slice().sort((a, b) => a - b);
    return {
      athleteKey: item.athleteKey,
      name: item.profile.athlete.name,
      color: LINE_COLORS[index % LINE_COLORS.length],
      best: bestFor(points, direction),
      recordCount: points.length,
      period: years.length ? `${years[0]}–${years[years.length - 1]}` : '—',
    };
  });
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
              className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
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
        {outcome.kind === 'partial' ? (
          <CompareInlineNotice
            title="일부 기록을 불러오지 못했어요"
            body={`선택한 기록 ${outcome.unavailableCount}개를 불러오지 못했어요. 불러온 기록만 나란히 보여드려요.`}
          />
        ) : null}

        {/* 선수 칩 */}
        <div className="flex flex-wrap gap-2">
          {loaded.map((l, i) => (
            <button
              key={l.athleteKey}
              type="button"
              onClick={() => onSelectAthlete?.(l.athleteKey)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink transition hover:border-line-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
              {l.profile.athlete.name}
              {l.profile.athlete.team ? <span className="text-ink-4"> · {l.profile.athlete.team}</span> : null}
            </button>
          ))}
        </div>

        {commonEvents.length === 0 ? (
          <CompareInlineNotice title="함께 가진 종목이 없어요" body="같은 종목·같은 단위에서만 나란히 볼 수 있어요." />
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
                        'min-h-11 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
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
            {canRenderChart ? (
              <CompareChart series={chartSeries} direction={direction} ariaLabel="종목별 기록 흐름 비교" />
            ) : (
              <CompareInlineNotice
                title="흐름을 그리기엔 기록이 적어요"
                body="이 종목에서 비교 가능한 기록이 한쪽이라도 적어요. 표로만 보여드릴게요."
              />
            )}

            <CompareBestTable rows={bestRows} />
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
