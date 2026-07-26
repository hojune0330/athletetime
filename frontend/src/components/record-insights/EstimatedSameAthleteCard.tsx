import { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { getShadowCluster, type ShadowCluster, type ShadowClusterSegment } from '../../api/recordAnalytics';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type Props = {
  athleteKey: string;
  onSelectAthlete?: (athleteKey: string) => void;
};

export function EstimatedSameAthleteCard({ athleteKey, onSelectAthlete }: Props) {
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
        </div>
        <p className="mt-3 text-[11px] leading-4 text-amber-800/60">
          같은 선수라고 단정하지 않아요. 각 기록을 열어 소속·연도·종목을 확인한 뒤, 원하는 카드만 "이 기록 담기"로 이 기기에서 모아 보세요.
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
