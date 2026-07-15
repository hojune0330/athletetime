import type { AthleteSearchCard } from '../../api/recordAnalytics';
import { Button } from '../ui/button';
import type { RecordsLoadState } from './RecordsMineTypes';

export function CandidateStep({
  query,
  athletes,
  state,
  selectedKeys,
  onToggleDraft,
  onNext,
}: {
  readonly query: string;
  readonly athletes: readonly AthleteSearchCard[];
  readonly state: RecordsLoadState;
  readonly selectedKeys: readonly string[];
  readonly onToggleDraft: (athlete: AthleteSearchCard) => void;
  readonly onNext: () => void;
}) {
  const selectedCount = selectedKeys.length;

  return (
    <div className="flex min-h-[32rem] flex-col" data-records-step="mine-candidates">
      <div>
        <p className="text-sm font-semibold text-brand">2단계</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">후보에서 내 기록을 고르세요.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          같은 이름이 여러 명일 수 있어요. 소속·연도를 보고 내 것만 고르세요.
        </p>
        <p className="mt-1 text-xs text-ink-4">선택해도 목록 위치는 바뀌지 않아요.</p>
      </div>

      <div className="mt-6 space-y-2">
        {state === 'loading' && <p role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">후보를 찾고 있어요.</p>}
        {state === 'error' && <p role="alert" className="border border-line bg-surface-2 p-4 text-sm text-err">검색을 불러오지 못했어요. 뒤로 가서 다시 시도해 주세요.</p>}
        {state === 'ready' && athletes.length === 0 && (
          <p role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
            {query}에 맞는 기록이 아직 없어요. 이름이나 소속을 바꿔보세요.
          </p>
        )}
        {athletes.map((athlete) => (
          <CandidateRow
            key={athlete.athleteKey}
            athlete={athlete}
            selected={selectedKeys.includes(athlete.athleteKey)}
            onToggle={() => onToggleDraft(athlete)}
          />
        ))}
      </div>

      <div className="sticky bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] mt-auto border-t border-hair bg-surface py-4 md:bottom-0" data-records-sticky-cta="mine-candidates">
        <Button type="button" size="lg" className="w-full" disabled={selectedCount === 0} onClick={onNext}>
          {selectedCount}개 선택됨 · 다음
        </Button>
      </div>
    </div>
  );
}

function CandidateRow({
  athlete,
  selected,
  onToggle,
}: {
  readonly athlete: AthleteSearchCard;
  readonly selected: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex w-full items-start justify-between gap-4 border p-4 text-left transition ${
        selected ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-lg font-semibold text-ink">{athlete.name}</span>
        <span className="mt-1 block truncate text-sm text-ink-3">{athlete.team || '소속 미상'}</span>
        <span className="mt-3 flex flex-wrap gap-1.5">
          <span className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">{formatYearRange(athlete.years)}</span>
          {athlete.events.slice(0, 3).map((event) => (
            <span key={event} className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">{event}</span>
          ))}
        </span>
      </span>
      <span
        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center border text-sm font-bold ${
          selected ? 'border-brand bg-brand text-white' : 'border-line bg-white text-transparent'
        }`}
        aria-hidden
      >
        ✓
      </span>
    </button>
  );
}

function formatYearRange(years: readonly number[]) {
  if (!years.length) return '연도 미상';
  if (years.length === 1) return String(years[0]);
  return `${years[0]}-${years[years.length - 1]}`;
}
