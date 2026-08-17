import type { AthleteSearchCard } from '../../api/recordAnalytics';

type RecordSearchResultCardProps = {
  readonly athlete: AthleteSearchCard;
  readonly selected: boolean;
  readonly inTray: boolean;
  readonly mine: boolean;
  readonly onSelect: () => void;
  readonly onToggleCompare: () => void;
  readonly onToggleMine: () => void;
};

export function RecordSearchResultCard({
  athlete,
  selected,
  inTray,
  mine,
  onSelect,
  onToggleCompare,
  onToggleMine,
}: RecordSearchResultCardProps) {
  const isHomonym = athlete.ambiguity === 'name_team' || athlete.ambiguity === 'name';
  const divisions = [...new Set(athlete.divisions.map((division) => division.trim()).filter(Boolean))];
  const events = [...new Set(athlete.events.map((event) => event.trim()).filter(Boolean))];

  return (
    <div
      className={`relative border p-4 transition-colors ${
        mine
          ? 'border-brand bg-brand/10'
          : selected
            ? 'border-brand bg-brand/5'
            : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2'
      }`}
    >
      {mine && (
        <span className="absolute right-3 top-3 border border-brand bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
          ✓ 기록 모음에 담은 선수
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="block min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{athlete.name}</h2>
            <p className="mt-1 text-sm text-ink-3">{athlete.team || '소속 미상'}</p>
          </div>
          {!mine && <span className="font-mono text-xs text-ink-4">기록 {athlete.recordCount}건</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">
            {formatYearRange(athlete.years)}
          </span>
          {events.map((event) => (
            <span key={event} className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">
              {event}
            </span>
          ))}
        </div>

        <p className="mt-3 break-keep text-xs leading-5 text-ink-3 [text-wrap:pretty]">
          경기 부문 · {divisions.join(' · ') || '부문 미상'}
        </p>

        {isHomonym ? (
          <p className="mt-3 text-xs text-warn">
            이 소속·연도의 기록만 모았어요. 같은 이름의 다른 선수일 수 있어요.
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-4">공개 기록 모음 · 공식 기록 아님</p>
        )}
        <span className="mt-4 inline-flex text-sm font-semibold text-brand">이 기록 보기</span>
      </button>

      <button
        type="button"
        onClick={onToggleMine}
        aria-pressed={mine}
        className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 border px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          mine
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-brand-500 bg-surface text-brand hover:bg-brand-50'
        }`}
      >
        {mine ? '✓ 기록 모음에 담은 선수 — 누르면 빼요' : '이 선수 담기'}
      </button>
      <button
        type="button"
        onClick={onToggleCompare}
        className={`mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          inTray
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink'
        }`}
      >
        {inTray ? '✓ 비교에 담음' : '+ 비교에 담기'}
      </button>
    </div>
  );
}

function formatYearRange(years: readonly number[]): string {
  const [firstYear] = years;
  const lastYear = years.at(-1);
  if (firstYear === undefined || lastYear === undefined) return '연도 미상';
  if (firstYear === lastYear) return String(firstYear);
  return `${firstYear}-${lastYear}`;
}
