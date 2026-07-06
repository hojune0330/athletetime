/**
 * 대회 볼거리 카드 (규칙 기반 하이라이트)
 *
 * 수집된 결과에서 규칙으로 찾은 이야깃거리를 보여준다.
 * - 신기록(한국신/대회신/부별신/타이), 박빙 승부, 시상대 싹쓸이, 다관왕, 최다 참가 종목
 * - AI 생성/예측/평가가 아닌, 결과 표에 실제로 있는 사실만 표시
 */

import {
  SparklesIcon,
  BoltIcon,
  UserGroupIcon,
  StarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { CompetitionHighlight } from '../../api/competitions';

const TYPE_STYLE: Record<
  CompetitionHighlight['type'],
  { icon: typeof SparklesIcon; chip: string; label: string }
> = {
  record: { icon: SparklesIcon, chip: 'bg-accent-50 text-accent-700', label: '신기록' },
  photo_finish: { icon: BoltIcon, chip: 'bg-primary-50 text-primary-700', label: '박빙' },
  sweep: { icon: UserGroupIcon, chip: 'bg-success-50 text-success-700', label: '싹쓸이' },
  multi_winner: { icon: StarIcon, chip: 'bg-accent-50 text-accent-700', label: '다관왕' },
  crowd: { icon: UsersIcon, chip: 'bg-neutral-100 text-neutral-600', label: '최다 참가' },
};

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
          const style = TYPE_STYLE[highlight.type] ?? TYPE_STYLE.crowd;
          const Icon = style.icon;
          return (
            <li
              key={`${highlight.type}-${index}`}
              className="flex items-start gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2.5"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${style.chip}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900">{highlight.title}</p>
                <p className="mt-0.5 break-keep text-xs leading-5 text-neutral-600">
                  {highlight.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
