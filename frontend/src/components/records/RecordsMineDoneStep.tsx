import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { MyRecordsCard } from '../record-insights/MyRecordsCard';
import type { MyAthleteEntry } from '../record-insights/useMyAthlete';

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
  const firstEntry = entries[0];

  return (
    <div className="space-y-4" data-records-step="mine-done">
      <div className="border border-brand bg-brand/5 p-5">
        <p className="text-sm font-semibold text-brand">4단계</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {hasEntries ? '모아 보는 기록이 준비됐어요.' : '기록 모음이 비었어요.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          {hasEntries ? `선택한 ${entries.length}개 묶음을 이 기기에서 모아 보고 있어요.` : '필요한 선수만 다시 담을 수 있어요.'}
        </p>
      </div>

      {hasEntries ? (
        <div className="grid gap-2 sm:grid-cols-3" data-records-sticky-cta="mine-done">
          <Button asChild>
            <Link to={firstEntry ? `/records?athlete=${encodeURIComponent(firstEntry.athleteKey)}` : '/records'}>
              선수 기록 보기
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={onAddMore}>기록 더 담기</Button>
          <Button type="button" variant="outline" onClick={onSeasonForMine}>시즌 기록표 보기</Button>
        </div>
      ) : (
        <div data-records-sticky-cta="mine-done">
          <Button type="button" onClick={onAddMore}>기록 담기</Button>
        </div>
      )}

      {hasEntries ? (
        <MyRecordsCard
          entries={[...entries]}
          onClose={onAddMore}
          onRemove={onRemoveMyAthlete}
        />
      ) : (
        <div role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
          아직 담긴 기록이 없어요. 기록 더 담기로 후보를 골라주세요.
        </div>
      )}
    </div>
  );
}
