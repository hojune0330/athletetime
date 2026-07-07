import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { getAthleteAnalytics, type AthleteAnalyticsProfile, type PublicRecord } from '../../api/recordAnalytics';
import { resolveRecordDisplay } from '../../lib/recordStatus';
import type { MyAthleteEntry } from './useMyAthlete';
import { useRecordDetailPref, detailToggleLabel } from './useRecordDetailPref';

type LoadState = 'loading' | 'ready' | 'error';

type Props = {
  /** 내가 직접 지정한 기록 묶음들 — 누르는 즉시 여기로 합산된다 */
  entries: MyAthleteEntry[];
  onClose: () => void;
  onRemove: (athleteKey: string) => void;
};

type MergedRecord = PublicRecord & { sourceTeam: string; sourceKey: string };

type EventBest = {
  eventKey: string;
  eventLabel: string;
  recordCount: number;
  best: MergedRecord | null;
};

/** 기록 문자열 → 비교가능 숫자. 시간형(mm:ss.xx)은 초, 거리형(12.34m)은 음수로 뒤집어 "작을수록 좋음" 통일 */
function markSortValue(record: string): number | null {
  const raw = (record || '').trim();
  if (!raw) return null;
  const distance = raw.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (distance) return -parseFloat(distance[1]);
  const time = raw.match(/^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!time) return null;
  const [, a, b, c] = time;
  const parts = [a, b, c].filter((v) => v !== undefined).map(Number);
  if (parts.some((v) => Number.isNaN(v))) return null;
  return parts.reduce((acc, v) => acc * 60 + v, 0);
}

function pickBetter(a: MergedRecord | null, b: MergedRecord): MergedRecord | null {
  if (!a) return b;
  const av = markSortValue(a.record);
  const bv = markSortValue(b.record);
  if (bv === null) return a;
  if (av === null) return b;
  return bv < av ? b : a;
}

/**
 * "내 기록" 합산 카드.
 *
 * - 사용자가 "나로 지정"을 누른 묶음 전부를 한 명의 기록처럼 합산해 보여준다.
 * - 요약(기록 수/종목/연도/최근)도 전부 합산.
 * - 지정은 사용자가 직접 누른 것만 (자동 병합 아님) — 화면 표시용이며 서버 데이터는 바꾸지 않는다.
 * - 잘못 합쳤으면 아래에서 빼면 된다. 설명은 최소로, 전부 하단에.
 */
export function MyRecordsCard({ entries, onClose, onRemove }: Props) {
  const keys = useMemo(() => entries.map((entry) => entry.athleteKey), [entries]);
  const [state, setState] = useState<LoadState>('loading');
  const [profiles, setProfiles] = useState<AthleteAnalyticsProfile[]>([]);
  const [showAll, setShowAll] = useState(false);
  // 날짜·순위·비고 보기/숨기기 (기기 단위 기억)
  const detailPref = useRecordDetailPref();

  useEffect(() => {
    if (keys.length === 0) return;
    let cancelled = false;
    setState('loading');
    Promise.all(keys.map((key) => getAthleteAnalytics(key).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const loaded = results.filter((p): p is AthleteAnalyticsProfile => p !== null);
        setProfiles(loaded);
        setState(loaded.length > 0 ? 'ready' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [keys]);

  const merged = useMemo(() => {
    const rows: MergedRecord[] = [];
    const years = new Set<number>();
    const eventMap = new Map<string, EventBest>();
    let latestSeason = 0;
    for (const profile of profiles) {
      for (const record of profile.records) {
        const row: MergedRecord = {
          ...record,
          sourceTeam: profile.athlete.team || '소속 미상',
          sourceKey: profile.athlete.athleteKey,
        };
        rows.push(row);
        if (record.season) {
          years.add(record.season);
          if (record.season > latestSeason) latestSeason = record.season;
        }
        // 종목별 베스트 — 묶음 전체를 합쳐서 계산 (시즌 베스트도 같은 방식으로 합산)
        const bucket = eventMap.get(record.eventKey) || {
          eventKey: record.eventKey,
          eventLabel: record.eventLabel,
          recordCount: 0,
          best: null,
        };
        bucket.recordCount += 1;
        bucket.best = pickBetter(bucket.best, row);
        eventMap.set(record.eventKey, bucket);
      }
    }
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    // 이번(최근) 시즌 베스트 — 묶음 전체 합산 기준
    let seasonBest: MergedRecord | null = null;
    for (const row of rows) {
      if (row.season === latestSeason) seasonBest = pickBetter(seasonBest, row);
    }
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const eventBests = Array.from(eventMap.values()).sort((a, b) => b.recordCount - a.recordCount);
    return {
      rows,
      totalCount: rows.length,
      eventCount: eventMap.size,
      eventBests,
      seasonBest,
      latestSeason,
      latest: rows[0] || null,
      yearRange:
        sortedYears.length === 0
          ? '-'
          : sortedYears.length === 1
            ? String(sortedYears[0])
            : `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}`,
    };
  }, [profiles]);

  const name = entries[0]?.name || '';
  const visibleRows = showAll ? merged.rows : merged.rows.slice(0, 10);

  return (
    <Card className="border-brand">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand">내 기록</p>
            <CardTitle className="mt-1 text-2xl">{name}</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>

        {/* 합산 요약 — 모든 묶음 합쳐서 (대시보드 상단) */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SumStat label="모은 기록" value={state === 'ready' ? `${merged.totalCount}개` : '…'} />
          <SumStat label="종목" value={state === 'ready' ? `${merged.eventCount}개` : '…'} />
          <SumStat label="활동 연도" value={state === 'ready' ? merged.yearRange : '…'} />
          <SumStat
            label={state === 'ready' && merged.latestSeason ? `${merged.latestSeason} 시즌 베스트` : '시즌 베스트'}
            value={state === 'ready' && merged.seasonBest ? resolveRecordDisplay(merged.seasonBest.record, merged.seasonBest.note).text : '…'}
          />
        </div>

        {/* 종목별 베스트 — 묶음 전체 합산 */}
        {state === 'ready' && merged.eventBests.length > 0 && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {merged.eventBests.slice(0, 4).map((event) => (
              <div key={event.eventKey} className="flex items-baseline justify-between gap-2 border border-line bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink-2">{event.eventLabel}</p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-4">{event.recordCount}개 기록</p>
                </div>
                <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-ink">
                  {event.best ? resolveRecordDisplay(event.best.record, event.best.note).text : '-'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {state === 'loading' && (
          <p role="status" className="py-3 text-sm text-ink-3">기록을 합치는 중이에요.</p>
        )}
        {state === 'error' && (
          <p role="alert" className="py-3 text-sm text-ink-3">기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        )}
        {state === 'ready' && merged.rows.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={detailPref.toggle}
              aria-pressed={detailPref.detail}
              className="border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-3 transition hover:border-line-2 hover:text-ink"
            >
              {detailToggleLabel(detailPref.detail)}
            </button>
          </div>
        )}
        {state === 'ready' && visibleRows.map((record) => {
          const display = resolveRecordDisplay(record.record, record.note);
          return (
            <div
              key={`${record.sourceKey}-${record.id}`}
              className="border border-line p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-ink">{record.eventLabel} · {record.competitionName}</p>
                <p className={`shrink-0 font-mono tabular-nums ${display.hasMark ? 'text-base font-semibold text-ink' : 'text-sm font-medium text-ink-4'}`}>
                  {display.text}
                  {detailPref.detail && record.rank != null && (
                    <span className="ml-1.5 text-xs font-medium text-ink-4">{record.rank}위</span>
                  )}
                </p>
              </div>
              {detailPref.detail && (
                <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-ink-4">
                  <p className="min-w-0 truncate">{record.divisionLabel} · {record.sourceTeam}</p>
                  <p className="shrink-0 font-mono tabular-nums">{record.date}</p>
                </div>
              )}
            </div>
          );
        })}
        {state === 'ready' && merged.rows.length > 10 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full border border-line bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink-2 transition hover:border-line-2"
          >
            전체 {merged.totalCount}개 모두 보기
          </button>
        )}

        {/* 관리·설명은 전부 아래로 */}
        <div className="mt-4 border-t border-hair pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {entries.map((entry) => (
              <span
                key={entry.athleteKey}
                className="inline-flex items-center gap-1.5 border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink-3"
              >
                {entry.team || '소속 미상'}
                <button
                  type="button"
                  onClick={() => onRemove(entry.athleteKey)}
                  aria-label={`${entry.team || '소속 미상'} 묶음을 내 기록에서 빼기`}
                  className="font-semibold text-ink-4 transition hover:text-err"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-ink-4">
            직접 지정한 묶음만 화면에서 합쳐 보여줘요 (원본 데이터는 그대로예요).
            동명이인이 섞였다면 위에서 ×로 빼면 돼요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SumStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-surface-2 p-3">
      <p className="text-[11px] text-ink-4">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
