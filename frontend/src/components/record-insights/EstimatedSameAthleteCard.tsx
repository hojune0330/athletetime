import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getShadowCluster, type ShadowCluster, type ShadowClusterSegment } from '../../api/recordAnalytics';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type Props = {
  /** 현재 보고 있는 선수의 athleteKey. 이 화면에서만 추정 제안을 띄운다. */
  athleteKey: string;
  /** 추정 묶음 안의 다른 기록(athleteKey)을 눌렀을 때 이동 콜백 (선택) */
  onSelectAthlete?: (athleteKey: string) => void;
  /** 묶음 전체를 한 화면에 모아 보기 (화면 임시 모음 — 데이터 병합 아님) */
  onCombine?: (athleteKeys: string[]) => void;
};

/**
 * "같은 선수로 추정되는 기록" 제안 카드.
 *
 * 신뢰 원칙 (인문/신뢰 도메인 — Claude 몫)
 * - 이것은 **추정**이다. 확정 병합이 아니다. 자동으로 합치지 않는다.
 * - "추정" 표현은 반드시 **"직접 확인"** 안내와 함께 둔다.
 * - person_no를 쓰지 않고 만들어진 묶음임을 사용자가 오해하지 않도록, 단정/공식/검증 같은 말을 쓰지 않는다.
 * - 동명이인일 수 있으므로 "다른 선수일 수 있어요"를 항상 남긴다.
 * - 응답에 cluster가 없으면(추정 묶음이 없으면) 아무것도 그리지 않는다(조용히 숨김).
 * - 로드 실패도 조용히 숨긴다 — 제안은 부가 기능이라 화면을 망치면 안 된다.
 */
export function EstimatedSameAthleteCard({ athleteKey, onSelectAthlete, onCombine }: Props) {
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-700/70">Estimated · 추정</p>
            <CardTitle className="mt-1 text-base text-amber-900">같은 선수로 추정되는 기록</CardTitle>
          </div>
          <ConfidenceBadge band={cluster.confidenceBand} />
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-900/80">
          소속 변화(예: 진학)로 보아 <strong>같은 선수일 수 있다고 추정</strong>한 기록이에요.
          확정이 아니고 <strong>자동으로 합치지 않아요</strong>. 동명이인일 수 있으니 소속·연도를 보고
          <strong> 직접 확인</strong>해 주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {others.map((seg) => (
          <SegmentRow key={seg.athleteKey} segment={seg} onSelect={onSelectAthlete} />
        ))}
        {onCombine && (
          <button
            type="button"
            onClick={() => onCombine(cluster.segments.map((seg) => seg.athleteKey))}
            className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            이 기록들 한 화면에 모아 보기
          </button>
        )}
        <p className="pt-1 text-xs leading-5 text-amber-800/70">
          이 추정은 공개된 소속·연도 흐름만으로 만든 것이고, 순위나 공식 기록이 아니에요.
          모아 보기도 화면에서만 임시로 모으는 것이고 데이터를 합치지 않아요.
        </p>
      </CardContent>
    </Card>
  );
}

function SegmentRow({
  segment,
  onSelect,
}: {
  segment: ShadowClusterSegment;
  onSelect?: (athleteKey: string) => void;
}) {
  const yearLabel = formatSegmentYears(segment);
  const team = segment.teamLabel || '소속 미상';
  const content = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-amber-950">{team}</p>
        <p className="mt-0.5 text-xs text-amber-800/75">{yearLabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-amber-800/75">기록 {segment.recordCount}개</p>
        {segment.eventCount > 0 && (
          <p className="text-[11px] text-amber-700/60">종목 {segment.eventCount}개</p>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(segment.athleteKey)}
        className="w-full rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-left transition hover:border-amber-400 hover:bg-white"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="w-full rounded-lg border border-amber-200 bg-white/70 px-3 py-2">{content}</div>
  );
}

function ConfidenceBadge({ band }: { band: 'low' | 'medium' }) {
  // 신뢰 원칙: 숫자(0.71 등)는 노출하지 않는다. "추정 강도"는 정성적 표현으로만.
  const label = band === 'medium' ? '추정 강도: 보통' : '추정 강도: 낮음';
  return (
    <span className="shrink-0 rounded-full border border-amber-300 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-amber-800">
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
