import { COMPARE_MAX, useCompareTray } from './useCompareTray';
import { TRUST_NOTICE } from '../../config/dataPolicy';

/**
 * 비교 트레이 — 화면 하단 고정 바. "비교에 담기"로 모은 선수(최대 4명)를 보여주고
 * "기록 나란히 보기"로 진입하게 한다.
 *
 * 신뢰: "나란히 보기"(NOT 대결/순위). 담은 게 없으면 렌더하지 않음.
 */
export function CompareTray({ onCompare }: { onCompare?: (athleteKeys: string[]) => void }) {
  const { entries, count, remove, clear } = useCompareTray();

  if (count === 0) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
      style={{ bottom: 'calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">기록 나란히 보기</p>
            <span className="font-mono text-xs text-ink-4">
              {count}/{COMPARE_MAX}명
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {entries.map((e) => (
              <span
                key={e.athleteKey}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-ink"
              >
                <span className="max-w-[10rem] truncate">
                  {e.name}
                  {e.team ? <span className="text-ink-4"> · {e.team}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => remove(e.athleteKey)}
                  aria-label={`${e.name} 비교에서 빼기`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-ink-4 transition hover:bg-line hover:text-ink"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink-3 transition hover:bg-surface-2"
          >
            비우기
          </button>
          <button
            type="button"
            disabled={count < 2}
            onClick={() => onCompare?.(entries.map((e) => e.athleteKey))}
            className={[
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              count < 2
                ? 'cursor-not-allowed border border-line bg-surface-2 text-ink-4'
                : 'bg-brand-500 text-white hover:bg-brand-600',
            ].join(' ')}
          >
            {count < 2 ? '2명부터 가능' : '나란히 보기'}
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-2 text-[11px] leading-4 text-ink-4">
        모은 공개 기록을 나란히 두는 거예요. {TRUST_NOTICE.notVersus} {TRUST_NOTICE.homonym}
      </p>
    </div>
  );
}
