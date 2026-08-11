import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import type { MyAthleteEntry } from '../record-insights/useMyAthlete';
import { createRecordAthleteMineReturnState } from '../../features/record-workspace/recordAthleteNavigationState';

export function DoneStep({
  entries,
  onAddMore,
  onSeasonForMine,
  onRemoveMyAthlete,
}: {
  readonly entries: readonly MyAthleteEntry[];
  readonly onAddMore: () => void;
  readonly onSeasonForMine: () => void;
  readonly onRemoveMyAthlete: (athleteKey: string) => void;
}) {
  const hasEntries = entries.length > 0;

  return (
    <div className="space-y-4" data-records-step="mine-done">
      <div className="border border-brand bg-brand/5 p-5">
        <p className="text-sm font-semibold text-brand">4단계</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {hasEntries ? '모아 보는 기록이 준비됐어요.' : '기록 모음이 비었어요.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          {hasEntries ? `이 기기에서 고른 ${entries.length}명의 선수 후보를 각각 확인할 수 있어요.` : '필요한 선수만 다시 담을 수 있어요.'}
        </p>
      </div>

      {hasEntries ? (
        <div className="grid gap-2 sm:grid-cols-2" data-records-sticky-cta="mine-done">
          <Button type="button" onClick={onAddMore}>후보 더 고르기</Button>
          <Button type="button" variant="outline" onClick={onSeasonForMine}>시즌 기록표 보기</Button>
        </div>
      ) : (
        <div data-records-sticky-cta="mine-done">
          <Button type="button" onClick={onAddMore}>기록 담기</Button>
        </div>
      )}

      {hasEntries ? (
        <section className="border border-line bg-surface" aria-labelledby="mine-candidates-heading">
          <div className="border-b border-line px-4 py-3">
            <h2 id="mine-candidates-heading" className="text-body font-semibold text-ink">이 기기에서 고른 선수 후보</h2>
            <p className="mt-1 text-body-sm text-ink-3">각 후보의 기록을 따로 열어 확인해요. 한 사람으로 합치지 않아요.</p>
          </div>
          <ul>
            {entries.map((entry) => (
              <li key={entry.athleteKey} className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-ink">{entry.name}</p>
                  <p className="mt-1 truncate text-caption text-ink-3">{entry.team || '소속 확인 중'}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild type="button" variant="outline">
                    <Link state={createRecordAthleteMineReturnState()} to={`/records/athletes/${encodeURIComponent(entry.athleteKey)}`}>기록 보기</Link>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onRemoveMyAthlete(entry.athleteKey)}>빼기</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
          아직 담긴 기록이 없어요. 기록 더 담기로 후보를 골라주세요.
        </div>
      )}
    </div>
  );
}
