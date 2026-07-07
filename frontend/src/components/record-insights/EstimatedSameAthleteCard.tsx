import { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { getShadowCluster, type ShadowCluster, type ShadowClusterSegment } from '../../api/recordAnalytics';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export type CombineEntry = { athleteKey: string; name: string; team: string };

type Props = {
  /** 현재 보고 있는 선수의 athleteKey. 이 화면에서만 추정 제안을 띄운다. */
  athleteKey: string;
  /** 현재 보고 있는 선수 이름 — 묶음 합산 시 표시명으로 쓴다 */
  athleteName?: string;
  /** 추정 묶음 안의 다른 기록(athleteKey)을 눌렀을 때 이동 콜백 (선택) */
  onSelectAthlete?: (athleteKey: string) => void;
  /** 원탭 합산 — 누르면 묶음 전체가 바로 내 기록이 된다 */
  onCombine?: (entries: CombineEntry[]) => void;
};

/**
 * "이 기록도 내 것 같아요?" 제안 카드 — 심플 버전.
 *
 * 소속 변화(예: 진학)로 나뉜 기록 묶음을 보여주고, 버튼 한 번으로 바로 합친다.
 * 확인 절차 없음 — 잘못 합쳤으면 내 기록 화면에서 빼면 된다.
 *
 * 신뢰 원칙 (유지):
 * - 이것은 추정이다. 서버 데이터를 자동으로 합치지 않는다 (화면 합산만).
 * - 동명이인 가능성 고지는 하단 한 줄로 유지한다.
 * - 응답에 cluster가 없거나 실패하면 조용히 숨긴다.
 */
export function EstimatedSameAthleteCard({ athleteKey, athleteName = '', onSelectAthlete, onCombine }: Props) {
  const [state, setState] = useState<LoadState>('idle');
  const [cluster, setCluster] = useState<ShadowCluster | null>(null);

  useEffect(() => {
    if (!athleteKey) {
      setCluster(null);
      setState('idle');
      return;
    }
    let cancelled = false;
    setState('loading');
    getShadowCluster(athleteKey)
      .then((res) => {
        if (cancelled) return;
        setCluster(res.cluster);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setCluster(null);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [athleteKey]);

  // 추정 묶음이 없거나 실패하면 조용히 숨긴다.
  if (state === 'error' || !cluster || cluster.segments.length < 2) {
    return null;
  }

  // 현재 보고 있는 기록을 제외한 "다른" 추정 기록만 제안한다.
  const others = cluster.segments.filter((seg) => seg.athleteKey !== athleteKey);
  if (others.length === 0) {
    return null;
  }

  const handleCombine = () => {
    if (!onCombine) return;
    onCombine(
      cluster.segments.map((seg) => ({
        athleteKey: seg.athleteKey,
        name: athleteName,
        team: seg.teamLabel || '소속 미상',
      })),
    );
  };

  return (
    <Card className="border-dashed border-amber-300 bg-amber-50/40">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-amber-900">
              소속이 다른 같은 이름 기록이 {others.length}개 더 있어요
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {others.map((seg) => (
                <SegmentChip key={seg.athleteKey} segment={seg} onSelect={onSelectAthlete} />
              ))}
            </div>
          </div>
          {onCombine && (
            <button
              type="button"
              onClick={handleCombine}
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700"
            >
              모두 내 기록으로 합치기
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-4 text-amber-800/60">
          소속·연도 흐름으로 추정한 묶음이에요 (원본 데이터는 그대로예요). 동명이인이면 내 기록 화면에서 빼면 돼요.
        </p>
      </CardContent>
    </Card>
  );
}

function SegmentChip({
  segment,
  onSelect,
}: {
  segment: ShadowClusterSegment;
  onSelect?: (athleteKey: string) => void;
}) {
  const label = `${segment.teamLabel || '소속 미상'} · ${formatSegmentYears(segment)} · 기록 ${segment.recordCount}개`;
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(segment.athleteKey)}
        className="rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-amber-950 transition hover:border-amber-400 hover:bg-white"
      >
        {label}
      </button>
    );
  }
  return (
    <span className="rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-amber-950">
      {label}
    </span>
  );
}

function formatSegmentYears(segment: ShadowClusterSegment): string {
  const { fromYear, toYear } = segment;
  if (fromYear && toYear) {
    return fromYear === toYear ? `${fromYear}년` : `${fromYear}–${toYear}년`;
  }
  if (fromYear) return `${fromYear}년`;
  if (Array.isArray(segment.years) && segment.years.length > 0) {
    return `${segment.years[0]}년`;
  }
  return '연도 미상';
}
