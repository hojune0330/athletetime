import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getAnonymousInsights, type AnonymousInsights } from '../../api/recordAnalytics';
import { TRUST_NOTICE_COMBO } from '../../config/dataPolicy';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type Props = {
  /** 종목 칩을 눌렀을 때 시즌 기록표로 이동하는 콜백 (선택) */
  onPickEvent?: (eventKey: string) => void;
};

/**
 * 익명 집계 인사이트 카드.
 *
 * 신뢰 원칙
 * - 개인 정보(이름·소속·선수키)는 담지 않은 "모은 수"만 보여준다.
 * - 단정/평가/예측 표현을 쓰지 않는다. ("가장 인기"→"기록이 많은", "활발"→"기록이 모인")
 * - 표본이 빈약해 오해를 부를 수 있는 카드는 그리지 않는다.
 *   (지역 카드는 식별된 지역이 2곳 미만이면 숨긴다 — Unknown 편중 방지)
 */
export function AnonymousInsightCards({ onPickEvent }: Props) {
  const [state, setState] = useState<LoadState>('idle');
  const [data, setData] = useState<AnonymousInsights | null>(null);

  useEffect(() => {
    let alive = true;
    setState('loading');
    getAnonymousInsights({ limit: 6 })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  // 조용히 숨김: 인사이트는 보조 진입점이라 실패해도 화면을 막지 않는다.
  if (state === 'error' || (state === 'ready' && !hasAnyInsight(data))) {
    return null;
  }

  if (state !== 'ready' || !data) {
    return <InsightSkeleton />;
  }

  const events = data.eventConcentration.slice(0, 6);
  // Unknown(미상)을 제외한 식별된 지역만 신뢰 대상으로 본다.
  const namedRegions = data.regionActivity.filter((r) => r.regionCode !== 'unknown');
  const showRegions = namedRegions.length >= 2;
  const pulse = data.seasonPulse?.buckets ?? [];
  const showPulse = pulse.length >= 2;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">요즘 기록이 모이는 곳</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-4">
          {data.season} · 익명 집계
        </span>
      </div>
      <p className="text-xs leading-5 text-ink-4">
        {TRUST_NOTICE_COMBO.anonymousFooter}
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.length > 0 && (
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">기록이 많은 종목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {events.map((ev) => (
                <button
                  key={ev.eventKey}
                  type="button"
                  onClick={onPickEvent ? () => onPickEvent(ev.eventKey) : undefined}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                    onPickEvent ? 'hover:bg-surface-2 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className="truncate text-sm text-ink">{ev.eventLabel}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-ink-3">
                    {ev.recordCount.toLocaleString()}건
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {showPulse && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">최근 기록이 모인 주</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PulseChart buckets={pulse} />
              {data.seasonPulse.from && data.seasonPulse.to && (
                <p className="font-mono text-[11px] text-ink-4">
                  {data.seasonPulse.from} ~ {data.seasonPulse.to}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {showRegions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">기록이 모인 지역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {namedRegions.slice(0, 6).map((r) => (
                <div
                  key={r.regionCode}
                  className="flex items-center justify-between rounded-md px-2 py-1.5"
                >
                  <span className="text-sm text-ink">{regionLabelKo(r.regionCode, r.regionLabel)}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-ink-3">
                    {r.recordCount.toLocaleString()}건
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-4 text-ink-4">
                소속 표기에서 지역을 추정한 값이라 실제와 다를 수 있어요.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function PulseChart({ buckets }: { buckets: { weekStart: string; recordCount: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.recordCount), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 64 }}>
      {buckets.map((b) => {
        const h = Math.max(6, Math.round((b.recordCount / max) * 56));
        return (
          <div key={b.weekStart} className="flex flex-1 flex-col items-center gap-1" title={`${b.weekStart} · ${b.recordCount}건`}>
            <div
              className="w-full rounded-sm bg-brand/70"
              style={{ height: h }}
              aria-hidden
            />
            <span className="font-mono text-[9px] text-ink-4">{b.weekStart.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function InsightSkeleton() {
  return (
    <section className="space-y-3">
      <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    </section>
  );
}

function hasAnyInsight(data: AnonymousInsights | null): boolean {
  if (!data) return false;
  const named = data.regionActivity.filter((r) => r.regionCode !== 'unknown');
  return (
    data.eventConcentration.length > 0 ||
    (data.seasonPulse?.buckets?.length ?? 0) >= 2 ||
    named.length >= 2
  );
}

const REGION_KO: Record<string, string> = {
  seoul: '서울',
  busan: '부산',
  daegu: '대구',
  incheon: '인천',
  gwangju: '광주',
  daejeon: '대전',
  ulsan: '울산',
  sejong: '세종',
  gyeonggi: '경기',
  gangwon: '강원',
  chungbuk: '충북',
  chungnam: '충남',
  jeonbuk: '전북',
  jeonnam: '전남',
  gyeongbuk: '경북',
  gyeongnam: '경남',
  jeju: '제주',
};

function regionLabelKo(code: string, fallback: string): string {
  return REGION_KO[code] ?? fallback;
}
