/**
 * 대회 볼거리 카드 v2 (규칙 기반 하이라이트 — 중계 자막 형식)
 *
 * 수집된 결과에서 규칙으로 찾은 이야깃거리를 보여준다.
 * - 신기록, 역대 최고 기록, 연속 우승, 직전 회차 비교, 박빙 승부, 싹쓸이, 다관왕, 우승, 최다 참가
 * - 핵심 수치(stat)를 크게 강조하는 스포츠 중계 자막 형식
 * - AI 생성/예측/평가가 아닌, 결과 표에 실제로 있는 사실만 표시
 */

import {
  SparklesIcon,
  BoltIcon,
  UserGroupIcon,
  StarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import type { CompetitionHighlight } from '../../api/competitions';

const TYPE_STYLE: Record<
  string,
  { icon: typeof SparklesIcon; chip: string; stat: string; label: string }
> = {
  record: { icon: SparklesIcon, chip: 'bg-accent-50 text-accent-700', stat: 'text-accent-700', label: '신기록' },
  series_best: { icon: ArrowTrendingUpIcon, chip: 'bg-accent-50 text-accent-700', stat: 'text-accent-700', label: '역대 최고' },
  domestic_champion: { icon: FlagIcon, chip: 'bg-primary-50 text-primary-700', stat: 'text-primary-700', label: '국내부 1위' },
  streak: { icon: FlagIcon, chip: 'bg-primary-50 text-primary-700', stat: 'text-primary-700', label: '연속 우승' },
  vs_last: { icon: ClockIcon, chip: 'bg-primary-50 text-primary-700', stat: 'text-primary-700', label: '지난 회차 비교' },
  photo_finish: { icon: BoltIcon, chip: 'bg-primary-50 text-primary-700', stat: 'text-primary-700', label: '박빙' },
  champion: { icon: StarIcon, chip: 'bg-neutral-100 text-neutral-700', stat: 'text-neutral-900', label: '우승' },
  sweep: { icon: UserGroupIcon, chip: 'bg-success-50 text-success-700', stat: 'text-success-700', label: '싹쓸이' },
  multi_winner: { icon: StarIcon, chip: 'bg-accent-50 text-accent-700', stat: 'text-accent-700', label: '다관왕' },
  crowd: { icon: UsersIcon, chip: 'bg-neutral-100 text-neutral-600', stat: 'text-neutral-900', label: '최다 참가' },
};

const FALLBACK_STYLE = TYPE_STYLE.crowd;

type CompetitionHighlightsProps = {
  readonly highlights: readonly CompetitionHighlight[];
};

export function CompetitionHighlights({ highlights }: CompetitionHighlightsProps) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <section
      aria-label="대회 볼거리"
      className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-accent-500" />
          <h3 className="text-sm font-bold text-neutral-900">이 대회 볼거리</h3>
        </div>
        <p className="text-[11px] text-neutral-400">수집된 결과에서 찾은 사실만 보여드려요</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {highlights.map((highlight, index) => {
          const style = TYPE_STYLE[highlight.type] ?? FALLBACK_STYLE;
          const Icon = style.icon;
          return (
            <li
              key={`${highlight.type}-${index}`}
              className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2.5"
            >
              {/* 상단: 유형 라벨 + 강조 수치 (중계 자막 스타일) */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${style.chip}`}
                >
                  <Icon className="h-3 w-3" />
                  {style.label}
                </span>
                {highlight.stat ? (
                  <span className={`shrink-0 font-mono text-sm font-extrabold tabular-nums ${style.stat}`}>
                    {highlight.stat}
                  </span>
                ) : null}
              </div>
              {/* 본문 */}
              <p className="mt-1.5 text-xs font-bold text-neutral-900">{highlight.title}</p>
              <p className="mt-0.5 break-keep text-xs leading-5 text-neutral-600">
                {highlight.detail}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
