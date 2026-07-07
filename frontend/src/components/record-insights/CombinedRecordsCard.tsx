import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { getAthleteAnalytics, type AthleteAnalyticsProfile, type PublicRecord } from '../../api/recordAnalytics';
import { resolveRecordDisplay } from '../../lib/recordStatus';

type LoadState = 'loading' | 'ready' | 'error';

type Props = {
  /** 모아 볼 athleteKey 목록 (추정 묶음). 최대 4개까지 불러온다. */
  athleteKeys: string[];
  onClose: () => void;
  onSelectAthlete?: (athleteKey: string) => void;
};

const MAX_KEYS = 4;

/**
 * "모아 보기" — 추정 묶음(같은 선수로 추정되는 기록)을 한 화면에 임시로 모아 본다.
 *
 * 신뢰 원칙:
 * - 이것은 화면에서만 임시로 모은 것. 데이터를 자동 병합하지 않는다.
 * - 각 기록에 원래 소속 배지를 남겨 어느 묶음에서 온 기록인지 항상 보이게 한다.
 * - "동명이인일 수 있어요 · 직접 확인" 고지를 유지한다.
 */
export function CombinedRecordsCard({ athleteKeys, onClose, onSelectAthlete }: Props) {
  const keys = useMemo(() => athleteKeys.slice(0, MAX_KEYS), [athleteKeys]);
  const [state, setState] = useState<LoadState>('loading');
  const [profiles, setProfiles] = useState<AthleteAnalyticsProfile[]>([]);

  useEffect(() => {
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

  const mergedRecords = useMemo(() => {
    const rows: Array<PublicRecord & { sourceTeam: string; sourceKey: string }> = [];
    for (const profile of profiles) {
      for (const record of profile.records) {
        rows.push({ ...record, sourceTeam: profile.athlete.team || '소속 미상', sourceKey: profile.athlete.athleteKey });
      }
    }
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [profiles]);

  const name = profiles[0]?.athlete.name || '';

  return (
    <Card className="border-brand/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand">모아 보기</p>
            <CardTitle className="mt-1 text-xl">
              {name ? `${name} — 추정 묶음 기록을 한 화면에` : '추정 묶음 기록을 한 화면에'}
            </CardTitle>
            <p className="mt-2 text-xs leading-5 text-ink-4">
              소속이 달라 나뉘어 있던 기록을 화면에서만 임시로 모았어요. 데이터를 합치는 게 아니고,
              동명이인일 수 있으니 소속·연도를 직접 확인해 주세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
        {profiles.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profiles.map((profile) => (
              <button
                key={profile.athlete.athleteKey}
                type="button"
                onClick={() => onSelectAthlete?.(profile.athlete.athleteKey)}
                className="border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-3 transition hover:border-brand-500/50 hover:text-ink"
              >
                {profile.athlete.team || '소속 미상'} · 기록 {profile.records.length}개
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {state === 'loading' && (
          <p role="status" className="py-4 text-sm text-ink-3">기록을 모으는 중이에요.</p>
        )}
        {state === 'error' && (
          <p role="alert" className="py-4 text-sm text-ink-3">기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        )}
        {state === 'ready' && mergedRecords.slice(0, 20).map((record) => {
          const display = resolveRecordDisplay(record.record, record.note);
          return (
            <div
              key={`${record.sourceKey}-${record.id}`}
              className="grid gap-2 border border-line p-3 sm:grid-cols-[110px_1fr_auto_auto] sm:items-center"
            >
              <div className="font-mono text-xs text-ink-4">{record.date}</div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{record.eventLabel} · {record.competitionName}</p>
                <p className="text-xs text-ink-4">{record.divisionLabel}</p>
              </div>
              <span className="justify-self-start border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3 sm:justify-self-auto">
                {record.sourceTeam}
              </span>
              {display.hasMark ? (
                <div className="text-lg font-semibold text-ink">{display.text}</div>
              ) : (
                <div className="text-sm font-medium text-ink-4">{display.text}</div>
              )}
            </div>
          );
        })}
        {state === 'ready' && mergedRecords.length > 20 && (
          <p className="pt-1 text-xs text-ink-4">최근 20개만 보여드려요. 소속 배지를 눌러 각 기록 화면에서 전체를 볼 수 있어요.</p>
        )}
      </CardContent>
    </Card>
  );
}
